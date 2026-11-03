import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FlaskConical,
  GitCommit,
  Users,
  FileText,
  Package,
  Receipt,
  BarChart3,
  Settings,
  ShieldCheck,
  Building2,
  FolderKanban,
  Calculator,
  ClipboardCheck,
  ClipboardList,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { useAppContext, type Role } from "@/presentation/providers/AppContext";
import { useAuth } from "@/presentation/providers/AuthContext";
import { useRolePermissions } from "@/presentation/hooks/useRolePermissions";
import { useEffectiveMenuVisibility } from "@/presentation/hooks/useEffectiveMenuVisibility";
import { isApiEnabled } from "@/infrastructure/api/api";
import type { MenuKey } from "@/infrastructure/mock/data/menuPermissions";
import type { ToggleableRole } from "@/infrastructure/mock/data/rolePermissions";

interface NavChild {
  href: string;
  labelEn: string;
  labelAr: string;
  key: MenuKey;
}

interface NavItem {
  href: string;
  labelEn: string;
  labelAr: string;
  icon: LucideIcon;
  /**
   * The roles this item belongs to by default.
   *
   * This is a DEFAULT, not a ceiling. An item is a candidate for a role
   * when the role is listed here **or** when the role × menu matrix
   * enables its key — so an admin can grant a menu to a role that did not
   * have it by default. The matrix is what actually decides; see
   * `useEffectiveMenuVisibility`.
   */
  roles: string[];
  key: MenuKey;
  children?: NavChild[];
}

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  // `location` reads the current path for active-link styling. We no
  // longer need `setLocation` here — logout moved to the header dropdown.
  const [location] = useLocation();
  const { currentRole, language } = useAppContext();
  // `user` is still read here for per-user menu overrides; `logout`
  // moved out with the footer (see `Header.tsx`).
  const { user } = useAuth();
  const rolePerms = useRolePermissions();
  const isRtl = language === "ar";

  // If a non-superadmin role was disabled by superadmin, fall back to "admin"
  // so the sidebar stays usable (the dropdown already hides the disabled role).
  //
  // In API mode this fallback is a FICTION and is deliberately skipped: the
  // server resolves the menu set from the user's REAL role
  // (`GET /auth/me/menus`), so rendering an "admin" sidebar to a disabled
  // analyst would show menus the server never granted. The role toggle is
  // a mock-mode affordance; in API mode the signed-in user's role is the
  // only one that exists.
  const effectiveRole: Role =
    currentRole === "superadmin" ||
    rolePerms.isEnabled(currentRole as ToggleableRole)
      ? currentRole
      : isApiEnabled()
        ? currentRole
        : "admin";
  const isSuperadmin = effectiveRole === "superadmin";

  // The role is passed in so the role × menu matrix is read from the
  // server in API mode — without it, a menu assignment made on another
  // device would never reach this sidebar.
  const visibility = useEffectiveMenuVisibility(effectiveRole);

  const getNavItems = (): NavItem[] => {
    // Superadmin gets a minimal sidebar (SaaS Admin + Settings). The
    // `isEnabled` filter is bypassed for superadmin so they can preview what
    // the configured sidebar looks like for every other role.
    if (isSuperadmin) {
      return [
        { href: "/admin", labelEn: "SaaS Admin", labelAr: "إدارة النظام", icon: ShieldCheck, roles: ["superadmin"], key: "saas_admin" },
        { href: "/admin/users", labelEn: "Users", labelAr: "المستخدمون", icon: UserCog, roles: ["superadmin"], key: "saas_admin" },
        { href: "/admin/roles", labelEn: "Role Permissions", labelAr: "صلاحيات الأدوار", icon: ShieldCheck, roles: ["superadmin"], key: "saas_admin" },
        { href: "/settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings, roles: ["superadmin"], key: "settings" },
      ];
    }

    const items: NavItem[] = [];

    // Dashboard - only for roles that need the general operational dashboard.
    items.push({
      href: "/dashboard",
      labelEn: "Dashboard",
      labelAr: "لوحة القيادة",
      icon: LayoutDashboard,
      roles: ["admin", "lab_manager", "analyst", "receptionist"],
      key: "dashboard",
      children: [
        { href: "/dashboard/marketing", labelEn: "Marketing Reports", labelAr: "تقارير التسويق", key: "marketing_reports" },
      ],
    });

    // Client Portal items.
    items.push(
      { href: "/client-portal", labelEn: "My Portal", labelAr: "بوابتي", icon: Building2, roles: ["client"], key: "client_portal" },
      { href: "/samples", labelEn: "My Samples", labelAr: "عيناتي", icon: FlaskConical, roles: ["client"], key: "my_samples" },
      { href: "/reports", labelEn: "My Reports", labelAr: "تقاريري", icon: FileText, roles: ["client"], key: "my_reports" },
      { href: "/invoices", labelEn: "My Invoices", labelAr: "فواتيري", icon: Receipt, roles: ["client"], key: "my_invoices" }
    );

    // Accounting items.
    items.push(
      { href: "/accounting/dashboard", labelEn: "Finance Dashboard", labelAr: "اللوحة المالية", icon: LayoutDashboard, roles: ["accountant", "admin"], key: "accounting_dashboard" },
      { href: "/accounting/journals", labelEn: "General Journal", labelAr: "القيود اليومية", icon: FileText, roles: ["accountant"], key: "accounting_journals" },
      { href: "/accounting/ledger", labelEn: "General Ledger", labelAr: "الأستاذ العام", icon: GitCommit, roles: ["accountant"], key: "accounting_ledger" },
      { href: "/accounting/reports", labelEn: "Financial Reports", labelAr: "التقارير المالية", icon: BarChart3, roles: ["accountant"], key: "accounting_reports" },
      { href: "/accounting/chart-of-accounts", labelEn: "Accounts Tree", labelAr: "شجرة الحسابات", icon: Calculator, roles: ["accountant"], key: "chart_of_accounts" }
    );

    // Laboratory items.
    items.push(
      { href: "/samples", labelEn: "Samples", labelAr: "العينات", icon: FlaskConical, roles: ["admin", "lab_manager", "analyst"], key: "samples",
        children: [
          { href: "/samples", labelEn: "Samples List", labelAr: "قائمة العينات", key: "samples" },
          { href: "/samples/receiving", labelEn: "Sample Receiving", labelAr: "استلام العينات", key: "samples_receiving" },
        ] },
      { href: "/samples/receiving", labelEn: "Sample Receiving", labelAr: "استلام العينات", icon: FlaskConical, roles: ["receptionist"], key: "samples_receiving" },
      { href: "/workflow", labelEn: "Workflow", labelAr: "سير العمل", icon: FolderKanban, roles: ["admin", "lab_manager", "analyst"], key: "workflow" },
      { href: "/quotations", labelEn: "Quotations", labelAr: "عروض الأسعار", icon: FileText, roles: ["admin", "lab_manager"], key: "quotations" },
      { href: "/client-requests", labelEn: "Client Requests", labelAr: "طلبات العملاء", icon: ClipboardList, roles: ["admin", "lab_manager", "receptionist"], key: "client_requests" },
      { href: "/technical-evaluation", labelEn: "Technical Evaluation", labelAr: "التقييم الفني", icon: ClipboardCheck, roles: ["admin", "lab_manager"], key: "technical_evaluation" },
      { href: "/clients", labelEn: "Clients", labelAr: "العملاء", icon: Users, roles: ["admin", "lab_manager", "receptionist"], key: "clients" },
      { href: "/reports", labelEn: "Reports", labelAr: "التقارير", icon: FileText, roles: ["admin", "lab_manager", "analyst", "receptionist"], key: "reports" },
      { href: "/inventory", labelEn: "Inventory", labelAr: "المخزون", icon: Package, roles: ["admin", "lab_manager", "receptionist"], key: "inventory" },
      { href: "/analytics", labelEn: "Analytics", labelAr: "التحليلات", icon: BarChart3, roles: ["admin", "lab_manager"], key: "analytics" },
      { href: "/approvals", labelEn: "Test Approvals", labelAr: "اعتماد الاختبارات", icon: ClipboardCheck, roles: ["admin", "lab_manager"], key: "test_approvals" },
      { href: "/approvals/my-submissions", labelEn: "My Submissions", labelAr: "طلباتي", icon: ClipboardCheck, roles: ["admin", "lab_manager", "analyst"], key: "my_submissions" }
    );

    // Billing — shared by admin and accountant. The label comes from
    // `MENU_REGISTRY` so both the sidebar and the "Assign Menus" modal
    // show the same name for the same key.
    items.push(
      { href: "/invoices", labelEn: "Billing", labelAr: "الفوترة", icon: Receipt, roles: ["admin", "accountant"], key: "billing" }
    );

    // Administration.
    items.push(
      { href: "/admin", labelEn: "SaaS Admin", labelAr: "إدارة النظام", icon: ShieldCheck, roles: ["admin"], key: "saas_admin" },
      { href: "/admin/users", labelEn: "Users", labelAr: "المستخدمون", icon: UserCog, roles: ["admin"], key: "saas_admin" },
      { href: "/admin/roles", labelEn: "Role Permissions", labelAr: "صلاحيات الأدوار", icon: ShieldCheck, roles: ["admin"], key: "saas_admin" }
    );

    // Specifications.
    items.push({
      href: "/specifications",
      labelEn: "Specifications",
      labelAr: "المواصفات",
      icon: GitCommit,
      roles: ["admin", "lab_manager"],
      key: "specifications",
      children: [
        { href: "/specifications", labelEn: "Specification List", labelAr: "قائمة المواصفات", key: "specifications" },
        { href: "/specifications/library", labelEn: "Test Parameters", labelAr: "معلمات الاختبار", key: "specifications_library" },
        { href: "/specifications/test-master", labelEn: "Test List", labelAr: "سجل الاختبارات", key: "specifications_tests" },
        { href: "/specifications/test-parameters", labelEn: "Test Parameter Catalogue", labelAr: "كتالوج معلمات الاختبار", key: "specifications_test_parameters" },
        { href: "/specifications/approval", labelEn: "Approval Queue", labelAr: "قائمة الاعتماد", key: "specifications_approval" },
        { href: "/specifications/history", labelEn: "Version History", labelAr: "سجل الإصدارات", key: "specifications_history" },
      ]
    });

    items.push({ href: "/settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings, roles: ["admin", "lab_manager", "analyst", "client", "accountant"], key: "settings" });

    // Step 1: candidate filter.
    //
    // An item is a candidate when the role is in its default `roles` list
    // OR when the permission layers enable its key. The second clause is
    // what lets an admin GRANT a menu to a role that did not have it by
    // default — the old code hard-filtered on `roles` alone, so the
    // matrix could only ever subtract.
    //
    // The user id is passed here too: a per-user "grant" must be able to
    // pull an item in, or the final filter below would never see it.
    const candidates = items.filter(
      (item) =>
        item.roles.includes(effectiveRole) ||
        visibility.isEnabled(item.key, effectiveRole, user?.id),
    );

    // Step 2: composited visibility filter — global kill-switch + role
    // default + per-user override. `useEffectiveMenuVisibility` already
    // returns a fresh closure on every change, so this re-runs whenever
    // any of the three stores mutate.
    // (superadmin is bypassed above by returning early)
    return candidates
      .filter((item) => visibility.isEnabled(item.key, effectiveRole, user?.id))
      .map((item) => {
        if (!item.children) return item;
        const filteredChildren = item.children.filter(
          (child) => visibility.isEnabled(child.key, effectiveRole, user?.id)
        );
        return { ...item, children: filteredChildren.length > 0 ? filteredChildren : undefined };
      });
  };

  const navItems = getNavItems();

  return (
    <aside className={`
      fixed md:sticky top-0 z-40 h-screen w-64 bg-sidebar border-border
      transition-transform duration-300 ease-in-out flex flex-col
      ${isOpen ? 'translate-x-0' : isRtl ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0'}
      ${isRtl ? 'border-l' : 'border-r'}
    `}>
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground">
        <FlaskConical className="h-6 w-6 mr-2 rtl:ml-2 rtl:mr-0" />
        <span className="font-bold text-lg tracking-tight">GreenLabLIMS <span className="font-light opacity-80">KSA</span></span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <div key={item.href} className="space-y-1">
                <Link
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isRtl ? 'ml-3' : 'mr-3'} ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {isRtl ? item.labelAr : item.labelEn}
                </Link>

                {item.children && (isActive || location.startsWith(item.href)) && (
                  <div className={`${isRtl ? 'mr-8' : 'ml-8'} space-y-1 mt-1 border-l border-sidebar-border pl-2 rtl:pr-2 rtl:border-r rtl:border-l-0`}>
                    {item.children
                      .map((child: NavChild) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`
                            block px-3 py-2 text-xs font-medium rounded-md transition-colors
                            ${location === child.href
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }
                          `}
                        >
                          {isRtl ? child.labelAr : child.labelEn}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}