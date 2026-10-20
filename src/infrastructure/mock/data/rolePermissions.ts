import {
  ShieldCheck,
  Users,
  FlaskConical,
  Briefcase,
  Calculator,
  ClipboardList,
} from "lucide-react";

/**
 * Roles that superadmin can enable/disable.
 *
 * `superadmin` is intentionally excluded — it must always remain enabled so
 * the platform can be re-configured.
 *
 * `ToggleableRole` is now an open-ended `string` because the Roles admin
 * page lets a superadmin **create new role slugs at runtime** (see
 * `useRoleAdmin` + `glims_custom_roles_v1`). The 6 fixed entries below
 * are the seed — runtime roles are appended via `useRoleRegistry`.
 */
export type ToggleableRole = string;

/** A role entry — the source of truth for the roles admin page. */
export interface RoleEntry {
  /** The slug, also the map key. Immutable once created. */
  slug: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  /**
   * lucide icon component name — JSON-serializable so the entry can be
   * persisted to localStorage. Resolved to a component via
   * `useRoleRegistry.ICON_PICKER`.
   */
  iconName: string;
}

// Seed entries — the 6 fixed roles the build ships with. These are
// NEVER persisted to localStorage; they are always loaded from this
// module. Only admin-created roles go to `glims_custom_roles_v1`.
const SEED_REGISTRY: RoleEntry[] = [
  {
    slug: "admin",
    labelEn: "System Admin",
    labelAr: "مدير النظام",
    descriptionEn: "Full access to tenants, billing, accounting and SaaS admin.",
    descriptionAr: "وصول كامل للمستأجرين والفوترة والمحاسبة وإدارة النظام.",
    iconName: "ShieldCheck",
  },
  {
    slug: "lab_manager",
    labelEn: "Lab Manager",
    labelAr: "مدير المختبر",
    descriptionEn: "Manages samples, workflows, clients, reports, specifications.",
    descriptionAr: "يدير العينات وسير العمل والعملاء والتقارير والمواصفات.",
    iconName: "ClipboardList",
  },
  {
    slug: "analyst",
    labelEn: "Analyst",
    labelAr: "محلل",
    descriptionEn: "Executes tests, reviews samples, publishes results.",
    descriptionAr: "ينفذ الاختبارات ويراجع العينات وينشر النتائج.",
    iconName: "FlaskConical",
  },
  {
    slug: "client",
    labelEn: "Client",
    labelAr: "عميل",
    descriptionEn: "Customer portal — view samples, reports, invoices.",
    descriptionAr: "بوابة العميل — عرض العينات والتقارير والفواتير.",
    iconName: "Briefcase",
  },
  {
    slug: "accountant",
    labelEn: "Accountant",
    labelAr: "محاسب",
    descriptionEn: "Manages invoices, journals, ledgers, financial reports.",
    descriptionAr: "يدير الفواتير والقيود اليومية والأستاذ والتقارير المالية.",
    iconName: "Calculator",
  },
  {
    slug: "receptionist",
    labelEn: "Receptionist",
    labelAr: "موظف استقبال",
    descriptionEn: "Receives samples, registers clients, manages inventory.",
    descriptionAr: "يستقبل العينات ويسجل العملاء ويدير المخزون.",
    iconName: "Users",
  },
];

/**
 * Slugs the build ships with — used by `useRoleAdmin` to forbid new
 * roles from colliding with the 6 fixed ones. `superadmin` is not in
 * here because it's a separate, non-toggleable role.
 */
export const FIXED_ROLE_SLUGS = [
  "admin",
  "lab_manager",
  "analyst",
  "client",
  "accountant",
  "receptionist",
] as const;

export type FixedRoleSlug = (typeof FIXED_ROLE_SLUGS)[number];

/**
 * Live registry. `useRoleRegistry` is the only writer — it merges the
 * 6 seeds with custom roles from `glims_custom_roles_v1` on every
 * `loadFromStorage()`. Read via `getRoleEntry(slug)`.
 */
export const ROLE_REGISTRY: Map<string, RoleEntry> = new Map(
  SEED_REGISTRY.map((e) => [e.slug, e]),
);

/** Slug → entry, or `undefined` if the slug is unknown. */
export function getRoleEntry(slug: string): RoleEntry | undefined {
  return ROLE_REGISTRY.get(slug);
}

/** All roles in display order (seeds first, then custom — see useRoleRegistry). */
export const ALL_TOGGLEABLE_ROLES: string[] = Array.from(ROLE_REGISTRY.keys());

/** Re-export the icons for the icon-picker (matches `iconName` strings). */
export { ShieldCheck, Users, FlaskConical, Briefcase, Calculator, ClipboardList };
