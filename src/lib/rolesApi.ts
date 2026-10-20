/**
 * Roles & Menu-Permissions API — typed client for `docs/api/users.md` §2.
 *
 * Sibling to `usersApi.ts` — same envelope, same bearer auth, same
 * `isApiEnabled()` gating strategy.
 */

import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types — mirror docs/api/users.md §2 + §5
// ---------------------------------------------------------------------------

export type RoleIconName =
  | "ShieldCheck"
  | "Users"
  | "FlaskConical"
  | "Briefcase"
  | "Calculator"
  | "ClipboardList";

export interface Role {
  role: string; // slug
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  iconName: RoleIconName;
  isActive: boolean;
  isCustom: boolean;
  updatedAt: string;
}

export interface RoleUpdate {
  labelEn?: string;
  labelAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  iconName?: RoleIconName;
}

export interface RoleCreate {
  slug: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  iconName: RoleIconName;
}

export interface RoleStatusUpdate {
  isActive: boolean;
}

export interface RoleMenuCell {
  menuKey: string;
  enabled: boolean;
}

export interface RoleMenuPermissions {
  role: string;
  cells: RoleMenuCell[];
}

export interface RoleMenuPermissionsReplace {
  cells: RoleMenuCell[];
}

interface Envelope<T> {
  data: T;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function unwrap<T>(
  path: string,
  init?: Parameters<typeof apiFetch>[1],
): Promise<T> {
  const env = await apiFetch<Envelope<T> | T | null>(path, init);
  if (env === null || env === undefined) return env as T;
  if (typeof env === "object" && "data" in env) {
    return (env as Envelope<T>).data;
  }
  return env as T;
}

// ---------------------------------------------------------------------------
// Menu-keys catalogue — spec §2.1
// ---------------------------------------------------------------------------

/** GET /admin/menu-keys — the 10 admin menu keys (separate from
 * `MENU_REGISTRY`). Re-exported from `@/lib/adminMenuKeys` for proximity. */
export { SEED_ADMIN_MENU_KEYS, type AdminMenuKey, type AdminMenuKeyGroup } from "@/lib/adminMenuKeys";

export interface AdminMenuKeyResponse {
  key: string;
  labelEn: string;
  labelAr: string;
  group: "lab" | "client" | "accounting" | "admin";
  href: string;
  displayOrder: number;
}

/** GET /admin/menu-keys */
export function listMenuKeys(): Promise<AdminMenuKeyResponse[]> {
  return unwrap<AdminMenuKeyResponse[]>("/admin/menu-keys");
}

// ---------------------------------------------------------------------------
// Role registry — spec §2.2-§2.7
// ---------------------------------------------------------------------------

/** GET /admin/roles */
export function listRoles(): Promise<Role[]> {
  return unwrap<Role[]>("/admin/roles");
}

/** GET /admin/roles/:role */
export function getRole(slug: string): Promise<Role> {
  return unwrap<Role>(`/admin/roles/${encodeURIComponent(slug)}`);
}

/** PATCH /admin/roles/:role — edit metadata. `If-Match` for optimistic concurrency. */
export function updateRole(
  slug: string,
  body: RoleUpdate,
  updatedAt?: string,
): Promise<Role> {
  return unwrap<Role>(`/admin/roles/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body,
    headers: updatedAt ? { "If-Match": updatedAt } : undefined,
  });
}

/** PATCH /admin/roles/:role/status — archive / restore. */
export function setRoleStatus(
  slug: string,
  body: RoleStatusUpdate,
): Promise<Role> {
  return unwrap<Role>(`/admin/roles/${encodeURIComponent(slug)}/status`, {
    method: "PATCH",
    body,
  });
}

/** POST /admin/roles — create custom role. */
export function createRole(body: RoleCreate): Promise<Role> {
  return unwrap<Role>("/admin/roles", { method: "POST", body });
}

/** DELETE /admin/roles/:role — hard delete. Returns void on 204. */
export function deleteRole(slug: string): Promise<void> {
  return unwrap<void>(`/admin/roles/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Role menu permissions — spec §2.8-§2.9
// ---------------------------------------------------------------------------

/** GET /admin/roles/:role/menu-permissions */
export function getRoleMenuPermissions(slug: string): Promise<RoleMenuPermissions> {
  return unwrap<RoleMenuPermissions>(
    `/admin/roles/${encodeURIComponent(slug)}/menu-permissions`,
  );
}

/** PUT /admin/roles/:role/menu-permissions — atomic replace. */
export function putRoleMenuPermissions(
  slug: string,
  body: RoleMenuPermissionsReplace,
): Promise<RoleMenuPermissions> {
  return unwrap<RoleMenuPermissions>(
    `/admin/roles/${encodeURIComponent(slug)}/menu-permissions`,
    { method: "PUT", body },
  );
}