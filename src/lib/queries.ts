/**
 * TanStack Query hooks for the backend.
 *
 * Each hook is gated by `isApiEnabled()` so the app stays 100% mock-data
 * driven by default. Flip `VITE_USE_API=true` in `.env.local` to enable.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiFetch, isApiEnabled, ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import {
  type ListFilters,
  type TestParameter,
  type TestParameterCreate,
  type TestParameterUpdate,
  createTestParameter as apiCreate,
  deleteTestParameter as apiDelete,
  listTestParameters as apiList,
  updateTestParameter as apiUpdate,
} from "@/lib/testParametersApi";
import {
  type User,
  type UserCreate,
  type UserUpdate,
  type ListUsersFilters,
  type Page,
  type ResetPasswordResponse,
  type UserOverridesResponse,
  type UserOverridesReplace,
  listUsers,
  createUser as apiCreateUser,
  getUser as apiGetUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  resetUserPassword as apiResetPassword,
  suspendUser as apiSuspendUser,
  activateUser as apiActivateUser,
  getUserMenuOverrides as apiGetUserMenuOverrides,
  replaceUserMenuOverrides as apiReplaceUserMenuOverrides,
  clearUserMenuOverrides as apiClearUserMenuOverrides,
} from "@/lib/usersApi";
import {
  type Role,
  type RoleUpdate,
  type RoleCreate,
  type RoleStatusUpdate,
  type RoleMenuPermissions,
  type RoleMenuPermissionsReplace,
  type AdminMenuKeyResponse,
  listRoles as apiListRoles,
  getRole as apiGetRole,
  updateRole as apiUpdateRole,
  setRoleStatus as apiSetRoleStatus,
  createRole as apiCreateRole,
  deleteRole as apiDeleteRole,
  getRoleMenuPermissions as apiGetRoleMenuPermissions,
  putRoleMenuPermissions as apiPutRoleMenuPermissions,
  listMenuKeys as apiListMenuKeys,
} from "@/lib/rolesApi";

export interface HealthResponse {
  status: string;
  [key: string]: unknown;
}

/** GET /health — smoke-test ping used by the header status badge. */
export function useHealth(): UseQueryResult<HealthResponse> {
  return useQuery<HealthResponse>({
    queryKey: ["api", "health"],
    queryFn: () => apiFetch<HealthResponse>("/health"),
    enabled: isApiEnabled(),
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 30_000,
  });
}

interface Envelope<T> { data: T }

/** Helper: unwrap the standard `{ data: T }` envelope. */
async function fetchEnvelope<T>(
  path: string,
  init?: Parameters<typeof apiFetch>[1],
): Promise<T> {
  const env = await apiFetch<Envelope<T> | T>(path, init);
  // Same dual-shape tolerance as `unwrap` in `@/lib/auth` — see comment there.
  if (env !== null && typeof env === "object" && "data" in env) {
    return (env as Envelope<T>).data;
  }
  return env as T;
}

/**
 * GET /auth/me — current user.
 *
 * 401 is expected for anonymous users; it surfaces as a normal `error`
 * (the AuthProvider handles the state transition). All other errors
 * propagate.
 */
export function useMe(): UseQueryResult<AuthUser> {
  return useQuery<AuthUser>({
    queryKey: ["api", "auth", "me"],
    queryFn: () => fetchEnvelope<AuthUser>("/auth/me"),
    enabled: isApiEnabled(),
    retry: (failureCount, error) => {
      // 401 means "no session" — that's not a transient failure.
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Test Parameter Catalogue — docs/test_parameter_api.md
// ---------------------------------------------------------------------------

export const testParameterKeys = {
  all: ["api", "test-parameters"] as const,
  list: (filters: ListFilters) =>
    [
      ...testParameterKeys.all,
      "list",
      {
        search: filters.search ?? "",
        spec: filters.spec ?? "",
        sop_code: filters.sop_code ?? "",
        is_active:
          typeof filters.is_active === "boolean" ? filters.is_active : null,
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
      },
    ] as const,
  detail: (id: string) => [...testParameterKeys.all, "detail", id] as const,
};

/** GET /test-parameters — list with filters. */
export function useTestParameters(
  filters: ListFilters = {},
): UseQueryResult<Awaited<ReturnType<typeof apiList>>> {
  return useQuery({
    queryKey: testParameterKeys.list(filters),
    queryFn: () => apiList({ ...filters, limit: filters.limit ?? 200 }),
    enabled: isApiEnabled(),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

/** GET /test-parameters/{id} — single. */
export function useTestParameter(
  id: string | null,
): UseQueryResult<TestParameter> {
  return useQuery({
    queryKey: testParameterKeys.detail(id ?? ""),
    queryFn: () => apiList({ limit: 200 }).then((p) => {
      // The contract has no GET-by-id consumer in the page, so this is a
      // safety net: when an id is provided but the endpoint is unreachable,
      // we fall back to a list scan. The single endpoint is also exposed
      // via testParametersApi.getTestParameter if needed elsewhere.
      const hit = p.items.find((r) => r.id === id);
      if (!hit) throw new ApiError(404, "Test parameter not found", null);
      return hit;
    }),
    enabled: isApiEnabled() && !!id,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

/** POST /test-parameters — create (admin). */
export function useCreateTestParameter(): UseMutationResult<
  TestParameter,
  unknown,
  TestParameterCreate
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TestParameterCreate) => apiCreate(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: testParameterKeys.all });
    },
  });
}

/** PATCH /test-parameters/{id} — partial update (admin). */
export function useUpdateTestParameter(): UseMutationResult<
  TestParameter,
  unknown,
  { id: string; body: TestParameterUpdate }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => apiUpdate(id, body),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: testParameterKeys.all });
      qc.setQueryData(testParameterKeys.detail(row.id), row);
    },
  });
}

