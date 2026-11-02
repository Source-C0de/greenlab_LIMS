/**
 * Where each role lands after a successful login.
 *
 * WHY THIS IS SHARED: the tenant login page and the OTP-verification page
 * both need the same role→route mapping. They previously carried two
 * byte-identical copies of this table, which meant every new role had to be
 * added in two places — and a role added to only one of them logged the user
 * into the app and then dumped them on the default route.
 *
 * Lives under `presentation/` because it is a navigation concern, not a
 * domain rule: the domain knows what a role IS, not which screen it opens.
 */

import type { Role } from "@/presentation/providers/AppContext";

export const ROLE_REDIRECT: Record<Role, string> = {
  superadmin:         "/admin",
  platform_support:   "/admin",
  platform_billing:   "/admin",
  platform_readonly:  "/admin",
  admin:              "/dashboard",
  lab_manager:        "/dashboard",
  analyst:            "/dashboard",
  receptionist:       "/samples/receiving",
  accountant:         "/accounting/dashboard",
  client:             "/client-portal",
};

/** The route a role lands on, falling back to the dashboard. */
export function redirectForRole(role: Role): string {
  return ROLE_REDIRECT[role] ?? "/dashboard";
}
