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
    });

    return () => {
      unsubscribe();
    };
    // Runs once for the provider's lifetime. `setCurrentRole` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // The backend accepts either a username or an email; `buildLoginPayload`
      // routes a single identifier field to the right shape.
      const payload = req.username
        ? { username: req.username, password: req.password }
        : buildLoginPayload(req.email ?? "", req.password);

      // `signIn` THROWS on failure (rather than returning a Result): the
      // existing login page distinguishes `instanceof ApiError` (401 / 4xx)
      // from `instanceof TypeError` (network unreachable), and that
      // distinction carries UX meaning — wrong password vs backend down. The
      // HTTP adapter re-throws both unmodified.
      const session = await container.auth.signIn({
        email: payload.email ?? payload.username ?? "",
        password: payload.password,
      });
      return toUser(session);
    },
    [toUser],
  );

  const logout = useCallback(async (): Promise<void> => {
    await container.auth.signOut();
    setState({ status: "anonymous" });
    // Don't touch currentRole here — AppContext falls back to "admin" only when
    // no user is loaded. Keeping the previous role keeps in-flight queries
    // readable during the brief anonymous flicker.
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === "authenticated" ? state.user : null,
      isAuthenticated: state.status === "authenticated",
      isLoading: state.status === "loading",
      login,
      applyLoginResponse: applySession,
      logout,
    }),
    [state, login, applySession, logout],
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