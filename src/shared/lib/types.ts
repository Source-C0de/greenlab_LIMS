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

/** The 7 roles the app gates navigation and permissions on. */
export type Role =
  | "superadmin"
  | "admin"
  | "lab_manager"
  | "analyst"
  | "client"
  | "accountant"
  | "receptionist";

export const ROLES: readonly Role[] = [
  "superadmin",
  "admin",
  "lab_manager",
  "analyst",
  "client",
  "accountant",
  "receptionist",
];

export type Language = "en" | "ar";
export type Theme = "light" | "dark";