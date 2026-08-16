# GreenLIMS KSA — Laboratory Information Management System

> A production-ready SaaS frontend for a Saudi Arabia laboratory. Bilingual
> (English / Arabic with RTL), multi-role, dark/light themed, and 100%
> mock-data driven — no backend required to demo the full flow.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Getting Started](#5-getting-started)
6. [Available Scripts](#6-available-scripts)
7. [Roles & Permissions](#7-roles--permissions)
8. [Pages & Routes](#8-pages--routes)
9. [Mock Data](#9-mock-data)
10. [Core Modules](#10-core-modules)
11. [Bilingual (EN / AR) + RTL](#11-bilingual-en--ar--rtl)
12. [Theming](#12-theming)
13. [Reusable Components](#13-reusable-components)
14. [State Management](#14-state-management)
15. [Sample Test Replicate Workflow](#15-sample-test-replicate-workflow)
16. [Role-Based Per-Test Editing](#16-role-based-per-test-editing)
17. [Accounting (ZATCA)](#17-accounting-zatca)
18. [Marketing Reports Dashboard](#18-marketing-reports-dashboard)
19. [Build & Typecheck](#19-build--typecheck)
20. [Legacy / Backup Artifacts](#20-legacy--backup-artifacts)
21. [Roadmap](#21-roadmap)
22. [License](#22-license)

---

## 1. Project Overview

**GreenLIMS KSA** is a Laboratory Information Management System (LIMS)
purpose-built for the Saudi Arabian market. The application simulates a
multi-tenant SaaS where laboratories receive samples, assign analysts,
run tests, approve results, issue ZATCA-compliant invoices, and expose
analytics to clients — all from a single React SPA.

The repository ships the full UI/UX with realistic mock data
(Al-Marai, Saudi Aramco, Ajmal Perfumes, SADL, etc.) so it can be
demoed end-to-end without any backend services.

> ⚠️ **There is no real backend.** All data lives in
> `src/mock-data/*.ts` and is mutated in-memory through the
> `findSample` / `notifyStoreChanged` helpers in
> `src/hooks/test-approvals/store.ts`. Refresh the page to reset state.

---

## 2. Features

- ✅ **Role-based UI** for 7 personas (Admin, Lab Manager, Analyst,
  Receptionist, Accountant, Client, Superadmin).
- ✅ **Bilingual EN / AR** with full RTL flipping driven by `AppContext`.
- ✅ **Dark + Light** theme via `next-themes`.
- ✅ **Sample Lifecycle**: Receiving → Testing → Review → Approval →
  Certificate of Analysis (COA) → Invoice.
- ✅ **Chain-of-Custody** timeline on each sample.
- ✅ **Replicate Tests to Other Samples** (deep copy with fresh IDs and
  reset approval state).
- ✅ **Per-test Edit / Delete** actions for privileged roles
  (`admin`, `lab_manager`, `superadmin`).
- ✅ **Test Approvals** workflow with reviewer chains, reject-with-reason
  dialog, and approval history.
- ✅ **Kanban Workflow** board (`/workflow`).
- ✅ **ZATCA FATOORA-compliant** tax invoices (SAR, 15% VAT) with
  Phase-2-ready QR/TLV fields.
- ✅ **Accounting**: Chart of Accounts, Journals, General Ledger,
  Financial Reports.
- ✅ **Marketing Reports** dashboard segment with CSV / Excel export
  and pagination.
- ✅ **Multi-tenant** SaaS Admin panel (Tenants, Plans, Feature Flags).
- ✅ **Client Portal** with My Samples / Reports / Invoices.
- ✅ **Inventory** alerts for low/expiring reagents.
- ✅ **Analytics** with Recharts visualisations.
- ✅ **Responsive** layout for desktop, tablet, and mobile.

---

## 3. Tech Stack

| Layer            | Choice                                  |
| ---------------- | --------------------------------------- |
| Framework        | **React 18** + **TypeScript**           |
| Build tool       | **Vite 6**                              |
| Styling          | **Tailwind CSS v4** + `tailwind-vite`   |
| UI primitives    | **shadcn/ui** (Radix-based)             |
| Icons            | **lucide-react**, **react-icons**       |
| Routing          | **wouter**                              |
| Charts           | **Recharts**                            |
| Animations       | **framer-motion**                       |
| Forms + schema   | **react-hook-form** + **Zod**           |
| Tables / DnD     | **@tanstack/react-query**, **@hello-pangea/dnd** |
| Dates            | **date-fns**, **react-day-picker**      |
| PDF export       | **jspdf** + **html2canvas**             |
| Toasts           | **sonner** + **@radix-ui/react-toast**  |
| Theme            | **next-themes**                         |
| Lang/runtime     | **Node.js 24+**, ESM (`"type": "module"`)|

---

## 4. Project Structure

```
greenlims-ksa/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── components.json              # shadcn/ui config
├── migrate.sh                   # (legacy) DB seed helper
├── public/
│   └── signatures/              # Static COA signature SVGs
├── src/
│   ├── main.tsx                 # React entry
│   ├── App.tsx                  # Provider tree + wouter routes
│   ├── index.css                # Tailwind + design tokens
│   ├── components/
│   │   ├── layout/              # AppLayout, Sidebar, Header, Breadcrumb, NotificationBell
│   │   ├── samples/             # SampleHeader, SampleTabs, ReplicateTestsDialog, …
│   │   ├── tests/               # TestTable, TestRowExpandable, TestDrawer, ParameterTable
│   │   ├── approvals/           # ApprovalChainPanel, RejectTestDialog, TestReviewDrawer
│   │   ├── shared/              # DataTable, KpiCard, StatusBadge, RoleSwitcher, SampleTimeline
│   │   └── ui/                  # shadcn/ui primitives (button, card, dialog, …)
│   ├── pages/
│   │   ├── dashboard.tsx        # KPI + Marketing Reports
│   │   ├── samples/             # index, [id], receiving
│   │   ├── specifications/      # library, test-master, new, approval, history, index
│   │   ├── invoices/            # index, [id]
│   │   ├── reports/             # index, [id] (COA)
│   │   ├── accounting/          # dashboard, journals, ledger, reports, chart-of-accounts
│   │   ├── admin.tsx
│   │   ├── analytics.tsx
│   │   ├── clients.tsx
│   │   ├── inventory.tsx
│   │   ├── workflow.tsx         # Kanban
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   ├── otp-verify.tsx
│   │   ├── settings.tsx
│   │   ├── superadmin-login.tsx
│   │   ├── client-portal.tsx
│   │   └── not-found.tsx
│   ├── context/
│   │   ├── AppContext.tsx       # currentRole, language, RTL, theme
│   │   └── NotificationContext.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useMenuPermissions.ts
│   │   ├── useRolePermissions.ts
│   │   └── test-approvals/      # store.ts (findSample / notifyStoreChanged) + helpers
│   ├── lib/
│   │   ├── utils.ts             # cn(), class helpers
│   │   └── accounting-utils.ts  # ZATCA + accounting math
│   └── mock-data/
│       ├── index.ts             # barrel export
│       ├── samples.ts           # MockSample[] + deriveMarketingRows()
│       ├── clients.ts           # Saudi companies
│       ├── analysts.ts
│       ├── sampleTypes.ts
│       ├── specifications.ts
│       ├── reagents.ts
│       ├── reports.ts
│       ├── invoices.ts          # ZATCA-ready
│       ├── accounts.ts
│       ├── journals.ts
│       ├── expenses.ts
│       ├── tenants.ts
│       ├── notifications.ts
│       ├── rolePermissions.ts
│       └── menuPermissions.ts
└── .backup_artifacts/           # Legacy Express+Drizzle backend (unused)
```

---

## 5. Getting Started

### Prerequisites

- **Node.js ≥ 24** (the project uses ESM and modern Vite 6 features).
- **npm ≥ 10** (a `package-lock.json` is committed). You can also use
  pnpm / yarn, but npm is what CI uses.

### Install

```bash
npm install
```

### Run the dev server

```bash
npm run dev
```

Then open <http://localhost:3000>.

The login page exposes a **demo role selector** so you can switch
between Admin, Lab Manager, Analyst, Receptionist, Accountant, Client,
and Superadmin without any credentials.

### Build for production

```bash
npm run build
```

The static bundle lands in `dist/`. Serve it with any static host:

```bash
npm run serve
```

---

## 6. Available Scripts

| Script           | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `npm run dev`    | Start Vite dev server on port `3000`.                   |
| `npm run build`  | Production build → `dist/`.                             |
| `npm run serve`  | Preview the production build with `vite preview`.       |

> The original `replit.md` mentions a `pnpm run typecheck` workspace
> command, but the shipped project is a single-package Vite app —
> use `npx tsc --noEmit` for ad-hoc typechecking.

---

## 7. Roles & Permissions

Roles are stored in `AppContext.currentRole` and drive both navigation
(`Sidebar.tsx`) and in-page gating (`useRolePermissions`,
`useMenuPermissions`).

| Role          | Typical access                                                       |
| ------------- | -------------------------------------------------------------------- |
| `admin`       | Full operational + billing access.                                   |
| `lab_manager` | Samples, workflow, approvals, inventory, analytics. No billing.      |
| `analyst`     | Assigned tests, approvals. Read-only on samples.                     |
| `receptionist`| Samples (receiving), clients, inventory.                             |
| `accountant`  | Accounting dashboard, invoices, journals, ledger, reports.           |
| `client`      | Client Portal only (My Samples, Reports, Invoices).                  |
| `superadmin`  | Tenant management, plans, feature flags, per-test edit/delete.      |

### Per-test Edit / Delete gating

`TestTable.tsx` exposes `canModifyTest` for `admin`, `lab_manager`, and
`superadmin`. Other roles only see the **View** action. See
[§16 Role-Based Per-Test Editing](#16-role-based-per-test-editing).

---

## 8. Pages & Routes

| Route                      | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `/login`                   | Auth with demo role selector.                                 |
| `/register`                | New account sign-up.                                          |
| `/forgot-password`         | Password reset request.                                       |
| `/otp-verify`              | One-time passcode entry.                                      |
| `/superadmin-login`        | Tenant operator login.                                        |
| `/dashboard`               | KPI cards, Recharts, Marketing Reports segment.               |
| `/samples`                 | Samples Manager table (filters: customer, status, sample#, report#, name, date range). |
| `/samples/receiving`       | Walk-in sample intake form.                                   |
| `/samples/:id`             | Sample detail with Chain of Custody, Tests, Approvals tabs.   |
| `/specifications`          | Specification library index.                                  |
| `/specifications/library`  | Browse specifications.                                        |
| `/specifications/test-master` | Master list of test definitions.                            |
| `/specifications/new`      | Create a new specification.                                   |
| `/specifications/approval` | Approval queue.                                               |
| `/specifications/history`  | Approved / rejected history.                                  |
| `/workflow`                | Kanban: Received → Testing → Approved.                         |
| `/clients`                 | Client management.                                            |
| `/reports` + `/reports/:id`| Certificate of Analysis (COA).                                |
| `/inventory`               | Reagents + alerts.                                            |
| `/invoices` + `/invoices/:id` | ZATCA FATOORA-compliant invoices (SAR, 15% VAT).           |
| `/accounting/dashboard`    | Finance KPIs.                                                 |
| `/accounting/journals`     | General journal entries.                                      |
| `/accounting/ledger`       | General ledger view.                                          |
| `/accounting/reports`      | Trial balance, P&L, balance sheet.                            |
| `/accounting/chart-of-accounts` | Chart of accounts tree.                                  |
| `/analytics`               | Cross-tenant analytics dashboard.                             |
| `/admin`                   | SaaS admin: Tenants, Plans, Feature Flags.                    |
| `/client-portal`           | Client-facing landing.                                        |
| `/settings`                | App preferences (theme, language).                            |

---

## 9. Mock Data

All mock data lives in `src/mock-data/`.

| File                  | Contents                                                       |
| --------------------- | -------------------------------------------------------------- |
| `samples.ts`          | ~20 lab samples + `deriveMarketingRows()` helper.              |
| `clients.ts`          | Saudi companies (Al-Marai, Aramco, Ajmal, SADL, etc.).         |
| `analysts.ts`         | 5+ analysts with Arabic names.                                 |
| `sampleTypes.ts`      | Sample type ↔ test mappings.                                   |
| `specifications.ts`   | Spec library.                                                  |
| `reagents.ts`         | Inventory.                                                     |
| `reports.ts`          | COA records.                                                   |
| `invoices.ts`         | ZATCA-ready invoices in SAR.                                   |
| `accounts.ts`         | Chart of accounts.                                             |
| `journals.ts`         | Journal entries.                                               |
| `expenses.ts`         | Expense records.                                               |
| `tenants.ts`          | Multi-tenant SaaS data.                                        |
| `notifications.ts`    | Notification feed.                                             |
| `rolePermissions.ts`  | Role → permission matrix.                                      |
| `menuPermissions.ts`  | Role → menu visibility.                                        |

> **Anchor date**: `ANCHOR_TODAY = "2026-08-14"` keeps date math
> deterministic when deriving progress % and due dates.

---

## 10. Core Modules

### 10.1 Sample Lifecycle

```
Received → Testing → Review → Approved → Reported → Invoiced
```

State transitions are tracked in `MockSample.status`. The Kanban board
(`/workflow`) is the visual control surface; the Sample detail page
(`/samples/:id`) shows the chain-of-custody timeline plus the active
tabs.

### 10.2 Test Approvals

Approval chains live in `src/components/approvals/` and
`src/hooks/test-approvals/`:

- `ApprovalChainPanel` renders the ordered reviewers.
- `TestReviewDrawer` opens the test for review.
- `RejectTestDialog` captures the rejection reason.
- `store.ts` exports `findSample(id)` and `notifyStoreChanged()` so
  any mutation re-renders all subscribed views.

### 10.3 Specifications

A specification is a reusable set of test + parameter definitions that
can be attached to a sample. The
`/specifications/{library,test-master,new,approval,history}` flow
moves a draft through approval before it becomes attachable.

### 10.4 Accounting

`src/lib/accounting-utils.ts` holds the ZATCA FATOORA helpers
(VAT 15 %, QR / TLV generation, totals). Pages under
`/accounting/*` consume it.

---

## 11. Bilingual (EN / AR) + RTL

- `AppContext.language` ∈ `"en" | "ar"`.
- Components flip layouts via the helper `isRtl = language === "ar"`,
  swap margins / paddings, and choose between English and Arabic
  labels (e.g. `"Edit"` ↔ `"تعديل"`).
- The `<html dir>` attribute is updated by the context provider.

---

## 12. Theming

Dark + Light are handled by `next-themes` with a class-based strategy.
The provider sits in `App.tsx` and the toggle lives in
`components/shared/RoleSwitcher.tsx` (and the settings page).

---

## 13. Reusable Components

| Component             | Where                                          |
| --------------------- | ---------------------------------------------- |
| `DataTable`           | `components/shared/DataTable.tsx`              |
| `KpiCard`             | `components/shared/KpiCard.tsx`                |
| `StatusBadge`         | `components/shared/StatusBadge.tsx`            |
| `RoleSwitcher`        | `components/shared/RoleSwitcher.tsx`           |
| `SampleTimeline`      | `components/shared/SampleTimeline.tsx`         |
| `BarcodeMock` / `QrCodeMock` | `components/shared/`                   |
| `Button`, `Card`, `Dialog`, `Select`, `Tabs`, `Table`, `Checkbox`, `Popover`, `ScrollArea`, `Badge` | `components/ui/*` (shadcn/ui) |

---

## 14. State Management

There is **no Redux / Zustand**. The app uses:

- **React Context** (`AppContext`, `NotificationContext`) for cross-app
  concerns (role, language, notifications).
- **In-memory mutation** through `findSample(id)` +
  `notifyStoreChanged()` from `src/hooks/test-approvals/store.ts`.
  Pages call these directly to update shared sample state.
- **Local component state** for filters, drawers, dialogs.

To make sure a page re-renders after a mutation, call
`notifyStoreChanged()` after `findSample(id)` writes back to
`sample.tests`.

---

## 15. Sample Test Replicate Workflow

The `Replicate to Samples` button on `/samples/:id` opens
`components/samples/ReplicateTestsDialog.tsx`.

1. Source tests are **deep-copied** with `cloneTests()`:
   - Fresh IDs for both the test and every parameter.
   - Approval state dropped (`reviewStatus = "pending"`).
   - Parameter values blanked, parameter status reset to `"pending"`.
2. The user picks one or more **target samples** from a searchable
   list with checkboxes + Select all / Clear shortcuts.
3. On confirm: each target's tests are appended, then
   `notifyStoreChanged()` re-renders every subscriber.
4. A toast confirms the count: `"Replicated X tests to N samples"`.

> Disabled when the source sample has zero tests.

---

## 16. Role-Based Per-Test Editing

For users with role `admin`, `lab_manager`, or `superadmin`, each row
in the test table on `/samples/:id` exposes three actions:

- 👁 **View** — opens `TestDrawer` for read-only inspection.
- ✏ **Edit** — opens the same drawer in edit mode + info toast.
- 🗑 **Delete** — removes the test from the sample (with toast); the
  shared store is notified via `notifyStoreChanged()`.

For all other roles, only the **View** button renders. The gating is
implemented once in `components/tests/TestTable.tsx`:

```ts
const canModifyTest =
  currentRole === "admin" ||
  currentRole === "lab_manager" ||
  currentRole === "superadmin";
```

and threaded down through `SampleTabs → TestTable → TestRowExpandable`
via `onEdit`/`onDelete` props.

---

## 17. Accounting (ZATCA)

- Currency: **SAR** with **15 % VAT**.
- Invoice numbering, QR / TLV encoding, and Phase-2 readiness are
  implemented in `src/lib/accounting-utils.ts`.
- Routes: `/invoices`, `/invoices/:id`, plus the
  `/accounting/{dashboard,journals,ledger,reports,chart-of-accounts}`
  suite for accountants.

---

## 18. Marketing Reports Dashboard

`/dashboard` ends with a **Marketing Reports** section
(`components/dashboard/MarketingReports.tsx`) that:

- Filters by From / To date, Client, Issuance, Status, Type, and a free
  text search.
- Renders a 10-column table (Sample#, Client, Product, Test, Received,
  Reported, Priority, Status, Progress, Marketing Status).
- Exports the filtered set to **CSV** or **Excel** via Blob downloads.
- Paginates at 10 rows per page.
- Shares locale handling with the rest of the app.

The data comes from `deriveMarketingRows(nowIso, samples)` in
`src/mock-data/samples.ts`, which is also reused by the Samples
Manager table.

---

## 19. Build & Typecheck

```bash
# Build
npm run build

# Type-check only
npx tsc --noEmit
```

A clean build emits `dist/index.html` + hashed JS/CSS assets. CI exit
code `0` and `✓ built in <time>s` indicate success.

---

## 20. Legacy / Backup Artifacts

Three directories at the repo root hold an **unused** Express 5 +
Drizzle ORM + OpenAPI backend from a prior pnpm workspace attempt:

- `.backup_artifacts/api-server/`
- `.backup_artifacts/greenlims-ksa/`
- `.backup_artifacts/mockup-sandbox/`
- `.backup_lib/`, `.backup_scripts/`

They are kept for historical reference only — the shipped frontend
makes **zero** API calls.

---

## 21. Roadmap

Planned follow-ups (not yet implemented):

- Real backend integration (Express + Drizzle scaffold already
  exists under `.backup_artifacts/`).
- Server-side approval webhooks + email notifications.
- Barcode / QR scanner integration for sample receiving.
- Role gating on the **Samples Manager Action** column (currently
  shown to all non-client roles; could be tightened to
  admin / lab_manager / superadmin only).
- Dedicated edit-only `TestDrawer` mode (currently reuses the view
  drawer with a toast).

---

## 22. License

Internal project — see repository owner for licensing terms.
