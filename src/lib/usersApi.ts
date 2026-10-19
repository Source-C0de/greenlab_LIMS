/**
 * Users & Roles API — typed client for `docs/api_frontend/users.md`.
 *
 * All calls flow through `apiFetch` (Bearer auth, JSON envelopes,
 * structured ApiError). Activated via `VITE_USE_API=true`; the consuming
 * hooks gate on `isApiEnabled()` so the rest of the app stays mock-only.
 */

import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types — mirror docs/api_frontend/users.md §5
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

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  pagination: Pagination;
}

export interface Envelope<T> {
  data: T;
}

export interface ResetPasswordResponse {
  resetLink: string;
  expiresAt: string;
}

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
  requestId?: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tolerate the `{ data: T }` envelope (same dual-shape pattern as
 * `src/lib/auth.ts:unwrap`). The spec §"Response envelopes" mandates it for
 * success responses; for DELETE the server may return `{ data: null }`. */
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
  if (
    err &&
    typeof err === "object" &&
    "body" in err &&
    err.body &&
    typeof err.body === "object" &&
    "error" in (err.body as Record<string, unknown>)
  ) {
    const e = (err.body as ApiErrorEnvelope).error;
    if (e && typeof e === "object" && typeof e.code === "string") return e.code;
  }
  return null;
}

// ---------------------------------------------------------------------------
// User CRUD — spec §1
// ---------------------------------------------------------------------------

/** GET /admin/users — list with optional filters + pagination. */
export function listUsers(
  filters: ListUsersFilters = {},
): Promise<Page<User>> {
  return unwrap<Page<User>>(`/admin/users${buildListQuery(filters)}`);
}

/** POST /admin/users — create. Returns the new user + one-time tempPassword. */
export function createUser(body: UserCreate): Promise<User> {
  return unwrap<User>("/admin/users", { method: "POST", body });
}

/** GET /admin/users/:id — fetch one. */
export function getUser(id: string): Promise<User> {
  return unwrap<User>(`/admin/users/${encodeURIComponent(id)}`);
}

/** PATCH /admin/users/:id — partial update. Pass `updatedAt` for `If-Match`. */
export function updateUser(
  id: string,
  body: UserUpdate,
  updatedAt?: string,
): Promise<User> {
  return unwrap<User>(`/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
    headers: updatedAt ? { "If-Match": updatedAt } : undefined,
  });
}

/** DELETE /admin/users/:id?confirm=<username> — hard delete. */
export function deleteUser(id: string, confirm: string): Promise<void> {
  const qs = new URLSearchParams({ confirm }).toString();
  return unwrap<void>(`/admin/users/${encodeURIComponent(id)}?${qs}`, {
    method: "DELETE",
  });
}

/** POST /admin/users/:id/reset-password — mint reset link. */
export function resetUserPassword(id: string): Promise<ResetPasswordResponse> {
  return unwrap<ResetPasswordResponse>(
    `/admin/users/${encodeURIComponent(id)}/reset-password`,
    { method: "POST" },
  );
}

/** POST /admin/users/:id/suspend — set status=suspended. */
export function suspendUser(id: string, updatedAt?: string): Promise<User> {
  return unwrap<User>(`/admin/users/${encodeURIComponent(id)}/suspend`, {
    method: "POST",
    headers: updatedAt ? { "If-Match": updatedAt } : undefined,
  });
}

/** POST /admin/users/:id/activate — set status=active. */
export function activateUser(id: string, updatedAt?: string): Promise<User> {
  return unwrap<User>(`/admin/users/${encodeURIComponent(id)}/activate`, {
    method: "POST",
    headers: updatedAt ? { "If-Match": updatedAt } : undefined,
  });
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