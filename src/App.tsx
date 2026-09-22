import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Context
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";

// Layout
import { AppLayout } from "@/components/layout/AppLayout";

// Auth
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth Pages (No sidebar)
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import OtpVerify from "@/pages/otp-verify";
import SuperadminLogin from "@/pages/superadmin-login";

// App Pages
import Dashboard from "@/pages/dashboard";
import MarketingReportsPage from "@/pages/dashboard/marketing";
import SamplesList from "@/pages/samples/index";
import SampleDetail from "@/pages/samples/[id]";
import SampleReportPage from "@/pages/samples/report";
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
import ApprovalsQueue from "@/pages/approvals/queue";
import MySubmissions from "@/pages/approvals/my-submissions";
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
  const { isAuthenticated, isLoading } = useAuth();

  // While bootstrap is in flight, render nothing on `/` to avoid flashing
  // /login for an already-logged-in user. Once known, redirect to the right
  // landing page. Only ONE <Redirect> renders per render — never outside
  // the Switch as a sibling, which used to cause a duplicate navigate on
  // every auth-state change.
  const rootRedirect =
    isLoading ? null : isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />;

  return (
    <Switch>
      {/* Auth routes without sidebar */}
      <Route path="/" component={() => rootRedirect ?? <Redirect to="/login" />} />
      <Route path="/login" component={Login} />
      <Route path="/superadmin" component={SuperadminLogin} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/otp-verify" component={OtpVerify} />

      {/* App routes wrapped in layout + protected. The `roles` prop is
          intentionally loose in mock mode — ProtectedRoute short-circuits
          there. In API mode the user is loaded from /me before render. */}
      <Route path="/dashboard"><ProtectedRoute><LayoutWrapper component={Dashboard} /></ProtectedRoute></Route>
      <Route path="/dashboard/marketing"><ProtectedRoute><LayoutWrapper component={MarketingReportsPage} /></ProtectedRoute></Route>
      <Route path="/samples"><ProtectedRoute><LayoutWrapper component={SamplesList} /></ProtectedRoute></Route>
      <Route path="/samples/receiving"><ProtectedRoute><LayoutWrapper component={SampleReceiving} /></ProtectedRoute></Route>
      {/*
        Sample IDs contain slashes (e.g. "FD/2024/0001") so wouter's `:id`
        (single-segment matcher) can't capture them. Use a splat (*) and
        let the page read the full id from `useParams()["*"]`.
      */}
      <Route path="/samples/*/report"><ProtectedRoute><LayoutWrapper component={SampleReportPage} /></ProtectedRoute></Route>
      <Route path="/samples/*"><ProtectedRoute><LayoutWrapper component={SampleDetail} /></ProtectedRoute></Route>
      <Route path="/workflow"><ProtectedRoute><LayoutWrapper component={WorkflowBoard} /></ProtectedRoute></Route>
      <Route path="/clients"><ProtectedRoute><LayoutWrapper component={ClientsList} /></ProtectedRoute></Route>
      <Route path="/reports"><ProtectedRoute><LayoutWrapper component={ReportsList} /></ProtectedRoute></Route>
      <Route path="/reports/:id"><ProtectedRoute><LayoutWrapper component={ReportDetail} /></ProtectedRoute></Route>
      <Route path="/inventory"><ProtectedRoute><LayoutWrapper component={InventoryList} /></ProtectedRoute></Route>
      <Route path="/invoices"><ProtectedRoute><LayoutWrapper component={InvoicesList} /></ProtectedRoute></Route>
      <Route path="/invoices/:id"><ProtectedRoute><LayoutWrapper component={InvoiceDetail} /></ProtectedRoute></Route>
      <Route path="/analytics"><ProtectedRoute><LayoutWrapper component={Analytics} /></ProtectedRoute></Route>
      <Route path="/admin"><ProtectedRoute roles={["admin", "superadmin"]}><LayoutWrapper component={AdminPanel} /></ProtectedRoute></Route>
      <Route path="/client-portal"><ProtectedRoute roles={["client"]}><LayoutWrapper component={ClientPortal} /></ProtectedRoute></Route>
      <Route path="/settings"><ProtectedRoute><LayoutWrapper component={Settings} /></ProtectedRoute></Route>

      {/* Accounting Routes */}
      <Route path="/accounting/dashboard"><ProtectedRoute roles={["admin", "accountant"]}><LayoutWrapper component={AccountingDashboard} /></ProtectedRoute></Route>
      <Route path="/accounting/journals"><ProtectedRoute roles={["admin", "accountant"]}><LayoutWrapper component={AccountingJournals} /></ProtectedRoute></Route>
      <Route path="/accounting/ledger"><ProtectedRoute roles={["admin", "accountant"]}><LayoutWrapper component={AccountingLedger} /></ProtectedRoute></Route>
      <Route path="/accounting/reports"><ProtectedRoute roles={["admin", "accountant"]}><LayoutWrapper component={AccountingReports} /></ProtectedRoute></Route>
      <Route path="/accounting/chart-of-accounts"><ProtectedRoute roles={["admin", "accountant"]}><LayoutWrapper component={ChartOfAccounts} /></ProtectedRoute></Route>

      {/* Specification Routes */}
      <Route path="/specifications"><ProtectedRoute><LayoutWrapper component={SpecificationList} /></ProtectedRoute></Route>
      <Route path="/specifications/new"><ProtectedRoute><LayoutWrapper component={NewSpecification} /></ProtectedRoute></Route>
      <Route path="/specifications/library"><ProtectedRoute><LayoutWrapper component={ParameterLibrary} /></ProtectedRoute></Route>
      <Route path="/specifications/approval"><ProtectedRoute><LayoutWrapper component={ApprovalQueue} /></ProtectedRoute></Route>
      <Route path="/specifications/history"><ProtectedRoute><LayoutWrapper component={VersionHistory} /></ProtectedRoute></Route>
      <Route path="/specifications/test-master"><ProtectedRoute><LayoutWrapper component={TestMasterPage} /></ProtectedRoute></Route>

      {/* Approval Routes */}
      <Route path="/approvals"><ProtectedRoute><LayoutWrapper component={ApprovalsQueue} /></ProtectedRoute></Route>
      <Route path="/approvals/my-submissions"><ProtectedRoute><LayoutWrapper component={MySubmissions} /></ProtectedRoute></Route>

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
              <AuthProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <Toaster />
              </AuthProvider>
            </TooltipProvider>
          </NotificationProvider>
        </AppProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
