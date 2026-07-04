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
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAppContext, type Role } from "@/context/AppContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import type { MenuKey } from "@/mock-data/menuPermissions";
import type { ToggleableRole } from "@/mock-data/rolePermissions";

interface NavChild {
  href: string;
  labelEn: string;
  labelAr: string;
  key: MenuKey;
  roles?: string[];
}

interface NavItem {
  href: string;
  labelEn: string;
  labelAr: string;
  icon: LucideIcon;
  roles: string[];
  key: MenuKey;
  children?: NavChild[];
}

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { currentRole, language } = useAppContext();
  const menuPerms = useMenuPermissions();
  const rolePerms = useRolePermissions();
  const isRtl = language === "ar";

  // If a non-superadmin role was disabled by superadmin, fall back to "admin"
  // so the sidebar stays usable (the dropdown already hides the disabled role).
  const effectiveRole: Role =
    currentRole === "superadmin" || rolePerms.isEnabled(currentRole as ToggleableRole)
      ? currentRole
      : "admin";
  const isSuperadmin = effectiveRole === "superadmin";

  const handleLogout = () => {
    // Clear any session/state if needed
    setLocation("/login");
  };

  const getNavItems = (): NavItem[] => {
    // Superadmin gets a minimal sidebar (SaaS Admin + Settings). The
    // `isEnabled` filter is bypassed for superadmin so they can preview what
    // the configured sidebar looks like for every other role.
    if (isSuperadmin) {
      return [
        { href: "/admin", labelEn: "SaaS Admin", labelAr: "إدارة النظام", icon: ShieldCheck, roles: ["superadmin"], key: "saas_admin" },
        { href: "/settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings, roles: ["superadmin"], key: "settings" },
      ];
    }

    const items: NavItem[] = [];

    // Dashboard - Only for roles that need the general operational dashboard
    if (["admin", "lab_manager", "analyst", "receptionist"].includes(effectiveRole)) {
      items.push({ href: "/dashboard", labelEn: "Dashboard", labelAr: "لوحة القيادة", icon: LayoutDashboard, roles: ["admin", "lab_manager", "analyst", "receptionist"], key: "dashboard" });
    }

    if (effectiveRole === "client") {
      items.push(
        { href: "/client-portal", labelEn: "My Portal", labelAr: "بوابتي", icon: Building2, roles: ["client"], key: "client_portal" },
        { href: "/samples", labelEn: "My Samples", labelAr: "عيناتي", icon: FlaskConical, roles: ["client"], key: "my_samples" },
        { href: "/reports", labelEn: "My Reports", labelAr: "تقاريري", icon: FileText, roles: ["client"], key: "my_reports" },
        { href: "/invoices", labelEn: "My Invoices", labelAr: "فواتيري", icon: Receipt, roles: ["client"], key: "my_invoices" }
      );
    } else if (effectiveRole === "accountant") {
      items.push(
        { href: "/accounting/dashboard", labelEn: "Finance Dashboard", labelAr: "اللوحة المالية", icon: LayoutDashboard, roles: ["accountant"], key: "accounting_dashboard" },
        { href: "/invoices", labelEn: "Invoice Management", labelAr: "إدارة الفواتير", icon: Receipt, roles: ["accountant"], key: "billing" },
        { href: "/accounting/journals", labelEn: "General Journal", labelAr: "القيود اليومية", icon: FileText, roles: ["accountant"], key: "accounting_journals" },
        { href: "/accounting/ledger", labelEn: "General Ledger", labelAr: "الأستاذ العام", icon: GitCommit, roles: ["accountant"], key: "accounting_ledger" },
        { href: "/accounting/reports", labelEn: "Financial Reports", labelAr: "التقارير المالية", icon: BarChart3, roles: ["accountant"], key: "accounting_reports" },
        { href: "/accounting/chart-of-accounts", labelEn: "Accounts Tree", labelAr: "شجرة الحسابات", icon: Calculator, roles: ["accountant"], key: "chart_of_accounts" },
      );
    } else {
      items.push(
        {
          href: effectiveRole === "receptionist" ? "/samples/receiving" : "/samples",
          labelEn: effectiveRole === "receptionist" ? "Sample Receiving" : "Samples",
          labelAr: effectiveRole === "receptionist" ? "استلام العينات" : "العينات",
          icon: FlaskConical,
          roles: ["admin", "lab_manager", "analyst", "receptionist"],
          key: effectiveRole === "receptionist" ? "samples_receiving" : "samples",
          children: effectiveRole === "receptionist" ? undefined : [
            { href: "/samples", labelEn: "Samples List", labelAr: "قائمة العينات", key: "samples", roles: ["admin", "lab_manager", "analyst"] },
            { href: "/samples/receiving", labelEn: "Sample Receiving", labelAr: "استلام العينات", key: "samples_receiving", roles: ["admin", "lab_manager", "analyst"] },
          ]
        },
        { href: "/workflow", labelEn: "Workflow", labelAr: "سير العمل", icon: FolderKanban, roles: ["admin", "lab_manager", "analyst"], key: "workflow" },
        { href: "/clients", labelEn: "Clients", labelAr: "العملاء", icon: Users, roles: ["admin", "lab_manager", "receptionist"], key: "clients" },
        { href: "/reports", labelEn: "Reports", labelAr: "التقارير", icon: FileText, roles: ["admin", "lab_manager", "analyst", "receptionist"], key: "reports" },
        { href: "/inventory", labelEn: "Inventory", labelAr: "المخزون", icon: Package, roles: ["admin", "lab_manager", "receptionist"], key: "inventory" },
        { href: "/analytics", labelEn: "Analytics", labelAr: "التحليلات", icon: BarChart3, roles: ["admin", "lab_manager"], key: "analytics" }
      );

      // Only Admin gets billing/accounting access in the main menu
      if (effectiveRole === "admin") {
        items.push(
          { href: "/invoices", labelEn: "Billing", labelAr: "الفوترة", icon: Receipt, roles: ["admin"], key: "billing" },
          { href: "/accounting/dashboard", labelEn: "Accounting", labelAr: "المحاسبة", icon: Calculator, roles: ["admin"], key: "accounting_dashboard" }
        );
      }
    }

    if (effectiveRole === "admin") {
      items.push({ href: "/admin", labelEn: "SaaS Admin", labelAr: "إدارة النظام", icon: ShieldCheck, roles: ["admin"], key: "saas_admin" });
    }

    // Add Specifications for Admin and Lab Manager
    if (["admin", "lab_manager"].includes(effectiveRole)) {
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
          { href: "/specifications/approval", labelEn: "Approval Queue", labelAr: "قائمة الاعتماد", key: "specifications_approval" },
          { href: "/specifications/history", labelEn: "Version History", labelAr: "سجل الإصدارات", key: "specifications_history" },
        ]
      });
    }

    items.push({ href: "/settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings, roles: ["admin", "lab_manager", "analyst", "client", "accountant"], key: "settings" });

    // Step 1: role filter
    const roleFiltered = items.filter(item => item.roles.includes(effectiveRole));

    // Step 2: superadmin-controlled visibility filter
    // (already bypassed above by returning early for superadmin)
    return roleFiltered
      .filter(item => menuPerms.isEnabled(item.key))
      .map(item => {
        if (!item.children) return item;
        const filteredChildren = item.children.filter(
          child => menuPerms.isEnabled(child.key)
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
                      .filter((child: NavChild) => !child.roles || child.roles.includes(effectiveRole))
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

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {effectiveRole.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">{effectiveRole.replace("_", " ").toUpperCase()}</span>
              <span className="text-xs text-muted-foreground">Demo User</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title={isRtl ? "تسجيل الخروج" : "Logout"}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}