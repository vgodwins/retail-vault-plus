import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, RotateCcw, XCircle } from "lucide-react";

export default function Inventory() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">Track and manage your stock levels</p>
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
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Products in good condition and ready for sale will appear here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Returned Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Products returned by customers will be listed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="damaged" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Damaged Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Items with damage or defects will be tracked here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expired" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expired Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Products past their expiration date will be shown here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}