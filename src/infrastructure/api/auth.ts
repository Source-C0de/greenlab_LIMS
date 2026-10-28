/**
 * Auth surface — token storage + endpoint helpers.
 *
 * Token is held in localStorage so a refresh keeps the user logged in.
 * `apiFetch` reads it via `getToken()` on every request (see
 * `src/infrastructure/api/api.ts`).
 *
 * The backend is **Bearer-only** — it sets no cookies and has no CSRF
 * mechanism (`app/core/deps.py:33`; zero `set_cookie`/`csrf` hits in `app/`).
 *
 * All endpoints unwrap the standard `{ data: T, meta: T }` envelope. The
 * client requests the `enveloped` contract via `X-LIMS-API-Version`.
 *
 * Two API surfaces exist and they are **siblings**, not parent/child:
 *   - tenant API     → `/api/v1`
 *   - superadmin API → `/api/superadmin`
 * Superadmin calls therefore pass `getSuperadminBaseUrl()` explicitly.
 */

import type { Role } from "@/shared/lib/types";
import { apiFetch, getSuperadminBaseUrl } from "@/infrastructure/api/api";
import { unwrapData, type SuccessEnvelope } from "@/infrastructure/api/response";

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

/**
 * The wire shape of the user returned by the **auth** endpoints — six fields
 * (`app/domains/auth/schemas.py:53-61`). The adapter maps this onto the
 * richer domain `AuthUser` (`src/domain/identity/model.ts`).
 */
export interface AuthUser {
  id: string;
  email?: string | null;
  full_name?: string;
  role: Role;
  is_active?: boolean;
  created_at?: string;
}

export interface LoginRequest {
  /** The backend authenticates by **email only** (`app/domains/auth/schemas.py:11-13`). */
  email: string;
  password: string;
}

/**
 * Builds the login payload from the form's single identifier field.
 *
 * The identifier is always sent as `email` — the backend has no `username`
 * field, so a `{ username, password }` body would 422 on the missing
 * required `email`. The form still labels the field "Username or Email" for
 * the mock flow; in API mode the value must be an email address.
 */
export function buildLoginPayload(
  identifier: string,
  password: string,
): LoginRequest {
  const trimmed = identifier.trim();
  // The backend has no `username` field, so the identifier is sent as
  // `email` regardless. An identifier without "@" is still sent as-is: the
  // server owns validation and will return a clear 422 if it is not an
  // email address.
  return { email: trimmed, password };
}

export interface LoginResponse {
  /** Persisted to localStorage so subsequent `apiFetch` calls can attach it. */
  access_token: string;
  /** Rotated on every refresh — the presented token is revoked (`app/domains/auth/service.py:160-163`). */
  refresh_token?: string;
  token_type?: string;
  /** Superadmin response only (`app/domains/superadmin/schemas_auth.py:36`); the tenant `Token` schema has none. */
  expires_in?: number;
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

/**
 * Every endpoint the frontend calls answers with the canonical `enveloped`
 * contract, so the payload is always at `data`. Unwrapping is explicit here
 * (rather than hidden inside `apiFetch`) so a call site that wants a list, a
 * page, or a `null` says which one it expects.
 */
async function unwrap<T>(path: string, init?: Parameters<typeof apiFetch>[1]): Promise<T> {
  const env = await apiFetch<SuccessEnvelope<T>>(path, init);
  return unwrapData(env);
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const login = (body: LoginRequest): Promise<LoginResponse> =>
  unwrap<LoginResponse>("/auth/login", { method: "POST", body, skipAuth: true });

/**
 * Superadmin login. The superadmin surface is a sibling of the tenant API, so
 * it needs its own base URL and has its own token family
 * (`app/core/security.py:54-58`).
 */
export const superadminLogin = (body: LoginRequest): Promise<LoginResponse> =>
  unwrap<LoginResponse>("/auth/login", {
    method: "POST",
    body,
    skipAuth: true,
    baseUrl: getSuperadminBaseUrl(),
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
  return unwrap<void>("/auth/logout", {
    method: "POST",
    body,
    baseUrl: getSuperadminBaseUrl(),
  });
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

/**
 * Tenant self-registration request.
 *
 * ⚠️ **The backend has no `/auth/register` route** — this 404s. Tenant
 * creation lives under `/api/superadmin/tenants`
 * (`app/domains/superadmin/router_tenant.py:91`).
 *
 * Kept because hiding the register page vs. adding a backend route is a
 * product call, not a code call. See the audit report, Phase 2.
 */
export const requestRegister = (body: RegisterRequest): Promise<void> =>
  unwrap<void>("/auth/register", { method: "POST", body, skipAuth: true });

export const forgotPassword = (email: string): Promise<void> =>
  unwrap<void>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });

/**
 * Verify an OTP code. The backend field is `code`, not `otp`
 * (`OtpVerifyRequest`, `app/domains/auth/schemas.py:28-30`).
 */
export const verifyOtp = (body: {
  email: string;
  code: string;
}): Promise<LoginResponse> =>
  unwrap<LoginResponse>("/auth/otp-verify", {
    method: "POST",
    body,
    skipAuth: true,
  });

/**
 * ⚠️ **The backend has no `/auth/otp/resend` route** — this 404s. Kept for
 * the same reason as `requestRegister`.
 */
export const resendOtp = (email: string): Promise<void> =>
  unwrap<void>("/auth/otp/resend", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });
