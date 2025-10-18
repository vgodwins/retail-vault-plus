import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    todaySales: 0,
    lowStock: 0,
  });
  const [currencySymbol, setCurrencySymbol] = useState("$");

  useEffect(() => {
    fetchStats();
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

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get total products
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get today's sales total
      const { data: todayTransactions } = await supabase
        .from("transactions")
        .select("total")
        .eq("status", "completed")
        .gte("created_at", today);

      const todayTotal = todayTransactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;

      // Get all time sales
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("total")
        .eq("status", "completed");

      const allTimeTotal = allTransactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;

      // Get low stock products
      const { data: inventoryData } = await supabase
        .from("inventory")
        .select("product_id, quantity, products(reorder_level)")
        .eq("status", "valid");

      const lowStockCount = inventoryData?.filter((item: any) => 
        item.quantity <= (item.products?.reorder_level || 10)
      ).length || 0;

      setStats({
        totalSales: allTimeTotal,
        totalProducts: productsCount || 0,
        todaySales: todayTotal,
        lowStock: lowStockCount,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your retail operations</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencySymbol}{stats.totalSales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All time revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencySymbol}{stats.todaySales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Revenue today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Active products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <ShoppingCart className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStock}</div>
              <p className="text-xs text-muted-foreground">Need restocking</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Recent transactions and inventory updates will appear here
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Quick access to frequently used features
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}