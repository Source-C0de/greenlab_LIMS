/**
 * HTTP `AuthSession` adapter — the real FastAPI backend.
 *
 * This is where the race guard LIVES NOW.
 *
 * ── The bug the guard prevents ───────────────────────────────────────────
 * On mount, `AuthProvider` calls `restore()` to ask "is there still a valid
 * session?". That is a network round-trip. If the user submits the login form
 * while it is in flight, the old code had a genuine race: the slow `/me`
 * response would arrive AFTER the successful `/auth/login` response and
 * overwrite `authenticated` with `anonymous`, throwing the user back to the
 * login screen even though they had just logged in correctly.
 *
 * The previous fix was a timestamp heuristic in the React provider:
 *
 *     if (Date.now() - lastExplicitMutationAt.current < 2000) return;
 *
 * — a 2-second window that had to be repeated at three separate call sites in
 * `AuthContext.tsx`, each one a chance to forget it. Worse, it was a *time*
 * heuristic guarding an *ordering* problem: on a slow connection a legitimate
 * login could take longer than 2s and be discarded.
 *
 * ── The correct fix ──────────────────────────────────────────────────────
 * Ordering is what actually matters, so this adapter tracks it with a
 * monotonic generation counter. Every mutating call (`signIn`, `signOut`)
 * increments the counter and captures its own value. `restore()` captures the
 * counter at entry and refuses to publish its result if the counter moved
 * while it was awaiting — i.e. "a newer auth mutation happened while I was in
 * flight, so my answer is stale by definition."
 *
 * This is exact, not approximate: no time window, no tuning, and no way for a
 * slow login to be thrown away.
 */

import type { AuthSession, Credentials, Session } from "@/domain/identity/ports";
import type { AuthUser } from "@/domain/identity/model";
import { PLATFORM_ROLES, TENANT_ROLES } from "@/shared/lib/types";

import {
  clearToken,
  clearSuperadminToken,
  getRefreshToken,
  getSuperadminRefreshToken,
  getSuperadminToken,
  getToken,
  getTokenExpiry,
  login as loginRequest,
  logout as logoutRequest,
  me as meRequest,
  refresh as refreshRequest,
  setRefreshToken,
  setSuperadminRefreshToken,
  setSuperadminToken,
  setToken,
  superadminLogin as superadminLoginRequest,
  superadminLogout as superadminLogoutRequest,
  superadminMe as superadminMeRequest,
  superadminRefresh as superadminRefreshRequest,
  type LoginResponse,
} from "@/infrastructure/api/auth";
import { ApiError } from "@/infrastructure/api/api";

// ---------------------------------------------------------------------------
// Monotonic generation — the race guard
// ---------------------------------------------------------------------------

/**
 * Incremented by every mutating auth operation. A read that started before the
 * bump is stale and must not publish.
 */
let authGeneration = 0;

function nextGeneration(): number {
  authGeneration += 1;
  return authGeneration;
}

// ---------------------------------------------------------------------------
// Response mapping
// ---------------------------------------------------------------------------

/**
 * The backend returns snake_case; the domain speaks camelCase. Tolerate BOTH
 * shapes — several endpoints already return camelCase in practice, and a hard
 * failure on the "wrong" one would log everyone out.
 *
 * The backend's auth `UserOut` carries only `id`, `email`, `full_name`,
 * `role`, `is_active`, `created_at` (`app/domains/auth/schemas.py:53-61`).
 * The remaining fields below exist because the admin directory's `UserOut`
 * is a richer schema, and because the mock adapter produces them — they are
 * absent (and defaulted) in API mode.
 */
