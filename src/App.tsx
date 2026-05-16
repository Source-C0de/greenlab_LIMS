import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Context
import { AppProvider } from "@/context/AppContext";
import { NotificationProvider } from "@/context/NotificationContext";

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
import AccountingDashboard from "@/pages/accounting/dashboard";
import AccountingJournals from "@/pages/accounting/journals";
import AccountingLedger from "@/pages/accounting/ledger";
import AccountingReports from "@/pages/accounting/reports";
import ChartOfAccounts from "@/pages/accounting/chart-of-accounts";
import SpecificationList from "@/pages/specifications/index";
import NewSpecification from "@/pages/specifications/new";
import ParameterLibrary from "@/pages/specifications/library";
import ApprovalQueue from "@/pages/specifications/approval";
import VersionHistory from "@/pages/specifications/history";
import TestMasterPage from "@/pages/specifications/test-master";
import SampleReceiving from "@/pages/samples/receiving";
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
      <Route path="/samples/receiving"><LayoutWrapper component={SampleReceiving} /></Route>
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

      {/* Accounting Routes */}
      <Route path="/accounting/dashboard"><LayoutWrapper component={AccountingDashboard} /></Route>
      <Route path="/accounting/journals"><LayoutWrapper component={AccountingJournals} /></Route>
      <Route path="/accounting/ledger"><LayoutWrapper component={AccountingLedger} /></Route>
      <Route path="/accounting/reports"><LayoutWrapper component={AccountingReports} /></Route>
      <Route path="/accounting/chart-of-accounts"><LayoutWrapper component={ChartOfAccounts} /></Route>

      {/* Specification Routes */}
      <Route path="/specifications"><LayoutWrapper component={SpecificationList} /></Route>
      <Route path="/specifications/new"><LayoutWrapper component={NewSpecification} /></Route>
      <Route path="/specifications/library"><LayoutWrapper component={ParameterLibrary} /></Route>
      <Route path="/specifications/approval"><LayoutWrapper component={ApprovalQueue} /></Route>
      <Route path="/specifications/history"><LayoutWrapper component={VersionHistory} /></Route>
      <Route path="/specifications/test-master"><LayoutWrapper component={TestMasterPage} /></Route>

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
          <NotificationProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </NotificationProvider>
        </AppProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
