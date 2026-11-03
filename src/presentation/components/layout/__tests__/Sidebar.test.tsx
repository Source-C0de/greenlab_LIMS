/**
 * @vitest-environment jsdom
 *
 * Tests for the sidebar's menu filtering — the read side of the
 * "menu assignment does not reach the user" bug.
 *
 * ── The bug ──────────────────────────────────────────────────────────────
 *
 * Two things stopped a role's menu assignment from changing the sidebar:
 *
 *   1. **The hard-coded `roles[]` ceiling.** The sidebar filtered its nav
 *      items with `item.roles.includes(effectiveRole)` BEFORE consulting
 *      the permission matrix, so the matrix could only ever subtract. An
 *      admin could never grant a menu a role did not have by default.
 *
 *   2. **The vocabulary mismatch.** The "Assign Menus" modal wrote the
 *      backend's 10-key admin catalogue while the sidebar read the SPA's
 *      32 `MenuKey`s. Only 5 keys overlapped, so most assignments were
 *      inert — the user's menu "stayed the same".
 *
 * These tests pin the fixed behaviour:
 *
 *   - the matrix can GRANT a menu to a role that lacked it;
 *   - the matrix can HIDE a menu the role had by default;
 *   - a role with no assignments keeps its seeded menus.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { Sidebar } from "@/presentation/components/layout/Sidebar";
import { AppProvider } from "@/presentation/providers/AppContext";
import { AuthProvider } from "@/presentation/providers/AuthContext";
import { container } from "@/infrastructure/di/container";
import type { AuthSession, Session } from "@/domain/identity/ports";
import type { AuthUser } from "@/domain/identity/model";

const MATRIX_KEY = "glims_role_menu_matrix_v2";
const ROLE_KEY = "glims_role_override";
const USER_OVERRIDES_KEY = "glims_user_menu_overrides_v1";

// ── Fixtures ───────────────────────────────────────────────────────────────

function userFor(role: AuthUser["role"], id = "U-1"): AuthUser {
  return {
    id,
    username: role,
    email: `${role}@greenlab.com`,
    fullName: `Test ${role}`,
    fullNameAr: null,
    role,
    isActive: true,
    clientId: null,
    lastLoginAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

/** An `AuthSession` that is signed in as the given role. */
function sessionFor(role: AuthUser["role"]): AuthSession {
  const user = userFor(role);
  const session: Session = {
    user,
    token: "token",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
  const listeners = new Set<(s: Session | null) => void>();
  return {
    async restore() {
      return session;
    },
    async signIn() {
      return session;
    },
    adoptSession(s) {
      listeners.forEach((fn) => fn(s));
    },
    async signOut() {},
    currentToken() {
      return session.token;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Render the sidebar and wait for the session to hydrate.
 *
 * The AuthProvider starts in the "loading" state and resolves the session
 * asynchronously. Until it does, `useAuth().user` is `null`, so the
 * per-user override layer is not consulted at all. The two override tests
 * below therefore need the hydration to have settled.
 */
async function renderSidebar(children: ReactNode) {
  // The sidebar's role × menu matrix is read through TanStack Query (the
  // API bridge), so a QueryClientProvider is required. `retry: false` keeps
  // a failed query from delaying the assertions.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthProvider>
          <Router>
            <Sidebar isOpen={true} />
            {children}
          </Router>
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>,
  );

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return result;
}

/** The visible nav labels, in order. */
function navLabels(): string[] {
  return Array.from(
    document.querySelectorAll("aside nav a"),
  ).map((a) => a.textContent?.trim() ?? "");
}

/** Set the role the mock session reports. */
function setRole(role: string): void {
  window.localStorage.setItem(ROLE_KEY, role);
}

/** Write the role × menu matrix. */
function setMatrix(rows: Record<string, string[]>): void {
  window.localStorage.setItem(MATRIX_KEY, JSON.stringify(rows));
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Sidebar menu filtering", () => {
  let originalAuth: AuthSession;

  beforeEach(() => {
    // Force MOCK mode — the repo's `.env.local` sets `VITE_USE_API=true`,
    // and without a backend the matrix query would reject. The sidebar's
    // behaviour under test is the mock-mode behaviour.
    vi.stubEnv("VITE_USE_API", "false");
    window.localStorage.clear();
    originalAuth = container.auth;
  });

  afterEach(() => {
    (container as { auth: AuthSession }).auth = originalAuth;
    cleanup();
    window.localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("shows a seeded menu by default", async () => {
    setRole("analyst");
    (container as { auth: AuthSession }).auth = sessionFor("analyst");

    await renderSidebar(null);

    expect(navLabels()).toContain("Dashboard");
    expect(navLabels()).toContain("Samples");
  });

  it("HIDES a menu the role matrix denies", async () => {
    setRole("analyst");
    // The analyst seed has `samples`; deny it and nothing else.
    setMatrix({ analyst: ["dashboard", "workflow", "reports", "settings"] });
    (container as { auth: AuthSession }).auth = sessionFor("analyst");

    await renderSidebar(null);

    const labels = navLabels();
    expect(labels).not.toContain("Samples");
    expect(labels).toContain("Dashboard");
  });

  it("GRANTS a menu the role did not have by default", async () => {
    // This is the case the hard-coded `roles[]` filter made impossible:
    // `quotations` belongs to admin/lab_manager, not to an analyst.
    setRole("analyst");
    setMatrix({ analyst: ["dashboard", "samples", "quotations", "settings"] });
    (container as { auth: AuthSession }).auth = sessionFor("analyst");

    await renderSidebar(null);

    expect(navLabels()).toContain("Quotations");
  });

  it("shows nothing when the role is assigned no menus at all", async () => {
    // The user's exact complaint: "if i don't assign any menu ... it still
    // remains same". An explicitly-empty row must empty the sidebar.
    setRole("analyst");
    setMatrix({ analyst: [] });
    (container as { auth: AuthSession }).auth = sessionFor("analyst");

    await renderSidebar(null);

    expect(navLabels()).toHaveLength(0);
  });

  it("restores a menu when it is re-assigned", async () => {
    setRole("analyst");
    setMatrix({ analyst: [] });
    (container as { auth: AuthSession }).auth = sessionFor("analyst");

    const first = await renderSidebar(null);
    expect(navLabels()).toHaveLength(0);
    first.unmount();

    // Re-assign and re-render.
    setMatrix({ analyst: ["dashboard", "samples", "settings"] });
    await renderSidebar(null);
    expect(navLabels()).toContain("Samples");
  });

  it("gives superadmin the fixed four-item sidebar", async () => {
    setRole("superadmin");
    (container as { auth: AuthSession }).auth = sessionFor("superadmin");

    await renderSidebar(null);

    const labels = navLabels();
    expect(labels).toContain("SaaS Admin");
    expect(labels).toContain("Users");
    expect(labels).toContain("Role Permissions");
    expect(labels).toContain("Settings");
    expect(labels).not.toContain("Samples");
  });

  it("gives a client the client portal menus", async () => {
    setRole("client");
    (container as { auth: AuthSession }).auth = sessionFor("client");

    await renderSidebar(null);

    const labels = navLabels();
    expect(labels).toContain("My Portal");
    expect(labels).toContain("My Samples");
    expect(labels).toContain("My Reports");
    expect(labels).toContain("My Invoices");
    expect(labels).not.toContain("Quotations");
  });

  it("applies a per-user DENY on top of the role matrix", async () => {
    setRole("analyst");
    (container as { auth: AuthSession }).auth = sessionFor("analyst");
    window.localStorage.setItem(
      USER_OVERRIDES_KEY,
      JSON.stringify({ "U-1": { samples: "deny" } }),
    );

    await renderSidebar(null);

    expect(navLabels()).not.toContain("Samples");
  });

  it("applies a per-user GRANT on top of a role-level deny", async () => {
    // The Grant button used to be a no-op: the override fell through to
    // the role check, which had already denied the key.
    setRole("analyst");
    setMatrix({ analyst: ["dashboard", "settings"] });
    (container as { auth: AuthSession }).auth = sessionFor("analyst");
    window.localStorage.setItem(
      USER_OVERRIDES_KEY,
      JSON.stringify({ "U-1": { quotations: "grant" } }),
    );

    await renderSidebar(null);

    expect(navLabels()).toContain("Quotations");
  });
});
