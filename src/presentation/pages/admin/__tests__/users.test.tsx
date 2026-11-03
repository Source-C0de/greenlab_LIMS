/**
 * @vitest-environment jsdom
 *
 * Tests for the Users admin page's role assignment (ADR 0010).
 *
 * ── The bug ──────────────────────────────────────────────────────────────
 *
 * A role created on the Roles admin page never appeared in the Users
 * page's role dropdown, and it could not be assigned. The frontend
 * half of that was that the dropdown read `roleAdmin.list()` — the
 * localStorage registry — which has NO api-mode branch. In API mode the
 * custom-role store was never written, so the dropdown could only ever
 * show the fixed seeds, and a role the admin had just created was
 * invisible.
 *
 * A second frontend defect: `users/[id].tsx` resolved the role's label
 * with no fallback, so a user holding a custom role rendered **nothing**
 * in the detail header.
 *
 * These tests pin the fixed behaviour:
 *
 *   - the dropdown lists the roles the SERVER returns (including a
 *     custom one);
 *   - selecting a custom role sends its slug in the PATCH body;
 *   - a user holding a custom slug renders its LABEL, not the slug and
 *     not a blank cell;
 *   - `superadmin` is NOT offered — it is unassignable to a tenant user.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import UsersPage from "@/presentation/pages/admin/users";
import UserDetailPage from "@/presentation/pages/admin/users/[id]";
import { AppProvider } from "@/presentation/providers/AppContext";
import { AuthProvider } from "@/presentation/providers/AuthContext";
import { container } from "@/infrastructure/di/container";
import type { AuthSession, Session } from "@/domain/identity/ports";
import type { AuthUser } from "@/domain/identity/model";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_USER: AuthUser = {
  id: "U-ADMIN",
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

/**
 * A role the admin created on the Roles page — the reported bug.
 *
 * NOTE the snake_case keys: the backend's `enveloped` contract emits
 * `label_en` / `is_active` / … and the frontend client normalises them
 * (`rolesApi.ts::normalizeRole`). A camelCase stub would silently
 * produce blank labels.
 */
const CUSTOM_ROLE = {
  role: "qa_reviewer",
  label_en: "QA Reviewer",
  label_ar: "مراجع الجودة",
  description_en: "Reviews QA results.",
  description_ar: "يراجع نتائج الجودة.",
  icon_name: "ClipboardList",
  is_active: true,
  is_custom: true,
  updated_at: "2026-01-01T00:00:00.000Z",
};

const FIXED_ROLES = [
  {
    role: "admin",
    label_en: "Admin",
    label_ar: "مسؤول",
    description_en: "Full access.",
    description_ar: "وصول كامل.",
    icon_name: "ShieldCheck",
    is_active: true,
    is_custom: false,
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    role: "analyst",
    label_en: "Analyst",
    label_ar: "محلل",
    description_en: "Runs tests.",
    description_ar: "يجري الاختبارات.",
    icon_name: "FlaskConical",
    is_active: true,
    is_custom: false,
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

const HOLDER_USER = {
  id: "U-HOLDER",
  email: "holder@greenlab.com",
  username: "holder",
  full_name: "Custom Role Holder",
  full_name_ar: null,
  role: "qa_reviewer",
  is_active: true,
  status: "active",
  client_id: null,
  last_login_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function adminSession(): AuthSession {
  const session: Session = {
    user: ADMIN_USER,
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

/** The envelope the backend's `enveloped` contract returns. */
function envelope(data: unknown) {
  return {
    data,
    meta: { request_id: "req-1" },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface FetchCall {
  url: string;
  method: string;
  body: unknown;
}

/**
 * Stub `fetch` with the three endpoints the Users page reads:
 * `GET /admin/roles`, `GET /admin/users`, `PATCH /admin/users/:id`.
 */
function installFetchStub(calls: FetchCall[]) {
  const stub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method, body });

    if (url.includes("/admin/roles")) {
      return jsonResponse(envelope([...FIXED_ROLES, CUSTOM_ROLE]));
    }
    if (url.includes("/admin/users") && method === "PATCH") {
      return jsonResponse(
        envelope({ ...HOLDER_USER, ...(body ?? {}) }),
      );
    }
    // `GET /admin/users/:id` (one user) must be matched BEFORE the list
    // branch — the list branch would otherwise answer with the page
    // envelope and the detail page would render "User not found".
    if (/\/admin\/users\/[^/?]+/.test(url)) {
      return jsonResponse(envelope(HOLDER_USER));
    }
    if (url.includes("/admin/users")) {
      // The canonical paginated envelope: rows in `data`, the window in
      // `meta.pagination` (`usersApi.ts::listUsers` → `unwrapPage`).
      return jsonResponse({
        data: [HOLDER_USER],
        meta: {
          request_id: "req-1",
          pagination: { limit: 25, offset: 0, total: 1 },
        },
      });
    }
    return jsonResponse(envelope({}), 404);
  });
  vi.stubGlobal("fetch", stub);
  return stub;
}

function renderPage(path = "/admin/users") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // `memoryLocation` sets the location hermetically. (`<Router
  // initialPath=…>` is not a wouter v3 prop — it is silently ignored,
  // and the location stays at jsdom's "/".)
  const loc = memoryLocation({ path });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthProvider>
          <Router hook={loc.hook}>
            <UsersPage />
          </Router>
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>,
  );
}

function renderDetailPage(id: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // The detail page reads `useParams().id`, and wouter only populates
  // params from a MATCHING `<Route>`. Its location comes from
  // `memoryLocation` rather than `window.history` so the test stays
  // hermetic (jsdom's URL is shared across the whole file).
  //
  // NOTE: `<Router initialPath=…>` does NOT work here — wouter v3 has no
  // such prop, and `ssrPath` only applies during server rendering, so
  // the location stayed at "/" and `<Route>` matched nothing.
  const loc = memoryLocation({ path: `/admin/users/${id}` });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthProvider>
          <Router hook={loc.hook}>
            <Route path="/admin/users/:id">
              <UserDetailPage />
            </Route>
          </Router>
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>,
  );
}

