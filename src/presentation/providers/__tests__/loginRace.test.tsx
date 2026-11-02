/**
 * @vitest-environment jsdom
 *
 * Regression test for the "login succeeds but the app bounces back to
 * /login" bug — for BOTH the tenant and the superadmin surfaces.
 *
 * ── The bug ──────────────────────────────────────────────────────────────
 * The backend returned 200, the token was stored, and the SPA still ended up
 * on the login screen. The cause was a React 18 scheduling subtlety:
 *
 *   1. `signIn()` resolves in a microtask; the adapter publishes the session
 *      and the provider schedules `setState({authenticated})`.
 *   2. The login page then calls `setLocation("/dashboard")` — a NAVIGATION,
 *      issued in a SEPARATE task.
 *
 * React 18 batches only within a single synchronous task, so steps 1 and 2 are
 * NOT batched together. Worse, a navigation render is dispatched on React's
 * **SyncLane**, which does NOT wait for the provider's pending **DefaultLane**
 * state update — so the route guard can render with a STALE context value
 * (`isAuthenticated: false`) and redirect straight back to `/login`.
 *
 * The fix is the `pending` / `superadminPending` flags in `AuthContext`: while
 * a sign-in is in flight, `isLoading` (resp. `isSuperadminLoading`) stays
 * true, so the guard renders NOTHING instead of redirecting on a stale value.
 *
 * ── What this test locks down ────────────────────────────────────────────
 * The invariant the fix guarantees is:
 *
 *     "from the moment a sign-in STARTS until its state has committed,
 *      `isLoading` / `isSuperadminLoading` is true."
 *
 * That is the property the route guard depends on. If it ever regresses, the
 * guard will again be able to observe "not loading AND not authenticated"
 * during the window where the navigation lands — and the user is bounced.
 *
 * WHY THE INVARIANT AND NOT THE FULL ROUND-TRIP:
 * A full "click → navigate → assert the guard rendered" test cannot reliably
 * reproduce the race under jsdom. React's `act()` and the test scheduler
 * flush the provider's DefaultLane update *before* the navigation's SyncLane
 * render, so the guard sees the fresh value and the bug does not appear. The
 * race is real (it was reproduced and instrumented in a live browser), but it
 * is a lane-priority artefact that jsdom's scheduler does not reproduce.
 *
 * Asserting the invariant directly is therefore both deterministic and
 * closer to the actual contract: it fails loudly the moment someone removes
 * the `pending` flag, and it does not depend on React's internal scheduling
 * details staying exactly as they are today.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Router, Route, Switch, useLocation } from "wouter";
import type { ReactNode } from "react";

import { AuthProvider, useAuth } from "@/presentation/providers/AuthContext";
import { AppProvider } from "@/presentation/providers/AppContext";
import { ProtectedRoute } from "@/presentation/components/auth/ProtectedRoute";
import { container } from "@/infrastructure/di/container";
import type { AuthSession, Session } from "@/domain/identity/ports";
import type { AuthUser } from "@/domain/identity/model";

// ── Fixtures ───────────────────────────────────────────────────────────────

const TENANT_USER: AuthUser = {
  id: "U-1",
  username: "admin",
  email: "admin@greenlab.com",
  fullName: "Admin",
  fullNameAr: null,
  role: "admin",
  isActive: true,
  clientId: null,
  lastLoginAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const SUPERADMIN_USER: AuthUser = {
  ...TENANT_USER,
  id: "SA-1",
  username: "ops",
  email: "ops@greenlab.com",
  role: "superadmin",
};

/**
 * A fake `AuthSession` whose `signIn` resolves only when the test releases
 * it — so the test controls exactly when the session commits, and can observe
 * the provider's state in the window before that happens.
 */