/** DELETE /test-parameters/{id} — hard delete (admin). */
export function useDeleteTestParameter(): UseMutationResult<
  void,
  unknown,
  string
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(id),
    onSuccess: (_void, id) => {
      qc.invalidateQueries({ queryKey: testParameterKeys.all });
      qc.removeQueries({ queryKey: testParameterKeys.detail(id) });
    },
  });
}

// ---------------------------------------------------------------------------
// Users — docs/api_frontend/users.md §1
// ---------------------------------------------------------------------------

export const userKeys = {
  all: ["api", "users"] as const,
  list: (filters: ListUsersFilters) =>
    [
      ...userKeys.all,
      "list",
      {
        q: filters.q ?? "",
        role: filters.role ?? "",
        status: filters.status ?? "",
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
      },
    ] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
  overrides: (id: string) => [...userKeys.all, "overrides", id] as const,
};

/** GET /admin/users — list with filters. */
export function useUsers(
  filters: ListUsersFilters = {},
): UseQueryResult<Page<User>> {
  return useQuery<Page<User>>({
    queryKey: userKeys.list(filters),
    queryFn: () => listUsers(filters),
    enabled: isApiEnabled(),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

/** GET /admin/users/:id — single. */
export function useUser(id: string | null): UseQueryResult<User> {
  return useQuery<User>({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => apiGetUser(id as string),
    enabled: isApiEnabled() && !!id,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

/** POST /admin/users — create. */
export function useCreateUser(): UseMutationResult<
  User,
  unknown,
  UserCreate
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UserCreate) => apiCreateUser(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

/** PATCH /admin/users/:id — partial update. */
export function useUpdateUser(): UseMutationResult<
  User,
  unknown,
  { id: string; body: UserUpdate; updatedAt?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, updatedAt }) => apiUpdateUser(id, body, updatedAt),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.setQueryData(userKeys.detail(row.id), row);
    },
  });
}

/** DELETE /admin/users/:id — hard delete. */
export function useDeleteUser(): UseMutationResult<
  void,
  unknown,
  { id: string; confirm: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirm }) => apiDeleteUser(id, confirm),
    onSuccess: (_void, { id }) => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.removeQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

/** POST /admin/users/:id/reset-password.
 *
 *  When `newPassword` is provided, the SPA sends it in the body and the
 *  backend is expected to set the user's password directly. When omitted,
 *  the legacy "mint reset link" semantics apply (server emails a link).
 */
export function useResetUserPassword(): UseMutationResult<
  ResetPasswordResponse,
  unknown,
  { id: string; newPassword?: string }
> {
  return useMutation({
    mutationFn: ({ id, newPassword }) =>
      apiResetPassword(
        id,
        newPassword ? { new_password: newPassword } : undefined,
      ),
  });
}

/** POST /admin/users/:id/suspend — set status=suspended. */
export function useSuspendUser(): UseMutationResult<
  User,
  unknown,
  { id: string; updatedAt?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updatedAt }) => apiSuspendUser(id, updatedAt),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.setQueryData(userKeys.detail(row.id), row);
    },
  });
}

/** POST /admin/users/:id/activate — set status=active. */
export function useActivateUser(): UseMutationResult<
  User,
  unknown,
  { id: string; updatedAt?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updatedAt }) => apiActivateUser(id, updatedAt),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.setQueryData(userKeys.detail(row.id), row);
    },
  });
}

// --- User menu overrides (per-user delta) -----------------------------

