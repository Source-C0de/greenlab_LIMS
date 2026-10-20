/**
 * Admin menu-key catalogue — the 10 keys exposed by the backend at
 * `GET /admin/menu-keys` (spec §2.1). Distinct from the SPA's own
 * `MENU_REGISTRY` (32 sidebar keys in `src/mock-data/menuPermissions.ts`),
 * which the backend does not know about.
 *
 * The two coexist: `MENU_REGISTRY` drives the sidebar, this file is the
 * source of truth for the role × menu permission matrix when the SPA is
 * in API mode (`VITE_USE_API=true`).
 */

export type AdminMenuKeyGroup = "lab" | "client" | "accounting" | "admin";

export interface AdminMenuKey {
  key: string;
  labelEn: string;
  labelAr: string;
  group: AdminMenuKeyGroup;
  href: string;
  displayOrder: number;
}

/** The 10 keys the backend seeds (spec §2.1). */
export const SEED_ADMIN_MENU_KEYS: AdminMenuKey[] = [
  { key: "dashboard", labelEn: "Dashboard", labelAr: "لوحة التحكم", group: "lab", href: "/", displayOrder: 10 },
  { key: "samples", labelEn: "Samples", labelAr: "العينات", group: "lab", href: "/samples", displayOrder: 20 },
  { key: "test_approvals", labelEn: "Test Approvals", labelAr: "اعتماد الاختبارات", group: "lab", href: "/approvals", displayOrder: 30 },
  { key: "test_parameters", labelEn: "Test Parameters", labelAr: "معلمات الاختبار", group: "lab", href: "/specifications/test-parameters", displayOrder: 40 },
  { key: "reports", labelEn: "Reports", labelAr: "التقارير", group: "lab", href: "/reports", displayOrder: 50 },
  { key: "client_portal", labelEn: "Client Portal", labelAr: "بوابة العميل", group: "client", href: "/client-portal", displayOrder: 60 },
  { key: "accounting", labelEn: "Accounting", labelAr: "المحاسبة", group: "accounting", href: "/accounting/dashboard", displayOrder: 70 },
  { key: "invoices", labelEn: "Invoices", labelAr: "الفواتير", group: "accounting", href: "/invoices", displayOrder: 80 },
  { key: "users", labelEn: "Users", labelAr: "المستخدمون", group: "admin", href: "/admin/users", displayOrder: 90 },
  { key: "roles", labelEn: "Roles", labelAr: "الأدوار", group: "admin", href: "/admin/roles", displayOrder: 100 },
];

/** Map of group code → bilingual group label (used by the matrix UI). */
export const ADMIN_MENU_GROUP_LABELS: Record<AdminMenuKeyGroup, { en: string; ar: string }> = {
  lab: { en: "Laboratory", ar: "المختبر" },
  client: { en: "Client Portal", ar: "بوابة العميل" },
  accounting: { en: "Accounting & Finance", ar: "المحاسبة والمالية" },
  admin: { en: "Administration", ar: "الإدارة" },
};
