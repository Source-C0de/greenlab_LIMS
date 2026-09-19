# Frontend Integration Guide

> Step-by-step process for wiring the existing GreenLabLIMS KSA SPA to
> a backend that implements [`openapi.yaml`](./openapi.yaml).
>
> **Approach:** incremental — one domain at a time. Each phase ends
> with the SPA working against the real backend for that domain while
> keeping mock data for the rest. We never do a big-bang migration.
>
> **Tooling:** TanStack Query is already wired (`src/App.tsx:128`) but
> never called. This guide introduces the actual hooks in
> `src/hooks/api/` and replaces one mock-data read at a time.

## Phase 0 — Plumbing (do once)

### 0.1 — Add an API client

Create `src/lib/api/client.ts`:

```ts
// src/lib/api/client.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const csrfToken = getCookie("glims_csrf"); // small cookie reader
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  // State-changing methods need the CSRF header.
  if (init.method && !["GET", "HEAD", "OPTIONS"].includes(init.method.toUpperCase())) {
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include", // send glims_session cookie
  });

  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (json as any).error ?? {};
    throw new ApiError(res.status, err.code ?? "internal", err.message ?? res.statusText, err.details);
  }
  return (json as any).data as T;
}

export const api = {
  get:   <T>(p: string)              => request<T>(p),
  post:  <T>(p: string, body: any)   => request<T>(p, { method: "POST",   body: JSON.stringify(body) }),
  put:   <T>(p: string, body: any)   => request<T>(p, { method: "PUT",    body: JSON.stringify(body) }),
  patch: <T>(p: string, body: any)   => request<T>(p, { method: "PATCH",  body: JSON.stringify(body) }),
  delete:<T>(p: string)              => request<T>(p, { method: "DELETE" }),
};

function getCookie(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
}
```

### 0.2 — Configure TanStack Query defaults

In `src/App.tsx:54`, replace the default `new QueryClient()` with:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s before refetching on mount
      gcTime: 5 * 60_000,          // 5m cache retention
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

### 0.3 — Add a `.env.local`

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 0.4 — Verify

```
npm run dev
# → open http://localhost:3000/login
# Network tab should show no /api/v1 calls yet (nothing wired).
# Console should show zero errors.
```

---

## Phase 1 — Auth (do this first)

Wiring order matters: every other endpoint depends on `glims_session`.

### 1.1 — Replace `useState` defaults in `AppContext`

In `src/context/AppContext.tsx`, replace `currentRole`'s `useState<Role>("admin")`
default with a fetch of `GET /api/v1/auth/me`:

```tsx
export function AppProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [language, setLanguage] = useState<Language>("en");

  const { data: me, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<MeResponse>("/auth/me"),
    retry: false,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (me) setCurrentRole(me.role);
  }, [me]);

  // ... rest
}
```

Add a top-level loading splash while `isLoading` is true.

### 1.2 — Wire `Login`

In `src/pages/login.tsx`, replace the hardcoded `DEMO_CREDENTIALS` map
and `setTimeout` with a real mutation:

```tsx
const login = useMutation({
  mutationFn: (body: { username: string; password: string }) =>
    api.post<{ user: User; expiresAt: string }>("/auth/login", body),
  onSuccess: ({ user }) => {
    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    setLocation(DEFAULT_ROUTE_BY_ROLE[user.role]);
  },
  onError: (err: ApiError) => {
    setLoginError(err.code === "unauthorized"
      ? pick(LABELS.invalid)
      : err.message);
    triggerShake();
  },
});
```

Keep the bilingual labels and shake animation from the previous patch
— they're already correct.

### 1.3 — Wire `logout`

Add a `Logout` button to `Header.tsx` (currently absent):

```tsx
const logout = useMutation({
  mutationFn: () => api.post("/auth/logout"),
  onSuccess: () => {
    queryClient.clear();
    setLocation("/login");
  },
});
```

### 1.4 — Verify

1. `npm run dev`.
2. Open `/login` → submit `admin` / `admin123` → land on `/dashboard`.
3. Open DevTools → Application → Cookies → confirm `glims_session` is
   HttpOnly, `Secure` (in prod), `SameSite=Lax`.
4. Refresh `/dashboard` → still logged in (cookie persists).
5. Click Logout → land on `/login`, cookie cleared, no `me` call
   succeeds.

---

## Phase 2 — Reference data

