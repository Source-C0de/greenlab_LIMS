import {
  ShieldCheck,
  Users,
  FlaskConical,
  Briefcase,
  Calculator,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

/**
 * Roles that superadmin can enable/disable.
 * `superadmin` is intentionally excluded — it must always remain enabled so
 * the platform can be re-configured.
 */
export type ToggleableRole =
  | "admin"
  | "lab_manager"
  | "analyst"
  | "client"
  | "accountant"
  | "receptionist";

export interface RoleEntry {
  role: ToggleableRole;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: LucideIcon;
}

export const ROLE_REGISTRY: Record<ToggleableRole, RoleEntry> = {
  admin: {
    role: "admin",
    labelEn: "System Admin",
    labelAr: "مدير النظام",
    descriptionEn: "Full access to tenants, billing, accounting and SaaS admin.",
    descriptionAr: "وصول كامل للمستأجرين والفوترة والمحاسبة وإدارة النظام.",
    icon: ShieldCheck,
  },
  lab_manager: {
    role: "lab_manager",
    labelEn: "Lab Manager",
    labelAr: "مدير المختبر",
    descriptionEn: "Manages samples, workflows, clients, reports, specifications.",
    descriptionAr: "يدير العينات وسير العمل والعملاء والتقارير والمواصفات.",
    icon: ClipboardList,
  },
  analyst: {
    role: "analyst",
    labelEn: "Analyst",
    labelAr: "محلل",
    descriptionEn: "Executes tests, reviews samples, publishes results.",
    descriptionAr: "ينفذ الاختبارات ويراجع العينات وينشر النتائج.",
    icon: FlaskConical,
  },
  client: {
    role: "client",
    labelEn: "Client",
    labelAr: "عميل",
    descriptionEn: "Customer portal — view samples, reports, invoices.",
    descriptionAr: "بوابة العميل — عرض العينات والتقارير والفواتير.",
    icon: Briefcase,
  },
  accountant: {
    role: "accountant",
    labelEn: "Accountant",
    labelAr: "محاسب",
    descriptionEn: "Manages invoices, journals, ledgers, financial reports.",
    descriptionAr: "يدير الفواتير والقيود اليومية والأستاذ والتقارير المالية.",
    icon: Calculator,
  },
  receptionist: {
    role: "receptionist",
    labelEn: "Receptionist",
    labelAr: "موظف استقبال",
    descriptionEn: "Receives samples, registers clients, manages inventory.",
    descriptionAr: "يستقبل العينات ويسجل العملاء ويدير المخزون.",
    icon: Users,
  },
};

export const ALL_TOGGLEABLE_ROLES = Object.keys(ROLE_REGISTRY) as ToggleableRole[];