import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface NotImplementedProps {
  title: string;
  description: string;
}

export default function NotImplemented({ title, description }: NotImplementedProps) {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Construction className="h-5 w-5" />
              Under Development
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This feature is coming soon. The foundation has been laid and will be fully
              implemented in the next iteration.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}