import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Scan, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
}

interface Product {
  id: string;
  name: string;
  unit_price: number;
  barcode: string | null;
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [voucherCode, setVoucherCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<{ method: string; amount: string }[]>([
    { method: "cash", amount: "" },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("$");

  useEffect(() => {
    fetchProducts();
    fetchTaxRate();
    fetchCurrency();
  }, []);

  const fetchCurrency = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "currency")
      .maybeSingle();
    
    if (data?.value) {
      const currencySymbols: Record<string, string> = {
        USD: "$", EUR: "€", GBP: "£", NGN: "₦", JPY: "¥",
        CNY: "¥", INR: "₹", KES: "KSh", ZAR: "R",
      };
      setCurrencySymbol(currencySymbols[data.value as string] || data.value as string);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, unit_price, barcode")
      .eq("is_active", true);
    
    if (!error && data) {
      setProducts(data);
    }
  };

  const fetchTaxRate = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "tax_rate")
      .single();
    
    if (data?.value) {
      setTaxRate(Number(data.value) / 100);
    }
  };

  const handleBarcodeSearch = async (code: string) => {
    if (!code.trim()) return;

    const product = products.find((p) => p.barcode === code || p.name.toLowerCase().includes(code.toLowerCase()));
    
    if (product) {
      addToCart({
        id: product.id,
        name: product.name,
        price: Number(product.unit_price),
        quantity: 1,
        barcode: product.barcode || undefined,
      });
      setBarcode("");
      toast.success(`Added ${product.name} to cart`);
    } else {
      toast.error("Product not found");
    }
  };

  const addToCart = (item: CartItem) => {
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      setCart(cart.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, item]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;

    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .eq("code", voucherCode.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !data) {
      toast.error("Invalid voucher code");
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error("Voucher has expired");
      return;
    }

    if (data.max_uses && data.uses_count >= data.max_uses) {
      toast.error("Voucher has reached maximum uses");
      return;
    }

    const currentSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (currentSubtotal < Number(data.min_purchase)) {
      toast.error(`Minimum purchase of ${currencySymbol}${data.min_purchase} required`);
      return;
    }

    const discountAmount = data.is_percentage
      ? (currentSubtotal * Number(data.value)) / 100
      : Number(data.value);

    setDiscount(discountAmount);
    toast.success(`Voucher applied: ${currencySymbol}${discountAmount.toFixed(2)} discount`);
  };

  const processPayment = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      // Validate inputs before processing
      const transactionSchema = z.object({
        customer_name: z.string().max(100).optional().nullable().transform(val => val || null),
        customer_phone: z.string().max(20).regex(/^[0-9+\-\s()]*$/, "Invalid phone format").optional().nullable().transform(val => val || null),
        cart: z.array(z.object({
          id: z.string().uuid(),
          price: z.number().positive("Price must be positive"),
          quantity: z.number().int().positive("Quantity must be positive")
        })).min(1, "Cart cannot be empty"),
        payments: z.array(z.object({
          method: z.enum(['cash', 'card', 'mobile_money', 'voucher', 'bank_transfer']),
          amount: z.number().positive("Payment amount must be positive")
        })).min(1, "At least one payment method required")
      });

      const validatedData = transactionSchema.parse({
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        cart: cart.map(item => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity
        })),
        payments: paymentMethods
          .filter((pm) => pm.amount && Number(pm.amount) > 0)
          .map((pm) => ({
            method: pm.method,
            amount: Number(pm.amount)
          }))
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Authorization: cashiers, managers and admins can process payments
      const [adminRes, managerRes, cashierRes] = await Promise.all([
        supabase.rpc('has_role', { user_id: user.id, check_role: 'admin' }),
        supabase.rpc('has_role', { user_id: user.id, check_role: 'manager' }),
        supabase.rpc('has_role', { user_id: user.id, check_role: 'cashier' }),
      ]);
      const isAuthorized = !!(adminRes.data || managerRes.data || cashierRes.data);
      if (!isAuthorized) {
        toast.error("You don't have permission to process transactions.");
        return;
      }

      const transactionNumber = `TXN-${Date.now()}`;
      const subtotal = validatedData.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = subtotal * taxRate;
      const total = subtotal + tax - discount;

