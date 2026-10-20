import type { MenuKey } from "@/infrastructure/mock/data/menuPermissions";

/**
 * Per-user menu permission delta. Sits **on top of** the role × menu
 * default matrix: a `grant` lets a user see a menu their role normally
 * hides; a `deny` hides a menu their role normally sees. Absence of a row
 * means "inherit from the role default".
 *
 * Persisted in localStorage by `useUserMenuOverrides`. This file is the
 * seed used on first load only.
 */
export type OverrideEffect = "grant" | "deny";

export interface UserMenuOverride {
  userId: string;
  menuKey: MenuKey;
  effect: OverrideEffect;
}

/**
 * 3 seed rows that demonstrate the three override scenarios from the
 * SaaS Admin / User & Role Creation module docs:
 *
 *  - U002 (analyst) is **granted** `client_portal` so they can preview
 *    the client experience during a sales call.
 *  - U006 (receptionist) is **denied** `billing` — receptionists never
 *    see invoices, even though the role default would let them.
 *  - U003 (lab_manager) is **granted** `accounting_dashboard` so the
 *    lab head can review monthly numbers without an `admin` account.
 */
export const mockUserMenuOverrides: UserMenuOverride[] = [
  { userId: "U002", menuKey: "client_portal", effect: "grant" },
  { userId: "U006", menuKey: "billing", effect: "deny" },
  { userId: "U003", menuKey: "accounting_dashboard", effect: "grant" },
];
