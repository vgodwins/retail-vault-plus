import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  status: string;
  total: number;
  due_date: string | null;
  created_at: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    due_date: "",
    notes: "",
    items: [{ description: "", quantity: "1", unit_price: "", subtotal: "0" }],
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, customer_name, customer_email, status, total, due_date, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInvoices(data);
    }
  };

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: "", quantity: "1", unit_price: "", subtotal: "0" }],
    });
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };

    if (field === "quantity" || field === "unit_price") {
      const quantity = Number(items[index].quantity) || 0;
      const unitPrice = Number(items[index].unit_price) || 0;
      items[index].subtotal = (quantity * unitPrice).toFixed(2);
    }

    setForm({ ...form, items });
  };

  const handleSave = async () => {
    try {
      // Validate inputs before saving
      const invoiceSchema = z.object({
        customer_name: z.string().trim().min(1, "Customer name is required").max(100, "Name too long"),
        customer_email: z.string().trim().max(255, "Email too long").email("Invalid email").optional().or(z.literal('')).transform(val => val || null),
        customer_phone: z.string().trim().max(20, "Phone too long").regex(/^[0-9+\-\s()]*$/, "Invalid phone format").optional().or(z.literal('')).transform(val => val || null),
        customer_address: z.string().trim().max(500, "Address too long").optional().or(z.literal('')).transform(val => val || null),
        notes: z.string().trim().max(1000, "Notes too long").optional().or(z.literal('')).transform(val => val || null),
        items: z.array(z.object({
          description: z.string().trim().min(1, "Item description required").max(200, "Description too long"),
          quantity: z.number().int().positive("Quantity must be positive"),
          unit_price: z.number().nonnegative("Price cannot be negative")
        })).min(1, "At least one item required")
      });

      const validatedData = invoiceSchema.parse({
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        customer_address: form.customer_address,
        notes: form.notes,
        items: form.items.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price)
        }))
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const invoiceNumber = `INV-${Date.now()}`;
      const subtotal = validatedData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const tax = 0; // Can be configured
      const total = subtotal + tax;

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_name: validatedData.customer_name,
          customer_email: validatedData.customer_email,
          customer_phone: validatedData.customer_phone,
          customer_address: validatedData.customer_address,
          due_date: form.due_date || null,
          notes: validatedData.notes,
          subtotal,
          tax,
          total,
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const items = validatedData.items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(items);
      if (itemsError) throw itemsError;

      toast.success("Invoice created successfully");
      setShowDialog(false);
      setForm({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        customer_address: "",
        due_date: "",
        notes: "",
        items: [{ description: "", quantity: "1", unit_price: "", subtotal: "0" }],
      });
      fetchInvoices();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "sent":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">Generate and track invoices</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No invoices created
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="font-bold">${Number(invoice.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(invoice.status)} className="capitalize">
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Customer Address</Label>
              <Input
                value={form.customer_address}
                onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <Input
                    placeholder="Description"
                    className="col-span-5"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    className="col-span-2"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    className="col-span-2"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                  />
                  <Input
                    placeholder="Subtotal"
                    className="col-span-2"
                    value={item.subtotal}
                    disabled
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="col-span-1"
                    onClick={() => {
                      const items = form.items.filter((_, i) => i !== index);
                      setForm({ ...form, items });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>
                  ${form.items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
