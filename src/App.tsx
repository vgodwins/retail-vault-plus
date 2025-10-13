import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Settings from "./pages/Settings";
import NotImplemented from "./pages/NotImplemented";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/sales"
            element={<NotImplemented title="Sales Management" description="View and manage your sales history" />}
          />
          <Route
            path="/expenditures"
            element={<NotImplemented title="Expenditure Management" description="Track business expenses" />}
          />
          <Route
            path="/vouchers"
            element={<NotImplemented title="Voucher Management" description="Create and manage discount vouchers" />}
          />
          <Route
            path="/users"
            element={<NotImplemented title="User Management" description="Manage staff and access roles" />}
          />
          <Route
            path="/invoices"
            element={<NotImplemented title="Invoices" description="Generate and track invoices" />}
          />
          <Route
            path="/reports"
            element={<NotImplemented title="Reports & Analysis" description="Business insights and analytics" />}
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;