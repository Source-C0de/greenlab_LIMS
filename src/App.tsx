import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/shared/ui/toaster";
import { TooltipProvider } from "@/shared/ui/tooltip";

// Context
import { AppProvider } from "@/presentation/providers/AppContext";
import { AuthProvider, useAuth } from "@/presentation/providers/AuthContext";
import { NotificationProvider } from "@/presentation/providers/NotificationContext";

// Layout
import { AppLayout } from "@/presentation/components/layout/AppLayout";

// Auth
import { ProtectedRoute } from "@/presentation/components/auth/ProtectedRoute";

// Auth Pages (No sidebar)
import Login from "@/presentation/pages/login";
import Register from "@/presentation/pages/register";
import ForgotPassword from "@/presentation/pages/forgot-password";
import OtpVerify from "@/presentation/pages/otp-verify";
import SuperadminLogin from "@/presentation/pages/superadmin-login";

// App Pages
import Dashboard from "@/presentation/pages/dashboard";
import MarketingReportsPage from "@/presentation/pages/dashboard/marketing";
import SamplesList from "@/presentation/pages/samples/index";
import SampleDetail from "@/presentation/pages/samples/[id]";
import SampleReportPage from "@/presentation/pages/samples/report";
import WorkflowBoard from "@/presentation/pages/workflow";
import ClientsList from "@/presentation/pages/clients";
import ReportsList from "@/presentation/pages/reports/index";
import ReportDetail from "@/presentation/pages/reports/[id]";
import InventoryList from "@/presentation/pages/inventory";
import InvoicesList from "@/presentation/pages/invoices/index";
import InvoiceDetail from "@/presentation/pages/invoices/[id]";
import Analytics from "@/presentation/pages/analytics";
import AdminPanel from "@/presentation/pages/admin";
import UsersAdmin from "@/presentation/pages/admin/users";
import RolesAdmin from "@/presentation/pages/admin/roles";
import UserDetail from "@/presentation/pages/admin/users/[id]";
import ClientPortal from "@/presentation/pages/client-portal";
import Settings from "@/presentation/pages/settings";
import AccountingDashboard from "@/presentation/pages/accounting/dashboard";
import AccountingJournals from "@/presentation/pages/accounting/journals";
import AccountingLedger from "@/presentation/pages/accounting/ledger";
import AccountingReports from "@/presentation/pages/accounting/reports";
import ChartOfAccounts from "@/presentation/pages/accounting/chart-of-accounts";
import QuotationsList from "@/presentation/pages/quotations/index";
import NewQuotation from "@/presentation/pages/quotations/new";
import QuotationDetail from "@/presentation/pages/quotations/[id]";
import SpecificationList from "@/presentation/pages/specifications/index";
import NewSpecification from "@/presentation/pages/specifications/new";
import ParameterLibrary from "@/presentation/pages/specifications/library";
import ApprovalQueue from "@/presentation/pages/specifications/approval";
import VersionHistory from "@/presentation/pages/specifications/history";
import TestMasterPage from "@/presentation/pages/specifications/test-master";
import TestParameterCatalogue from "@/presentation/pages/specifications/test-parameters";
import SampleReceiving from "@/presentation/pages/samples/receiving";
import ApprovalsQueue from "@/presentation/pages/approvals/queue";
import MySubmissions from "@/presentation/pages/approvals/my-submissions";
import ClientRequestsList from "@/presentation/pages/client-requests/index";
import NewClientRequest from "@/presentation/pages/client-requests/new";
import ClientRequestDetail from "@/presentation/pages/client-requests/[id]";
import TechnicalEvaluationList from "@/presentation/pages/technical-evaluation/index";
import TechnicalEvaluationDetail from "@/presentation/pages/technical-evaluation/[id]";
import NotFound from "@/presentation/pages/not-found";

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

      {/* Quotation Routes — admin + lab_manager (BDM role reuses lab_manager). */}
      <Route path="/quotations"><ProtectedRoute roles={["admin","lab_manager"]}><LayoutWrapper component={QuotationsList} /></ProtectedRoute></Route>
      <Route path="/quotations/new"><ProtectedRoute roles={["admin","lab_manager"]}><LayoutWrapper component={NewQuotation} /></ProtectedRoute></Route>
      <Route path="/quotations/:id"><ProtectedRoute roles={["admin","lab_manager"]}><LayoutWrapper component={QuotationDetail} /></ProtectedRoute></Route>
      <Route path="/analytics"><ProtectedRoute><LayoutWrapper component={Analytics} /></ProtectedRoute></Route>
      <Route path="/admin"><ProtectedRoute roles={["admin", "superadmin"]}><LayoutWrapper component={AdminPanel} /></ProtectedRoute></Route>
      <Route path="/admin/users"><ProtectedRoute roles={["admin", "superadmin"]}><LayoutWrapper component={UsersAdmin} /></ProtectedRoute></Route>
      <Route path="/admin/users/:id"><ProtectedRoute roles={["admin", "superadmin"]}><LayoutWrapper component={UserDetail} /></ProtectedRoute></Route>
      <Route path="/admin/roles"><ProtectedRoute roles={["admin", "superadmin"]}><LayoutWrapper component={RolesAdmin} /></ProtectedRoute></Route>
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
      <Route path="/specifications/test-parameters"><ProtectedRoute><LayoutWrapper component={TestParameterCatalogue} /></ProtectedRoute></Route>

      {/* Approval Routes */}
      <Route path="/approvals"><ProtectedRoute><LayoutWrapper component={ApprovalsQueue} /></ProtectedRoute></Route>
      <Route path="/approvals/my-submissions"><ProtectedRoute><LayoutWrapper component={MySubmissions} /></ProtectedRoute></Route>

      {/* Pre-sample pipeline: Client Requests + Technical Evaluation.
          Splats handle the slash-bearing ids if we add them later. */}
      <Route path="/client-requests"><ProtectedRoute roles={["admin", "lab_manager", "receptionist"]}><LayoutWrapper component={ClientRequestsList} /></ProtectedRoute></Route>
      <Route path="/client-requests/new"><ProtectedRoute roles={["admin", "lab_manager", "receptionist"]}><LayoutWrapper component={NewClientRequest} /></ProtectedRoute></Route>
      <Route path="/client-requests/*"><ProtectedRoute roles={["admin", "lab_manager", "receptionist"]}><LayoutWrapper component={ClientRequestDetail} /></ProtectedRoute></Route>
      <Route path="/technical-evaluation"><ProtectedRoute roles={["admin", "lab_manager"]}><LayoutWrapper component={TechnicalEvaluationList} /></ProtectedRoute></Route>
      <Route path="/technical-evaluation/*"><ProtectedRoute roles={["admin", "lab_manager"]}><LayoutWrapper component={TechnicalEvaluationDetail} /></ProtectedRoute></Route>

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
