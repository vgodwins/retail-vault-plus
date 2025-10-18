import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Copy, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Voucher {
  id: string;
  code: string;
  description: string | null;
  value: number;
  is_percentage: boolean;
  min_purchase: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export default function Vouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    description: "",
    value: "",
    is_percentage: false,
    min_purchase: "0",
    max_uses: "",
    expires_at: "",
  });
  const [currencySymbol, setCurrencySymbol] = useState("$");

  useEffect(() => {
    fetchVouchers();
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

  const fetchVouchers = async () => {
    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVouchers(data);
    }
  };

  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setForm({ ...form, code });
  };

  const handleSave = async () => {
    try {
      if (!form.code.trim()) {
        toast.error("Voucher code is required");
        return;
      }

      if (!form.value || Number(form.value) <= 0) {
        toast.error("Discount value must be greater than 0");
        return;
      }

      if (form.is_percentage && Number(form.value) > 100) {
        toast.error("Percentage discount cannot exceed 100%");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const voucherData = {
        code: form.code.toUpperCase(),
        description: form.description || null,
        value: Number(form.value),
        is_percentage: form.is_percentage,
        min_purchase: Number(form.min_purchase),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        created_by: user.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("vouchers")
          .update(voucherData)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Voucher updated successfully");
      } else {
        const { error } = await supabase.from("vouchers").insert(voucherData);
        if (error) throw error;
        toast.success("Voucher created successfully");
      }

      setShowDialog(false);
      setEditingId(null);
      setForm({
        code: "",
        description: "",
        value: "",
        is_percentage: false,
        min_purchase: "0",
        max_uses: "",
        expires_at: "",
      });
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("vouchers")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Voucher ${!currentStatus ? "activated" : "deactivated"}`);
      fetchVouchers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this voucher?")) return;

    const { error } = await supabase.from("vouchers").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Voucher deleted");
      fetchVouchers();
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Voucher code copied to clipboard");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Voucher Management</h1>
            <p className="text-muted-foreground">Create and manage discount vouchers</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Voucher
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Vouchers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Purchase</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No vouchers created
                    </TableCell>
                  </TableRow>
                ) : (
                  vouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-mono font-bold">
                        {voucher.code}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-2 h-6 w-6"
                          onClick={() => copyToClipboard(voucher.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TableCell>
                      <TableCell>{voucher.description || "-"}</TableCell>
                      <TableCell className="font-medium">
                        {voucher.is_percentage
                          ? `${voucher.value}%`
                          : `${currencySymbol}${Number(voucher.value).toFixed(2)}`}
                      </TableCell>
                      <TableCell>{currencySymbol}{Number(voucher.min_purchase).toFixed(2)}</TableCell>
                      <TableCell>
                        {voucher.uses_count}
                        {voucher.max_uses ? ` / ${voucher.max_uses}` : " / ∞"}
                      </TableCell>
                      <TableCell>
                        {voucher.expires_at
                          ? new Date(voucher.expires_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={voucher.is_active ? "default" : "secondary"}>
                          {voucher.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Switch
                            checked={voucher.is_active}
                            onCheckedChange={() => handleToggleActive(voucher.id, voucher.is_active)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(voucher.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Voucher" : "Create Voucher"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Voucher Code *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                />
                <Button variant="secondary" onClick={generateCode}>
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="20% off all items"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.is_percentage}
                onCheckedChange={(checked) => setForm({ ...form, is_percentage: checked })}
              />
              <Label>Percentage Discount</Label>
            </div>
            <div className="space-y-2">
              <Label>Discount Value *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.is_percentage ? "20" : "10.00"}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Purchase</Label>
              <Input
                type="number"
                step="0.01"
                value={form.min_purchase}
                onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Uses (leave empty for unlimited)</Label>
              <Input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date (leave empty for no expiry)</Label>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Update Voucher" : "Create Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
