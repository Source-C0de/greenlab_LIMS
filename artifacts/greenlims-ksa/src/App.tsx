import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Context
import { AppProvider } from "@/context/AppContext";

// Layout
import { AppLayout } from "@/components/layout/AppLayout";

// Auth Pages (No sidebar)
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import OtpVerify from "@/pages/otp-verify";

// App Pages
import Dashboard from "@/pages/dashboard";
import SamplesList from "@/pages/samples/index";
import SampleDetail from "@/pages/samples/[id]";
import WorkflowBoard from "@/pages/workflow";
import ClientsList from "@/pages/clients";
import ReportsList from "@/pages/reports/index";
import ReportDetail from "@/pages/reports/[id]";
import InventoryList from "@/pages/inventory";
import InvoicesList from "@/pages/invoices/index";
import InvoiceDetail from "@/pages/invoices/[id]";
import Analytics from "@/pages/analytics";
import AdminPanel from "@/pages/admin";
import ClientPortal from "@/pages/client-portal";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// High order component to wrap routes with the sidebar layout
function LayoutWrapper({ component: Component }: { component: any }) {
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth routes without sidebar */}
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/otp-verify" component={OtpVerify} />

      {/* App routes wrapped in layout */}
      <Route path="/dashboard"><LayoutWrapper component={Dashboard} /></Route>
      <Route path="/samples"><LayoutWrapper component={SamplesList} /></Route>
      <Route path="/samples/:id"><LayoutWrapper component={SampleDetail} /></Route>
      <Route path="/workflow"><LayoutWrapper component={WorkflowBoard} /></Route>
      <Route path="/clients"><LayoutWrapper component={ClientsList} /></Route>
      <Route path="/reports"><LayoutWrapper component={ReportsList} /></Route>
      <Route path="/reports/:id"><LayoutWrapper component={ReportDetail} /></Route>
      <Route path="/inventory"><LayoutWrapper component={InventoryList} /></Route>
      <Route path="/invoices"><LayoutWrapper component={InvoicesList} /></Route>
      <Route path="/invoices/:id"><LayoutWrapper component={InvoiceDetail} /></Route>
      <Route path="/analytics"><LayoutWrapper component={Analytics} /></Route>
      <Route path="/admin"><LayoutWrapper component={AdminPanel} /></Route>
      <Route path="/client-portal"><LayoutWrapper component={ClientPortal} /></Route>
      <Route path="/settings"><LayoutWrapper component={Settings} /></Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AppProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