      // Create transaction
      const { data: transaction, error: txnError } = await supabase
        .from("transactions")
        .insert({
          transaction_number: transactionNumber,
          customer_name: validatedData.customer_name,
          customer_phone: validatedData.customer_phone,
          created_by: user.id,
          subtotal,
          tax,
          discount,
          total,
          status: "completed",
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Create transaction items
      const items = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from("transaction_items").insert(items);
      if (itemsError) throw itemsError;

      // Create payments
      const payments = validatedData.payments.map((pm) => ({
        transaction_id: transaction.id,
        payment_method: pm.method as any,
        amount: pm.amount,
      }));

      const { error: paymentsError } = await supabase.from("transaction_payments").insert(payments);
      if (paymentsError) throw paymentsError;

      // Update voucher usage if applied
      if (voucherCode && discount > 0) {
        const { data: voucher } = await supabase
          .from("vouchers")
          .select("uses_count")
          .eq("code", voucherCode.toUpperCase())
          .single();
        
        if (voucher) {
          await supabase
            .from("vouchers")
            .update({ uses_count: voucher.uses_count + 1 })
            .eq("code", voucherCode.toUpperCase());
        }
      }

      toast.success("Transaction completed successfully!");
      printReceipt(transaction, items);
      
      // Reset
      setCart([]);
      setDiscount(0);
      setVoucherCode("");
      setCustomerName("");
      setCustomerPhone("");
      setPaymentMethods([{ method: "cash", amount: "" }]);
      setShowPayment(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to process payment");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = (transaction: any, items: any[]) => {
    const receiptWindow = window.open("", "_blank");
    if (!receiptWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${transaction.transaction_number}</title>
          <style>
            body { font-family: monospace; max-width: 300px; margin: 20px auto; }
            h2 { text-align: center; margin: 10px 0; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 1.2em; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h2>SALES RECEIPT</h2>
          <div class="line"></div>
          <p>Transaction: ${transaction.transaction_number}</p>
          <p>Date: ${new Date(transaction.created_at).toLocaleString()}</p>
          ${transaction.customer_name ? `<p>Customer: ${transaction.customer_name}</p>` : ''}
          <div class="line"></div>
          ${cart.map(item => `
            <div class="row">
              <span>${item.name} x${item.quantity}</span>
              <span>${currencySymbol}${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="row"><span>Subtotal:</span><span>${currencySymbol}${transaction.subtotal.toFixed(2)}</span></div>
          <div class="row"><span>Tax:</span><span>${currencySymbol}${transaction.tax.toFixed(2)}</span></div>
          ${transaction.discount > 0 ? `<div class="row"><span>Discount:</span><span>-${currencySymbol}${transaction.discount.toFixed(2)}</span></div>` : ''}
          <div class="line"></div>
          <div class="row total"><span>TOTAL:</span><span>${currencySymbol}${transaction.total.toFixed(2)}</span></div>
          <div class="line"></div>
          <p style="text-align: center;">Thank you for your purchase!</p>
          <button onclick="window.print()" style="width: 100%; padding: 10px; margin-top: 20px;">Print Receipt</button>
        </body>
      </html>
    `;

    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
  const tax = subtotal * (Number(taxRate) || 0);
  const total = subtotal + tax - (Number(discount) || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
          <p className="text-muted-foreground">Process customer transactions</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Product Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Scan barcode or search product..."
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleBarcodeSearch(barcode)}
                    className="text-lg"
                  />
                  <Button onClick={() => handleBarcodeSearch(barcode)} size="lg">
                    <Scan className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {products.slice(0, 8).map((product) => (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-start"
                      onClick={() => addToCart({
                        id: product.id,
                        name: product.name,
                        price: Number(product.unit_price),
                        quantity: 1,
                      })}
                    >
                      <span className="font-medium text-sm">{product.name}</span>
                      <span className="text-xs text-muted-foreground">{currencySymbol}{Number(product.unit_price).toFixed(2)}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cart Items</CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cart is empty. Scan or add items to begin.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {currencySymbol}{item.price.toFixed(2)} each
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="font-bold w-24 text-right">
                          {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{currencySymbol}{tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{currencySymbol}{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="w-full justify-center py-2">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} items in cart
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Voucher code"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    />
                    <Button variant="secondary" onClick={applyVoucher}>
                      Apply
                    </Button>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount Applied</span>
                      <span>-{currencySymbol}{discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    size="lg" 
                    disabled={cart.length === 0}
                    onClick={() => setShowPayment(true)}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Process Payment
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCart([])}
                    disabled={cart.length === 0}
                  >
                    Clear Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Name (Optional)</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone (Optional)</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>Payment Methods</Label>
              {paymentMethods.map((pm, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={pm.method}
                    onValueChange={(value) => {
                      const updated = [...paymentMethods];
                      updated[index].method = value;
                      setPaymentMethods(updated);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="voucher">Voucher</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={pm.amount}
                    onChange={(e) => {
                      const updated = [...paymentMethods];
                      updated[index].amount = e.target.value;
                      setPaymentMethods(updated);
                    }}
                  />
                  {paymentMethods.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPaymentMethods(paymentMethods.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentMethods([...paymentMethods, { method: "cash", amount: "" }])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-lg">{currencySymbol}{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Paid:</span>
                <span>
                  {currencySymbol}
                  {paymentMethods
                    .reduce((sum, pm) => sum + (Number(pm.amount) || 0), 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Cancel
            </Button>
            <Button onClick={processPayment} disabled={isProcessing}>
              <Printer className="mr-2 h-4 w-4" />
              {isProcessing ? "Processing..." : "Complete & Print"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}