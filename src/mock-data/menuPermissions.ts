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
  type LucideIcon,
} from "lucide-react";

export type MenuKey =
  | "dashboard"
  | "samples"
  | "samples_receiving"
  | "workflow"
  | "clients"
  | "reports"
  | "inventory"
  | "analytics"
  | "billing"
  | "accounting_dashboard"
  | "accounting_journals"
  | "accounting_ledger"
  | "accounting_reports"
  | "chart_of_accounts"
  | "specifications"
  | "specifications_library"
  | "specifications_tests"
  | "specifications_approval"
  | "specifications_history"
  | "saas_admin"
  | "settings"
  | "client_portal"
  | "my_samples"
  | "my_reports"
  | "my_invoices";

export type MenuGroup = "lab" | "client" | "accounting" | "admin";

export interface MenuEntry {
  key: MenuKey;
  labelEn: string;
  labelAr: string;
  icon: LucideIcon;
  href: string;
  group: MenuGroup;
}

export const MENU_REGISTRY: Record<MenuKey, MenuEntry> = {
  dashboard: {
    key: "dashboard",
    labelEn: "Dashboard",
    labelAr: "لوحة القيادة",
    icon: LayoutDashboard,
    href: "/dashboard",
    group: "lab",
  },
  samples: {
    key: "samples",
    labelEn: "Samples",
    labelAr: "العينات",
    icon: FlaskConical,
    href: "/samples",
    group: "lab",
  },
  samples_receiving: {
    key: "samples_receiving",
    labelEn: "Sample Receiving",
    labelAr: "استلام العينات",
    icon: FlaskConical,
    href: "/samples/receiving",
    group: "lab",
  },
  workflow: {
    key: "workflow",
    labelEn: "Workflow",
    labelAr: "سير العمل",
    icon: FolderKanban,
    href: "/workflow",
    group: "lab",
  },
  clients: {
    key: "clients",
    labelEn: "Clients",
    labelAr: "العملاء",
    icon: Users,
    href: "/clients",
    group: "lab",
  },
  reports: {
    key: "reports",
    labelEn: "Reports",
    labelAr: "التقارير",
    icon: FileText,
    href: "/reports",
    group: "lab",
  },
  inventory: {
    key: "inventory",
    labelEn: "Inventory",
    labelAr: "المخزون",
    icon: Package,
    href: "/inventory",
    group: "lab",
  },
  analytics: {
    key: "analytics",
    labelEn: "Analytics",
    labelAr: "التحليلات",
    icon: BarChart3,
    href: "/analytics",
    group: "lab",
  },
  billing: {
    key: "billing",
    labelEn: "Billing",
    labelAr: "الفوترة",
    icon: Receipt,
    href: "/invoices",
    group: "lab",
  },
  accounting_dashboard: {
    key: "accounting_dashboard",
    labelEn: "Finance Dashboard",
    labelAr: "اللوحة المالية",
    icon: LayoutDashboard,
    href: "/accounting/dashboard",
    group: "accounting",
  },
  accounting_journals: {
    key: "accounting_journals",
    labelEn: "General Journal",
    labelAr: "القيود اليومية",
    icon: FileText,
    href: "/accounting/journals",
    group: "accounting",
  },
  accounting_ledger: {
    key: "accounting_ledger",
    labelEn: "General Ledger",
    labelAr: "الأستاذ العام",
    icon: GitCommit,
    href: "/accounting/ledger",
    group: "accounting",
  },
  accounting_reports: {
    key: "accounting_reports",
    labelEn: "Financial Reports",
    labelAr: "التقارير المالية",
    icon: BarChart3,
    href: "/accounting/reports",
    group: "accounting",
  },
  chart_of_accounts: {
    key: "chart_of_accounts",
    labelEn: "Accounts Tree",
    labelAr: "شجرة الحسابات",
    icon: Calculator,
    href: "/accounting/chart-of-accounts",
    group: "accounting",
  },
  specifications: {
    key: "specifications",
    labelEn: "Specifications",
    labelAr: "المواصفات",
    icon: GitCommit,
    href: "/specifications",
    group: "lab",
  },
  specifications_library: {
    key: "specifications_library",
    labelEn: "Test Parameters",
    labelAr: "معلمات الاختبار",
    icon: GitCommit,
    href: "/specifications/library",
    group: "lab",
  },
  specifications_tests: {
    key: "specifications_tests",
    labelEn: "Test List",
    labelAr: "سجل الاختبارات",
    icon: GitCommit,
    href: "/specifications/test-master",
    group: "lab",
  },
  specifications_approval: {
    key: "specifications_approval",
    labelEn: "Approval Queue",
    labelAr: "قائمة الاعتماد",
    icon: GitCommit,
    href: "/specifications/approval",
    group: "lab",
  },
  specifications_history: {
    key: "specifications_history",
    labelEn: "Version History",
    labelAr: "سجل الإصدارات",
    icon: GitCommit,
    href: "/specifications/history",
    group: "lab",
  },
  saas_admin: {
    key: "saas_admin",
    labelEn: "SaaS Admin",
    labelAr: "إدارة النظام",
    icon: ShieldCheck,
    href: "/admin",
    group: "admin",
  },
  settings: {
    key: "settings",
    labelEn: "Settings",
    labelAr: "الإعدادات",
    icon: Settings,
    href: "/settings",
    group: "admin",
  },
  client_portal: {
    key: "client_portal",
    labelEn: "My Portal",
    labelAr: "بوابتي",
    icon: Building2,
    href: "/client-portal",
    group: "client",
  },
  my_samples: {
    key: "my_samples",
    labelEn: "My Samples",
    labelAr: "عيناتي",
    icon: FlaskConical,
    href: "/samples",
    group: "client",
  },
  my_reports: {
    key: "my_reports",
    labelEn: "My Reports",
    labelAr: "تقاريري",
    icon: FileText,
    href: "/reports",
    group: "client",
  },
  my_invoices: {
    key: "my_invoices",
    labelEn: "My Invoices",
    labelAr: "فواتيري",
    icon: Receipt,
    href: "/invoices",
    group: "client",
  },
};

export const MENU_GROUP_LABELS: Record<MenuGroup, { en: string; ar: string }> = {
  lab: { en: "Laboratory Operations", ar: "عمليات المختبر" },
  client: { en: "Client Portal", ar: "بوابة العميل" },
  accounting: { en: "Accounting & Finance", ar: "المحاسبة والمالية" },
  admin: { en: "Administration", ar: "الإدارة" },
};