These endpoints power dropdowns and sidebars. Wiring them here unblocks
every later phase.

### 2.1 — Files to touch

- `src/hooks/api/useClients.ts` (new)
- `src/hooks/api/useAnalysts.ts` (new)
- `src/hooks/api/useSampleTypes.ts` (new)
- `src/hooks/api/useAccounts.ts` (new)

### 2.2 — Pattern

For each:

```ts
// src/hooks/api/useClients.ts
export function useClients(params: { q?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ["clients", params],
    queryFn: () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<Paginated<Client>>(`/clients${qs ? `?${qs}` : ""}`);
    },
  });
}
```

### 2.3 — Replace mock reads

- `src/pages/clients.tsx:23-26` — replace `useState(mockClients)` with
  `useClients()`.
- `src/components/samples/SampleTabs.tsx` — replace analyst lookup with
  `useAnalysts()`.
- `src/lib/sample-id.ts:13` — replace `SAMPLE_TYPE_PREFIXES` with
  `useSampleTypes()` (or fetch once and cache in AppContext).
- `src/pages/accounting/chart-of-accounts.tsx` — replace
  `mockAccounts` import with `useAccounts()`.

### 2.4 — Verify

- Clients page renders the same list as before but from the backend.
- DevTools Network shows `GET /clients` returning paginated JSON.
- No console errors. No double-fetches (TanStack dedup works).

---

## Phase 3 — Samples

The biggest domain in the SPA. Wire the **list** first, then **receive**,
then **detail**.

### 3.1 — Files to touch

- `src/hooks/api/useSamples.ts` (new)
- `src/hooks/api/useSample.ts` (new)
- `src/hooks/api/useCreateSample.ts` (new)
- `src/hooks/api/useUpdateSample.ts` (new)
- `src/pages/samples/index.tsx:84` — swap to `useSamples()`
- `src/pages/samples/receiving.tsx:88-126` — swap create + update
- `src/pages/samples/[id].tsx` — swap to `useSample(id)`
- `src/pages/samples/report.tsx` — swap to `useSampleReport(id)`

### 3.2 — Server-side ID generation

Delete the client-side `lib/sample-id.ts` generator. The backend now
mints `<PREFIX>/<YYYY>/<NNNN>` inside `POST /samples`. The SPA's
wouter splat route (`App.tsx:82-87`) keeps working unchanged because
sample IDs are still strings with `/` in them.

### 3.3 — Verify

1. `POST /samples` from `/samples/receiving` → response includes the
   server-minted id → redirect to `/samples/<id>` → detail loads.
2. Move a card in `/workflow` Kanban → `PATCH /samples/:id/status`
   succeeds → refetch list reflects the move.
3. Refresh `/samples` → list persists (now real).

---

## Phase 4 — Tests & approval workflow

This is the highest-value mutation surface — every analyst interaction
hits these endpoints. The hook layer at
`src/hooks/test-approvals/` already wraps the store; replace its body.

### 4.1 — Files to touch

For each of `useSubmitTest`, `useApproveTest`, `useRejectTest`,
`useBulkApprove`, `useUpdateTestParameters`, `useUpdateTest`,
`useTest`, `useTestHistory`, `useApprovalQueue`,
`useMySubmittedTests`:

```ts
// src/hooks/test-approvals/useApproveTest.ts (new body)
export function useApproveTest(testId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { stage: ApprovalStage; comment?: string }) =>
      api.post<Test>(`/tests/${testId}/approve`, body),
    onSuccess: (test) => {
      qc.invalidateQueries({ queryKey: ["tests", testId] });
      qc.invalidateQueries({ queryKey: ["tests", "queue"] });
      qc.invalidateQueries({ queryKey: ["samples", test.sampleId] });
    },
  });
}
```

### 4.2 — Replace store-based reads

`useTest` and `useApprovalQueue` are read hooks. Replace their bodies
with `useQuery` against the backend.

### 4.3 — `useSampleTimeline` (new)

Add a hook for `GET /samples/:id/timeline` so the UI can render a
visual history of stage transitions (currently absent).

### 4.4 — Verify

1. Log in as `analyst` / `analyst123` → open a submitted sample → edit
   parameters → submit. DevTools shows `PUT /tests/:id/parameters`
   then `POST /tests/:id/submit`.
2. Log out, log in as `manager` / `manager123` → approve the test. UI
   advances to next stage.
3. `GET /tests/queue` shows the test in "Awaiting Tech Manager".

---

## Phase 5 — Reports & invoices

### 5.1 — Reports

- `src/pages/reports/index.tsx` → `useReports()`
- `src/pages/reports/[id].tsx` → `useReport(id, { expand: ["sample", "client"] })`
- The COA PDF generation in `src/lib/pdf-report.ts` stays client-side
  for v1; a server-rendered PDF endpoint is a v2 addition.

### 5.2 — Invoices

- `src/pages/invoices/index.tsx` → `useInvoices()`
- "Mark as reported to ZATCA" button → `useReportInvoiceToZatca(id)`
- "Record payment" (if added) → `useRecordPayment(id)`
- **Delete `src/lib/accounting-utils.ts`'s `ZatcaService`** — the
  backend signs and reports. The SPA only needs to display the IRN.

### 5.3 — Verify

- Create invoice from `/invoices` → backend auto-posts AR + Revenue +
  Output VAT journal entry → visible in `/accounting/journals`.
- Report invoice to ZATCA → `isReported = true`, `irn` populated.

---

## Phase 6 — Accounting

### 6.1 — Files to touch

- `src/pages/accounting/journals.tsx` → `useJournals()`; add
  `useCreateJournal()` for the "New Manual Entry" button that has no
  handler today.
- `src/pages/accounting/ledger.tsx` → `useLedger({ accountCode, dateFrom, dateTo })`.
- `src/pages/accounting/chart-of-accounts.tsx` → `useAccounts()` (done
  in phase 2 — verify it loads from the backend).
- `src/pages/accounting/reports.tsx` → `usePnlReport`, `useBalanceSheet`,
  `useCashFlowReport`.

### 6.2 — Verify

- Create a manual journal entry → appears in the list with status
  `Draft` → "Post" button calls `POST /journals/:id/post` → status
  becomes `Posted`, becomes immutable.
- Ledger view for an account shows the new lines.
- P&L report for the current month matches the journal activity.

---

## Phase 7 — Admin, notifications, inventory

### 7.1 — Admin

- `src/pages/admin.tsx` → `useTenants()`, `usePlans()`,
  `useFeatureFlags()`, `usePermissionsMatrix()`,
  `useSetMenuPermissions()`.
- The `useRolePermissions` and `useMenuPermissions` hooks
  (`src/hooks/useRolePermissions.ts:66`,
  `src/hooks/useMenuPermissions.ts:65`) currently persist to
  `localStorage`. They should switch to the backend endpoints
  `GET /admin/permissions/matrix` and
  `PUT /admin/permissions/menu-items/:id`.

### 7.2 — Notifications

- `src/context/NotificationContext.tsx` → `useNotifications({ unreadOnly: true })`
  polled every 60s. `PATCH /notifications/:id/read` on click.

### 7.3 — Inventory

- `src/pages/inventory.tsx` → `useReagents({...})`,
  `useCreateReagent()`, `useAdjustReagentQuantity(id)`, `useReagentAlerts()`.

### 7.4 — Verify

- Toggle a role-permission cell → backend `PUT` succeeds → all admin
  sessions see the change after a refetch (no localStorage).
- Mark a notification read → badge updates → reload preserves read state.
- Add a reagent → quantity > 0 → status recomputed server-side
  (`OK` / `Low Stock` / `Expired`) → SPA displays the computed status.

---

## Migration checklist (final pass)

Before deleting `src/mock-data/`:

- [ ] Every page that read mock data has been swapped to a hook.
- [ ] Every mutation has a working `useMutation` and invalidates the
      right query keys.
- [ ] The `glims_session` cookie is set on every successful login and
      cleared on logout.
- [ ] The CSRF token is sent on every state-changing request.
- [ ] No `import` statement references `src/mock-data/*` from any page
      (`grep -r "from \"@/mock-data" src/pages src/components`).
- [ ] The remaining references are in seed scripts, tests, or the
      `parameterLibrary` / `testMasterData` collections that the
      backend seeds via Alembic.
- [ ] `npm run build` passes with zero warnings.
- [ ] End-to-end smoke test from `backend.md` §8 (last bullet) passes
      against the deployed backend.

## What to defer

- Server-side PDF generation (`POST /reports/:id/pdf`).
- WebSocket/SSE notifications (v2).
- S3-compatible file storage (v2).
- Multi-tenant `tenant_id` plumbing (revisit when product asks).
- Audit log UI (table is required; UI is optional).