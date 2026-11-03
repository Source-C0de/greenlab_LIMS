/**
 * @vitest-environment jsdom
 *
 * Tests for `useEffectiveMenuVisibility` — the hook that decides whether a
 * menu is visible.
 *
 * ── The two modes ─────────────────────────────────────────────────────────
 *
 * **API mode** — the SERVER decides. The hook applies only the global
 * kill-switch on top of the server's resolved answer:
 *
 *     visible ⇔ kill-switch ON ∧ server says enabled
 *
 * The per-user override layer is deliberately NOT re-applied client-side
 * here: the server already applied it, and re-applying would let a stale
 * `localStorage` grant resurrect a menu the server denied — the opposite of
 * what the admin's "Deny" button promises.
 *
 * **Mock mode** — the local layers decide (kill-switch ∧ role matrix ∧
 * per-user override), unchanged from before.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useEffectiveMenuVisibility } from "@/presentation/hooks/useEffectiveMenuVisibility";

const MATRIX_KEY = "glims_role_menu_matrix_v2";
const USER_OVERRIDES_KEY = "glims_user_menu_overrides_v1";
const PERMISSIONS_KEY = "glims_menu_permissions_v1";

let fetchMock: ReturnType<typeof vi.fn>;

/**
 * The QueryClientProvider wrapper for `renderHook`.
 *
 * The QueryClient is created ONCE per render call and captured in a closure.
 * Creating it inside the wrapper function would make React build a new
 * client on every re-render — a new cache each time — so the query would
 * never resolve into the tree under test.
 */
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/** The server's resolved answer, in the backend's snake_case shape. */
function menusPayload(
  role: string,
  menus: Array<[string, boolean]>,
): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => ({
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
    }),
    text: async () => "",
  } as unknown as Response;
}

async function renderVisibility() {
  const result = renderHook(() => useEffectiveMenuVisibility("analyst"), {
    wrapper: makeWrapper(),
  });
  // Let the query fire and settle.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  return result;
}

describe("useEffectiveMenuVisibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_USE_API", "true");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  // ── API mode ────────────────────────────────────────────────────────────

  describe("API mode — the server decides", () => {
    it("shows a menu the server enables", async () => {
      fetchMock.mockResolvedValue(
        menusPayload("analyst", [
          ["dashboard", true],
          ["samples", true],
        ]),
      );

      const { result } = await renderVisibility();

      expect(result.current.isEnabled("dashboard", "analyst")).toBe(true);
      expect(result.current.isEnabled("samples", "analyst")).toBe(true);
    });

    it("hides a menu the server disables", async () => {
      fetchMock.mockResolvedValue(
        menusPayload("analyst", [
          ["dashboard", true],
          ["samples", false],
        ]),
      );

      const { result } = await renderVisibility();

      expect(result.current.isEnabled("dashboard", "analyst")).toBe(true);
      expect(result.current.isEnabled("samples", "analyst")).toBe(false);
    });

    it("hides a server-disabled menu even when the local mirror enables it", async () => {
      // The stale-local-grant case. The server is the authority in API mode,
      // so a leftover `localStorage` row must not resurrect the menu.
      window.localStorage.setItem(
        MATRIX_KEY,
        JSON.stringify({ analyst: ["dashboard", "samples"] }),
      );
      window.localStorage.setItem(
        USER_OVERRIDES_KEY,
        JSON.stringify({ "U-1": { samples: "grant" } }),
      );

      fetchMock.mockResolvedValue(
        menusPayload("analyst", [
          ["dashboard", true],
          ["samples", false],
        ]),
      );

      const { result } = await renderVisibility();

      expect(result.current.isEnabled("samples", "analyst", "U-1")).toBe(false);
    });

    it("hides a server-enabled menu when the global kill-switch is off", async () => {
      window.localStorage.setItem(
        PERMISSIONS_KEY,
        JSON.stringify({ samples: false }),
      );

      fetchMock.mockResolvedValue(
        menusPayload("analyst", [
          ["dashboard", true],
          ["samples", true],
        ]),
      );

      const { result } = await renderVisibility();

      expect(result.current.isEnabled("samples", "analyst")).toBe(false);
      expect(result.current.isEnabled("dashboard", "analyst")).toBe(true);
    });

    it("shows everything to a superadmin", async () => {
      fetchMock.mockResolvedValue(menusPayload("analyst", []));

      const { result } = await renderVisibility();

      // Superadmins are the platform operators who configure the other
      // roles; they bypass the resolved set.
      expect(result.current.isEnabled("samples", "superadmin")).toBe(true);
      expect(result.current.isEnabled("quotations", "superadmin")).toBe(true);
    });

    it("hides a key the server did not mention at all", async () => {
      // The server's resolved set is exhaustive, so an absent key means
      // "not granted to this user" — not "unknown, fall back to the seed".
      fetchMock.mockResolvedValue(menusPayload("analyst", [["dashboard", true]]));

      const { result } = await renderVisibility();

      expect(result.current.isEnabled("quotations", "analyst")).toBe(false);
    });
  });

  // ── Mock mode ───────────────────────────────────────────────────────────

  describe("mock mode — the local layers decide", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_USE_API", "false");
    });


    it("falls back to the role matrix", async () => {
      window.localStorage.setItem(
        MATRIX_KEY,
        JSON.stringify({ analyst: ["dashboard", "samples"] }),
      );

      const { result } = await renderVisibility();

      expect(result.current.isEnabled("dashboard", "analyst")).toBe(true);
      expect(result.current.isEnabled("samples", "analyst")).toBe(true);
      expect(result.current.isEnabled("quotations", "analyst")).toBe(false);
    });

    it("applies a per-user deny on top of the role matrix", async () => {
      window.localStorage.setItem(
        MATRIX_KEY,
        JSON.stringify({ analyst: ["dashboard", "samples"] }),
      );
      window.localStorage.setItem(
        USER_OVERRIDES_KEY,
        JSON.stringify({ "U-1": { samples: "deny" } }),
      );

      const { result } = await renderVisibility();

      expect(result.current.isEnabled("samples", "analyst", "U-1")).toBe(false);
      expect(result.current.isEnabled("samples", "analyst")).toBe(true);
    });

    it("applies a per-user grant that rescues a role-level deny", async () => {
      window.localStorage.setItem(
        MATRIX_KEY,
        JSON.stringify({ analyst: ["dashboard"] }),
      );
      window.localStorage.setItem(
        USER_OVERRIDES_KEY,
        JSON.stringify({ "U-1": { quotations: "grant" } }),
      );

      const { result } = await renderVisibility();

      expect(result.current.isEnabled("quotations", "analyst", "U-1")).toBe(true);
    });

    it("honours the global kill-switch", async () => {
      window.localStorage.setItem(
        MATRIX_KEY,
        JSON.stringify({ analyst: ["dashboard", "samples"] }),
      );
      window.localStorage.setItem(
        PERMISSIONS_KEY,
        JSON.stringify({ samples: false }),
      );

      const { result } = await renderVisibility();

      expect(result.current.isEnabled("samples", "analyst")).toBe(false);
    });

    it("never calls the server in mock mode", async () => {
      window.localStorage.setItem(
        MATRIX_KEY,
        JSON.stringify({ analyst: ["dashboard"] }),
      );

      await renderVisibility();

      expect(
        fetchMock.mock.calls.some((c) => String(c[0]).includes("/auth/me/menus")),
      ).toBe(false);
    });
  });
});
