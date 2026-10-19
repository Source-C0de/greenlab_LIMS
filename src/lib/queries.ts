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
