import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAppContext } from "@/context/AppContext";
import { isApiEnabled, ApiError } from "@/lib/api";
import {
  clearToken,
  login as loginRequest,
  logout as logoutRequest,
  me as meRequest,
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

  const apiOn = isApiEnabled();

  // Bootstrap on mount — only when the user opted in to API mode.
  useEffect(() => {
    if (!apiOn) {
      setState({ status: "anonymous" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      try {
        const user = await meRequest();
        if (cancelled) return;
        setState({ status: "authenticated", user });
        setCurrentRole(user.role);
      } catch (err) {
        if (cancelled) return;
        // 401 = no session — that's the normal anonymous case.
        if (err instanceof ApiError && err.status === 401) {
          setState({ status: "anonymous" });
        } else {
          // Network error etc. — treat as anonymous so the UI is usable.
          // (The Header's API status badge will surface the underlying issue.)
          setState({ status: "anonymous" });
        }
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
      if (response.token) setToken(response.token);
      setState({ status: "authenticated", user: response.user });
      setCurrentRole(response.user.role);
      return response.user;
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