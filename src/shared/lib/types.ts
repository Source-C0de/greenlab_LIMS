// =========================================================================
// Cross-cutting primitive types.
//
// These live in `shared/` rather than in `presentation/providers/AppContext`
// because non-presentation layers need them: `infrastructure/api/auth.ts` and
// `infrastructure/mock/data/{samples,users}.ts` all reference `Role`.
//
// A *type* is not presentation logic — it has no runtime behaviour and no
// React dependency, so it belongs in the layer everyone can import from.
// `AppContext.tsx` re-exports these for convenience, so existing
// `import type { Role } from "@/presentation/providers/AppContext"` call sites
// keep working.
// =========================================================================

/**
 * The roles the app gates navigation and permissions on.
 *
 * The first four are the **superadmin platform roles**, mirroring the
 * backend's `SuperadminRole` enum (`app/domains/shared/enums.py:51-55`).
 * They describe what a platform operator may do and are NOT interchangeable
 * with the tenant roles below — a `platform_billing` operator is not a
 * laboratory `accountant`, and must not inherit that operator's menu.
 *
 * `superadmin` is the full-power platform role; the other three are scoped
 * variants.
 */
export type PlatformRole =
  | "superadmin"
  | "platform_support"
  | "platform_billing"
  | "platform_readonly";

/** The tenant-side laboratory roles. */
export type TenantRole =
  | "admin"
  | "lab_manager"
  | "analyst"
  | "client"
  | "accountant"
  | "receptionist";

export type Role = PlatformRole | TenantRole;

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  "superadmin",
  "platform_support",
  "platform_billing",
  "platform_readonly",
];

export const TENANT_ROLES: readonly TenantRole[] = [
  "admin",
  "lab_manager",
  "analyst",
  "client",
  "accountant",
  "receptionist",
];

export type Language = "en" | "ar";
export type Theme = "light" | "dark";