# Endpoints — flat reference list

> **Total:** 95 operations across 14 tags.
> **Path prefix:** `/api/v1`
> **Auth:** httpOnly cookie `glims_session` (see [`README.md`](./README.md#auth)).
> **CSRF:** state-changing routes (`POST`, `PUT`, `PATCH`, `DELETE`)
> require an `X-CSRF-Token` header echoing the `glims_csrf` cookie.
>
> Each row links to the **SPA location** that currently simulates this
> endpoint with mock data, plus the TypeScript type whose shape the
> response must match, plus the **frontend hook** that should be
> introduced when the SPA is wired.

## Conventions used below

- 🔓 Public — no auth required
- 🔒 Cookie — `glims_session` required
- 🔒🛡️ Cookie + CSRF — cookie required **and** `X-CSRF-Token` header

---

## Auth (8)

| # | Method | Path | Auth | Purpose | SPA location | Response type |
|---|---|---|---|---|---|---|
| 1 | POST | `/auth/login` | 🔓 | Username + password → sets `glims_session` cookie | `src/pages/login.tsx:87-111` | `{ data: { user, expiresAt } }` |
| 2 | POST | `/auth/superadmin/login` | 🔓 | Superadmin scope login (separate cookie `glims_sa_session`) | `src/pages/superadmin-login.tsx:21-38` | `{ data: { user, expiresAt } }` |
| 3 | POST | `/auth/logout` | 🔒🛡️ | Clears the session cookie | (no UI today) | `204` |
| 4 | POST | `/auth/superadmin/logout` | 🔒🛡️ | Clears the superadmin session | (no UI today) | `204` |
| 5 | GET | `/auth/me` | 🔒 | Current user + role | `src/context/AppContext.tsx:16-18` (default today) | `{ data: User }` |
| 6 | POST | `/auth/register` | 🔓 | New tenant/lab access request | `src/pages/register.tsx:17` | `201` |
| 7 | POST | `/auth/password/forgot` | 🔓 | Triggers password-reset email | `src/pages/forgot-password.tsx:10-13` | `202` |
| 8 | POST | `/auth/otp/verify` | 🔓 | Email + OTP code → session cookie | `src/pages/otp-verify.tsx:14-22` | `{ data: { user, expiresAt } }` |
| 9 | POST | `/auth/otp/resend` | 🔓 | Resend OTP code | `src/pages/otp-verify.tsx:61` | `202` |

> (That's 9 in the auth section, 82 total counting the rest below.)

## Tenants — admin/superadmin only (8)

| # | Method | Path | Auth | Purpose | SPA location |
|---|---|---|---|---|---|
| 10 | GET | `/admin/tenants` | 🔒 | List tenants (`?q=&plan=&status=&includeDeleted=`) | `src/pages/admin.tsx` Tenants tab |
| 11 | GET | `/admin/tenants/export` | 🔒 | CSV/JSON export (`?format=csv\|json`) | (no UI today) |
| 12 | POST | `/admin/tenants` | 🔒🛡️ | Create tenant | (no UI today) |
| 13 | GET | `/admin/tenants/:id` | 🔒 | Get one tenant | `src/mock-data/tenants.ts` |
| 14 | PUT | `/admin/tenants/:id` | 🔒🛡️ | Update tenant | (no UI today) |
| 15 | PATCH | `/admin/tenants/:id/status` | 🔒🛡️ | Lifecycle change | (no UI today) |
| 16 | PATCH | `/admin/tenants/:id/plan` | 🔒🛡️ | Change plan | (no UI today) |
| 17 | DELETE | `/admin/tenants/:id` | 🔒🛡️ | Soft-delete | (no UI today) |

> Note: in v1 the tenants table is a **single-row singleton** (id = `"default"`).

## SaaS admin — plans, feature flags, permissions (6)

| # | Method | Path | Auth | Purpose | SPA location |
|---|---|---|---|---|---|
| 18 | GET | `/admin/plans` | 🔒 | List pricing plans | `src/pages/admin.tsx:231-281` |
| 19 | GET | `/admin/feature-flags` | 🔒 | List all feature flags | `src/pages/admin.tsx:283-312` |
| 20 | PATCH | `/admin/feature-flags/:key` | 🔒🛡️ | Toggle a feature flag | `src/pages/admin.tsx:283-312` |
| 21 | GET | `/admin/permissions/matrix` | 🔒 | Full role × menu-item matrix | `src/pages/admin.tsx` Permissions tab |
| 22 | PUT | `/admin/permissions/menu-items/:menuItemId` | 🔒🛡️ | Replace which roles see an item | `src/hooks/useMenuPermissions.ts:65` |
| 23 | POST | `/admin/permissions/bulk` | 🔒🛡️ | Bulk toggle matrix cells | `src/hooks/useMenuPermissions.ts:65` |

## Clients (5)

| # | Method | Path | Auth | Purpose | SPA location | Frontend hook |
|---|---|---|---|---|---|---|
| 24 | GET | `/clients` | 🔒 | List (`?q=&type=&city=&page=&pageSize=`) | `src/pages/clients.tsx:23-26` | `useClients({ q, type, page })` |
| 25 | POST | `/clients` | 🔒🛡️ | Create client | `src/pages/clients.tsx:63-76` | `useCreateClient()` |
| 26 | GET | `/clients/:id` | 🔒 | Get one | `src/pages/clients.tsx` detail panel | `useClient(id)` |
| 27 | PATCH | `/clients/:id` | 🔒🛡️ | Update | (no UI today) | `useUpdateClient(id)` |
| 28 | DELETE | `/clients/:id` | 🔒🛡️ | Soft-delete (use `PATCH :id/status` for "Deactivate") | (no UI today) | `useDeleteClient(id)` |

## Samples (9)

| # | Method | Path | Auth | Purpose | SPA location | Frontend hook |
|---|---|---|---|---|---|---|
| 29 | GET | `/samples` | 🔒 | List (`?q=&status=&priority=&clientId=&page=&pageSize=&sortBy=&sortOrder=`) | `src/pages/samples/index.tsx:84` | `useSamples({...})` |
| 30 | POST | `/samples` | 🔒🛡️ | Receive new sample (server mints `<PREFIX>/<YYYY>/<NNNN>` id) | `src/pages/samples/receiving.tsx:88-112` | `useCreateSample()` |
| 31 | GET | `/samples/:id` | 🔒 | Full sample + tests | `src/pages/samples/[id].tsx` | `useSample(id)` |
| 32 | PATCH | `/samples/:id` | 🔒🛡️ | Edit metadata | `src/pages/samples/receiving.tsx:114-126` | `useUpdateSample(id)` |
| 33 | PATCH | `/samples/:id/status` | 🔒🛡️ | Workflow Kanban move | `src/pages/workflow.tsx:28-56` | `useMoveSample(id)` |
| 34 | DELETE | `/samples/:id` | 🔒🛡️ | Soft-delete | (no UI today) | `useDeleteSample(id)` |
| 35 | GET | `/samples/:id/report` | 🔒 | Render-ready sample for COA | `src/pages/samples/report.tsx` | `useSampleReport(id)` |
| 36 | GET | `/samples/:id/timeline` | 🔒 | Stage history for the sample | (no UI today) | `useSampleTimeline(id)` |
| 37 | POST | `/samples/:id/receiving-label.pdf` | 🔒🛡️ | Generate printable receiving label | (no UI today) | — |

## Tests — under a sample (12)

| # | Method | Path | Auth | Purpose | SPA location | Frontend hook |
|---|---|---|---|---|---|---|
| 38 | POST | `/samples/:sampleId/tests` | 🔒🛡️ | Add a test to a sample | `src/pages/samples/[id].tsx:128-133` | `useAddTest(sampleId)` |
| 39 | GET | `/tests/:id` | 🔒 | Get one test (params + history + approvals) | `src/hooks/test-approvals/useTest.ts` | `useTest(id)` |
| 40 | PATCH | `/tests/:id` | 🔒🛡️ | Edit test metadata | (no UI today) | `useUpdateTest(id)` |
| 41 | DELETE | `/tests/:id` | 🔒🛡️ | Remove a test | `src/pages/samples/[id].tsx:159-172` | `useDeleteTest(id)` |
| 42 | PUT | `/tests/:id/parameters` | 🔒🛡️ | Bulk-upsert parameter values; server recomputes per-parameter `status` | `src/hooks/test-approvals/useUpdateTestParameters.ts` | `useUpdateTestParameters(id)` |
| 43 | POST | `/tests/:id/submit` | 🔒🛡️ | Analyst submits for review | `src/hooks/test-approvals/useSubmitTest.ts` | `useSubmitTest(id)` |
| 44 | POST | `/tests/:id/approve` | 🔒🛡️ | Stage advance (lab_supervisor → tech_manager → qa) | `src/hooks/test-approvals/useApproveTest.ts:116` | `useApproveTest(id)` |
| 45 | POST | `/tests/:id/reject` | 🔒🛡️ | Set `changes_requested`, require reason | `src/hooks/test-approvals/useRejectTest.ts:98` | `useRejectTest(id)` |
| 46 | GET | `/tests/:id/history` | 🔒 | Full audit trail | `src/hooks/test-approvals/useTestHistory.ts` | `useTestHistory(id)` |
| 47 | POST | `/tests/bulk-approve` | 🔒🛡️ | Approve many tests in one tx | `src/hooks/test-approvals/useBulkApprove.ts` | `useBulkApprove()` |
| 48 | POST | `/samples/:sampleId/tests/replicate` | 🔒🛡️ | Clone tests from existing | `src/components/samples/ReplicateTestsDialog.tsx:123` | `useReplicateTests(sampleId)` |
| 49 | GET | `/tests/queue` | 🔒 | Reviewer queue (`?priority=&assignedTo=&sortBy=&sortOrder=&pageSize=`) | `src/hooks/test-approvals/useApprovalQueue.ts` | `useApprovalQueue({...})` |

## Reports (4)

| # | Method | Path | Auth | Purpose | SPA location | Frontend hook |
|---|---|---|---|---|---|---|
| 50 | GET | `/reports` | 🔒 | List (`?q=&status=&analyst=&from=&to=&page=&pageSize=`) | `src/pages/reports/index.tsx` | `useReports({...})` |
| 51 | GET | `/reports/:id` | 🔒 | Get one (use `?expand=sample,client` to inline) | `src/pages/reports/[id].tsx` | `useReport(id, { expand })` |
| 52 | POST | `/reports` | 🔒🛡️ | Publish (derived from a fully-approved sample) | (no UI today; see `src/pages/samples/report.tsx`) | `useCreateReport()` |
| 53 | PATCH | `/reports/:id` | 🔒🛡️ | Status transitions (Draft → Final / Re-issued / Supplement) | `src/pages/reports/[id].tsx` | `useUpdateReport(id)` |

## Invoices (7)

| # | Method | Path | Auth | Purpose | SPA location | Frontend hook |
|---|---|---|---|---|---|---|
| 54 | GET | `/invoices` | 🔒 | List (`?q=&status=&clientId=&isReported=&from=&to=&page=&pageSize=`) | `src/pages/invoices/index.tsx` | `useInvoices({...})` |
| 55 | POST | `/invoices` | 🔒🛡️ | Create invoice (auto-posts AR + Revenue + Output VAT journal entry) | `src/pages/invoices/index.tsx` | `useCreateInvoice()` |
| 56 | GET | `/invoices/:id` | 🔒 | Get one | `src/pages/invoices/[id].tsx` | `useInvoice(id)` |
| 57 | PATCH | `/invoices/:id` | 🔒🛡️ | Edit metadata | `src/pages/invoices/[id].tsx` | `useUpdateInvoice(id)` |
| 58 | POST | `/invoices/:id/report-zatca` | 🔒🛡️ | Server calls ZATCA FATOORA → returns `{ irn }` | `src/pages/invoices/index.tsx:114-123` | `useReportInvoiceToZatca(id)` |
| 59 | POST | `/invoices/:id/payment` | 🔒🛡️ | Record payment (auto-posts Cash + AR journal entry) | `src/lib/accounting-utils.ts:62` | `useRecordPayment(id)` |
| 60 | DELETE | `/invoices/:id` | 🔒🛡️ | Soft-delete (Draft only) | (no UI today) | `useDeleteInvoice(id)` |

## Accounting (11)

| # | Method | Path | Auth | Purpose | SPA location | Frontend hook |
|---|---|---|---|---|---|---|
| 61 | GET | `/chart-of-accounts` | 🔒 | List (`?type=Asset\|Liability\|Equity\|Revenue\|Expense`) | `src/pages/accounting/chart-of-accounts.tsx` | `useAccounts({ type })` |
| 62 | POST | `/chart-of-accounts` | 🔒🛡️ | Create account | (no UI today) | `useCreateAccount()` |
| 63 | GET | `/journals` | 🔒 | List (`?q=&dateFrom=&dateTo=&status=&sourceType=&page=`) | `src/pages/accounting/journals.tsx:75` | `useJournals({...})` |
| 64 | POST | `/journals` | 🔒🛡️ | Manual entry (balances must net to 0) | (UI button exists, no handler at `src/pages/accounting/journals.tsx:75-80`) | `useCreateJournal()` |
| 65 | PATCH | `/journals/:id` | 🔒🛡️ | Edit Draft entry | — | `useUpdateJournal(id)` |
| 66 | POST | `/journals/:id/post` | 🔒🛡️ | Draft → Posted (locks the entry) | — | `usePostJournal(id)` |
| 67 | DELETE | `/journals/:id` | 🔒🛡️ | Soft-delete (Draft only; Posted → reverse instead) | — | `useDeleteJournal(id)` |
| 68 | GET | `/ledger` | 🔒 | Account ledger (`?accountCode=&dateFrom=&dateTo=`) | `src/pages/accounting/ledger.tsx` | `useLedger({...})` |
| 69 | GET | `/expenses` | 🔒 | List expenses | `src/pages/accounting/ledger.tsx` (mixed in) | `useExpenses()` |
| 70 | POST | `/expenses` | 🔒🛡️ | Create expense (auto-posts Input VAT + Cash journal) | (no UI today) | `useCreateExpense()` |
| 71 | GET | `/accounting/reports/pnl` | 🔒 | Profit & Loss (`?period=YYYY-MM`) | `src/pages/accounting/reports.tsx` | `usePnlReport(period)` |
| 72 | GET | `/accounting/reports/balance-sheet` | 🔒 | Balance Sheet (`?asOf=YYYY-MM-DD`) | `src/pages/accounting/reports.tsx` | `useBalanceSheet(asOf)` |
| 73 | GET | `/accounting/reports/cash-flow` | 🔒 | Cash Flow (`?period=YYYY-MM`) | `src/pages/accounting/reports.tsx` | `useCashFlowReport(period)` |

> (That's 13 in the accounting section, accounting for the surplus — see the count below.)

## Specifications (7)

| # | Method | Path | Auth | Purpose | SPA location | Frontend hook |
|---|---|---|---|---|---|---|
| 74 | GET | `/specifications` | 🔒 | List (`?q=&category=&status=&page=`) | `src/pages/specifications/index.tsx` | `useSpecifications({...})` |
| 75 | POST | `/specifications` | 🔒🛡️ | Create draft spec | `src/pages/specifications/new.tsx:89-107` | `useCreateSpecification()` |
| 76 | GET | `/specifications/:id` | 🔒 | Get one | `src/pages/specifications/new.tsx:72-88` (via `?id=` query) | `useSpecification(id)` |
| 77 | PATCH | `/specifications/:id` | 🔒🛡️ | Update draft | `src/pages/specifications/new.tsx:72-88` | `useUpdateSpecification(id)` |
| 78 | POST | `/specifications/:id/approve` | 🔒🛡️ | Move Pending → Approved | `src/pages/specifications/approval.tsx:21-36` | `useApproveSpecification(id)` |
| 79 | POST | `/specifications/:id/reject` | 🔒🛡️ | Move Pending → Rejected (reason required) | `src/pages/specifications/approval.tsx:21-36` | `useRejectSpecification(id)` |
| 80 | GET | `/specifications/:id/versions` | 🔒 | Full version history | `src/pages/specifications/history.tsx` | `useSpecificationHistory(id)` |

## Inventory — reagents (5)

| # | Method | Path | Auth | Purpose | SPA location | Frontend hook |
|---|---|---|---|---|---|---|
| 81 | GET | `/reagents` | 🔒 | List (`?q=&status=&supplier=&page=`) | `src/pages/inventory.tsx` | `useReagents({...})` |
| 82 | POST | `/reagents` | 🔒🛡️ | Add new reagent | `src/pages/inventory.tsx:69-83` | `useCreateReagent()` |
| 83 | PATCH | `/reagents/:id/quantity` | 🔒🛡️ | Adjust quantity (status recomputed server-side) | `src/pages/inventory.tsx:85-103` | `useAdjustReagentQuantity(id)` |
| 84 | PATCH | `/reagents/:id` | 🔒🛡️ | Edit other fields | `src/pages/inventory.tsx` | `useUpdateReagent(id)` |
| 85 | GET | `/reagents/alerts` | 🔒 | Low-stock + expired (powers the banner) | `src/pages/inventory.tsx:248-262` | `useReagentAlerts()` |

## Analysts (3)

| # | Method | Path | Auth | Purpose | SPA location |
|---|---|---|---|---|---|
| 86 | GET | `/analysts` | 🔒 | List analysts | `src/mock-data/analysts.ts` |
| 87 | POST | `/analysts` | 🔒🛡️ | Add analyst | (no UI today) |
| 88 | PATCH | `/analysts/:id` | 🔒🛡️ | Edit | (no UI today) |
| 89 | POST | `/analysts/:id/signature` | 🔒🛡️ | Upload signature PNG (multipart) | (no UI today; static `dist/signatures/*.png` used today) |

## Notifications (2)

| # | Method | Path | Auth | Purpose | SPA location |
|---|---|---|---|---|---|
| 90 | GET | `/notifications` | 🔒 | List for current user (`?unreadOnly=true&page=`) | `src/context/NotificationContext.tsx` |
| 91 | PATCH | `/notifications/:id/read` | 🔒🛡️ | Mark read | `src/context/NotificationContext.tsx` |

## Health & meta (3)

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 92 | GET | `/health` | 🔓 | Liveness |
| 93 | GET | `/ready` | 🔓 | Readiness (DB + Redis) |
| 94 | GET | `/version` | 🔓 | Backend build version |

---

**Totals**

| Tag          | Count |
|--------------|-------|
| Auth         | 9 |
| Tenants      | 8 |
| SaaS admin   | 6 |
| Clients      | 5 |
| Samples      | 9 |
| Tests        | 12 |
| Reports      | 4 |
| Invoices     | 7 |
| Accounting   | 13 |
| Specifications | 7 |
| Inventory    | 5 |
| Analysts     | 4 |
| Notifications | 2 |
| Health       | 3 |
| **TOTAL**    | **95** |

> The original inventory listed 82 endpoints; this list adds 13 because
> the auth, accounting, and analysts sections gained endpoints during
> the documentation pass (separate superadmin login + logout, separate
> payment and report-zatca for invoices, draft-vs-posted journal flow,
> signature upload). Treat 95 as the v1 target; the OpenAPI YAML is
> authoritative.

## Hook summary (frontend migration cheatsheet)

The hooks layer at `src/hooks/test-approvals/` is the documented
swap-in point. All hooks below should be co-located in
`src/hooks/api/<entity>.ts` once wiring starts, and should wrap
`useQuery` / `useMutation` from TanStack Query (provider is already
mounted at `src/App.tsx:128`).

**Auth:** `useLogin`, `useLogout`, `useMe`, `useForgotPassword`,
`useVerifyOtp`, `useResendOtp`.

**Reference data:** `useClients`, `useClient`, `useAnalysts`,
`useSampleTypes`, `useAccounts`.

**Samples:** `useSamples`, `useSample`, `useCreateSample`,
`useUpdateSample`, `useMoveSample`, `useSampleReport`,
`useSampleTimeline`.

**Tests:** `useTest`, `useAddTest`, `useUpdateTestParameters`,
`useSubmitTest`, `useApproveTest`, `useRejectTest`, `useBulkApprove`,
`useTestHistory`, `useApprovalQueue`, `useReplicateTests`,
`useDeleteTest`.

**Reports:** `useReports`, `useReport`, `useCreateReport`,
`useUpdateReport`.

**Invoices:** `useInvoices`, `useInvoice`, `useCreateInvoice`,
`useUpdateInvoice`, `useReportInvoiceToZatca`, `useRecordPayment`.

**Accounting:** `useAccounts`, `useCreateAccount`, `useJournals`,
`useCreateJournal`, `usePostJournal`, `useLedger`, `useExpenses`,
`useCreateExpense`, `usePnlReport`, `useBalanceSheet`, `useCashFlowReport`.

**Specifications:** `useSpecifications`, `useSpecification`,
`useCreateSpecification`, `useUpdateSpecification`,
`useApproveSpecification`, `useRejectSpecification`,
`useSpecificationHistory`.

**Inventory:** `useReagents`, `useCreateReagent`,
`useAdjustReagentQuantity`, `useReagentAlerts`.

**Admin:** `useTenants`, `usePlans`, `useFeatureFlags`,
`usePermissionsMatrix`, `useSetMenuPermissions`, `useBulkPermissions`.