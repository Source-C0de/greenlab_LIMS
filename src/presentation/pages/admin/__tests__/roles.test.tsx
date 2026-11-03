/**
 * @vitest-environment jsdom
 *
 * Tests for the "Assign Menus" modal on the Roles admin page.
 *
 * ── The bug ──────────────────────────────────────────────────────────────
 *
 * The modal rendered the backend's 10-key ADMIN catalogue
 * (`SEED_ADMIN_MENU_KEYS`) while the sidebar reads the SPA's own 32
 * `MenuKey`s (`MENU_REGISTRY`). Only 5 keys overlapped, so assigning
 * "Accounting" wrote `accounting` while the sidebar checked
 * `accounting_dashboard` — the assignment was inert and the user's menu
 * never changed.
 *
 * These tests pin the fixed behaviour:
 *
 *   - the modal lists the SAME 32 keys the sidebar reads;
 *   - un-ticking a key and saving actually removes it from the role's
 *     matrix — the user's exact reported scenario.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import RolesPage from "@/presentation/pages/admin/roles";
import { AppProvider } from "@/presentation/providers/AppContext";
import { AuthProvider } from "@/presentation/providers/AuthContext";
import { useRoleMenuMatrix } from "@/presentation/hooks/useRoleMenuMatrix";
import { MENU_KEY_LIST } from "@/infrastructure/mock/data/menuPermissions";
import { container } from "@/infrastructure/di/container";
import type { AuthSession, Session } from "@/domain/identity/ports";
import type { AuthUser } from "@/domain/identity/model";

const MATRIX_KEY = "glims_role_menu_matrix_v2";

const SUPERADMIN_USER: AuthUser = {
  id: "SA-1",
  username: "ops",
  email: "ops@greenlab.com",
  fullName: "Ops",
  fullNameAr: null,
  role: "superadmin",
  isActive: true,
  clientId: null,
  lastLoginAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function superadminSession(): AuthSession {
  const session: Session = {
    user: SUPERADMIN_USER,
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthProvider>
          <Router>
            <RolesPage />
          </Router>
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>,
  );
}

/** Open the "Assign Menus" modal for a role. */
async function openModal(role: string) {
  const trigger = await screen.findByTestId(`role-assign-menus-${role}`);
  await act(async () => {
    fireEvent.click(trigger);
  });
}

/** Click a menu row's checkbox in the modal. */
async function toggleRow(key: string) {
  const row = await screen.findByTestId(`assign-menus-row-${key}`);
  const checkbox = row.querySelector('button[role="checkbox"]');
  if (!checkbox) throw new Error(`no checkbox in row ${key}`);
  await act(async () => {
    fireEvent.click(checkbox);
  });
}

/** Click "Save" in the modal. */
async function save() {
  const button = await screen.findByRole("button", { name: /save|حفظ/i });
  await act(async () => {
    fireEvent.click(button);
  });
}

/** The matrix as the sidebar would read it. */
function matrixSnapshot(): Record<string, string[]> {
  const raw = window.localStorage.getItem(MATRIX_KEY);
  return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
}

describe("Roles page — Assign Menus modal", () => {
  let originalAuth: AuthSession;

  beforeEach(() => {
    // Force MOCK mode. The repo's `.env.local` sets `VITE_USE_API=true`,
    // which would make the page render the server's role list (empty here,
    // because there is no backend in the test run) instead of the mock
    // registry. The bug this file pins is a MOCK-mode bug.
    vi.stubEnv("VITE_USE_API", "false");
    window.localStorage.clear();
    originalAuth = container.auth;
    (container as { auth: AuthSession }).auth = superadminSession();
  });

  afterEach(() => {
    (container as { auth: AuthSession }).auth = originalAuth;
    cleanup();
    window.localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("lists the 32 menu keys the sidebar actually reads", async () => {
    renderPage();
    await openModal("analyst");

    for (const key of MENU_KEY_LIST) {
      expect(screen.getByTestId(`assign-menus-row-${key}`)).toBeTruthy();
    }
  });

  it("no longer lists the stale 10-key admin catalogue", async () => {
    renderPage();
    await openModal("analyst");

    // These were the old catalogue's keys. They are NOT part of the
    // sidebar's vocabulary, so they must not appear.
    for (const key of ["accounting", "invoices", "users", "roles", "test_parameters"]) {
      expect(screen.queryByTestId(`assign-menus-row-${key}`)).toBeNull();
    }
  });

  it("shows the real sidebar keys instead", async () => {
    renderPage();
    await openModal("analyst");

    // The keys the sidebar checks for the accountant and admin.
    expect(screen.getByTestId("assign-menus-row-accounting_dashboard")).toBeTruthy();
    expect(screen.getByTestId("assign-menus-row-saas_admin")).toBeTruthy();
    expect(screen.getByTestId("assign-menus-row-billing")).toBeTruthy();
  });

  it("REMOVES a menu from the role when it is un-ticked and saved", async () => {
    // ── The user's exact scenario ──────────────────────────────────────
    // "if i don't assign any menu ... it still remains same".
    renderPage();
    await openModal("analyst");

    // `samples` is enabled in the analyst seed.
    expect(
      screen.getByTestId("assign-menus-row-samples").getAttribute("data-state"),
    ).not.toBe("unchecked");

    await toggleRow("samples");
    await save();

    // The matrix must no longer contain `samples` for the analyst.
    const persisted = matrixSnapshot();
    expect(persisted.analyst ?? []).not.toContain("samples");
  });

  it("restores a menu when it is re-ticked and saved", async () => {
    renderPage();
    await openModal("analyst");

    await toggleRow("samples");
    await save();
    expect(matrixSnapshot().analyst ?? []).not.toContain("samples");

    await openModal("analyst");
    await toggleRow("samples");
    await save();

    expect(matrixSnapshot().analyst ?? []).toContain("samples");
  });

  it("empties the role when every menu is un-ticked", async () => {
    renderPage();
    await openModal("analyst");

    // Un-tick everything the modal lists.
    for (const key of MENU_KEY_LIST) {
      const row = screen.getByTestId(`assign-menus-row-${key}`);
      const checkbox = row.querySelector('button[role="checkbox"]');
      const state = checkbox?.getAttribute("data-state");
      if (state === "checked") {
        await toggleRow(key);
      }
    }
    await save();

    expect(matrixSnapshot().analyst ?? []).toEqual([]);
  });

  it("writes keys the sidebar can actually match", async () => {
    renderPage();
    await openModal("lab_manager");

    // `accounting_dashboard` is NOT in the lab_manager seed — ticking it
    // is a GRANT. The old 10-key catalogue wrote `accounting` here, a key
    // no sidebar item uses, so the grant was silently inert.
    await toggleRow("accounting_dashboard");
    await save();

    const persisted = matrixSnapshot();
    expect(persisted.lab_manager ?? []).toContain("accounting_dashboard");
    // Every persisted key must be one the sidebar actually checks.
    for (const key of persisted.lab_manager ?? []) {
      expect(MENU_KEY_LIST).toContain(key);
    }
    // The stale vocabulary must not appear at all.
    expect(persisted.lab_manager ?? []).not.toContain("accounting");
  });

  it("keeps the store readable by the sidebar after saving", async () => {
    renderPage();
    await openModal("analyst");
    await toggleRow("workflow");
    await save();

    // The sidebar reads the same store through `useRoleMenuMatrix`.
    let enabled: boolean | null = null;
    function Probe() {
      const matrix = useRoleMenuMatrix();
      enabled = matrix.isRoleEnabled("analyst", "workflow");
      return null;
    }
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    );

    expect(enabled).toBe(false);
  });
});