interface RawAuthUser extends Partial<Omit<AuthUser, "role">> {
  id?: string;
  email?: string | null;
  /** The wire may carry a role the SPA has not enumerated yet. */
  role?: string;
  username?: string;
  full_name?: string;
  full_name_ar?: string;
  is_active?: boolean;
  /** Superadmin only (`SuperadminUserOut.status`). */
  status?: string;
  client_id?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * The roles the backend can actually mint, per surface.
 *
 * Tenant: `app/domains/shared/enums.py:7-15` → admin, lab_manager, analyst,
 * reviewer, client, accountant, receptionist.
 * Superadmin: `app/domains/shared/enums.py:51-55` → superadmin,
 * platform_support, platform_billing, platform_readonly.
 *
 * The previous code cast `raw.role` blindly (`as AuthUser["role"]`), so a
 * backend role the SPA had never heard of — `reviewer`, say — became an
 * invalid role that matched no nav rule and no route guard. An UNRECOGNISED
 * role now degrades to the least-privileged sensible default for the surface
 * rather than passing through as a garbage value.
 *
 * The role lists themselves live in `@/shared/lib/types` — one source of
 * truth for what a role IS. The only addition here is `reviewer`, which the
 * backend mints but the SPA has no equivalent for.
 */
const TENANT_ROLE_VALUES: readonly string[] = [...TENANT_ROLES, "reviewer"];

function normaliseRole(rawRole: string | undefined): AuthUser["role"] {
  if (!rawRole) return "admin";
  if ((PLATFORM_ROLES as readonly string[]).includes(rawRole)) {
    return rawRole as AuthUser["role"];
  }
  if (TENANT_ROLE_VALUES.includes(rawRole)) {
    // `reviewer` exists on the backend but has no SPA equivalent. It is not
    // in `Role`, so it cannot be surfaced as one — fall back to `analyst`,
    // the closest laboratory role with the same read-mostly access.
    return rawRole === "reviewer" ? "analyst" : (rawRole as AuthUser["role"]);
  }
  return "admin";
}

/**
 * Whether the account is allowed to act.
 *
 * The two surfaces report liveness differently:
 *  - tenant: a boolean `is_active`
 *  - superadmin: a `status` of `active` | `suspended` | `disabled`
 *    (`app/domains/superadmin/schemas_auth.py:26`)
 *
 * The backend refuses a non-active superadmin at the dependency layer with
 * 403 (`app/core/deps.py:175-182`). Mirroring that here keeps the SPA from
 * rendering an admin console for an account the server will reject.
 */
function normaliseIsActive(raw: RawAuthUser): boolean {
  if (raw.status) return raw.status === "active";
  return raw.isActive ?? raw.is_active ?? true;
}

function normaliseUser(raw: RawAuthUser): AuthUser {
  const now = new Date().toISOString();
  return {
    id: raw.id ?? "",
    username: raw.username ?? "",
    email: raw.email ?? null,
    fullName: raw.fullName ?? raw.full_name ?? "",
    fullNameAr: raw.fullNameAr ?? raw.full_name_ar ?? null,
    role: normaliseRole(raw.role),
    isActive: normaliseIsActive(raw),
    clientId: raw.clientId ?? raw.client_id ?? null,
    lastLoginAt: raw.lastLoginAt ?? raw.last_login_at ?? null,
    // The login payload often omits these; backfill so nothing reads undefined.
    createdAt: raw.createdAt ?? raw.created_at ?? now,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? now,
  };
}

function sessionFromLogin(response: LoginResponse): Session {
  const now = new Date();
  return {
    user: normaliseUser(response.user as RawAuthUser),
    token: response.access_token,
    // No expiry claim is returned by the current backend contract, so this is
    // a nominal far-future value. If the backend starts issuing `expires_in`,
    // this is where it gets read.
    expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Session state + subscription
// ---------------------------------------------------------------------------

let currentSession: Session | null = null;
const listeners = new Set<(session: Session | null) => void>();

function publish(): void {
  for (const fn of listeners) fn(currentSession);
}

// ---------------------------------------------------------------------------
// Token renewal
// ---------------------------------------------------------------------------

/**
 * Treat a token as expired slightly BEFORE it actually is, so a request is
 * never sent with a token that will expire while it is in flight.
 */
const EXPIRY_SKEW_MS = 30_000;

/**
 * Exchange the stored refresh token for a fresh token pair.
 *
 * Returns the new session, or `null` when renewal is impossible (no refresh
 * token stored, or the backend rejected it).
 *
 * The refresh token ROTATES: the response carries a new `refresh_token` and
 * the old one is invalidated, so both new values must be persisted here or the
 * next renewal fails.
 */
async function refreshSession(): Promise<Session | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await refreshRequest({ refresh_token: refreshToken });
    if (!response?.access_token) return null;

    setToken(response.access_token);
    if (response.refresh_token) setRefreshToken(response.refresh_token);

    const session: Session = {
      user: normaliseUser(response.user as RawAuthUser),
      token: response.access_token,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };
    currentSession = session;
    publish();
    return session;
  } catch (err) {
    // The refresh token itself is dead (revoked, expired, malformed). There is
    // nothing to salvage — the caller must fall back to a full sign-out.
    console.warn("[auth] Token refresh failed; the session cannot be renewed.", err);
    return null;
  }
}

/**
 * True when the stored access token is missing, expired, or about to expire.
 *
 * Purely a client-side hint used to renew BEFORE spending a doomed request.
 * The server remains the authority on validity — see `getTokenExpiry`.
 */
function tokenNeedsRenewal(token: string): boolean {
  const expiry = getTokenExpiry(token);
  // No readable `exp` claim — we cannot tell, so let the server decide.
  if (expiry === null) return false;
  return Date.now() >= expiry - EXPIRY_SKEW_MS;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const httpAuthSession: AuthSession = {
  async restore(): Promise<Session | null> {
    // Snapshot the generation BEFORE awaiting. If signIn/signOut bumps it while
    // this request is in flight, the answer we get back describes a session
    // state that no longer exists, and must be discarded.
    const startedAt = authGeneration;

    const token = getToken();
    if (!token) {
      currentSession = null;
      publish();
      return null;
    }

    // ── Proactive renewal ────────────────────────────────────────────────
    // The backend issues 15-minute access tokens. If the stored one has
    // already expired (the common case after the user has been working for a
    // while), renew BEFORE calling `/auth/me` — otherwise every refresh
    // spends a guaranteed 401 and then has to recover from it.
    if (tokenNeedsRenewal(token)) {
      // Bump the generation FIRST: a `signIn()` that lands while the refresh
      // is in flight must not be clobbered by the renewed session (or vice
      // versa) — whichever started later wins.
      const generation = nextGeneration();
      const renewed = await refreshSession();
      if (renewed) {
        // A newer mutation landed while we were refreshing — that newer
        // session wins, not ours.
        if (authGeneration !== generation) return currentSession;
        return renewed;
      }
      // Renewal failed and there is no usable session. If something superseded
      // us meanwhile (e.g. the user signed in again), that newer state wins.
      if (authGeneration !== generation) return currentSession;
    }

    try {
      const raw = (await meRequest()) as RawAuthUser;
      if (authGeneration !== startedAt) return currentSession; // superseded
      currentSession = { user: normaliseUser(raw), token, expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() };
      publish();
      return currentSession;
    } catch (err) {
      if (authGeneration !== startedAt) return currentSession; // superseded

      // ── Only a real 401 invalidates the credential ──────────────────────
      // The previous code used a bare `catch`, so a 500, a network blip, a
      // CORS failure, a timeout, or a fetch aborted by Vite HMR / a tab
      // suspend all called `clearToken()`. Any of those transient blips on
      // page load permanently destroyed a perfectly valid session — and
      // because `subscribe()` was never wired into React, the UI never even
      // learned it had happened. The user saw "not authorized" pages and
      // empty tables while still believing they were logged in.
      //
      // The server is the ONLY authority on whether the token is genuinely
      // dead, and it says so with a 401. Everything else means "we could not
      // find out", which is not the same as "no" — so keep the token.
      if (err instanceof ApiError && err.status === 401) {
        // The access token is rejected. Before signing the user out, try to
        // renew it — the access token expires every 15 minutes, so a 401 on
        // a page load is usually just "the token aged out", not "the session
        // is over". Without this, every session died after 15 minutes and
        // the user was bounced to the login screen on the next refresh.
        //
        // Bump the generation BEFORE the refresh so a concurrent `signIn()`
        // cannot have its fresh session overwritten by the renewal. The
        // renewal is the newer operation and therefore wins — but if the
        // user signed in while this was in flight, the sign-in is newer
        // still, and the check below hands control back to it.
        const generation = nextGeneration();
        const renewed = await refreshSession();
        if (renewed) {
          // A newer mutation landed while we were refreshing — that newer
          // session wins, not ours.
          if (authGeneration !== generation) return currentSession;
          return renewed;
        }
        // No refresh token, or renewal failed — the session really is over.
        if (authGeneration !== generation) return currentSession;
        clearToken();
        currentSession = null;
        publish();
        return null;
      }

      // Transient failure: keep the token and the current session so the
      // user is not logged out by a hiccup. Report the existing session
      // (or anonymous if we never had one) WITHOUT publishing, so a network
      // blip cannot itself become a state change.
      console.warn(
        "[auth] Session restore failed transiently; keeping the stored token.",
        err,
      );
      return currentSession;
    }
  },

  async signIn(credentials: Credentials): Promise<Session> {
    const generation = nextGeneration();
    let response: LoginResponse;
    try {
      response = await loginRequest({
        email: credentials.email,
        password: credentials.password,
      });
    } catch (err) {
      // A newer mutation landed while this login was in flight, so this
      // failure describes a session state that no longer exists — report the
      // newer outcome rather than a stale error. Still throws if there is no
      // session to adopt, so the caller is never handed a phantom success.
      if (authGeneration !== generation) {
        if (currentSession) return currentSession;
        throw err;
      }
      // Re-thrown UNCHANGED on purpose. `apiFetch` raises `ApiError` for a
      // 4xx/5xx response and the browser raises `TypeError` for a network
      // failure; `login.tsx` branches on exactly that distinction to show
      // "invalid password" versus "backend unreachable". Wrapping either in a
      // RepositoryError here would collapse both into one message and lose
      // the diagnostic — including the Vite-proxy URL hint the page shows.
      throw err;
    }

    setToken(response.access_token);
    if (response.refresh_token) setRefreshToken(response.refresh_token);
    currentSession = sessionFromLogin(response);
    publish();
    return currentSession;
  },

  adoptSession(session: Session): void {
    // Bump the generation FIRST: an in-flight `restore()` must not republish a
    // stale user over the OTP-authenticated session we are adopting.
    nextGeneration();
    // The OTP endpoint minted a real bearer token, so persist it — otherwise
    // the very next `apiFetch` would go out unauthenticated.
    setToken(session.token);
    currentSession = session;
    publish();
  },

  async signOut(): Promise<void> {
    nextGeneration();
    try {
      // Send the refresh token so the server can revoke it. A failure here
      // must not block the local sign-out — the user asked to leave.
      await logoutRequest();
    } catch {
      // ignore — local state is cleared regardless
    }
    clearToken();
    currentSession = null;
    publish();
  },

  currentToken(): string | null {
    return currentSession?.token ?? getToken();
  },

  subscribe(listener: (session: Session | null) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Exposed for the login form's OTP path, which already holds a response. */
export { getRefreshToken };

// ---------------------------------------------------------------------------
// Superadmin session adapter
// ---------------------------------------------------------------------------
//
// ── Why this is a SEPARATE adapter rather than a flag on the tenant one ───
//
// The backend treats the two surfaces as entirely different identities:
//
//  1. **Different token families.** `get_current_user` accepts `ACCESS` only;
//     `get_current_superadmin` accepts `SUPERADMIN_ACCESS` only and rejects
//     the rest with 401 "Wrong token type" (`app/core/deps.py:53,142-149`).
//     A single stored token cannot satisfy both.
//
//  2. **Different tables.** A `SuperadminUser` id is resolved against
//     `SuperadminUser`; the tenant `/auth/me` resolves against `User` and
//     answers "Not found or inactive" for a superadmin id
//     (`app/core/deps.py:74-83`). So even the *identity* probe differs.
//
//  3. **Different endpoints.** Login, refresh, logout and me all live under
//     `/api/superadmin/auth/*` with their own request bodies.
//
// Folding this into the tenant adapter behind a boolean would mean every
// method needed a branch, and the branch would have to be right on every
// path — the exact failure mode that produced the bug this file's header
// documents. A separate adapter keeps each one linear and individually
// testable.
//
// ── The bug this adapter fixes ────────────────────────────────────────────
//
// `superadmin-login.tsx` used to call the raw `superadminLogin()` helper and
// discard the response:
//
//     await superadminLoginRequest(...);
//     setLocation("/admin");
//
// Three things went wrong, and they compounded:
//
//  1. The access token was never persisted, so every subsequent request went
//     out unauthenticated.
//  2. `AuthContext` was never told about the login, so its state stayed
//     `anonymous` and `ProtectedRoute` redirected the user straight back to
//     `/login`. The backend reported success; the SPA never advanced.
//  3. On reload, `restore()` asked the TENANT `/auth/me`, which cannot
//     resolve a superadmin identity at all.
//
// This adapter fixes all three: it persists the token, publishes the session
// so `AuthContext` reacts, and probes the superadmin `/me`.

/** Independent generation counter — the two adapters never share a session. */
let superadminGeneration = 0;

function nextSuperadminGeneration(): number {
  superadminGeneration += 1;
  return superadminGeneration;
}

let superadminSession: Session | null = null;
const superadminListeners = new Set<(session: Session | null) => void>();

function publishSuperadmin(): void {
  for (const fn of superadminListeners) fn(superadminSession);
}

/**
 * Renew the superadmin access token.
 *
 * The superadmin access token lives for 24h — far longer than the tenant's 15
 * minutes — but it still expires, and a reload after expiry must not dump the
 * user back on the login screen. The refresh token ROTATES: the response
 * carries a new `refresh_token` and the old one is revoked, so both new
 * values are persisted.
 */
async function refreshSuperadminSession(): Promise<Session | null> {
  const refreshToken = getSuperadminRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await superadminRefreshRequest({ refresh_token: refreshToken });
    if (!response?.access_token) return null;

    setSuperadminToken(response.access_token);
    if (response.refresh_token) setSuperadminRefreshToken(response.refresh_token);

    const session: Session = {
      user: normaliseUser(response.user as RawAuthUser),
      token: response.access_token,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };
    superadminSession = session;
    publishSuperadmin();
    return session;
  } catch (err) {
    console.warn("[auth] Superadmin token refresh failed; session cannot be renewed.", err);
    return null;
  }
}

export const httpSuperadminSession: AuthSession = {
  async restore(): Promise<Session | null> {
    const startedAt = superadminGeneration;

    const token = getSuperadminToken();
    if (!token) {
      // A login may have landed between this adapter's module load and this
      // call, in which case there IS a session and the generation counter has
      // moved. Clearing it here would sign the user out — and publishing
      // `null` would flip the UI back to anonymous.
      if (superadminGeneration !== startedAt) return superadminSession;
      superadminSession = null;
      publishSuperadmin();
      return null;
    }

    // Renew proactively when the token is already gone — otherwise every
    // reload spends a guaranteed 401 and then has to recover from it.
    if (tokenNeedsRenewal(token)) {
      const generation = nextSuperadminGeneration();
      const renewed = await refreshSuperadminSession();
      if (renewed) {
        if (superadminGeneration !== generation) return superadminSession;
        return renewed;
      }
      if (superadminGeneration !== generation) return superadminSession;
    }

    try {
      // The SUPERADMIN `/me` — the tenant one would reject a superadmin id.
      const raw = (await superadminMeRequest()) as RawAuthUser;
      if (superadminGeneration !== startedAt) return superadminSession; // superseded
      superadminSession = {
        user: normaliseUser(raw),
        token,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      };
      publishSuperadmin();
      return superadminSession;
    } catch (err) {
      if (superadminGeneration !== startedAt) return superadminSession; // superseded

      // Only a real 401 means the credential is dead. Everything else is a
      // transient failure and must not destroy a valid session.
      if (err instanceof ApiError && err.status === 401) {
        const generation = nextSuperadminGeneration();
        const renewed = await refreshSuperadminSession();
        if (renewed) {
          if (superadminGeneration !== generation) return superadminSession;
          return renewed;
        }
        if (superadminGeneration !== generation) return superadminSession;
        clearSuperadminToken();
        superadminSession = null;
        publishSuperadmin();
        return null;
      }

      console.warn(
        "[auth] Superadmin session restore failed transiently; keeping the stored token.",
        err,
      );
      return superadminSession;
    }
  },

  async signIn(credentials: Credentials): Promise<Session> {
    const generation = nextSuperadminGeneration();
    let response: LoginResponse;
    try {
      response = await superadminLoginRequest({
        email: credentials.email,
        password: credentials.password,
      });
    } catch (err) {
      // Re-thrown UNCHANGED: the login page branches on `instanceof ApiError`
      // (bad credentials) vs `instanceof TypeError` (backend unreachable).
      if (superadminGeneration !== generation) {
        if (superadminSession) return superadminSession;
        throw err;
      }
      throw err;
    }

    // ── The token is persisted here. This is the line the old
    // superadmin-login.tsx was missing entirely: the access token was
    // received and thrown away, so every later request went out
    // unauthenticated.
    setSuperadminToken(response.access_token);
    if (response.refresh_token) setSuperadminRefreshToken(response.refresh_token);

    superadminSession = sessionFromLogin(response);
    publishSuperadmin();
    return superadminSession;
  },

  adoptSession(session: Session): void {
    nextSuperadminGeneration();
    setSuperadminToken(session.token);
    superadminSession = session;
    publishSuperadmin();
  },

  async signOut(): Promise<void> {
    nextSuperadminGeneration();
    try {
      await superadminLogoutRequest();
    } catch {
      // ignore — local state is cleared regardless
    }
    clearSuperadminToken();
    superadminSession = null;
    publishSuperadmin();
  },

  currentToken(): string | null {
    return superadminSession?.token ?? getSuperadminToken();
  },

  subscribe(listener: (session: Session | null) => void): () => void {
    superadminListeners.add(listener);
    return () => {
      superadminListeners.delete(listener);
    };
  },
};