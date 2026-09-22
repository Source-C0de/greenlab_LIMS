/**
 * Auth surface — token storage + endpoint helpers.
 *
 * Token is held in localStorage so a refresh keeps the user logged in.
 * `apiFetch` reads it via `getToken()` on every request (see `src/lib/api.ts`).
 *
 * All endpoints unwrap the standard `{ data: T }` envelope from the spec
 * (docs/api/openapi.yaml §Components §DataEnvelope).
 */

import type { Role } from "@/context/AppContext";
import { apiFetch } from "@/lib/api";

const TOKEN_KEY = "glims_auth_token";

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

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
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
  username: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  expiresAt: string;
  /** Optional token field. The spec doesn't currently include one (cookie-only);
   *  if the backend adds it, we persist it automatically. */
  token?: string;
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
  const env = await apiFetch<Envelope<T>>(path, init);
  return env.data;
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

export const logout = (): Promise<void> =>
  unwrap<void>("/auth/logout", { method: "POST" });

export const superadminLogout = (): Promise<void> =>
  unwrap<void>("/auth/superadmin/logout", { method: "POST" });

export const me = (): Promise<AuthUser> =>
  unwrap<AuthUser>("/auth/me");

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
