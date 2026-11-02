/**
 * Roles & Menu-Permissions API — typed client for `docs/api/users.md` §2.
 *
 * Sibling to `usersApi.ts` — same envelope, same bearer auth, same
 * `isApiEnabled()` gating strategy.
 *
 * WIRE FORMAT
 * -----------
 * The backend sends **snake_case** (`label_en`, `icon_name`, `is_active`,
 * `display_order`, `menu_key`) — see `app/domains/roles/schemas.py::RoleOut`.
 * This module's *public* types stay camelCase so the presentation layer is
 * unaffected; `normalizeRole` / `normalizeMenuKey` / `normalizeMenuCell`
 * bridge the two at the boundary, exactly as `usersApi.normalizeUser` already
 * does.
 *
 * TOKEN FAMILIES
 * --------------
 * These routes live on the TENANT prefix (`/api/v1/admin/roles`) but are
 * guarded by TWO different token families, split by operation. See
 * `authToken()` below for the full table.
 */

import { apiFetch } from "@/infrastructure/api/api";
import { getSuperadminToken, getToken } from "@/infrastructure/api/auth";
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

/** The shape the backend actually sends (snake_case). */
interface RawRoleMenuCell {
  menu_key: string;
  enabled: boolean;
}

export interface RoleMenuPermissions {
  role: string;
  cells: RoleMenuCell[];
}

