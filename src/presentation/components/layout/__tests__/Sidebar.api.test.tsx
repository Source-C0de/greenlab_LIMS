/**
 * @vitest-environment jsdom
 *
 * The API-mode sidebar test — the one the suite was missing.
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 * Every existing sidebar test forces `VITE_USE_API=false` and drives the
 * `localStorage` mirror. That is mock-mode behaviour, and it passed while
 * the real bug was live: an admin's assignment never reached the user's
 * sidebar in API mode, on any device.
 *
 * The API-mode path is the one that ships. `VITE_USE_API=true` is already
 * set in the repo's `.env.local`, so these are not hypothetical tests.
 *
 * ── What is pinned here ────────────────────────────────────────────────────
 *
 *   1. A menu the SERVER grants appears in the sidebar.
 *   2. A menu the SERVER denies is hidden.
 *   3. A server-granted menu appears even though the role's default
 *      `roles[]` list excludes it — the matrix can grant, not only subtract.
 *   4. A stale `localStorage` grant does NOT resurrect a server-denied key.
 *      (This is the reason the per-user override layer is not re-applied
 *      client-side in API mode.)
 *   5. The sidebar asks the TENANT endpoint with the TENANT token — not the
 *      superadmin-only role-matrix route.
 *
 * The server answer is faked by stubbing `fetch`, exactly as the server
 * would answer it: `{ data: { role, menus: [{ menu_key, enabled, source }],
 * version }, meta: {} }`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
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

/** The `GET /auth/me/menus` payload, in the backend's snake_case shape. */
function menusPayload(
  role: string,
  menus: Array<[string, boolean]>,
): string {
  return JSON.stringify({
    data: {
      role,
      menus: menus.map(([menu_key, enabled]) => ({
        menu_key,
        enabled,
        source: "role",
      })),
      version: "sha256:test",
    },
    meta: {},
  });
}

/** The visible nav labels, in order. */
function navLabels(): string[] {
  return Array.from(document.querySelectorAll("aside nav a")).map(
    (a) => a.textContent?.trim() ?? "",
  );
}

/** The URLs the app requested. */
function requestedUrls(): string[] {
  return fetchMock.mock.calls.map((c) => String(c[0]));
}

let fetchMock: ReturnType<typeof vi.fn>;

async function renderSidebar(children: ReactNode = null) {
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

  // Let the session hydrate.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  // Wait for the resolved menu set to arrive. A fixed number of microtask
  // flushes is not enough — the query resolves after the fetch promise and
  // the React render that follows it, and a flush count that is "usually"
  // right makes the assertions read a DIFFERENT sidebar state depending on
  // timing. `waitFor` on the request itself is deterministic.
  await waitFor(() => {
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes("/auth/me/menus")),
    ).toBe(true);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return result;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Sidebar in API mode", () => {
  let originalAuth: AuthSession;

  beforeEach(() => {
    // API MODE — the mode that ships. `.env.local` sets this too.
    vi.stubEnv("VITE_USE_API", "true");
    window.localStorage.clear();

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    originalAuth = container.auth;
    (container as { auth: AuthSession }).auth = sessionFor("analyst");
  });

  afterEach(() => {
    (container as { auth: AuthSession }).auth = originalAuth;
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("shows a menu the SERVER grants", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        menusPayload("analyst", [
          ["dashboard", true],
          ["samples", true],
          ["quotations", true],
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await renderSidebar();

    expect(navLabels()).toContain("Dashboard");
    expect(navLabels()).toContain("Samples");
    expect(navLabels()).toContain("Quotations");
  });

  it("HIDES a menu the SERVER denies", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        menusPayload("analyst", [
          ["dashboard", true],
          ["samples", false],
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await renderSidebar();

    const labels = navLabels();
    expect(labels).toContain("Dashboard");
    expect(labels).not.toContain("Samples");
  });

  it("shows a server-granted menu the role's default list excludes", async () => {
    // `quotations` is NOT in the analyst's default `roles[]` list — it
    // belongs to admin/lab_manager. The server granted it, so it must
    // appear. The matrix can GRANT, not only subtract.
    fetchMock.mockResolvedValue(
      new Response(
        menusPayload("analyst", [
          ["dashboard", true],
          ["quotations", true],
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await renderSidebar();

    expect(navLabels()).toContain("Quotations");
  });

  it("does NOT let a stale local grant resurrect a server-denied key", async () => {
    // The local mirror says `samples` is granted (a per-user grant left over
    // from an earlier session). The server denies it. The server wins —
    // otherwise the admin's "Deny" button would be a no-op.
    window.localStorage.setItem(
      USER_OVERRIDES_KEY,
      JSON.stringify({ "U-1": { samples: "grant" } }),
    );
    window.localStorage.setItem(
      MATRIX_KEY,
      JSON.stringify({ analyst: ["dashboard", "samples"] }),
    );

    fetchMock.mockResolvedValue(
      new Response(
        menusPayload("analyst", [
          ["dashboard", true],
          ["samples", false],
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await renderSidebar();

    const labels = navLabels();
    expect(labels).toContain("Dashboard");
    expect(labels).not.toContain("Samples");
  });

  it("reads the TENANT endpoint /auth/me/menus, not the role-matrix route", async () => {
    // The role-matrix route (`/admin/roles/:role/menu-permissions`) is
    // superadmin-only. A tenant user calling it got 401 "Wrong token
    // type", which is why the sidebar silently fell back to its seed.
    fetchMock.mockResolvedValue(
      new Response(menusPayload("analyst", [["dashboard", true]]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await renderSidebar();

    const urls = requestedUrls();
    expect(urls.some((u) => u.includes("/auth/me/menus"))).toBe(true);
    expect(
      urls.some((u) => u.includes("/admin/roles/") && u.includes("menu-permissions")),
    ).toBe(false);
  });

  it("hides everything when the server grants nothing", async () => {
    fetchMock.mockResolvedValue(
      new Response(menusPayload("analyst", []), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await renderSidebar();

    expect(navLabels()).toHaveLength(0);
  });
});
