/**
 * Auth surface — token storage + endpoint helpers.
 *
 * Token is held in localStorage so a refresh keeps the user logged in.
 * `apiFetch` reads it via `getToken()` on every request (see `src/lib/api.ts`).
 *
 * All endpoints unwrap the standard `{ data: T }` envelope from the spec
 * (docs/api/openapi.yaml §Components §DataEnvelope).
 */

import type { Role } from "@/shared/lib/types";
import { apiFetch } from "@/infrastructure/api/api";

const TOKEN_KEY = "glims_auth_token";
const REFRESH_KEY = "glims_auth_refresh";

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage may be unavailable (private mode, quota). The token simply
    // won't survive a refresh in that case — the user will need to log in again.
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REFRESH_KEY, token);
  } catch {
    // ignore
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Types — mirror docs/api/openapi.yaml User schema
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  fullName: string;
  fullNameAr?: string | null;
  role: Role;
  isActive: boolean;
  clientId?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  /** Username (canonical short handle). Use this OR `email`, never both. */
  username?: string;
  /** Email address. Use this OR `username`, never both. */
  email?: string;
  password: string;
}

/**
 * Routes the login form's single identifier field to the correct payload
 * shape. Backend authenticates against either `username` or `email` on the
 * users table. Detection rule: a string containing `@` is treated as an email;
 * everything else is a username. The form's `required` attribute guarantees
 * `identifier` is non-empty before this is called.
 */
export function buildLoginPayload(
  identifier: string,
  password: string,
): LoginRequest {
  const trimmed = identifier.trim();
  return trimmed.includes("@")
    ? { email: trimmed, password }
    : { username: trimmed, password };
}

export interface LoginResponse {
  /**
   * OAuth-style `access_token` (snake_case, JWT). Persisted to localStorage
   * on successful auth so subsequent `apiFetch` calls can attach it.
   */
  access_token: string;
  /** OAuth refresh token (snake_case). Not consumed by the SPA today —
   *  the backend re-issues a fresh pair on each successful `/auth/login`. */
  refresh_token?: string;
  token_type?: string;
  user: AuthUser;
}

export interface RegisterRequest {
  labName: string;
  labNameAr?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Envelope unwrap
// ---------------------------------------------------------------------------

interface Envelope<T> { data: T }

async function unwrap<T>(path: string, init?: Parameters<typeof apiFetch>[1]): Promise<T> {
  const env = await apiFetch<Envelope<T> | T>(path, init);
  // Backend contract (docs/api/openapi.yaml §Components §DataEnvelope) wraps
  // every response in `{ data: T }`, but in practice some endpoints (notably
  // login) currently return the raw object. Peel the envelope only when it's
  // actually present so both shapes work.
  if (env !== null && typeof env === "object" && "data" in env) {
    return (env as Envelope<T>).data;
  }
  return env as T;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const login = (body: LoginRequest): Promise<LoginResponse> =>
  unwrap<LoginResponse>("/auth/login", { method: "POST", body, skipAuth: true });

export const superadminLogin = (body: LoginRequest): Promise<LoginResponse> =>
  unwrap<LoginResponse>("/auth/superadmin/login", {
    method: "POST",
    body,
    skipAuth: true,
  });

/**
 * Logout. Sends the refresh token (if known) in the body so the server can
 * revoke it server-side. The `refresh_token` field is omitted when not
 * available so endpoints that only require an authenticated body still work.
 *
 * FastAPI returns 422 when a POST with `Content-Type: application/json` has
 * an empty body but a declared schema; we always send at least `{}` to
 * keep the parser happy regardless of the backend's exact schema.
 */
export const logout = (): Promise<void> => {
  const body = getRefreshToken() ? { refresh_token: getRefreshToken() } : {};
  return unwrap<void>("/auth/logout", { method: "POST", body });
};

export const superadminLogout = (): Promise<void> => {
  const body = getRefreshToken() ? { refresh_token: getRefreshToken() } : {};
  return unwrap<void>("/auth/superadmin/logout", { method: "POST", body });
};

export const me = (): Promise<AuthUser> =>
  unwrap<AuthUser>("/auth/me");

/**
 * Exchange a refresh token for a fresh token pair.
 *
 * The backend issues SHORT-LIVED access tokens (15 minutes, per the JWT `exp`
 * claim) alongside a longer-lived refresh token. Without redeeming the refresh
 * token, every session dies 15 minutes after login and the user is forced back
 * to the login screen on the next page load.
 *
 * Two contract details the caller must honour:
 *  - **The refresh token ROTATES.** Every response carries a NEW
 *    `refresh_token`; the previous one is invalidated. Persist the new value or
 *    the next refresh will fail.
 *  - **The response includes `user`**, so a successful refresh restores both
 *    the session and the user identity without a second `/auth/me` round-trip.
 *
 * `skipAuth: true` — the access token is expired or expiring, so sending it
 * would be pointless (and could mask a real 401 with a confusing one).
 *
 * Note: this endpoint is implemented by the backend but is NOT yet listed in
 * `docs/api/endpoints.md` or `docs/api/openapi.yaml`.
 */
export const refresh = (body: { refresh_token: string }): Promise<LoginResponse> =>
  unwrap<LoginResponse>("/auth/refresh", {
    method: "POST",
    body,
    skipAuth: true,
  });

/**
 * Read the `exp` claim from a JWT without verifying it.
 *
 * This is a CLIENT-SIDE hint only — it decides whether to proactively renew a
 * token, never whether to trust one. The server remains the sole authority on
 * whether a token is valid; this just avoids spending a doomed `/auth/me`
 * request to find out.
 *
 * Returns the expiry as epoch milliseconds, or `null` when the token is not a
 * parseable JWT (in which case the caller falls back to the reactive path).
 */
export function getTokenExpiry(token: string | null): number | null {
  if (!token) return null;
  const parts = token.split(".");
  // A JWT is header.payload.signature — we only need the payload.
  if (parts.length !== 3) return null;
  try {
    // base64url → base64: restore padding and swap the URL-safe alphabet.
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    // `atob` yields a binary string; decode it as UTF-8 so non-ASCII claims
    // (e.g. a name with an accent) don't corrupt the JSON.
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const payload = JSON.parse(json) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return null;
    }
    return payload.exp * 1000;
  } catch {
    // Not a JWT we can read — fall back to the reactive refresh path.
    return null;
  }
}

export const requestRegister = (body: RegisterRequest): Promise<void> =>
  unwrap<void>("/auth/register", { method: "POST", body, skipAuth: true });

export const forgotPassword = (email: string): Promise<void> =>
  unwrap<void>("/auth/password/forgot", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });

export const verifyOtp = (body: { email: string; otp: string }): Promise<LoginResponse> =>
  unwrap<LoginResponse>("/auth/otp/verify", {
    method: "POST",
    body,
    skipAuth: true,
  });

export const resendOtp = (email: string): Promise<void> =>
  unwrap<void>("/auth/otp/resend", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });
