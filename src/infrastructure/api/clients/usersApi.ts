/**
 * Users & Roles API — typed client for `docs/api/users.md`.
 *
 * All calls flow through `apiFetch` (Bearer auth, JSON envelopes,
 * structured ApiError). Activated via `VITE_USE_API=true`; the consuming
 * hooks gate on `isApiEnabled()` so the rest of the app stays mock-only.
 */

import { apiFetch } from "@/infrastructure/api/api";
import {
  getApiErrorCode as sharedGetApiErrorCode,
  unwrapData,
  unwrapPage,
  type Pagination as WirePagination,
  type SuccessEnvelope,
} from "@/infrastructure/api/response";

// ---------------------------------------------------------------------------
// Types — mirror docs/api/users.md §5
// ---------------------------------------------------------------------------

export type UserRole =
  | "admin"
  | "lab_manager"
  | "analyst"
  | "client"
  | "accountant"
  | "receptionist";

export type UserStatus = "active" | "trial" | "suspended" | "disabled";

export interface User {
  id: string; // UUID
  email: string;
  username: string;
  fullName: string;
  fullNameAr: string | null;
  role: UserRole;
  isActive: boolean;
  status: UserStatus;
  clientId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present on POST 201 (one-time password). */
  tempPassword?: string | null;
}

/** Snake-case shape that FastAPI actually emits for `User`.
 *  `normalizeUser` (below) promotes it to the camelCase `User` above. */
export interface RawUser extends Partial<User> {
  full_name?: string;
  full_name_ar?: string | null;
  is_active?: boolean;
  client_id?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  temp_password?: string | null;
}

export interface UserCreate {
  email: string;
  username: string;
  fullName: string;
  fullNameAr?: string | null;
  role: UserRole;
  isActive?: boolean;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  fullName?: string;
  fullNameAr?: string | null;
  role?: UserRole;
  isActive?: boolean;
  status?: UserStatus;
}

