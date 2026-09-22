/**
 * TanStack Query hooks for the backend.
 *
 * Each hook is gated by `isApiEnabled()` so the app stays 100% mock-data
 * driven by default. Flip `VITE_USE_API=true` in `.env.local` to enable.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch, isApiEnabled, ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";

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
  const env = await apiFetch<Envelope<T>>(path, init);
  return env.data;
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