/** GET /admin/users/:id/menu-overrides */
export function useUserMenuOverridesApi(
  userId: string | null,
): UseQueryResult<UserOverridesResponse> {
  return useQuery<UserOverridesResponse>({
    queryKey: userKeys.overrides(userId ?? ""),
    queryFn: () => apiGetUserMenuOverrides(userId as string),
    enabled: isApiEnabled() && !!userId,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

/** PUT /admin/users/:id/menu-overrides */
export function useReplaceUserMenuOverrides(): UseMutationResult<
  UserOverridesResponse,
  unknown,
  { id: string; body: UserOverridesReplace }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => apiReplaceUserMenuOverrides(id, body),
    onSuccess: (data, { id }) => {
      qc.setQueryData(userKeys.overrides(id), data);
    },
  });
}

/** DELETE /admin/users/:id/menu-overrides */
export function useClearUserMenuOverrides(): UseMutationResult<
  void,
  unknown,
  string
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClearUserMenuOverrides(id),
    onSuccess: (_void, id) => {
      qc.invalidateQueries({ queryKey: userKeys.overrides(id) });
    },
  });
}

// ---------------------------------------------------------------------------
// Menu-keys catalogue — spec §2.1
// ---------------------------------------------------------------------------

export const menuKeyKeys = {
  all: ["api", "admin", "menu-keys"] as const,
};

/** GET /admin/menu-keys — the 10 admin menu keys. */
export function useAdminMenuKeys(): UseQueryResult<AdminMenuKeyResponse[]> {
  return useQuery<AdminMenuKeyResponse[]>({
    queryKey: menuKeyKeys.all,
    queryFn: () => apiListMenuKeys(),
    enabled: isApiEnabled(),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000, // catalogue is static
  });
}

// ---------------------------------------------------------------------------
// Roles — spec §2
// ---------------------------------------------------------------------------

export const roleKeys = {
  all: ["api", "admin", "roles"] as const,
  list: () => [...roleKeys.all, "list"] as const,
  detail: (slug: string) => [...roleKeys.all, "detail", slug] as const,
  matrix: (slug: string) => [...roleKeys.all, "matrix", slug] as const,
};

/** GET /admin/roles */
export function useRoles(): UseQueryResult<Role[]> {
  return useQuery<Role[]>({
    queryKey: roleKeys.list(),
    queryFn: () => apiListRoles(),
    enabled: isApiEnabled(),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

/** GET /admin/roles/:role */
export function useRole(slug: string | null): UseQueryResult<Role> {
  return useQuery<Role>({
    queryKey: roleKeys.detail(slug ?? ""),
    queryFn: () => apiGetRole(slug as string),
    enabled: isApiEnabled() && !!slug,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

/** PATCH /admin/roles/:role */
export function useUpdateRole(): UseMutationResult<
  Role,
  unknown,
  { slug: string; body: RoleUpdate; updatedAt?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, body, updatedAt }) =>
      apiUpdateRole(slug, body, updatedAt),
    onSuccess: (row, { slug }) => {
      qc.invalidateQueries({ queryKey: roleKeys.all });
      qc.setQueryData(roleKeys.detail(slug), row);
    },
  });
}

/** PATCH /admin/roles/:role/status */
export function useSetRoleStatus(): UseMutationResult<
  Role,
  unknown,
  { slug: string; body: RoleStatusUpdate }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, body }) => apiSetRoleStatus(slug, body),
    onSuccess: (row, { slug }) => {
      qc.invalidateQueries({ queryKey: roleKeys.all });
      qc.setQueryData(roleKeys.detail(slug), row);
    },
  });
}

/** POST /admin/roles */
export function useCreateRole(): UseMutationResult<
  Role,
  unknown,
  RoleCreate
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RoleCreate) => apiCreateRole(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

/** DELETE /admin/roles/:role */
export function useDeleteRole(): UseMutationResult<
  void,
  unknown,
  string
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => apiDeleteRole(slug),
    onSuccess: (_void, slug) => {
      qc.invalidateQueries({ queryKey: roleKeys.all });
      qc.removeQueries({ queryKey: roleKeys.detail(slug) });
      qc.removeQueries({ queryKey: roleKeys.matrix(slug) });
    },
  });
}

/** GET /admin/roles/:role/menu-permissions */
export function useRoleMenuPermissionsApi(
  slug: string | null,
): UseQueryResult<RoleMenuPermissions> {
  return useQuery<RoleMenuPermissions>({
    queryKey: roleKeys.matrix(slug ?? ""),
    queryFn: () => apiGetRoleMenuPermissions(slug as string),
    enabled: isApiEnabled() && !!slug,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

/** PUT /admin/roles/:role/menu-permissions */
export function usePutRoleMenuPermissions(): UseMutationResult<
  RoleMenuPermissions,
  unknown,
  { slug: string; body: RoleMenuPermissionsReplace }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, body }) => apiPutRoleMenuPermissions(slug, body),
    onSuccess: (data, { slug }) => {
      qc.setQueryData(roleKeys.matrix(slug), data);
    },
  });
}