function fakeSession(user: AuthUser): {
  adapter: AuthSession;
  release: () => void;
} {
  let current: Session | null = null;
  const listeners = new Set<(s: Session | null) => void>();
  const publish = () => listeners.forEach((fn) => fn(current));

  let release!: () => void;

  const adapter: AuthSession = {
    async restore() {
      return null;
    },
    signIn() {
      return new Promise<Session>((resolve) => {
        release = () => {
          current = {
            user,
            token: `token-${user.id}`,
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          };
          publish();
          resolve(current);
        };
      });
    },
    adoptSession(session) {
      current = session;
      publish();
    },
    async signOut() {
      current = null;
      publish();
    },
    currentToken() {
      return current?.token ?? null;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return { adapter, release: () => release() };
}

// ── Harness ────────────────────────────────────────────────────────────────

/** Records every value the provider publishes, so the test can assert on them. */
const observed: {
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperadminLoading: boolean;
  isSuperadminAuthenticated: boolean;
}[] = [];

function Probe() {
  const {
    isLoading,
    isAuthenticated,
    isSuperadminLoading,
    isSuperadminAuthenticated,
  } = useAuth();
  observed.push({
    isLoading,
    isAuthenticated,
    isSuperadminLoading,
    isSuperadminAuthenticated,
  });
  return null;
}

function GuardedPage({ label }: { label: string }) {
  return (
    <ProtectedRoute>
      <div data-testid="guarded">{label}</div>
    </ProtectedRoute>
  );
}

function PlatformGuardedPage({ label }: { label: string }) {
  return (
    <ProtectedRoute platformOnly>
      <div data-testid="guarded">{label}</div>
    </ProtectedRoute>
  );
}

function TenantLoginButton({ target }: { target: string }) {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  return (
    <button
      type="button"
      data-testid="login"
      onClick={() => {
        void (async () => {
          await login({ email: "admin@greenlab.com", password: "pw" });
          setLocation(target);
        })();
      }}
    >
      sign in
    </button>
  );
}

function SuperadminLoginButton({ target }: { target: string }) {
  const { superadminLogin } = useAuth();
  const [, setLocation] = useLocation();
  return (
    <button
      type="button"
      data-testid="sa-login"
      onClick={() => {
        void (async () => {
          await superadminLogin({ email: "ops@greenlab.com", password: "pw" });
          setLocation(target);
        })();
      }}
    >
      sign in
    </button>
  );
}

function renderApp(children: ReactNode) {
  return render(
    <AppProvider>
      <AuthProvider>
        <Router>
          <Probe />
          {children}
        </Router>
      </AuthProvider>
    </AppProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("login → navigate race", () => {
  let originalAuth: AuthSession;
  let originalSuperadminAuth: AuthSession;

  beforeEach(() => {
    observed.length = 0;
    originalAuth = container.auth;
    originalSuperadminAuth = container.superadminAuth;
  });

  afterEach(() => {
    // Restore the real adapters so a failing test cannot leak a fake into
    // the next one (or into another file running in the same worker).
    (container as { auth: AuthSession }).auth = originalAuth;
    (container as { superadminAuth: AuthSession }).superadminAuth =
      originalSuperadminAuth;
    cleanup();
  });

  it("reports isLoading=true for the whole tenant sign-in window", async () => {
    const { adapter, release } = fakeSession(TENANT_USER);
    (container as { auth: AuthSession }).auth = adapter;
    (container as { superadminAuth: AuthSession }).superadminAuth = fakeSession(
      SUPERADMIN_USER,
    ).adapter;

    renderApp(
      <>
        <TenantLoginButton target="/dashboard" />
        <Switch>
          <Route path="/login">
            <div data-testid="login-page">login</div>
          </Route>
          <Route path="/dashboard">
            <GuardedPage label="dashboard" />
          </Route>
        </Switch>
      </>,
    );

    // Let the bootstrap `restore()` resolve so the provider leaves "loading".
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The provider is settled and anonymous.
    const before = observed[observed.length - 1];
    expect(before.isAuthenticated).toBe(false);

    // Start the sign-in. It must NOT resolve yet.
    await act(async () => {
      screen.getByTestId("login").click();
    });

    // ── THE INVARIANT ──────────────────────────────────────────────────
    // While the sign-in is in flight the guard MUST see `isLoading: true`,
    // so it renders nothing instead of redirecting on a stale
    // `isAuthenticated: false`.
    const during = observed[observed.length - 1];
    expect(during.isLoading).toBe(true);
    expect(during.isAuthenticated).toBe(false);

    // Now let the login resolve and the navigation land.
    await act(async () => {
      release();
      await Promise.resolve();
      await Promise.resolve();
    });

    const after = observed[observed.length - 1];
    expect(after.isAuthenticated).toBe(true);
    expect(after.isLoading).toBe(false);

    // The user is on the guarded page, not bounced back to /login.
    expect(screen.getByTestId("guarded")).toBeTruthy();
    expect(screen.queryByTestId("login-page")).toBeNull();
    expect(window.location.pathname).toBe("/dashboard");
  });

  it("reports isSuperadminLoading=true for the whole superadmin sign-in window", async () => {
    const sa = fakeSession(SUPERADMIN_USER);
    (container as { auth: AuthSession }).auth = fakeSession(TENANT_USER).adapter;
    (container as { superadminAuth: AuthSession }).superadminAuth = sa.adapter;

    renderApp(
      <>
        <SuperadminLoginButton target="/admin" />
        <Switch>
          <Route path="/superadmin">
            <div data-testid="sa-login-page">sa login</div>
          </Route>
          <Route path="/admin">
            <PlatformGuardedPage label="admin console" />
          </Route>
        </Switch>
      </>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      screen.getByTestId("sa-login").click();
    });

    // ── THE INVARIANT ──────────────────────────────────────────────────
    const during = observed[observed.length - 1];
    expect(during.isSuperadminLoading).toBe(true);
    expect(during.isSuperadminAuthenticated).toBe(false);

    await act(async () => {
      sa.release();
      await Promise.resolve();
      await Promise.resolve();
    });

    const after = observed[observed.length - 1];
    expect(after.isSuperadminAuthenticated).toBe(true);
    expect(after.isSuperadminLoading).toBe(false);

    expect(screen.getByTestId("guarded")).toBeTruthy();
    expect(screen.queryByTestId("sa-login-page")).toBeNull();
    expect(window.location.pathname).toBe("/admin");
  });

  it("still blocks an anonymous visitor from a guarded page", async () => {
    (container as { auth: AuthSession }).auth = fakeSession(TENANT_USER).adapter;
    (container as { superadminAuth: AuthSession }).superadminAuth = fakeSession(
      SUPERADMIN_USER,
    ).adapter;

    renderApp(
      <Switch>
        <Route path="/login">
          <div data-testid="login-page">login</div>
        </Route>
        <Route path="/dashboard">
          <GuardedPage label="dashboard" />
        </Route>
      </Switch>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    window.history.pushState({}, "", "/dashboard");
    window.dispatchEvent(new Event("popstate"));

    await act(async () => {
      await Promise.resolve();
    });

    // No sign-in ever happened → the guard must still redirect.
    expect(screen.queryByTestId("guarded")).toBeNull();
    expect(window.location.pathname).toBe("/login");
  });
});
