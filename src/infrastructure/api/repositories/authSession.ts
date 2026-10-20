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

import {
  clearToken,
  getRefreshToken,
  getToken,
  login as loginRequest,
  logout as logoutRequest,
  me as meRequest,
  setRefreshToken,
  setToken,
  type LoginResponse,
} from "@/infrastructure/api/auth";

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
 */
interface RawAuthUser extends Partial<AuthUser> {
  full_name?: string;
  full_name_ar?: string;
  is_active?: boolean;
  client_id?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

function normaliseUser(raw: RawAuthUser): AuthUser {
  const now = new Date().toISOString();
  return {
    id: raw.id ?? "",
    username: raw.username ?? "",
    email: raw.email ?? null,
    fullName: raw.fullName ?? raw.full_name ?? "",
    fullNameAr: raw.fullNameAr ?? raw.full_name_ar ?? null,
    role: (raw.role ?? "admin") as AuthUser["role"],
    isActive: raw.isActive ?? raw.is_active ?? true,
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

    try {
      const raw = (await meRequest()) as RawAuthUser;
      if (authGeneration !== startedAt) return currentSession; // superseded
      currentSession = { user: normaliseUser(raw), token, expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() };
      publish();
      return currentSession;
    } catch {
      if (authGeneration !== startedAt) return currentSession; // superseded
      // Any failure (401, network, 5xx) means "no usable session". Clearing
      // the token prevents a permanently-broken credential from being retried
      // on every subsequent mount.
      clearToken();
      currentSession = null;
      publish();
      return null;
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