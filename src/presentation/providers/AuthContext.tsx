/**
 * Auth state for the SPA.
 *
 * PHASE 4: this component no longer knows whether the backend exists.
 *
 * BEFORE: it imported `isApiEnabled()` and branched — `if (apiOn) await
 * logoutRequest()`, a bespoke bootstrap effect, direct calls into
 * `infrastructure/api/auth`, and a 2-second timestamp heuristic repeated at
 * three call sites to stop a slow `/me` from clobbering a fresh login.
 *
 * AFTER: it talks to the `AuthSession` port and nothing else. The mock and HTTP
 * adapters are selected once in `infrastructure/di/container.ts`.
 *
 * The race guard MOVED, it was not deleted. It now lives in the HTTP adapter as
 * a monotonic generation counter — an exact ordering check rather than a time
 * window, so a slow login is never discarded and there is no magic number to
 * tune. See `infrastructure/api/repositories/authSession.ts` for the full
 * explanation.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/presentation/providers/AppContext";
import { currentMockRole } from "@/infrastructure/mock/repositories/authSession";
import { container } from "@/infrastructure/di/container";
import type { AuthUser } from "@/domain/identity/model";
import type { Session } from "@/domain/identity/ports";
import {
  buildLoginPayload,
  type LoginRequest,
  type LoginResponse,
} from "@/infrastructure/api/auth";

/**
 * Role to fall back to when there is no authenticated user. Matches the
 * fallback `AppProvider` itself uses on a fresh mount, so an anonymous app
 * renders exactly as it does on first paint — no stale role leaking through
 * from a previous session.
 */
const DEFAULT_ROLE = currentMockRole();

// ---------------------------------------------------------------------------
// State machine — unchanged shape, so every consumer keeps working
// ---------------------------------------------------------------------------

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser };

interface AuthContextValue {
  state: AuthState;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Imperatively log in. Returns the user, or throws on bad credentials. */
  login: (req: LoginRequest) => Promise<AuthUser>;
  /** Hydrate from an already-obtained LoginResponse (OTP verify). No network. */
  applyLoginResponse: (response: LoginResponse) => AuthUser;
  /** Imperatively log out. Clears token + state. */
  logout: () => Promise<void>;
  /**
   * Sign in against the **superadmin** surface.
   *
   * Kept separate from `login()` because the two are different identities:
   * the backend mints a different token family for each and resolves them
   * against different tables (`app/core/deps.py:49-83,109-183`). The
   * superadmin session therefore has its own storage slot and its own
   * restore path — see `infrastructure/api/repositories/authSession.ts`.
   */
  superadminLogin: (req: LoginRequest) => Promise<AuthUser>;
  /** Sign out of the superadmin surface. */
  superadminLogout: () => Promise<void>;
  /** True when a superadmin session is active. */
  isSuperadminAuthenticated: boolean;
  /**
   * True while the superadmin session is still being resolved — either the
   * initial bootstrap (`restore()` against `/api/superadmin/auth/me`) or a
   * sign-in that has not yet committed its state.
   *
   * Route guards MUST consult this before concluding "not authenticated".
   * See the `pending` flag below for the React 18 scheduling subtlety that
   * makes this necessary — the same race, on the superadmin surface.
   */
  isSuperadminLoading: boolean;
  /** The authenticated superadmin, or null. */
  superadminUser: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setCurrentRole } = useAppContext();

  // The initial state MUST be "loading", not "anonymous".
  //
  // The bootstrap `restore()` below runs in a `useEffect`, which React invokes
  // AFTER the first render. So on the very first render the session has not
  // been checked yet, and the correct state to report is "we don't know" —
  // i.e. still loading. Starting as "anonymous" made `ProtectedRoute` render
  // `<Redirect to="/login" />` on that first paint, before `/auth/me` had even
  // been requested. The bootstrap then completed successfully (the `/auth/me`
  // 200 was visible in the network tab) but the redirect had already fired,
  // so refreshing the browser always landed on the login screen even though
  // the session was valid the whole time.
  //
  // "loading" is also the safe default: `ProtectedRoute` renders nothing while
  // loading, so a logged-in user sees a blank frame for a moment instead of a
  // wrong-page flash.
  const [state, setState] = useState<AuthState>({ status: "loading" });

  // The TanStack Query cache, used to drop the previous user's cached
  // `["api", "auth", …]` entries on every session change. The provider is
  // mounted INSIDE `<QueryClientProvider>` (see `App.tsx`), so the client is
  // available here.
  const queryClient = useQueryClient();

  // True from the moment a sign-in STARTS until its state has committed.
  //
  // ═══ THE LOGIN→NAVIGATE RACE ═══════════════════════════════════════════
  // This flag exists because of a React 18 scheduling subtlety that bounced
  // a successfully-logged-in user straight back to the login screen — on
  // BOTH the tenant and the superadmin surface:
  //
  //   1. `signIn()` resolves in a microtask; the adapter publishes the session.
  //   2. `setState({authenticated})` is scheduled from that microtask.
  //   3. The login page calls `setLocation("/dashboard")` — a NAVIGATION, in
  //      a SEPARATE task.
  //
  // React 18 batches updates only within a single synchronous task, so steps 2
  // and 3 are NOT batched together. Worse, a navigation render is dispatched
  // on React's SyncLane, which does NOT wait for the provider's pending
  // DefaultLane update. Wouter can therefore render the target route BEFORE
  // the provider has re-rendered with the new state. The guard reads the
  // STALE context value (`isAuthenticated: false`) and redirects back to
  // `/login` — the user is bounced even though the backend reported success
  // and the token was stored correctly.
  //
  // While this flag is set, `isLoading` stays true, so `ProtectedRoute`
  // renders NOTHING instead of redirecting on a stale value. The next render
  // sees the truth.
  //
  // `superadminPending` below is the same mechanism for the superadmin
  // surface, which is a separate identity with its own state.
  // ═══════════════════════════════════════════════════════════════════════
  const [pending, setPending] = useState(false);

  // The superadmin session is a SEPARATE identity from the tenant one, so it
  // gets its own state rather than overloading `state`. A user can be
  // authenticated against the tenant API and the platform API at once — the
  // backend issues distinct token families for each — and collapsing them
  // would mean one login silently signed the other out.
  const [superadminState, setSuperadminState] = useState<AuthState>({
    status: "loading",
  });

  // The superadmin counterpart of `pending` — see the note there.
  const [superadminPending, setSuperadminPending] = useState(false);

  // Guards the one-shot bootstrap network call below against resolving after the
  // provider unmounts. Deliberately NOT used by the subscription effect further
  // down — see the note there for why sharing it broke login.
  const mounted = useRef(true);

  // ---------------------------------------------------------------------
  // Bootstrap — one call, no branching on which backend is live.
  // ---------------------------------------------------------------------
  useEffect(() => {
    mounted.current = true;
    // No `setState({ status: "loading" })` here — the initial state is already
    // "loading" (see above), which is what keeps the very first render from
    // redirecting an authenticated user to /login before `/auth/me` is asked.

    let cancelled = false;
    void container.auth.restore().then((session) => {
      if (cancelled || !mounted.current) return;
      if (session) {
        setState({ status: "authenticated", user: session.user });
        setCurrentRole(session.user.role);
      } else {
        // Reset the role on the anonymous branch too. Previously it was left
        // as-is, so a failed restore rendered the app with a role that no
        // longer matched the (now anonymous) auth state — which is what made
        // role-gated pages flash "غير مصرح" for a user who never logged out.
        setCurrentRole(DEFAULT_ROLE);
        setState({ status: "anonymous" });
      }
    });

    return () => {
      cancelled = true;
      mounted.current = false;
    };
    // Runs once. `setCurrentRole` is stable for the lifetime of the provider,
    // and re-running the bootstrap would risk re-introducing the very race the
    // adapter now guards against.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Mirror adapter-side session changes into React state.
  // ---------------------------------------------------------------------
  // `container.auth.subscribe` was implemented by both adapters but never
  // called, so every `publish()` in the adapter fired into an empty listener
  // set. That left the adapter's `currentSession` and this provider's `state`
  // as two independent copies that could silently diverge — the root cause of
  // the "logged in but unauthorized" symptom. Wiring the port closes that gap:
  // any mutation the adapter makes (sign-in, sign-out, OTP adoption, a genuine
  // 401 during restore) now updates the UI.
  //
  // NOTE: deliberately NOT guarded by `mounted`. That ref is owned by the
  // bootstrap effect above, and its cleanup sets it to `false` when the
  // provider unmounts. The subscriber must not consult it:
  //
  // `publish()` fires *synchronously* from inside `signIn()`, i.e. while the
  // user is mid-login. If `mounted.current` was false at that moment, the
  // subscriber silently discarded the brand-new session, React state stayed
  // `anonymous`, and the navigation that followed was bounced straight back
  // to `/login` by ProtectedRoute. The backend reported success but the SPA
  // never advanced, with no error shown anywhere. Before ProtectedRoute
  // existed this was invisible, because every page rendered regardless of
  // auth state.
  //
  // Nothing needs guarding here: `publish()` only fires in response to calls
  // this provider itself makes (never a late-resolving network call), and
  // React 18 does not warn on setState-after-unmount.
  useEffect(() => {
    const unsubscribe = container.auth.subscribe((session) => {
      if (session) {
        setState({ status: "authenticated", user: session.user });
        setCurrentRole(session.user.role);
      } else {
        setCurrentRole(DEFAULT_ROLE);
        setState({ status: "anonymous" });
      }
      // Drop every cached `["api", "auth", …]` entry — including the
      // resolved menu set (`["api", "auth", "menus"]`). The next user must
      // never see the previous user's menus: the cached payload is keyed by
      // nothing but the query key, so without this a sign-out/sign-in on the
      // same browser would briefly render the previous user's sidebar.
      queryClient.removeQueries({ queryKey: ["api", "auth"] });
    });

    return () => {
      unsubscribe();
    };
    // Runs once for the provider's lifetime. `setCurrentRole` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Superadmin bootstrap — a separate restore, against a separate identity.
  // ---------------------------------------------------------------------
  // The tenant bootstrap above probes the TENANT `/auth/me`, which resolves
  // the token subject against the `User` table (`app/core/deps.py:74-83`) — a
  // superadmin's id lives in `SuperadminUser`, so the tenant `/me` answers
  // "Not found or inactive" for a perfectly valid superadmin token. The
  // superadmin session therefore needs its own probe
  // (`/api/superadmin/auth/me`).
  //
  // The superadmin role is NOT pushed into `AppContext.currentRole` — that
  // slot drives the tenant sidebar, and a platform operator's menu is a
  // different thing from a laboratory role's menu.
  useEffect(() => {
    let cancelled = false;

    void container.superadminAuth.restore().then((session) => {
      if (cancelled) return;
      if (session) {
        setSuperadminState({ status: "authenticated", user: session.user });
      } else {
        setSuperadminState({ status: "anonymous" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror superadmin adapter-side changes into React state, exactly as the
  // tenant subscription above does for the tenant session.
  useEffect(() => {
    const unsubscribe = container.superadminAuth.subscribe((session) => {
      if (session) {
        setSuperadminState({ status: "authenticated", user: session.user });
      } else {
        setSuperadminState({ status: "anonymous" });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const toUser = useCallback(
    (session: Session): AuthUser => {
      setState({ status: "authenticated", user: session.user });
      setCurrentRole(session.user.role);
      return session.user;
    },
    [setCurrentRole],
  );

  const applySession = useCallback(
    (response: LoginResponse): AuthUser => {
      // The HTTP adapter owns token persistence and the response mapping; the
      // provider just hands it the session and reflects the result.
      const session: Session = {
        user: response.user as AuthUser,
        token: response.access_token,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      };
      container.auth.adoptSession(session);
      return toUser(session);
    },
    [toUser],
  );

  const login = useCallback(
    async (req: LoginRequest): Promise<AuthUser> => {
      // The backend authenticates by **email only**
      // (`app/domains/auth/schemas.py:11-13`), so the identifier is always
      // sent as `email`.
      const payload = buildLoginPayload(req.email ?? "", req.password);

      // Mark the session as "in flight" for the whole request, so
      // `isLoading` stays true and `ProtectedRoute` renders nothing rather
      // than redirecting on a stale `isAuthenticated: false`. See the note
      // on the `pending` flag above for why this is necessary.
      setPending(true);

      try {
        // `signIn` THROWS on failure (rather than returning a Result): the
        // existing login page distinguishes `instanceof ApiError` (401 / 4xx)
        // from `instanceof TypeError` (network unreachable), and that
        // distinction carries UX meaning — wrong password vs backend down. The
        // HTTP adapter re-throws both unmodified.
        const session = await container.auth.signIn({
          email: payload.email,
          password: payload.password,
        });
        return toUser(session);
      } finally {
        // Cleared AFTER the state is set, so React commits both together and
        // the guard never observes "not loading, not authenticated".
        setPending(false);
      }
    },
    [toUser],
  );

  const logout = useCallback(async (): Promise<void> => {
    setPending(true);
    try {
      await container.auth.signOut();
      setState({ status: "anonymous" });
      // Drop the cached `["api", "auth", …]` family (including the resolved
      // menu set). The session subscription below does the same, but the
      // mock adapter's `signOut` does not publish a session change, so the
      // cleanup must not depend on the subscription firing.
      queryClient.removeQueries({ queryKey: ["api", "auth"] });
      // Don't touch currentRole here — AppContext falls back to "admin" only when
      // no user is loaded. Keeping the previous role keeps in-flight queries
      // readable during the brief anonymous flicker.
    } finally {
      setPending(false);
    }
  }, [queryClient]);

  // ---------------------------------------------------------------------
  // Superadmin sign-in / sign-out
  // ---------------------------------------------------------------------
  //
  // These go through the `superadminAuth` port, NOT the tenant `auth` port.
  // The old `superadmin-login.tsx` bypassed the port entirely and called the
  // raw `superadminLogin()` HTTP helper, which is what broke the flow:
  //
  //   1. The returned token was discarded — nothing called `setToken()`, so
  //      every later request went out unauthenticated.
  //   2. `AuthContext` was never updated, so `state` stayed `anonymous` and
  //      `ProtectedRoute` redirected straight back to `/login`. The backend
  //      reported success; the SPA never advanced.
  //
  // Routing through the port fixes both: the adapter persists the token and
  // publishes the session, and the subscription above mirrors that publish
  // into React state.
  const superadminLogin = useCallback(
    async (req: LoginRequest): Promise<AuthUser> => {
      const payload = buildLoginPayload(req.email ?? "", req.password);

      // Mark the session as "in flight" for the whole duration of the
      // request — see the `pending` note above for the race this closes.
      setSuperadminPending(true);

      try {
        // Throws `ApiError` for 4xx/5xx and `TypeError` for a network
        // failure — the login page branches on that distinction.
        const session = await container.superadminAuth.signIn({
          email: payload.email,
          password: payload.password,
        });

        // The adapter's `publish()` already updated `superadminState` via the
        // subscription; this explicit set keeps the state correct even if the
        // subscription has not flushed yet in the same tick.
        setSuperadminState({ status: "authenticated", user: session.user });
        return session.user;
      } finally {
        // Cleared AFTER the state is set, so the guard never observes
        // "not loading, not authenticated".
        setSuperadminPending(false);
      }
    },
    [],
  );

  const superadminLogout = useCallback(async (): Promise<void> => {
    setSuperadminPending(true);
    try {
      await container.superadminAuth.signOut();
      setSuperadminState({ status: "anonymous" });
    } finally {
      setSuperadminPending(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === "authenticated" ? state.user : null,
      isAuthenticated: state.status === "authenticated",
      // "Loading" covers the initial bootstrap AND an in-flight sign-in. The
      // guard renders nothing while loading, so it can never redirect on a
      // stale "not authenticated" value — see the `pending` flag's note.
      isLoading: state.status === "loading" || pending,
      login,
      applyLoginResponse: applySession,
      logout,
      superadminLogin,
      superadminLogout,
      isSuperadminAuthenticated: superadminState.status === "authenticated",
      // Loading while the bootstrap is unresolved OR a sign-in is in flight.
      // The guard renders nothing in that window, so it can never redirect on
      // a stale "not authenticated" value.
      isSuperadminLoading:
        superadminPending || superadminState.status === "loading",
      superadminUser:
        superadminState.status === "authenticated" ? superadminState.user : null,
    }),
    [
      state,
      login,
      applySession,
      logout,
      superadminLogin,
      superadminLogout,
      superadminState,
      superadminPending,
      pending,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}