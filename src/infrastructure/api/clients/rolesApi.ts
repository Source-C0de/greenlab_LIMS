/**
 * Roles & Menu-Permissions API — typed client for `docs/api/users.md` §2.
 *
 * Sibling to `usersApi.ts` — same envelope, same bearer auth, same
 * `isApiEnabled()` gating strategy.
 *
 * WIRE FORMAT
 * -----------
 * The backend sends **snake_case** (`label_en`, `icon_name`, `is_active`,
 * `display_order`) — see `app/domains/roles/schemas.py::RoleOut`. This
 * module's *public* types stay camelCase so the presentation layer is
 * unaffected; `normalizeRole` / `normalizeMenuKey` bridge the two at the
 * boundary, exactly as `usersApi.normalizeUser` already does.
 */

import { apiFetch } from "@/infrastructure/api/api";
import { unwrapData, type SuccessEnvelope } from "@/infrastructure/api/response";

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

/** The shape the backend actually sends (snake_case). */
interface RawRole {
  role: string;
  label_en: string;
  label_ar: string;
  description_en: string;
  description_ar: string;
  icon_name: string;
  is_active: boolean;
  is_custom: boolean;
  updated_at: string;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function unwrap<T>(
  path: string,
  init?: Parameters<typeof apiFetch>[1],
): Promise<T> {
  const env = await apiFetch<SuccessEnvelope<T>>(path, init);
  return unwrapData(env);
}

/**
 * Bridge the backend's snake_case role row to this module's camelCase type.
 *
 * Without this the roles page renders empty labels — the backend never sent
 * `labelEn`, and nothing translated it.
 */
function normalizeRole(raw: RawRole): Role {
  return {
    role: raw.role,
    labelEn: raw.label_en,
    labelAr: raw.label_ar,
    descriptionEn: raw.description_en,
    descriptionAr: raw.description_ar,
    iconName: raw.icon_name as RoleIconName,
    isActive: raw.is_active,
    isCustom: raw.is_custom,
    updatedAt: raw.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Menu-keys catalogue — spec §2.1
// ---------------------------------------------------------------------------

/** GET /admin/menu-keys — the 10 admin menu keys (separate from
 * `MENU_REGISTRY`). Re-exported from `@/lib/adminMenuKeys` for proximity. */
export { SEED_ADMIN_MENU_KEYS, type AdminMenuKey, type AdminMenuKeyGroup } from "@/shared/lib/adminMenuKeys";

export interface AdminMenuKeyResponse {
  key: string;
  labelEn: string;
  labelAr: string;
  group: "lab" | "client" | "accounting" | "admin";
  href: string;
  displayOrder: number;
}

/** The shape the backend actually sends (snake_case). */
interface RawMenuKey {
  key: string;
  label_en: string;
  label_ar: string;
  group: string;
  href: string;
  display_order: number;
}

function normalizeMenuKey(raw: RawMenuKey): AdminMenuKeyResponse {
  return {
    key: raw.key,
    labelEn: raw.label_en,
    labelAr: raw.label_ar,
    group: raw.group as AdminMenuKeyResponse["group"],
    href: raw.href,
    displayOrder: raw.display_order,
  };
}

/** GET /admin/menu-keys */
export async function listMenuKeys(): Promise<AdminMenuKeyResponse[]> {
  const raw = await unwrap<RawMenuKey[]>("/admin/menu-keys");
  return raw.map(normalizeMenuKey);
}

// ---------------------------------------------------------------------------
// Role registry — spec §2.2-§2.7
// ---------------------------------------------------------------------------

/** GET /admin/roles */
export async function listRoles(): Promise<Role[]> {
  const raw = await unwrap<RawRole[]>("/admin/roles");
  return raw.map(normalizeRole);
}

/** GET /admin/roles/:role */
export async function getRole(slug: string): Promise<Role> {
  const raw = await unwrap<RawRole>(`/admin/roles/${encodeURIComponent(slug)}`);
  return normalizeRole(raw);
}

/** PATCH /admin/roles/:role — edit metadata. `If-Match` for optimistic concurrency. */
export async function updateRole(
  slug: string,
  body: RoleUpdate,
  updatedAt?: string,
): Promise<Role> {
  const raw = await unwrap<RawRole>(`/admin/roles/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body,
    headers: updatedAt ? { "If-Match": updatedAt } : undefined,
  });
  return normalizeRole(raw);
}

/** PATCH /admin/roles/:role/status — archive / restore. */
export async function setRoleStatus(
  slug: string,
  body: RoleStatusUpdate,
): Promise<Role> {
  const raw = await unwrap<RawRole>(`/admin/roles/${encodeURIComponent(slug)}/status`, {
    method: "PATCH",
    body,
  });
  return normalizeRole(raw);
}

/** POST /admin/roles — create custom role. */
export async function createRole(body: RoleCreate): Promise<Role> {
  const raw = await unwrap<RawRole>("/admin/roles", { method: "POST", body });
  return normalizeRole(raw);
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