export interface ListUsersFilters {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

/**
 * The pagination window, as the backend reports it.
 *
 * This is the shared wire type (`{limit, offset, total}`) re-exported under
 * a local name so the presentation layer can keep using `Page<T>` without
 * importing the whole response module.
 */
export type Pagination = WirePagination;

/**
 * A page of results: the items plus the window they were taken from.
 */
export interface Page<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * Response shape for `POST /admin/users/:id/reset-password`.
 *
 * The endpoint serves two flows:
 *  - **Admin sets a password** (body `{ new_password: "..." }`): server
 *    returns `{ ok: true, mode: "set", message: "..." }`. The SPA
 *    surfaces the typed password in the copy-to-clipboard dialog.
 *  - **Server mints a link** (no body, legacy): server returns
 *    `{ ok: true, mode: "link", resetLink, expiresAt }`. The SPA shows
 *    the link instead.
 *
 * Failures use standard FastAPI 4xx codes (422 weak password, 404 user
 * not found, 403 self-reset, etc.) with the standard error envelope —
 * the SPA's existing `apiFetch` + `ApiError` path handles those.
 */
export interface ResetPasswordSetResponse {
  ok: true;
  mode: "set";
  /** Localizable success message — server may translate via Accept-Language. */
  message: string;
}

export interface ResetPasswordLinkResponse {
  ok: true;
  mode: "link";
  resetLink: string;
  expiresAt: string;
}

export type ResetPasswordResponse =
  | ResetPasswordSetResponse
  | ResetPasswordLinkResponse;

export type MenuEffect = "grant" | "deny";

export interface UserOverrideCell {
  menuKey: string;
  effect: MenuEffect;
}

export interface UserOverridesResponse {
  userId: string;
  overrides: UserOverrideCell[];
}

export interface UserOverridesReplace {
  overrides: UserOverrideCell[];
}

// ---------------------------------------------------------------------------
// Error body shape — spec §"Error codes"
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  /** Only present under the `modern` contract; `enveloped` puts it in `meta`. */
  requestId?: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
  meta?: { request_id?: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch and unwrap the canonical envelope.
 *
 * `T` may be `null` (a DELETE returns `{"data": null}`) — that is a typed
 * null, not a missing payload.
 */
async function unwrap<T>(
  path: string,
  init?: Parameters<typeof apiFetch>[1],
): Promise<T> {
  const env = await apiFetch<SuccessEnvelope<T>>(path, init);
  return unwrapData(env);
}

function buildListQuery(filters: ListUsersFilters): string {
  const params = new URLSearchParams();
  if (filters.q && filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (typeof filters.page === "number") params.set("page", String(filters.page));
  if (typeof filters.pageSize === "number") {
    params.set("pageSize", String(filters.pageSize));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Extract the error code string from a thrown ApiError, when present. */
export function getApiErrorCode(err: unknown): string | null {
  return sharedGetApiErrorCode(err);
}

// ---------------------------------------------------------------------------
// User CRUD — spec §1
// ---------------------------------------------------------------------------

/** GET /admin/users — list with optional filters + pagination.
 *
 * The response is the canonical paginated envelope: the rows are in `data`
 * and the window in `meta.pagination` (`{limit, offset, total}`).
 *
 * Each user row is also passed through `normalizeUser` so the
 * snake_case fields the backend actually emits (`full_name`, `is_active`,
 * `created_at`, etc.) become the camelCase fields the SPA's `User` type
 * declares. Without this, the table cells render empty because
 * `u.fullName` is `undefined` even when the server sent `full_name`.
 */
export async function listUsers(
  filters: ListUsersFilters = {},
): Promise<Page<User>> {
  const env = await apiFetch<SuccessEnvelope<RawUser[]>>(
    `/admin/users${buildListQuery(filters)}`,
  );
  const { items, pagination } = unwrapPage(env);
  return { items: items.map(normalizeUser), pagination };
}

/** GET /admin/users/:id — fetch one. */
export function getUser(id: string): Promise<User> {
  return unwrap<RawUser | User>(
    `/admin/users/${encodeURIComponent(id)}`,
  ).then((u) => normalizeUser(u as RawUser));
}

/** Snake_case → camelCase adapter.
 *  The backend returns `{ full_name, full_name_ar, is_active, ... }` per
 *  FastAPI convention; the SPA's `User` type is camelCase. Tolerate both
 *  shapes — if the camelCase field is already present, keep it. */
export function normalizeUser(raw: RawUser): User {
  const now = new Date().toISOString();
  return {
    id: raw.id ?? "",
    email: raw.email ?? "",
    username: raw.username ?? "",
    fullName: raw.fullName ?? raw.full_name ?? "",
    fullNameAr: raw.fullNameAr ?? raw.full_name_ar ?? null,
    role: (raw.role ?? "admin") as UserRole,
    isActive: raw.isActive ?? raw.is_active ?? true,
    status: (raw.status ?? "active") as UserStatus,
    clientId: raw.clientId ?? raw.client_id ?? null,
    lastLoginAt: raw.lastLoginAt ?? raw.last_login_at ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? now,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? now,
    tempPassword: raw.tempPassword ?? raw.temp_password ?? null,
  };
}

/** POST /admin/users — create. Returns the new user + one-time tempPassword. */
export function createUser(body: UserCreate): Promise<User> {
  return unwrap<RawUser | User>("/admin/users", { method: "POST", body }).then(
    normalizeUser,
  );
}

/** PATCH /admin/users/:id — partial update. Pass `updatedAt` for `If-Match`. */
export function updateUser(
  id: string,
  body: UserUpdate,
  updatedAt?: string,
): Promise<User> {
  return unwrap<RawUser | User>(
    `/admin/users/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body,
      headers: updatedAt ? { "If-Match": updatedAt } : undefined,
    },
  ).then(normalizeUser);
}

/** DELETE /admin/users/:id?confirm=<username> — hard delete. */
export function deleteUser(id: string, confirm: string): Promise<void> {
  const qs = new URLSearchParams({ confirm }).toString();
  return unwrap<void>(`/admin/users/${encodeURIComponent(id)}?${qs}`, {
    method: "DELETE",
  });
}

/** POST /admin/users/:id/reset-password.
 *
 *  - With body `{ new_password: "..." }`, the server sets the user's
 *    password directly and returns `{ ok: true, mode: "set", message }`.
 *  - With no body (or `{}`), the server mints a 24h reset link and
 *    returns `{ ok: true, mode: "link", resetLink, expiresAt }`.
 *
 *  An empty-object body is always sent (not `undefined`) so FastAPI's
 *  Pydantic body parser is happy regardless of which path the backend
 *  actually validates.
 */
export function resetUserPassword(
  id: string,
  body?: { new_password: string },
): Promise<ResetPasswordResponse> {
  return unwrap<ResetPasswordResponse>(
    `/admin/users/${encodeURIComponent(id)}/reset-password`,
    { method: "POST", body: body ?? {} },
  );
}

/** POST /admin/users/:id/suspend — set status=suspended. */
export function suspendUser(id: string, updatedAt?: string): Promise<User> {
  return unwrap<RawUser | User>(
    `/admin/users/${encodeURIComponent(id)}/suspend`,
    {
      method: "POST",
      headers: updatedAt ? { "If-Match": updatedAt } : undefined,
    },
  ).then(normalizeUser);
}

/** POST /admin/users/:id/activate — set status=active. */
export function activateUser(id: string, updatedAt?: string): Promise<User> {
  return unwrap<RawUser | User>(
    `/admin/users/${encodeURIComponent(id)}/activate`,
    {
      method: "POST",
      headers: updatedAt ? { "If-Match": updatedAt } : undefined,
    },
  ).then(normalizeUser);
}

/** GET /admin/users/:id/menu-overrides — read overrides. */
export function getUserMenuOverrides(
  id: string,
): Promise<UserOverridesResponse> {
  return unwrap<UserOverridesResponse>(
    `/admin/users/${encodeURIComponent(id)}/menu-overrides`,
  );
}

/** PUT /admin/users/:id/menu-overrides — atomic replace. */
export function replaceUserMenuOverrides(
  id: string,
  body: UserOverridesReplace,
): Promise<UserOverridesResponse> {
  return unwrap<UserOverridesResponse>(
    `/admin/users/${encodeURIComponent(id)}/menu-overrides`,
    { method: "PUT", body },
  );
}

/** DELETE /admin/users/:id/menu-overrides — clear all. */
export function clearUserMenuOverrides(id: string): Promise<void> {
  return unwrap<void>(
    `/admin/users/${encodeURIComponent(id)}/menu-overrides`,
    { method: "DELETE" },
  );
}