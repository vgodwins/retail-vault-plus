import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Expenditure {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  payment_method: string;
  notes: string | null;
  receipt_url: string | null;
}

export default function Expenditures() {
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    notes: "",
  });
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState("$");

  useEffect(() => {
    fetchExpenditures();
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

  const fetchExpenditures = async () => {
    const { data, error } = await supabase
      .from("expenditures")
      .select("*")
      .order("date", { ascending: false });

    if (!error && data) {
      setExpenditures(data);
      const total = data.reduce((sum, exp) => sum + Number(exp.amount), 0);
      setTotalExpenses(total);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Authorization: only admins and managers can add expenditures
      const [{ data: isAdmin }, { data: isManager }] = await Promise.all([
        supabase.rpc('has_role', { user_id: user.id, check_role: 'admin' }),
        supabase.rpc('has_role', { user_id: user.id, check_role: 'manager' }),
      ]);
      if (!isAdmin && !isManager) {
        toast.error("You don't have permission to add expenditures.");
        return;
      }

      const { error } = await supabase.from("expenditures").insert({
        description: form.description,
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        payment_method: form.payment_method as any,
        notes: form.notes || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Expenditure added successfully");
      setShowDialog(false);
      setForm({
        description: "",
        category: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        payment_method: "cash",
        notes: "",
      });
      fetchExpenditures();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expenditure?")) return;

    const { error } = await supabase.from("expenditures").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Expenditure deleted");
      fetchExpenditures();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenditure Management</h1>
            <p className="text-muted-foreground">Track business expenses</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expenditure
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{currencySymbol}{totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time expenditures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenditure History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenditures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No expenditures recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  expenditures.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell>{new Date(exp.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell>{exp.category}</TableCell>
                      <TableCell className="capitalize">{exp.payment_method.replace("_", " ")}</TableCell>
                      <TableCell className="font-bold text-destructive">
                        {currencySymbol}{Number(exp.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm">{exp.notes || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
            <DialogTitle>Add Expenditure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g., Office supplies"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g., Office, Utilities, Salary"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={form.payment_method}
                onValueChange={(value) => setForm({ ...form, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Expenditure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
