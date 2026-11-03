import {
  MENU_REGISTRY,
  type MenuKey,
} from "@/infrastructure/mock/data/menuPermissions";
import {
  ALL_TOGGLEABLE_ROLES,
  type ToggleableRole,
} from "@/infrastructure/mock/data/rolePermissions";

/**
 * Per-role default menu visibility. This file is the **seed** — the
 * runtime values come from `src/hooks/useRoleMenuMatrix.ts` (persisted in
 * localStorage). The seed mirrors the role gates hard-coded in
 * `src/components/layout/Sidebar.tsx:80-183`; admin can edit it at
 * `/admin/roles`.
 *
 * Stored sparse: only `enabled: true` cells. Absent cells are implicit
 * "denied" (the hook treats `undefined` as `false`).
 *
 * Note: the legacy `useMenuPermissions` hook (flat kill-switch per menu
 * key) is still consulted *above* this matrix. The effective visibility is
 * resolved by `src/presentation/hooks/menuVisibility.ts`:
 *
 *     globalKill → false wins
 *     superadmin → true
 *     override "deny"  → false
 *     override "grant" → true   (rescues a key the role matrix denies)
 *     roleEnabled      → true
 *     otherwise        → false
 */
export interface RoleMenuPermission {
  role: ToggleableRole;
  menuKey: MenuKey;
  enabled: boolean;
}

/**
 * Build the full enable-set for one role from a list of menu keys.
 * Helper to keep the table below scannable.
 */
function enable(role: ToggleableRole, ...keys: MenuKey[]): RoleMenuPermission[] {
  return keys.map((menuKey) => ({ role, menuKey, enabled: true }));
}

// ---------------------------------------------------------------------------
// Default visibility per role (mirrors `Sidebar.tsx:80-183`)
// ---------------------------------------------------------------------------

const ADMIN_ENABLED: MenuKey[] = [
  "dashboard",
  "marketing_reports",
  "samples",
  "samples_receiving",
  "workflow",
  "quotations",
  "client_requests",
  "technical_evaluation",
  "clients",
  "reports",
  "inventory",
  "analytics",
  "test_approvals",
  "my_submissions",
  "billing",
  "accounting_dashboard",
  "saas_admin",
  "specifications",
  "specifications_library",
  "specifications_tests",
  "specifications_test_parameters",
  "specifications_approval",
  "specifications_history",
  "settings",
];

const LAB_MANAGER_ENABLED: MenuKey[] = [
  "dashboard",
  "marketing_reports",
  "samples",
  "samples_receiving",
  "workflow",
  "quotations",
  "client_requests",
  "technical_evaluation",
  "clients",
  "reports",
  "inventory",
  "analytics",
  "test_approvals",
  "my_submissions",
  "specifications",
  "specifications_library",
  "specifications_tests",
  "specifications_test_parameters",
  "specifications_approval",
  "specifications_history",
  "settings",
];

const ANALYST_ENABLED: MenuKey[] = [
  "dashboard",
  "samples",
  "samples_receiving",
  "workflow",
  "reports",
  "my_submissions",
  "settings",
];

const RECEPTIONIST_ENABLED: MenuKey[] = [
  "dashboard",
  "samples_receiving",
  "client_requests",
  "clients",
  "reports",
  "inventory",
  "settings",
];

const ACCOUNTANT_ENABLED: MenuKey[] = [
  "accounting_dashboard",
  "billing",
  "accounting_journals",
  "accounting_ledger",
  "accounting_reports",
  "chart_of_accounts",
  "settings",
];

const CLIENT_ENABLED: MenuKey[] = [
  "client_portal",
  "my_samples",
  "my_reports",
  "my_invoices",
];

/**
 * The default menu set for a **newly created custom role**.
 *
 * A custom role starts from the laboratory-operations set rather than from
 * an empty set: an empty set would leave the role with a blank sidebar and
 * no way for a non-superadmin admin to discover which keys exist, so the
 * role would look broken until a superadmin opened "Assign Menus" for it.
 * The admin then trims it to what the role actually needs.
 */
export const DEFAULT_CUSTOM_ROLE_KEYS: readonly MenuKey[] = [
  "dashboard",
  "samples",
  "samples_receiving",
  "workflow",
  "clients",
  "reports",
  "inventory",
  "analytics",
  "quotations",
  "client_requests",
  "technical_evaluation",
  "test_approvals",
  "my_submissions",
];

/**
 * `reviewer` reviews and approves technical results, so it gets the same
 * laboratory-operations set as a newly created custom role.
 *
 * This mirrors the backend exactly: `DEFAULT_ROLE_MATRIX["reviewer"]` in
 * `app/domains/roles/menu_catalogue.py` is the backend's
 * `DEFAULT_CUSTOM_ROLE_KEYS`, and the two must agree or a user's sidebar
 * differs between mock and API mode.
 */
const REVIEWER_ENABLED: MenuKey[] = [...DEFAULT_CUSTOM_ROLE_KEYS];

const SEEDS: Record<ToggleableRole, MenuKey[]> = {
  admin: ADMIN_ENABLED,
  lab_manager: LAB_MANAGER_ENABLED,
  analyst: ANALYST_ENABLED,
  reviewer: REVIEWER_ENABLED,
  receptionist: RECEPTIONIST_ENABLED,
  accountant: ACCOUNTANT_ENABLED,
  client: CLIENT_ENABLED,
};

/**
 * The seed enable-set per role slug, keyed by the slug the user-management
 * flows use. Exported so `useRoleMenuMatrix` can fall back to it for a role
 * that has no persisted row yet (e.g. a brand-new custom role).
 */
export const SEED_BY_ROLE: Readonly<Record<string, readonly MenuKey[]>> =
  SEEDS;

/**
 * Default sparse matrix. 32 MenuKeys × 7 toggleable roles = 224 cells;
 * storing only the enabled cells keeps the file readable.
 *
 * `useRoleMenuMatrix` consumes this on first load (when localStorage is
 * empty). After the first toggle, the user's edits are persisted and
 * this seed is no longer consulted for that role.
 */
export const mockRoleMenuPermissions: RoleMenuPermission[] = ALL_TOGGLEABLE_ROLES
  .flatMap((role) => enable(role, ...SEEDS[role]));

/**
 * Full 32-key reference list — kept in sync with `MENU_REGISTRY`. Used by
 * the `/admin/roles` matrix UI to enumerate the rows.
 */
export const ALL_MENU_KEYS: MenuKey[] = Object.keys(MENU_REGISTRY) as MenuKey[];