/** The shape the backend actually sends (snake_case). */
interface RawRoleMenuPermissions {
  role: string;
  cells: RawRoleMenuCell[];
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
 * The token a roles route must present.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * The roles routes live on the TENANT prefix (`/api/v1/admin/roles`) but are
 * guarded by TWO different token families, split by operation
 * (`backend/app/domains/roles/router.py`):
 *
 *   | operation                        | guard                          | token        |
 *   |----------------------------------|--------------------------------|--------------|
 *   | GET roles / menu-keys / role     | `get_current_user_or_superadmin` | either    |
 *   | POST / PATCH / DELETE roles      | `require_superadmin_role`      | superadmin   |
 *   | GET / PUT menu-permissions       | `require_superadmin_role`      | superadmin   |
 *
 * The two families are mutually exclusive everywhere else
 * (`backend/app/core/deps.py`): `get_current_user` accepts a JWT with
 * `type == "access"` and `get_current_superadmin` accepts
 * `type == "superadmin_access"`. Presenting the wrong one yields 401
 * "Wrong token type".
 *
 * The Roles page is behind `<ProtectedRoute platformOnly>` (`App.tsx:141`),
 * so the caller is a **superadmin** and normally has NO tenant token — yet
 * this client used to send the tenant token on every call. Every request went
 * out unauthenticated and the role table rendered empty.
 *
 * The superadmin token is preferred; the tenant token is the fallback so a
 * tenant admin still reaches the read endpoints (which accept either family).
 */
function authToken(): string | null {
  return getSuperadminToken() ?? getToken();
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

/**
 * Bridge the backend's snake_case menu cell to this module's camelCase type.
 *
 * The backend emits `{"menu_key": "samples", "enabled": true}`
 * (`backend/app/domains/roles/schemas.py:98-104`), but this module declared
 * `RoleMenuCell` as `{ menuKey }` and read `c.menuKey` with no normalizer.
 * Every cell therefore read back as `undefined`:
 *
 *     backend sends (c.menu_key): ["samples","reports","test_approvals",...]
 *     frontend reads (c.menuKey):  [undefined, undefined, undefined, ...]
 *
 * The Roles page seeds its "Assign Menus" draft from those cells
 * (`pages/admin/roles.tsx:586-588`), so the modal opened with an EMPTY
 * selection — the role's real menu assignment was invisible, and saving it
 * wrote a wrong matrix back to the server.
 */
function normalizeMenuCell(raw: RawRoleMenuCell): RoleMenuCell {
  return {
    menuKey: raw.menu_key,
    enabled: raw.enabled,
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
  const raw = await unwrap<RawMenuKey[]>("/admin/menu-keys", {
    token: authToken(),
  });
  return raw.map(normalizeMenuKey);
}

// ---------------------------------------------------------------------------
// Role registry — spec §2.2-§2.7
// ---------------------------------------------------------------------------

/** GET /admin/roles */
export async function listRoles(): Promise<Role[]> {
  const raw = await unwrap<RawRole[]>("/admin/roles", { token: authToken() });
  return raw.map(normalizeRole);
}

/** GET /admin/roles/:role */
export async function getRole(slug: string): Promise<Role> {
  const raw = await unwrap<RawRole>(
    `/admin/roles/${encodeURIComponent(slug)}`,
    { token: authToken() },
  );
  return normalizeRole(raw);
}

/** PATCH /admin/roles/:role — edit metadata. `if_match` for optimistic concurrency. */
export async function updateRole(
  slug: string,
  body: RoleUpdate,
  updatedAt?: string,
): Promise<Role> {
  // `if_match` is declared on the backend as a bare parameter — `if_match:
  // str | None = None` with NO `Header(...)` annotation
  // (`backend/app/domains/roles/router.py:124`) — so FastAPI binds it as a
  // QUERY parameter. The header this client used to send never reached the
  // handler, leaving the 412 stale-write guard inert. Send it as a query
  // param (the header is kept too, so the call keeps working if the backend
  // is later annotated with `Header(...)`).
  const q = updatedAt ? `?if_match=${encodeURIComponent(updatedAt)}` : "";
  const raw = await unwrap<RawRole>(
    `/admin/roles/${encodeURIComponent(slug)}${q}`,
    {
      method: "PATCH",
      body,
      token: authToken(),
      headers: updatedAt ? { "If-Match": updatedAt } : undefined,
    },
  );
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
    token: authToken(),
  });
  return normalizeRole(raw);
}

/** POST /admin/roles — create custom role. */
export async function createRole(body: RoleCreate): Promise<Role> {
  const raw = await unwrap<RawRole>("/admin/roles", {
    method: "POST",
    body,
    token: authToken(),
  });
  return normalizeRole(raw);
}

/**
 * DELETE /admin/roles/:role — hard delete.
 *
 * ── Why this does not use `unwrap()` ─────────────────────────────────────
 * The backend answers **204 No Content with no envelope**
 * (`backend/app/domains/roles/router.py:197-211`). `apiFetch` returns
 * `undefined` for a 204, and `unwrapData(undefined)` THROWS "Expected a
 * success envelope". So a successful delete used to surface as a confusing
 * error toast and the mutation's `onSuccess` never fired — the row stayed on
 * screen.
 */
export async function deleteRole(slug: string): Promise<void> {
  await apiFetch<void>(`/admin/roles/${encodeURIComponent(slug)}`, {
    method: "DELETE",
    token: authToken(),
  });
}

// ---------------------------------------------------------------------------
// Role menu permissions — spec §2.8-§2.9
// ---------------------------------------------------------------------------

/** GET /admin/roles/:role/menu-permissions */
export async function getRoleMenuPermissions(
  slug: string,
): Promise<RoleMenuPermissions> {
  const raw = await unwrap<RawRoleMenuPermissions>(
    `/admin/roles/${encodeURIComponent(slug)}/menu-permissions`,
    { token: authToken() },
  );
  return { role: raw.role, cells: raw.cells.map(normalizeMenuCell) };
}

/** PUT /admin/roles/:role/menu-permissions — atomic replace. */
export async function putRoleMenuPermissions(
  slug: string,
  body: RoleMenuPermissionsReplace,
): Promise<RoleMenuPermissions> {
  const raw = await unwrap<RawRoleMenuPermissions>(
    `/admin/roles/${encodeURIComponent(slug)}/menu-permissions`,
    { method: "PUT", body, token: authToken() },
  );
  return { role: raw.role, cells: raw.cells.map(normalizeMenuCell) };
}
