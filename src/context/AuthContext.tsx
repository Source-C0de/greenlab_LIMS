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
import { useAppContext } from "@/context/AppContext";
import { isApiEnabled, ApiError } from "@/lib/api";
import {
  clearToken,
  getToken,
  login as loginRequest,
  logout as logoutRequest,
  me as meRequest,
  setRefreshToken,
  setToken,
  type AuthUser,
  type LoginRequest,
  type LoginResponse,
} from "@/lib/auth";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type AuthState =
  | { status: "loading" }                       // bootstrap in flight (only meaningful in API mode)
  | { status: "anonymous" }                     // no user
  | { status: "authenticated"; user: AuthUser };

interface AuthContextValue {
  state: AuthState;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Imperatively log in. Throws ApiError on 401 / network failure. */
  login: (req: LoginRequest) => Promise<AuthUser>;
  /** Hydrate from an existing LoginResponse (e.g. OTP verify). No network. */
  applyLoginResponse: (response: LoginResponse) => AuthUser;
  /** Imperatively log out. Clears token + state. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setCurrentRole } = useAppContext();
  const [state, setState] = useState<AuthState>({ status: "anonymous" });

  // Timestamp of the most recent explicit auth mutation (login, hydrate
  // from a LoginResponse, logout). The bootstrap's late-arriving /me
  // response checks this to avoid clobbering state set by a login that
  // happened during the bootstrap's await window.
  const lastExplicitMutationAt = useRef<number>(0);

  const apiOn = isApiEnabled();

  // Bootstrap on mount — only when the user opted in to API mode.
  //
  // The bootstrap is best-effort and non-blocking. If the backend is
  // unreachable, the user can still log in from the login form. If
  // `/me` returns 401 (no session) we just stay anonymous.
  //
  // Critically: if the user has *already* logged in (e.g. a previous tab,
  // a previous mount, or a hard refresh after a successful login), the
  // `meRequest` race must never clobber the `authenticated` state. The
  // explicit-mutation timestamp check covers login + OTP + logout.
  useEffect(() => {
    if (!apiOn) {
      setState({ status: "anonymous" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      try {
        const raw = (await meRequest()) as RawAuthUser;
        if (cancelled) return;
        // A login may have happened while /me was in flight. If so, leave
        // the authenticated state alone — the explicit mutation wins.
        if (Date.now() - lastExplicitMutationAt.current < 2000) return;
        const user = normalizeAuthUser(raw, getToken() ?? "");
        setState({ status: "authenticated", user });
        setCurrentRole(user.role);
      } catch (err) {
        if (cancelled) return;
        // A login may have happened while /me was in flight. Don't clobber
        // the explicit "authenticated" state with a stale 401.
        if (Date.now() - lastExplicitMutationAt.current < 2000) return;
        // Any error (401, network, 5xx) → treat as anonymous so the UI is
        // usable. The login form will hit the backend directly.
        setState({ status: "anonymous" });
      }
    })();

    return () => {
      cancelled = true;
    };
    // setCurrentRole is stable per render; intentionally only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn]);

  const applyLoginResponse = useCallback(
    (response: LoginResponse): AuthUser => {
      lastExplicitMutationAt.current = Date.now();
      // Persist the bearer token (snake_case per the backend contract) so
      // subsequent `apiFetch` calls can attach it.
      if (response.access_token) setToken(response.access_token);
      if (response.refresh_token) setRefreshToken(response.refresh_token);
      // Normalize snake_case user fields to the SPA's `AuthUser` shape.
      const user: AuthUser = normalizeAuthUser(response.user, response.access_token);
      setState({ status: "authenticated", user });
      setCurrentRole(user.role);
      return user;
    },
    [setCurrentRole],
  );

  const login = useCallback(
    async (req: LoginRequest): Promise<AuthUser> => {
      const response = await loginRequest(req);
      return applyLoginResponse(response);
    },
    [applyLoginResponse],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (apiOn) await logoutRequest();
    } catch {
      // Even if the server logout fails, clear the local state — the user
      // wants out.
    }
    lastExplicitMutationAt.current = Date.now();
    clearToken();
    setState({ status: "anonymous" });
    // Don't touch currentRole here — the back-compat shim in AppContext falls
    // back to "admin" only when no user is loaded. Keeping the previous role
    // keeps in-flight queries readable during the brief anonymous flicker.
  }, [apiOn]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === "authenticated" ? state.user : null,
      isAuthenticated: state.status === "authenticated",
      isLoading: state.status === "loading",
      login,
      applyLoginResponse,
      logout,
    }),
    [state, login, applyLoginResponse, logout],
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

// ---------------------------------------------------------------------------
// Snake-case → camelCase adapter for the login response.
// The backend returns `{ access_token, user: { full_name, ... } }`; the SPA
// stores `AuthUser` with camelCase fields. Tolerate both shapes — if the
// snake_case field is already absent, fall back to the camelCase one.
// ---------------------------------------------------------------------------

interface RawAuthUser extends Partial<AuthUser> {
  full_name?: string;
  full_name_ar?: string;
  is_active?: boolean;
  client_id?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

function normalizeAuthUser(raw: RawAuthUser, token: string): AuthUser {
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
    // `createdAt` / `updatedAt` may be missing from the login payload.
    // Backfill so downstream code never reads `undefined`.
    createdAt: raw.createdAt ?? raw.created_at ?? now,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? now,
  };
}