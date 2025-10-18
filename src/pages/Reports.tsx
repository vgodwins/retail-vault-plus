import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, TrendingUp, DollarSign, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Reports() {
  const [salesData, setSalesData] = useState({
    dailySales: [] as Array<{ date: string; total: number }>,
    topProducts: [] as Array<{ name: string; quantity: number; revenue: number }>,
    paymentMethods: [] as Array<{ method: string; count: number; total: number }>,
  });
  const [currencySymbol, setCurrencySymbol] = useState("$");

  useEffect(() => {
    fetchReportsData();
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

  const fetchReportsData = async () => {
    // Fetch last 7 days sales
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("created_at, total")
      .eq("status", "completed")
      .gte("created_at", sevenDaysAgo.toISOString());

    // Group by date
    const dailySales = transactions?.reduce((acc: any, txn) => {
      const date = new Date(txn.created_at).toLocaleDateString();
      if (!acc[date]) acc[date] = 0;
      acc[date] += Number(txn.total);
      return acc;
    }, {});

    // Fetch top products
    const { data: topProductsData } = await supabase
      .from("transaction_items")
      .select(`
        quantity,
        unit_price,
        products(name)
      `);

    const productStats = topProductsData?.reduce((acc: any, item: any) => {
      const name = item.products?.name || "Unknown";
      if (!acc[name]) acc[name] = { quantity: 0, revenue: 0 };
      acc[name].quantity += item.quantity;
      acc[name].revenue += item.quantity * Number(item.unit_price);
      return acc;
    }, {});

    const topProducts = Object.entries(productStats || {})
      .map(([name, stats]: [string, any]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Fetch payment methods
    const { data: paymentsData } = await supabase
      .from("transaction_payments")
      .select("payment_method, amount");

    const paymentStats = paymentsData?.reduce((acc: any, payment) => {
      const method = payment.payment_method;
      if (!acc[method]) acc[method] = { count: 0, total: 0 };
      acc[method].count += 1;
      acc[method].total += Number(payment.amount);
      return acc;
    }, {});

    const paymentMethods = Object.entries(paymentStats || {}).map(([method, stats]: [string, any]) => ({
      method,
      ...stats,
    }));

    setSalesData({
      dailySales: Object.entries(dailySales || {}).map(([date, total]) => ({
        date,
        total: total as number,
      })),
      topProducts,
      paymentMethods,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analysis</h1>
          <p className="text-muted-foreground">Business insights and analytics</p>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Sales Reports</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Reports</TabsTrigger>
            <TabsTrigger value="financial">Financial Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Daily Sales (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {salesData.dailySales.map((day, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{day.date}</span>
                        <span className="font-bold">{currencySymbol}{day.total.toFixed(2)}</span>
                      </div>
                    ))}
                    {salesData.dailySales.length === 0 && (
                      <p className="text-sm text-muted-foreground">No sales data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Top Selling Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {salesData.topProducts.map((product, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                        </div>
                        <span className="font-bold">{currencySymbol}{product.revenue.toFixed(2)}</span>
                      </div>
                    ))}
                    {salesData.topProducts.length === 0 && (
                      <p className="text-sm text-muted-foreground">No product data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesData.paymentMethods.map((pm, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{pm.method.replace("_", " ")}</p>
                        <p className="text-sm text-muted-foreground">{pm.count} transactions</p>
                      </div>
                      <span className="text-lg font-bold">{currencySymbol}{pm.total.toFixed(2)}</span>
                    </div>
                  ))}
                  {salesData.paymentMethods.length === 0 && (
                    <p className="text-sm text-muted-foreground">No payment data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Detailed inventory reports including stock levels, movements, and valuation will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Profit & loss statements, revenue trends, and expense analysis will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
