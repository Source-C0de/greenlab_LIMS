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
  FolderKanban
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const [location] = useLocation();
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";

  const getNavItems = () => {
    const items = [
      { href: "/dashboard", labelEn: "Dashboard", labelAr: "لوحة القيادة", icon: LayoutDashboard, roles: ["admin", "lab_manager", "analyst", "client", "accountant"] },
    ];

    if (currentRole === "client") {
      items.push(
        { href: "/client-portal", labelEn: "My Portal", labelAr: "بوابتي", icon: Building2, roles: ["client"] },
        { href: "/samples", labelEn: "My Samples", labelAr: "عيناتي", icon: FlaskConical, roles: ["client"] },
        { href: "/reports", labelEn: "My Reports", labelAr: "تقاريري", icon: FileText, roles: ["client"] },
        { href: "/invoices", labelEn: "My Invoices", labelAr: "فواتيري", icon: Receipt, roles: ["client"] }
      );
    } else {
      items.push(
        { href: "/samples", labelEn: "Samples", labelAr: "العينات", icon: FlaskConical, roles: ["admin", "lab_manager", "analyst"] },
        { href: "/workflow", labelEn: "Workflow", labelAr: "سير العمل", icon: FolderKanban, roles: ["admin", "lab_manager", "analyst"] },
        { href: "/clients", labelEn: "Clients", labelAr: "العملاء", icon: Users, roles: ["admin", "lab_manager"] },
        { href: "/reports", labelEn: "Reports", labelAr: "التقارير", icon: FileText, roles: ["admin", "lab_manager", "analyst"] },
        { href: "/inventory", labelEn: "Inventory", labelAr: "المخزون", icon: Package, roles: ["admin", "lab_manager"] },
        { href: "/invoices", labelEn: "Invoices", labelAr: "الفواتير", icon: Receipt, roles: ["admin", "lab_manager", "accountant"] },
        { href: "/analytics", labelEn: "Analytics", labelAr: "التحليلات", icon: BarChart3, roles: ["admin", "lab_manager"] }
      );
    }

    if (currentRole === "admin") {
      items.push({ href: "/admin", labelEn: "SaaS Admin", labelAr: "إدارة النظام", icon: ShieldCheck, roles: ["admin"] });
    }

    items.push({ href: "/settings", labelEn: "Settings", labelAr: "الإعدادات", icon: Settings, roles: ["admin", "lab_manager", "analyst", "client", "accountant"] });

    return items.filter(item => item.roles.includes(currentRole));
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
        <span className="font-bold text-lg tracking-tight">GreenLIMS <span className="font-light opacity-80">KSA</span></span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
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
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {currentRole.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">{currentRole.replace("_", " ").toUpperCase()}</span>
            <span className="text-xs text-muted-foreground">Demo User</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