/** Open the Add/Edit User dialog. */
async function openDialog() {
  const button = await screen.findByRole("button", { name: /add user|إضافة مستخدم/i });
  await act(async () => {
    fireEvent.click(button);
  });
}

/**
 * Open the Role select and return its options' visible text.
 *
 * Radix renders the options into a portal only once the select is open,
 * and it does not expose the item's value as an attribute — so the
 * visible text is what the assertions work against.
 */
async function openRoleSelect(): Promise<string[]> {
  const trigger = await screen.findByTestId("user-role-select");
  await act(async () => {
    fireEvent.click(trigger);
  });
  await waitFor(() => {
    expect(document.querySelector('[role="option"]')).toBeTruthy();
  });
  return Array.from(document.querySelectorAll('[role="option"]')).map(
    (el) => el.textContent?.trim() ?? "",
  );
}

/** Pick an option in the open Role select, by its visible label. */
async function selectRole(label: string) {
  const option = await screen.findByRole("option", { name: label });
  await act(async () => {
    fireEvent.click(option);
  });
}

describe("Users page — role assignment", () => {
  let originalAuth: AuthSession;
  let calls: FetchCall[];

  beforeEach(() => {
    // API MODE. The bug was an API-mode bug: the dropdown read the
    // localStorage registry, which has no api-mode branch.
    vi.stubEnv("VITE_USE_API", "true");
    window.localStorage.clear();
    calls = [];
    installFetchStub(calls);
    originalAuth = container.auth;
    (container as { auth: AuthSession }).auth = adminSession();

    // jsdom does not implement `scrollIntoView`, which Radix's Select
    // calls when it opens. Without this the select throws on open.
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = function scrollIntoView() {};
    }
  });

  afterEach(() => {
    (container as { auth: AuthSession }).auth = originalAuth;
    cleanup();
    window.localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("lists a newly created custom role in the dropdown", async () => {
    renderPage();
    await openDialog();

    const options = await openRoleSelect();

    // The custom role the admin created on the Roles page is offered —
    // this is the reported bug. Before the fix the dropdown read the
    // localStorage registry, which has no api-mode branch, so in API mode
    // it could only ever show the fixed seeds.
    expect(options).toContain("QA Reviewer");
    // …and so are the fixed ones.
    expect(options).toContain("Admin");
    expect(options).toContain("Analyst");
  });

  it("shows the custom role's LABEL, not its slug", async () => {
    renderPage();
    await openDialog();
    const options = await openRoleSelect();

    // The label is what the admin reads. The slug must never be the
    // visible text of an option.
    expect(options).toContain("QA Reviewer");
    expect(options).not.toContain("qa_reviewer");
  });

  it("does NOT offer superadmin — it is unassignable to a tenant user", async () => {
    renderPage();
    await openDialog();

    const options = await openRoleSelect();

    // `superadmin` has no `roles` registry row, so assigning it to a
    // tenant user always 422s. Offering it was a dead option.
    expect(options).not.toContain("Super Admin");
  });

  it("sends the custom role's slug in the PATCH body", async () => {
    renderPage();

    // Wait for the list to load, then open the edit dialog for the
    // holder (the row's Edit button is the first icon button).
    await screen.findByText("holder@greenlab.com");
    const editButtons = document.querySelectorAll(
      'button[title="Edit"], button[title="تعديل"]',
    );
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await screen.findByTestId("user-role-select");
    await openRoleSelect();
    await selectRole("QA Reviewer");

    const save = await screen.findByRole("button", { name: /^save$|^حفظ$/i });
    await act(async () => {
      fireEvent.click(save);
    });

    await waitFor(() => {
      const patch = calls.find((c) => c.method === "PATCH");
      expect(patch).toBeTruthy();
      // The slug — not the label — is what goes on the wire.
      expect((patch!.body as { role: string }).role).toBe("qa_reviewer");
    });
  });

  it("renders the custom role's LABEL in the list, not the raw slug", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("QA Reviewer")).toBeTruthy();
    }, { timeout: 3000 });
    // The raw slug must not be what the user sees.
    expect(screen.queryByText("qa_reviewer")).toBeNull();
  });

  it("renders the custom role's LABEL on the detail page, never a blank", async () => {
    renderDetailPage("U-HOLDER");

    await waitFor(() => {
      // The detail header renders `email · roleLabel · @username` as ONE
      // text node, so the label is matched as a substring rather than
      // as an exact string.
      expect(
        screen.getByText(/QA Reviewer/),
      ).toBeTruthy();
    });
    // The raw slug must not be what the user sees.
    expect(screen.queryByText(/qa_reviewer/)).toBeNull();
  });
});
