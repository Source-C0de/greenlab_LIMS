# GreenLIMS KSA — Laboratory Information Management System

> A bilingual (English / Arabic with RTL), multi-role, dark/light themed
> Laboratory Information Management System frontend for Saudi Arabia. React 18 +
> TypeScript + Vite on a **ports-and-adapters (hexagonal) architecture**, so
> the UI runs against in-memory mocks today and a real HTTP backend tomorrow
> without rewriting a single component.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
   - [The dependency rule](#the-dependency-rule)
   - [Layers](#layers)
   - [Ports & adapters in practice](#ports--adapters-in-practice)
   - [The composition root](#the-composition-root)
   - [Layering guard](#layering-guard)
4. [Project Structure](#4-project-structure)
5. [Getting Started](#5-getting-started)
6. [Available Scripts](#6-available-scripts)
7. [Environment Variables](#7-environment-variables)
8. [Roles & Permissions](#8-roles--permissions)
9. [Pages & Routes](#9-pages--routes)
10. [Core Modules](#10-core-modules)
11. [Bilingual (EN / AR) + RTL](#11-bilingual-en--ar--rtl)
12. [Reusable Components](#12-reusable-components)
13. [State Management](#13-state-management)
14. [Key Workflows](#14-key-workflows)
15. [Accounting (ZATCA)](#15-accounting-zatca)
16. [Mock Data](#16-mock-data)
17. [Adding Features](#17-adding-features)
18. [Current State & Roadmap](#18-current-state--roadmap)
19. [Troubleshooting](#19-troubleshooting)
20. [License](#20-license)

---

## 1. Project Overview

**GreenLIMS KSA** is a Laboratory Information Management System frontend
purpose-built for the Saudi Arabian market. It simulates a multi-tenant SaaS
where laboratories receive samples, assign analysts, run tests, approve results,
issue ZATCA-format invoices, and expose analytics to clients — all from a single
React SPA.

```
Sample receiving → Testing → 3-stage approval → Certificate of Analysis
                → Quotation → ZATCA invoice → Accounting
```

The repository ships the full UI/UX with realistic Saudi mock data (Al-Marai,
Saudi Aramco, Ajmal Perfumes, SWCC, Tabuk Pharmaceuticals), so the entire flow
is demoable end-to-end with no backend running.

> ⚠️ **Mock-first, not mock-only.** Two seams already speak to a real FastAPI
> backend when `VITE_USE_API=true`: the **entire auth flow** and the **Test
> Parameter Catalogue**. Everything else reads in-memory fixtures. The
> architecture was refactored so extending the second seam is a config flip,
> not a rewrite. See [Current State](#18-current-state--roadmap) for exactly
> what is and isn't ported yet.

**Core capabilities**

- ✅ Role-based UI across **7 personas**
- ✅ Bilingual EN/AR with full RTL flipping, **typed** so a missing Arabic
  label is a compile error
- ✅ Dark + light theme via `next-themes`
- ✅ Sample lifecycle: receiving → testing → review → approval → COA → invoice
- ✅ Chain-of-custody timeline per sample
- ✅ Reissue & supplementary workflows (clone a sample, keep all test work)
- ✅ Replicate tests to other samples (deep copy, fresh ids, reset approvals)
- ✅ 3-stage test approval chain with reject-with-reason and history
- ✅ Kanban workflow board (`/workflow`)
- ✅ Accounting: chart of accounts, journals, ledger, financial reports
- ✅ ZATCA-shaped tax invoices (SAR, 15% VAT) — see the honesty note in
  [Accounting](#15-accounting-zatca)
- ✅ Marketing reports dashboard with CSV / Excel export and pagination
- ✅ Multi-tenant SaaS admin panel (tenants, plans, feature flags)
- ✅ Client portal, inventory alerts, Recharts analytics, responsive layout

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Framework | **React 18** + **TypeScript 5.9** (`strict: true`) |
| Build tool | **Vite 6** (dev server on port **3000**) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) + design tokens in `index.css` |
| UI primitives | **shadcn/ui** (Radix-based), **55 components** in `shared/ui/` |
| Icons | **lucide-react** |
| Routing | **wouter** (do **not** introduce React Router) |
| Data fetching | **@tanstack/react-query** 5 (used by the API-backed seams) |
| Charts | **Recharts** |
| Animations | **framer-motion** |
| Forms + validation | **react-hook-form** + **Zod** |
| Drag & drop | **@hello-pangea/dnd** |
| Dates | **date-fns**, **react-day-picker** |
| PDF / image export | **jspdf** + **html2canvas** |
| QR codes | **qrcode.react** |
| Toasts | **sonner** + **@radix-ui/react-toast** |
| Theme | **next-themes** |
| i18n | Hand-rolled (`AppContext.language`) — do **not** add `react-i18next` |
| Runtime | Node.js 18+ (developed against 22/24), ESM (`"type": "module"`) |

---

## 3. Architecture

### The dependency rule

This is the single most important thing to understand about the codebase:

```
presentation  →  domain  ←  infrastructure
                       ↑
            (shared is imported by all, imports nothing)
```

Arrows mean "may import". Nothing ever points back. A `domain/` file that
imports React, or an `infrastructure/` file that imports a React component, is
a design error — and [`npm run lint:layers`](#layering-guard) will fail the
build.

### Layers

| Layer | Contains | May import |
|---|---|---|
| `shared/` | UI primitives (55 shadcn), pure utilities, i18n label **data** | *nothing app-internal* |
| `domain/` | Business entities, pure rules, port interfaces | `shared/` |
| `infrastructure/` | Adapters — HTTP clients, in-memory mocks, repositories, DI | `shared/`, `domain/` |
| `presentation/` | React: pages, components, hooks, providers | all of the above |

**246 TypeScript files**: `shared` 69, `domain` 18, `infrastructure` 40,
`presentation` 116.

`domain/` is pure TypeScript — no React, no `fetch`, no side effects. That is
what makes it testable (see [Current State](#18-current-state--roadmap) for why
tests aren't there yet) and portable to a different UI framework.

### Ports & adapters in practice

A **port** is an interface the domain declares. An **adapter** is an
implementation the infrastructure provides. Consumers depend on the port, so
swapping implementations is a one-line change at the composition root.

`domain/sample/ports.ts`, in full:

```ts
export interface SampleRepository {
  list(query?: SampleQuery): Promise<Result<Page<Sample>>>;
  get(id: string): Promise<Result<Sample>>;
  create(input: Omit<Sample, "id">): Promise<Result<{ id: string }>>;
  update(id: string, patch: Partial<Sample>): Promise<Result<Sample>>;
  remove(id: string): Promise<Result<void>>;
}
```

Adapters that exist today:

| Adapter | Location | Backing |
|---|---|---|
| `mockSampleRepository` | `infrastructure/mock/repositories/sampleRepository.ts` | in-memory store |
| `mockClientRepository` | `infrastructure/mock/repositories/clientRepository.ts` | in-memory fixture |
| `mockAuthSession` | `infrastructure/mock/repositories/authSession.ts` | demo role picker |
| `httpAuthSession` | `infrastructure/api/repositories/authSession.ts` | real FastAPI backend |

**Four design points worth knowing before you touch these:**

**`Page<T>`, never a bare array.** Every `list()` returns `Page<T>` with
`{ items, total, limit, offset }`. The mock adapter paginates in memory; an HTTP
adapter maps `limit`/`offset`/`total` from the server envelope. If the port
returned `Sample[]`, adding a backend would force a signature change on the port
*and* on every caller. `total` is the count of **all** matching rows, not the
page size — that's what a pager needs to render "showing 1–20 of 347".

**`Result<T, E>` for expected failures.** Repositories return
`Result<T, RepositoryError>` rather than throwing for operational failures
("not found", "conflict", "validation failed"), so callers can't forget the
failure branch. Exceptions stay correct for genuine bugs — a broken invariant.

**One deliberate exception: `AuthSession.signIn` throws.** The login screen
distinguishes `ApiError` (401 → "wrong password") from `TypeError` (network
unreachable → shows a proxy-URL diagnostic). Collapsing both into a
`RepositoryError.code` destroys that distinction. The HTTP adapter re-throws
`apiFetch` errors **unchanged** for exactly this reason. The port's doc comment
says so, so nobody "fixes" it back into a `Result`.

**Sample fields are deliberately mutable.** The `domain/sample/model.ts` types
carry no `readonly` modifiers even though a domain model normally would, because
~15 hooks across the app mutate samples in place. This is recorded in a comment
at the top of that file. Making them `readonly` is not a free cleanup — it is a
migration.

### The composition root

`src/infrastructure/di/container.ts` is **the only place** adapters are
selected:

```ts
const API_ENABLED = isApiEnabled();   // read once, at module load

export const container: Container = {
  samples: mockSampleRepository,          // no HTTP alternative yet
  clients: mockClientRepository,          // no HTTP alternative yet
  auth:    API_ENABLED ? httpAuthSession : mockAuthSession,
};
```

Before the refactor, `isApiEnabled()` was consulted in 20+ places using two
incompatible idioms — an `enabled:` flag on TanStack Query hooks, and an
`if (apiOn)` branch inside `AuthContext`. Both are gone from the auth path.
`AuthContext` now depends on the `AuthSession` port and has no idea which backend
is live.

The `Container` interface is load-bearing: it makes the container fail at
compile time if an adapter stops satisfying its port, rather than at some
call site far away.

> **Why is this in `infrastructure/di/` and not `application/di/`?** The plan
> originally said `application/di/`, but the layering guard rejected it —
> `application/ must not depend on infrastructure/`. A composition root's entire
> job is to import concrete adapters and hand back interfaces, so by definition
> it sits *outside* both layers it joins. `infrastructure/di/` is the outermost
> placement that keeps the one-way rule intact. `src/application/` therefore
> doesn't exist yet; the guard's rule table still lists it, ready for when use
> cases arrive.

Reading the flag at module scope is deliberate: reloading `.env.local` should be
a full page reload, not a mid-session adapter swap that would strand the user in
a half-HTTP session.

### Layering guard

```bash
npm run lint:layers
```

`scripts/check-layering.mjs` — plain Node, no dependencies. Walks every
`.ts`/`.tsx` file, resolves each import (both `@/`-aliased and relative),
classifies source and target into layers, and exits non-zero listing any
forbidden dependency.

It has real teeth. It caught all of these during the refactor:

- `infrastructure/` importing from `presentation/` — the sample store lived in
  `presentation/hooks/test-approvals/store.ts` and had to move
- `application/di/` importing adapters — which relocated the container
- `shared/ui/toaster.tsx` reaching into `presentation/hooks/use-toast`
- `shared/ui/sidebar.tsx` reaching into `presentation/hooks/use-mobile`
- `infrastructure/api/auth.ts` importing the `Role` **type** from a React context

> Folders not in the rule table are treated as transitional and exempt, so the
> guard gains coverage automatically as files migrate in.

---

## 4. Project Structure

```
greenlims-ksa/
├── index.html
├── package.json
├── vite.config.ts              # port 3000, @ alias, /api dev proxy
├── tsconfig.json               # strict: true, @/* → ./src/*
├── components.json             # shadcn generator config (paths point at shared/ui)
├── .env.example                # documents all four VITE_* variables
├── docs/                       # API contracts (OpenAPI, user + test-param specs)
├── scripts/
│   └── check-layering.mjs      # architecture guard
├── public/signatures/          # COA signature images (gitignored — PII)
└── src/
    ├── main.tsx
    ├── App.tsx                 # provider tree + all 49 routes
    ├── index.css               # Tailwind v4 + design tokens
    │
    ├── domain/                 # ← pure business logic, no React  (18 files)
    │   ├── sample/             #   model.ts  rules.ts  ports.ts
    │   ├── client/             #   model.ts  ports.ts
    │   ├── accounting/         #   model.ts  rules.ts  ports.ts
    │   ├── quotation/          #   model.ts  rules.ts  ports.ts
    │   ├── identity/           #   model.ts  ports.ts   (User, AuthUser, AuthSession)
    │   ├── testParameter/      #   model.ts  ports.ts
    │   ├── shared/             #   pagination.ts  result.ts
    │   └── index.ts            #   barrel (cross-cutting only)
    │
    ├── infrastructure/         # ← adapters  (40 files)
    │   ├── api/
    │   │   ├── api.ts          #   apiFetch, isApiEnabled, ApiError
    │   │   ├── auth.ts         #   token storage + auth endpoints
    │   │   ├── apiErrors.ts
    │   │   ├── tanstack-queries.ts
    │   │   ├── clients/        #   usersApi rolesApi testListApi testParametersApi
    │   │   └── repositories/   #   authSession.ts   ← HTTP adapter
    │   ├── di/
    │   │   └── container.ts    #   ★ composition root — the only adapter-selection site
    │   ├── domain-support/     #   quotation utils, signature
    │   ├── mock/
    │   │   ├── data/           #   23 fixture files
    │   │   └── repositories/   #   sampleRepository  clientRepository
    │   │                        #   authSession  sampleStore
    │   └── storage/
    │
    ├── presentation/           # ← React  (116 files)
    │   ├── providers/          #   AppContext  AuthContext  NotificationContext
    │   ├── hooks/
    │   │   ├── i18n/           #   useTranslation (typed EN/AR)
    │   │   ├── test-approvals/ #   approval hooks, labels
    │   │   └── *               #   useMenuPermissions, useRolePermissions, …
    │   ├── components/
    │   │   ├── layout/         #   AppLayout Sidebar Header Breadcrumb NotificationBell
    │   │   ├── auth/           #   ProtectedRoute  RoleAvatar
    │   │   ├── features/       #   samples/ tests/ approvals/ accounting/ admin/
    │   │   │                   #   samples-specs/ work-orders/ quotations/ dashboard/
    │   │   └── shared/         #   DataTable KpiCard StatusBadge RoleSwitcher SampleTimeline
    │   └── pages/              #   16 route directories + top-level pages
    │
    └── shared/                 # ← imported by everything, imports nothing  (69 files)
        ├── ui/                 #   55 shadcn/ui primitives
        ├── lib/                #   cn()  types.ts  sample-id.ts  adminMenuKeys.ts
        │                       #   app-meta.ts  accounting-utils.ts  pdf-report.ts
        └── i18n/               #   types.ts + domains/<vertical>/{en,ar}.ts
```

---

## 5. Getting Started

### Prerequisites

Node.js 18+ (developed against 22/24; `@types/node` is `^22.10.6`). No
`.nvmrc` is pinned, so any modern Node works.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server  →  http://localhost:3000
npm run dev

# 3. Verify the codebase is sound (run before every commit)
npm run typecheck      # tsc --noEmit — zero errors
npm run lint:layers    # architecture guard — zero violations

# 4. Production build
npm run build          # → dist/
npm run serve          # preview the production build
```

### Logging in

With `VITE_USE_API=false` (the default) the login screen is a **demo role
picker** — any credentials work, and a role switcher in the sidebar changes the
active role at runtime. The chosen role persists across refresh via
`localStorage` (key `glims_role_override`).

> Role gating in demo mode **demonstrates intent rather than enforcing
> security**. The backend's `user.role` is the real authority when
> `VITE_USE_API=true`.

### Running against the real backend

Set `VITE_USE_API=true` and make sure the dev proxy target is reachable. Leave
`VITE_API_BASE_URL` empty in dev so requests go through the Vite `/api` proxy
(avoids CORS). In production set it to the absolute origin.

---

## 6. Available Scripts

| Script | Command | What it does |
|---|---|---|
| `npm run dev` | `vite` | Dev server on port **3000** |
| `npm run build` | `vite build` | Production build → `dist/` |
| `npm run serve` | `vite preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.json` | Full type check, zero errors expected |
| `npm run lint:layers` | `node scripts/check-layering.mjs` | Architecture guard, zero violations expected |

**There is no `test` script and no test framework installed.** See
[Current State](#18-current-state--roadmap).

### Before you commit

```bash
npm run typecheck && npm run lint:layers && npm run build
```

All three must be clean.

> TypeScript was only added to this project during the architecture work.
> Before that, Vite bundled via esbuild, which *strips* types without *checking*
> them — so `npm run build` passing told you very little. Fixing the 52 errors
> that surfaced on the first `tsc` run uncovered three genuine runtime crashes
> that would otherwise have shipped. It no longer works that way.

---

## 7. Environment Variables

| Variable | Default | Effect |
|---|---|---|
| `VITE_USE_API` | `false` | `true` selects HTTP adapters in the composition root |
| `VITE_API_BASE_URL` | `""` → falls back to `/api` | Backend base URL. Empty means relative, which routes through the dev proxy |
| `VITE_API_TOKEN` | — | Bearer token sent as `Authorization` on outgoing requests |

Plus one **Node-side** variable read by `vite.config.ts` (never exposed to the
browser):

| Variable | Default | Effect |
|---|---|---|
| `VITE_API_PROXY_TARGET` | `http://localhost:8000` | Where the dev server proxies `/api` |

`.env.example` documents all four. `.env.local` is gitignored.

---

## 8. Roles & Permissions

Seven roles, defined in `src/shared/lib/types.ts`:

```ts
export type Role =
  | "superadmin" | "admin" | "lab_manager" | "analyst"
  | "client" | "accountant" | "receptionist";
```

| Role | Sees |
|---|---|
| `superadmin` | Minimal sandbox — admin/users, admin/roles, settings |
| `admin` | Everything except tenant-level superadmin tooling |
| `lab_manager` | As admin, minus Billing / Accounting / SaaS Admin |
| `analyst` | Dashboard, Samples, Workflow, Reports, My Submissions |
| `receptionist` | Dashboard, Samples (→ receiving), Client Requests, Clients, Reports, Inventory |
| `client` | Client Portal, My Samples, My Reports, My Invoices |
| `accountant` | Finance Dashboard, Invoices, Journals, Ledger, Reports, Accounts Tree |

**Gating happens at two levels:**

1. **Route level** — `ProtectedRoute` wraps every non-auth route, with an
   optional `roles={[…]}` array. 18 routes across 6 groups carry an explicit
   array. Enforced in `App.tsx`.
2. **Menu level** — the sidebar filters nav items by role, then applies per-user
   menu overrides (`useEffectiveMenuVisibility`).

> Every one of the 49 routes is wrapped in `ProtectedRoute`. It used to be
> documented as "unguarded" — that has not been true since the auth refactor.

---

## 9. Pages & Routes

**49 routes** registered in `src/App.tsx`.

**Auth** (no layout): `/login`, `/superadmin`, `/register`,
`/forgot-password`, `/otp-verify`

**Core** — `/dashboard`, `/dashboard/marketing`, `/samples`,
`/samples/receiving`, `/samples/*`, `/samples/*/report`, `/workflow`,
`/clients`, `/reports`, `/reports/:id`, `/inventory`, `/invoices`,
`/invoices/:id`, `/analytics`, `/settings`

**Approvals** — `/approvals`, `/approvals/my-submissions`

**Specifications** — `/specifications`, `/specifications/new`,
`/specifications/library`, `/specifications/approval`,
`/specifications/history`, `/specifications/test-master`,
`/specifications/test-parameters`

**Role-gated groups:**

| Routes | Roles |
|---|---|
| `/quotations*` (3 routes) | `admin`, `lab_manager` |
| `/admin*` (4 routes) | `admin`, `superadmin` |
| `/client-portal` | `client` |
| `/accounting/*` (5 routes) | `admin`, `accountant` |
| `/client-requests*` (3 routes) | `admin`, `lab_manager`, `receptionist` |
| `/technical-evaluation*` (2 routes) | `admin`, `lab_manager` |

> **Sample ids contain slashes** (`FD/2024/0001`), so the detail route is
> registered as `/samples/*`, not `/samples/:id` — a `:id` segment would not
> match. The splat arrives under the literal key `"*"` from
> wouter/regexparam.

### Registering a new page

1. Create `src/presentation/pages/<area>/<page>.tsx`
2. Register the route in `src/App.tsx`, wrapped in
   `<ProtectedRoute roles={[…]}>`
3. Add a `Sidebar.tsx` nav entry for the roles that should see it
4. Run all three gates

---

## 10. Core Modules

| Domain | Covers | Has rules? |
|---|---|---|
| `sample` | Samples, tests, parameters, parameter review status, 3-stage approval | ✅ |
| `client` | Customers — the join anchor for samples/quotations/invoices | — |
| `accounting` | Invoices, journals, ledger, chart of accounts | ✅ |
| `quotation` | Quotation lifecycle, pricing, totals | ✅ |
| `identity` | Users, roles, menu permissions, auth session | — |
| `testParameter` | The Test Parameter Catalogue | — |

### `rules.ts` — pure business logic, extracted from where it used to live

These were originally embedded in mock data or UI components. They now live in
`domain/` as side-effect-free functions, which is what makes them testable:

```ts
// domain/sample/rules.ts
currentStage(test)            // which approval stage must act right now
roleForStage(stage)           // the role that owns a stage
nextStage(stage)              // lab_supervisor → tech_manager → qa
statusAfterApproval(stage)    // where the review status lands
canApprove(test, role)        // the gating rule, in one place

// domain/accounting/rules.ts
vatFor(net, rate = 0.15)      // 15% KSA VAT
isBalanced(entry)             // Σdebits === Σcredits — the invariant that was never checked
invoicePosting(...)           // double-entry posting
isOverdue(invoice, today?)

// domain/quotation/rules.ts
computeTotals(lines)          // subtotal + VAT
canTransition(from, to)       // quotation state machine
```

### The 3-stage approval chain

```
Analyst submits
  → Lab Supervisor      (approvals.lab_supervisor)
    → Technical Manager (approvals.tech_manager)
      → QA              (approvals.qa)  →  reviewStatus: "qa_approved"
```

Each test carries three sign-off slots plus an append-only `reviewHistory`.
`currentStage()` is the single source of truth for "who acts next";
`roleForStage()` maps each stage to the role that owns it. The gating rule
itself — `canApprove(test, role)` — lives in the domain, not in a component.

### The Test Parameter Catalogue

The one module with a genuinely live backend contract
(`docs/test_parameter_api.md`). It calls the real FastAPI API when
`VITE_USE_API=true` and falls back to fixtures otherwise. This is the seam the
next port (`TestParameterRepository`) will formalise.

---

## 11. Bilingual (EN / AR) + RTL

`language: "en" | "ar"` lives in `AppContext`; setting it to `"ar"` sets
`<html dir="rtl">` and toggles an `.rtl` class on the root element.

**Two label patterns coexist:**

1. **Inline paired objects** (legacy, ~75 files):
   ```tsx
   const LABEL = { en: "Edit", ar: "تعديل" };
   {isRtl ? LABEL.ar : LABEL.en}
   ```

2. **Typed `useTranslation`** (the target):
   ```tsx
   // presentation/hooks/i18n/useTranslation.ts
   const labels = { en: {...}, ar: {...} };
   const { t, isRtl } = useTranslation(labels);
   ```

Label modules live per-vertical in `shared/i18n/domains/<vertical>/`. The
Arabic table is typed as `{ [K in keyof typeof enLabels]: string }`, so a
missing or misspelled Arabic key is a **compile error** rather than a blank
label discovered in review.

Only `samples/` is migrated so far — it is a working proof of the pattern.
**Prefer it in new code.**

> Do **not** introduce `react-i18next`. i18n is hand-rolled via
> `AppContext.language` by design.

**RTL rule:** use logical Tailwind properties (`ms-*`, `me-*`, `start-*`,
`end-*`), never `ml-*` / `mr-*`.

---

## 12. Reusable Components

| Component | Location | Purpose |
|---|---|---|
| `DataTable` | `presentation/components/shared/` | Generic list table with search, sort, pagination, CSV export. **Prefer this over reinventing table JSX.** Accepts `searchKey` as `keyof T` or `(item: T) => string` |
| `KpiCard` | `presentation/components/shared/` | Metric tile with an optional numeric trend |
| `StatusBadge` | `presentation/components/shared/` | Coloured status pill |
| `RoleSwitcher` | `presentation/components/shared/` | Demo-mode role picker |
| `SampleTimeline` | `presentation/components/shared/` | Chain-of-custody visualization |
| `ProtectedRoute` | `presentation/components/auth/` | Route guard with optional `roles` allow-list |
| `PermissionMatrix` | `presentation/components/features/admin/` | Role × menu-key grid |
| 55 shadcn primitives | `shared/ui/` | button, card, dialog, select, table, … |

---

## 13. State Management

There is no Redux. Three mechanisms cover everything:

**1. React context for ambient app state** — `AppContext` (role, language,
theme), `AuthContext` (session), `NotificationContext`.

**2. An in-memory store for sample data** —
`infrastructure/mock/repositories/sampleStore.ts`:

```ts
samplesStore            // deep copy of the seed fixtures — NOT the seed itself
subscribe(fn)          // register a listener
getStoreSnapshot()     // read for useSyncExternalStore
notifyStoreChanged()   // call after every mutation
findSample(id)
findTestById(id)
resetStore()
```

Components read it through `useSyncExternalStore`:

```tsx
const samples = useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);
```

The store lives in `infrastructure/` rather than `presentation/hooks/` because
the mock repository adapter has to import it — and adapters must never reach
into the UI layer. It has no React dependency, which is what made that move
possible.

> **Phase 3 moved this file** from `presentation/hooks/test-approvals/store.ts`.
> 14 import sites were rewritten. If you find an import pointing at the old
> path, it's stale.

**3. TanStack Query for the API-backed seams** — `infrastructure/api/tanstack-queries.ts`.
Its hooks still gate on `enabled: isApiEnabled()`; porting them is the natural
Phase 5 slice.

> A hard browser refresh resets the store by design. A newly registered sample
> that vanishes was never persisted — writes must go through
> `container.samples.create()` / `.update()`, not local `useState`.

---

## 14. Key Workflows

### Sample registration

1. `pages/samples/index.tsx` → `onSubmit`
2. The spec auto-loads when a sample type is selected (matching `productName`)
3. `container.samples.create(...)` persists to the store
4. The adapter mints the id via `generateSampleId` — format
   `<PREFIX>/<YYYY>/<NNNN>`, serial scoped per category per year

> The **adapter** owns id generation, not the form. `generateSampleId` needs
> the full corpus to derive the next serial, and a real backend would assign
> its own id anyway — so keeping it in presentation would leak a mock-only
> concept upward.

### Approval workflow

`useApproveTest` / `useRejectTest` / `useSubmitTest` mutate the live store and
call `notifyStoreChanged()`. Subscribed views re-render on the store tick.

### Reissue & supplementary

Both clone a sample, keeping all test work (approvals, history, parameter
values) intact and refreshing only the wrapper fields:

- **Reissue** → new id `<base>-R<n>`, status `Reissue`
- **Supplementary** → new id `<base>-S<n>`, status `Supplementary`, designed
  to receive additional tests

Both surface a lineage banner on the detail page linking back to the source.

### Replicate tests to other samples

Deep-copies tests with **fresh ids**, resets `reviewStatus` to `pending`, and
blanks parameter values — so the copy can be run independently.

---

## 15. Accounting (ZATCA)

Currency **SAR**, VAT **15%**. `isBalanced()` enforces Σdebits = Σcredits — an
invariant that had never previously been checked anywhere.

> ⚠️ **Recorded, not fixed — and deliberately so.** Two functions in
> `shared/lib/accounting-utils.ts` are *simulations*, not implementations:
>
> - `ZatcaService.generateHash` returns `Math.random()` despite being labelled a
>   "SHA-256 simulation". It is not a hash.
> - `generateQR` is a base64 pipe-delimited string, not ZATCA TLV, and is
>   therefore not FATOORA-compliant.
> - `postInvoice` debits `invoice.total` and credits `subtotal + vat`. This is
>   probably balanced but was unverified.
>
> Real ZATCA compliance requires a real backend and the actual spec. It is not
> achievable with a frontend patch, so these are documented rather than
> quietly "improved".

---

## 16. Mock Data

23 fixture files in `src/infrastructure/mock/data/`, re-exported through
`index.ts`:

```
accounts  analysts  clients  expenses  index  invoices  journals
menuPermissions  notifications  quotations  reagents  reports
role-menu-permissions  rolePermissions  samples  sampleTypes  specifications
tenants  testQueue  user-menu-overrides  users  workOrders  workOrderStore
```

The corpus is Saudi-realistic: Al-Marai, Saudi Aramco, Ajmal Perfumes, SWCC,
Tabuk Pharmaceuticals. It supports mutation, sharing, and cross-references, so
it behaves as a *de-fee in-memory database* rather than static fixtures — which
is what made wrapping it in repository ports worthwhile.

> **Which entities earn a port, and why.** Six do: accounting (VAT math is pure
> and untested), sample (the status lifecycle was scattered `if` chains), client
> (a five-way join anchor), testParameter (a live backend contract already
> exists), quotation (an existing state machine), identity (four permission
> tables joined ad-hoc). The other ~16 stay plain fixtures — forcing a
> repository interface onto a static lookup table is ceremony, not
> architecture.

### Adding mock data

1. Add `src/infrastructure/mock/data/<entity>.ts` with a typed collection
2. Type it from `domain/<entity>/model.ts` — **never** declare a local
   duplicate interface. The domain owns the type; the fixture implements it
3. Re-export it from `src/infrastructure/mock/data/index.ts`

---

## 17. Adding Features

### A new repository

1. Declare the port in `domain/<entity>/ports.ts`
2. Implement the mock adapter in `infrastructure/mock/repositories/`
3. Implement the HTTP adapter in `infrastructure/api/repositories/`
4. Wire both into `infrastructure/di/container.ts`
5. Consume via `container.<name>`

> **Rule of thumb: presentation never imports a concrete adapter.** If a page
> needs a repository, it imports the container. If you find yourself importing
> from `infrastructure/` in a component to get data, that's the signal you've
> skipped a port.

### A new page

See [Pages & Routes](#pages--routes).

### A bilingual component

Prefer the typed `useTranslation` pattern over inline `{en, ar}` objects, and
logical CSS properties for RTL. See
[Bilingual](#11-bilingual-en--ar--rtl).

### A new domain entity

1. `domain/<entity>/model.ts` — types only, no behaviour
2. `domain/<entity>/rules.ts` — pure functions, if it has any logic
3. `domain/<entity>/ports.ts` — interfaces the outside world must satisfy
4. `domain/index.ts` — add to the barrel only if it's cross-cutting

---

## 18. Current State & Roadmap

### Working, gated, and verified

- ✅ `npm run typecheck` — **0 errors** under `strict: true`
- ✅ `npm run lint:layers` — **0 violations**
- ✅ `npm run build` — green

### Not yet done — the honest list

- 🔴 **No tests. Zero. No framework installed.** The domain `rules.ts`
  functions were extracted *specifically* to make them testable. Vitest would
  cost ~5 lines in `vite.config.ts`; the highest-value first targets are
  `isBalanced` (Σdebits === Σcredits, never checked) and VAT rounding. **This
  is the single largest remaining gap.**
- 🔴 **`UserRepository` and `RoleRegistry` are declared but not implemented.**
  Five components still read `isApiEnabled()` directly and juggle three
  overlapping user shapes (`SaaSUser`, API `User`, domain `User`):
  `admin/users`, `admin/users/[id]`, `admin/roles`,
  `specifications/test-master`, `specifications/test-parameters`, plus the
  notification bell in `components/layout/Header.tsx`.
  `infrastructure/api/tanstack-queries.ts` also still gates every hook on
  `enabled: isApiEnabled()`. Porting these is the natural next slice.
- 🟡 **`TestParameterRepository` port** — the API seam exists but isn't behind
  a port yet, so it doesn't get the race guard or the mock/HTTP symmetry auth
  has.
- 🟡 **`pages/samples/report.tsx`** still reads the store directly
  (`samplesStore`, `findSample`) rather than through the port.
- 🟡 **Four oversized pages** remain unsplit:
  `specifications/test-parameters.tsx` (1190L), `admin/roles.tsx` (1152L),
  `samples/index.tsx` (1142L), `admin/users.tsx` (1049L). Splitting a
  controlled form into a child component can silently make it uncontrolled —
  **`tsc` will not catch this**, so each split needs a manual form walkthrough.
- 🟡 **i18n migration incomplete** — only the `samples` vertical uses the typed
  pattern; ~75 files still use inline `{en, ar}` objects.

### Known issues deliberately left visible

- **ZATCA hash/QR are simulations**, not spec-compliant — see
  [Accounting](#15-accounting-zatca).
- **`MenuEntry.iconName` is correctly a `string`**, but the existing
  `menuPermissions.ts` registry still imports real `lucide-react` components.
  That's a layering violation the guard can't catch, because the fixture lives
  in `infrastructure/` — which is *allowed* to import React.
- **Bundle is a single ~2.3 MB chunk.** No `manualChunks` config;
  code-splitting is a straightforward win if load time matters.
- **`CLAUDE.md` and `PUKU.md` predate the architecture work.** Where they
  disagree with this README, this README is correct — but the real fix is to
  rewrite them.

---

## 19. Troubleshooting

**`npm run typecheck` passes but the app misbehaves.**
Always run it — the build only strips types, it does not check them.

**Layering guard reports `must not depend on …`.**
The architecture is right and the import is wrong. Move the file to the
correct layer rather than suppressing the rule. Every violation the guard has
ever raised was a genuine design error.

**Sample changes don't appear.**
Sample data lives in `samplesStore` (a deep copy of the seed, *not* the seed
itself). Call `notifyStoreChanged()` after mutating, and make sure the
component subscribes via
`useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot)`.

**A newly registered sample disappears.**
It wasn't persisted. Writes must go through `container.samples.create()` /
`.update()`, not local component state — `useState` is not a store.

**The sample detail page shows the wrong sample.**
Don't fall back to `mockSamples[0]` when an id doesn't resolve. Show an explicit
"not found" / "loading" state instead. `pages/samples/[id].tsx` does this now;
copy the pattern.

**`VITE_USE_API=true` but nothing changes.**
The flag is read once at module load. Restart the dev server after changing
`.env` — an HMR update will not re-evaluate the container.

**Auth race on a slow network.**
Already handled. `httpAuthSession` tracks a monotonic generation counter, so a
slow `/auth/me` can never overwrite a newer successful login. This replaced a
2-second timestamp heuristic in `AuthContext` that was duplicated across three
call sites and could discard a legitimate login on a slow connection. Don't
"simplify" it back.

**Login error messages look wrong.**
`AuthSession.signIn` throws `ApiError` / `TypeError` *unchanged* on purpose —
`login.tsx` branches on that distinction to show "invalid password" versus
"backend unreachable" (including the Vite-proxy URL hint). Wrapping either in a
`RepositoryError` collapses both into one useless message.

**Imports fail after a refactor.**
Check for stale `@/mock-data`, `@/hooks`, `@/context`, `@/components/ui`, or
`@/lib` paths — those directories no longer exist. Current aliases are
`@/shared/*`, `@/domain/*`, `@/infrastructure/*`, `@/presentation/*`.

**Stale docs.**
`CLAUDE.md` / `PUKU.md` / `.puku-cli/skills/*` still teach the old flat
structure. This README is the current source of truth.

---

## 20. License

Internal project — contact the repository owner.