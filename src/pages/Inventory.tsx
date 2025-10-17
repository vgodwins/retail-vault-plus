import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, AlertTriangle, RotateCcw, XCircle, Plus, Edit, Trash2, Scan } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
}

interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  status: string;
  batch_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  products: { name: string; sku: string | null; barcode: string | null };
}

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit_price: string;
  cost_price: string;
  reorder_level: string;
  description: string;
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    unit_price: "",
    cost_price: "",
    reorder_level: "10",
    description: "",
  });
  const [inventoryForm, setInventoryForm] = useState({
    product_id: "",
    quantity: "",
    status: "valid",
    batch_number: "",
    expiry_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchInventory();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (showInventoryDialog) {
      fetchProducts();
    }
  }, [showInventoryDialog]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, barcode")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setProducts(data);
    }
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*, products(name, sku, barcode)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInventory(data);
    }
  };

  const handleSaveProduct = async () => {
    try {
      // Validate inputs before saving
      const productSchema = z.object({
        name: z.string().trim().min(1, "Product name is required").max(100, "Name too long"),
        sku: z.string().trim().max(50, "SKU too long").optional().or(z.literal('')).transform(val => val || null),
        barcode: z.string().trim().max(50, "Barcode too long").optional().or(z.literal('')).transform(val => val || null),
        category: z.string().trim().max(50, "Category too long").optional().or(z.literal('')).transform(val => val || null),
        description: z.string().trim().max(500, "Description too long").optional().or(z.literal('')).transform(val => val || null),
        unit_price: z.number().nonnegative("Unit price cannot be negative"),
        cost_price: z.number().nonnegative("Cost price cannot be negative").optional().nullable(),
        reorder_level: z.number().int().nonnegative("Reorder level cannot be negative")
      });

      const validatedData = productSchema.parse({
        name: productForm.name,
        sku: productForm.sku,
        barcode: productForm.barcode,
        category: productForm.category,
        description: productForm.description,
        unit_price: Number(productForm.unit_price),
        cost_price: productForm.cost_price ? Number(productForm.cost_price) : null,
        reorder_level: Number(productForm.reorder_level)
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Authorization: only admins and managers can create/update products
      const [{ data: isAdmin }, { data: isManager }] = await Promise.all([
        supabase.rpc('has_role', { user_id: user.id, check_role: 'admin' }),
        supabase.rpc('has_role', { user_id: user.id, check_role: 'manager' }),
      ]);
      if (!isAdmin && !isManager) {
        toast.error("You don't have permission to manage products.");
        return;
      }

      const productData = {
        name: validatedData.name,
        sku: validatedData.sku,
        barcode: validatedData.barcode,
        category: validatedData.category,
        unit_price: validatedData.unit_price,
        cost_price: validatedData.cost_price,
        reorder_level: validatedData.reorder_level,
        description: validatedData.description,
        created_by: user.id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct);
        if (error) throw error;
        toast.success("Product updated successfully");
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
        toast.success("Product created successfully");
      }

      setShowProductDialog(false);
      setEditingProduct(null);
      setProductForm({
        name: "",
        sku: "",
        barcode: "",
        category: "",
        unit_price: "",
        cost_price: "",
        reorder_level: "10",
        description: "",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleSaveInventory = async () => {
    try {
      // Validate inputs before saving
      const inventorySchema = z.object({
        product_id: z.string().uuid("Invalid product selection"),
        quantity: z.number().int().nonnegative("Quantity cannot be negative"),
        status: z.enum(['valid', 'returned', 'damaged', 'expired']),
        batch_number: z.string().trim().max(50, "Batch number too long").optional().or(z.literal('')).transform(val => val || null),
        notes: z.string().trim().max(500, "Notes too long").optional().or(z.literal('')).transform(val => val || null)
      });

      const validatedData = inventorySchema.parse({
        product_id: inventoryForm.product_id,
        quantity: Number(inventoryForm.quantity),
        status: inventoryForm.status,
        batch_number: inventoryForm.batch_number,
        notes: inventoryForm.notes
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Authorization: only admins and managers can add inventory
      const [{ data: isAdmin }, { data: isManager }] = await Promise.all([
        supabase.rpc('has_role', { user_id: user.id, check_role: 'admin' }),
        supabase.rpc('has_role', { user_id: user.id, check_role: 'manager' }),
      ]);
      if (!isAdmin && !isManager) {
        toast.error("You don't have permission to manage inventory.");
        return;
      }

      const { error } = await supabase.from("inventory").insert({
        product_id: validatedData.product_id,
        quantity: validatedData.quantity,
        status: validatedData.status as any,
        batch_number: validatedData.batch_number,
        expiry_date: inventoryForm.expiry_date || null,
        notes: validatedData.notes,
        updated_by: user.id,
      });

      if (error) throw error;

      toast.success("Inventory added successfully");
      setShowInventoryDialog(false);
      setInventoryForm({
        product_id: "",
        quantity: "",
        status: "valid",
        batch_number: "",
        expiry_date: "",
        notes: "",
      });
      fetchInventory();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory record?")) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    // Authorization: only admins and managers can delete inventory
    const [{ data: isAdmin }, { data: isManager }] = await Promise.all([
      supabase.rpc('has_role', { user_id: user.id, check_role: 'admin' }),
      supabase.rpc('has_role', { user_id: user.id, check_role: 'manager' }),
    ]);
    if (!isAdmin && !isManager) {
      toast.error("You don't have permission to delete inventory.");
      return;
    }

    const { error } = await supabase.from("inventory").delete().eq("id", id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Inventory deleted");
      fetchInventory();
    }
  };

  const filterByStatus = (status: string) => {
    return inventory.filter((item) => item.status === status);
  };

  const renderInventoryTable = (items: InventoryItem[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU/Barcode</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Batch</TableHead>
          <TableHead>Expiry Date</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-3">
                <span>No items found</span>
                <Button size="sm" onClick={() => setShowInventoryDialog(true)}>
                  <Package className="h-4 w-4 mr-2" />
                  Add Stock
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.products.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.products.sku || item.products.barcode || "-"}
              </TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{item.batch_number || "-"}</TableCell>
              <TableCell>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "-"}</TableCell>
              <TableCell className="text-sm">{item.notes || "-"}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteInventory(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">Track and manage your stock levels</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowProductDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
            <Button variant="secondary" onClick={() => setShowInventoryDialog(true)}>
              <Package className="h-4 w-4 mr-2" />
              Add Stock
            </Button>
          </div>
        </div>

        <Tabs defaultValue="valid" className="space-y-4">
          <TabsList>
            <TabsTrigger value="valid" className="gap-2">
              <Package className="h-4 w-4" />
              Valid Stock
            </TabsTrigger>
            <TabsTrigger value="returned" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Returned
            </TabsTrigger>
            <TabsTrigger value="damaged" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Damaged
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-2">
              <XCircle className="h-4 w-4" />
              Expired
            </TabsTrigger>
          </TabsList>

          <TabsContent value="valid" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Valid Stock Items</CardTitle>
              </CardHeader>
              <CardContent>{renderInventoryTable(filterByStatus("valid"))}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Returned Items</CardTitle>
              </CardHeader>
              <CardContent>{renderInventoryTable(filterByStatus("returned"))}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="damaged" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Damaged Stock</CardTitle>
              </CardHeader>
              <CardContent>{renderInventoryTable(filterByStatus("damaged"))}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expired" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expired Products</CardTitle>
              </CardHeader>
              <CardContent>{renderInventoryTable(filterByStatus("expired"))}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>Enter product details then save.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Barcode</Label>
              <div className="flex gap-2">
                <Input
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                />
                <Button variant="outline" size="icon">
                  <Scan className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unit Price *</Label>
              <Input
                type="number"
                step="0.01"
                value={productForm.unit_price}
                onChange={(e) => setProductForm({ ...productForm, unit_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cost Price</Label>
              <Input
                type="number"
                step="0.01"
                value={productForm.cost_price}
                onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={productForm.reorder_level}
                onChange={(e) => setProductForm({ ...productForm, reorder_level: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Input
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Inventory Stock</DialogTitle>
            <DialogDescription>Select a product and quantity to add stock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select
                value={inventoryForm.product_id}
                onValueChange={(value) => setInventoryForm({ ...inventoryForm, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No products available. Create a product first.
                    </div>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.sku && `(${product.sku})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                value={inventoryForm.quantity}
                onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={inventoryForm.status}
                onValueChange={(value) => setInventoryForm({ ...inventoryForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch Number</Label>
              <Input
                value={inventoryForm.batch_number}
                onChange={(e) => setInventoryForm({ ...inventoryForm, batch_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={inventoryForm.expiry_date}
                onChange={(e) => setInventoryForm({ ...inventoryForm, expiry_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={inventoryForm.notes}
                onChange={(e) => setInventoryForm({ ...inventoryForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInventoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveInventory}>Add Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}