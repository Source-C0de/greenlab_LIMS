# Mentor Guide — Backend Engineer Onboarding to GreenLIMS KSA Frontend

> **Purpose:** A teaching doc for someone comfortable with backend systems who
> is new to this React+TypeScript SPA. It walks you through the data-flow map,
> tells you which files to touch for each kind of change, and flags every
> non-obvious thing about how this codebase talks to FastAPI.
>
> **No code is meant to be written from this document.** It is a mental model
> plus a lookup table for "where do I go for X?"

**Table of contents**

| § | Topic |
|---|---|
| [0](#0-read-this-before-anything-else) | Two things that will trip you up |
| [1](#1-the-30-second-mental-model) | The mental model |
| [2](#2-the-map) | Every directory and what it may import |
| [3](#3-the-data-flow-map--exact-paths) | Three exact request paths |
| [4](#4-common-tasks--where-to-look-for-each) | Add field / page / fixture / label / toast / role |
| [5](#5-bug-hunting--the-systematic-flow) | Where bugs actually live |
| [6](#6-backend-integration--the-exact-seams) | Every HTTP detail you'll need |
| [7](#7-adding-a-new-domain-entity-the-right-way) | 10-step port recipe |
| [8](#8-verification-checklist-for-every-change) | What to run, per change type |
| [9](#9-when-you-are-stuck) | Read-in-order + grep recipes |
| [10](#10-quick-command-crib) | Copy-paste commands |
| [11](#11-what-this-doc-deliberately-does-not-teach) | Out of scope |
| [12](#12-when-your-task-touches-multiple-layers) | Multi-layer change patterns |
| [13](#13-the-single-sentence-version) | If you forget everything else |

---

## 0. Read this before anything else

Two things in this repo are unusual, and you will trip over them if you don't
know.

1. **`.env.local` currently has `VITE_USE_API=true`.** That means this
   checkout is pointed at the real backend, not at mock mode. When you log in
   the app tries to hit `/api/v1/...` through the Vite proxy. If the backend on
   `localhost:8000` is down, every page that touches data will fail.
   To go back to mocks: set `VITE_USE_API=false` in `.env.local` **and restart
   the dev server** — the flag is read at module load only, so HMR will not
   pick it up.

2. **`useTranslation` exists but has zero callers.** `README.md` calls it "the
   target pattern", but the actual label pattern still in use across ~12 files
   is the inline `{ en, ar }` object plus a local `pick()` helper, defined
   separately in each file (reference: `src/presentation/pages/quotations/new.tsx`
   L69–88). When you add labels to a file, follow whichever pattern that file
   already uses. Do **not** introduce a third pattern mid-edit.

Now, the model.

---

## 1. The 30-second mental model

```
backend (FastAPI)
        │  /api/v1/*  (Bearer token + cookies)
        ▼
infrastructure/api/        ← HTTP adapters, ONE per port
        │
        ├── mock/data/ + mock/repositories/   ← in-memory adapters
        │
        └──→  di/container.ts   ← ★ the ONLY place an adapter is chosen
                          │
                          ▼
              presentation/   ← React (pages, components, hooks, providers)
                          │
                          ▼
                  shared/   ← primitives & utilities, imports nothing app-internal

domain/  ← pure types + interfaces. NO React, NO fetch, NO side effects.
```

**The rule that makes it all work:** a page never imports an adapter directly.
It imports the `container` and asks `container.samples.list(...)`. The
container decides — once, at module load — whether the answer comes from an
HTTP `fetch()` or from an in-memory fixture.

That's the whole architecture. Everything below is "which file under each box"
and "what do I touch when."

---

## 2. The map

Every directory, what it does, and who is allowed to import it.

| Layer | Folder | May import | May **not** import | Your role there |
|---|---|---|---|---|
| shared | `src/shared/{ui,lib,i18n}` | nothing app-internal | everything else | Reuse, don't extend |
| domain | `src/domain/<entity>` | `shared/` | `infrastructure/`, `presentation/` | **Owns** the types and rules |
| infrastructure | `src/infrastructure/{api,mock,di,domain-support,storage}` | `shared/`, `domain/` | `presentation/` | **Implements** the port |
| presentation | `src/presentation/{providers,hooks,components,pages}` | everything | — | Reads via `container` |

`npm run lint:layers` enforces this table. Every commit should run it green.

Note the rule is **symmetric**: `domain/` may not import `infrastructure/`, and
`infrastructure/` may not import `presentation/`. The composition root has to
see both layers at once, which is why it lives at the outermost level that
satisfies both — `infrastructure/di/container.ts`, **not** `application/di/`.
(The plan originally said `application/di/`; the layering guard rejected it on
day one, correctly.)

### File-count expectations (sanity check)

```
shared:           69 files
domain:           18 files
infrastructure:   40 files
presentation:    116 files
─────────────────────────────
TOTAL:           246 .ts/.tsx
```

If `find src -name '*.ts*' | wc -l` returns something wildly different, you
are on the wrong branch.

---

## 3. The data-flow map — exact paths

### 3.1 A user's request reaches the screen

```
Browser URL
  → wouter router                        src/App.tsx
    → <ProtectedRoute roles={[…]}>       src/presentation/components/auth/ProtectedRoute.tsx
      → Page component                   src/presentation/pages/<area>/<page>.tsx
        → useAuth()                      src/presentation/providers/AuthContext.tsx
        → container.<repo>.list(...)     src/infrastructure/di/container.ts
            → mock adapter  → fixture array
              OR
            → http adapter  → apiFetch() → fetch()
        → useSyncExternalStore (mock)  OR  useQuery (http)
          → render
```

### 3.2 A form submission mutates state

```
onSubmit handler in the page
  → container.<repo>.create(input)  /  .update(id, patch)
      ├─ mock: mutate the in-memory store + notifyStoreChanged()
      │         ← src/infrastructure/mock/repositories/sampleStore.ts
      └─ http: fetch(...) → unwrap → Result<T, RepositoryError>
  → local setState  OR  notifyStoreChanged()
      → every useSyncExternalStore subscriber re-renders
  → toast.success(...) / toast.error(...)     ← Sonner, imported directly
```

### 3.3 Auth lifecycle

```
On mount
  → AuthProvider useEffect fires once
    → container.auth.restore()
        ├─ mock adapter: returns null  → state becomes "anonymous"
        └─ http adapter: GET /auth/me
             + snapshots a generation counter first (race guard)
             ← src/infrastructure/api/repositories/authSession.ts
  → authenticated if a session came back, else anonymous

On "Login" submit
  → container.auth.signIn(credentials)
    → POST /auth/login  → bump generation → persist token
    → adapter returns Session → AuthContext transitions

On "Logout" click
  → container.auth.signOut()
    → bump generation → POST /auth/logout → clear both tokens
```

---

## 4. Common tasks — where to look for each

Every table below maps a job to the exact files you need to open. Line numbers
in parentheses were verified against the code.

### 4.1 Add a new field to an entity

Worked example: adding a `condition` field to `Sample`.

| Layer | File | What to change |
|---|---|---|
| domain | `src/domain/sample/model.ts` (L156–179) | Add the field to the `Sample` interface. **Do not add `readonly`** — there's a MUTABILITY comment at the top of that file explaining that ~15 hooks mutate samples in place. |
| infrastructure | `src/infrastructure/mock/data/samples.ts` (L66+) | Add the field to every record in the `mockSamples` array. TypeScript will enumerate every one that is missing it. |
| infrastructure | `src/infrastructure/mock/repositories/sampleStore.ts` (L22, L67–77) | `samplesStore` is a deep copy of the seed. Nothing to change unless you need a non-trivial default value. |
| infrastructure | `src/infrastructure/mock/repositories/sampleRepository.ts` (L95) | `create()` builds `Sample` from `Omit<Sample, "id">` + `{ id }`. Only changes if you're changing `create`'s contract. |
| presentation | `src/presentation/pages/samples/index.tsx` (L211–226) | The form's submit handler constructs `Omit<Sample, "id">` — add the field here. |
| presentation | `src/presentation/pages/samples/[id].tsx` | Detail-view forms mutate the loaded `Sample` in place — add the field to the form. |
| presentation | `src/presentation/pages/samples/report.tsx` | ⚠️ **Bypasses the port** — reads `sampleStore.findSample` directly. Any new field rendered here needs adding by hand. |
| infrastructure/api | *(no sample HTTP adapter exists yet)* | Skip. This is a documented gap — add it when the HTTP seam is built. |
| presentation/components | `src/presentation/components/features/samples/*` | Anything that displays the field: cards, drawers, badges, tables. |

Then run `npm run typecheck`. It will enumerate every `Sample` literal you
missed and every consumer that reads the new field — that is the whole point of
having the gate.

### 4.2 Add a new page

| Step | File | Action |
|---|---|---|
| 1 | `src/presentation/pages/<area>/<page>.tsx` | Create the page component. |
| 2 | `src/App.tsx` | Import it and register `<Route path="/x"><ProtectedRoute roles={[…]}><LayoutWrapper component={NewPage} /></ProtectedRoute></Route>`. Note: paths containing slashes (like sample ids `FD/2024/0001`) must use the `"/samples/*"` splat syntax, not `:id`. |
| 3 | `src/presentation/components/layout/Sidebar.tsx` | Add a nav entry guarded by the appropriate `roles`. |
| 4 | `src/presentation/hooks/useMenuPermissions.ts` or `useEffectiveMenuVisibility.ts` | Only if the entry should respect per-user menu overrides. |
| 5 | gates | `npm run typecheck && npm run lint:layers && npm run build` |

### 4.3 Add a new mock data collection

| Step | File | Action |
|---|---|---|
| 1 | `src/infrastructure/mock/data/<entity>.ts` | Create the fixture. **Type it from `domain/<entity>/model.ts`** — never declare a local duplicate interface. The domain owns the type; the fixture implements it. |
| 2 | `src/infrastructure/mock/data/index.ts` | Re-export the collection. |

If your page only needs an existing collection, import it from
`@/infrastructure/mock/data` instead.

### 4.4 Add a bilingual label

**Find the file first. Then match whatever pattern it already uses.**

- **Inline pattern** (`const LABELS = {…} as const` + a local `pick()` helper):
  add keys to that `LABELS` object. Canonical reference:
  `src/presentation/pages/quotations/new.tsx` (L69–88).
- **Typed pattern** (`useTranslation` from
  `@/presentation/hooks/i18n/useTranslation`): add the key to BOTH
  `src/shared/i18n/domains/<vertical>/<vertical>.en.ts` and `.ar.ts`. The
  Arabic table is typed `{ [K in keyof typeof enLabels]: string }`, so a
  missing or misspelled Arabic key is a **compile error**.
- **Neither**: you're adding the first labels to this file. Use the inline
  pattern — smaller blast radius. Don't unilaterally introduce
  `useTranslation`.

**RTL rule:** logical Tailwind properties only — `ms-*`, `me-*`, `ps-*`,
`pe-*`, `start-*`, `end-*`. **Never** `ml-*` / `mr-*`. The language toggle
depends on this for the whole layout to flip correctly.

### 4.5 Add or fix a notification

Every page imports Sonner directly. There is no wrapper hook, and you should
not create one:

```ts
import { toast } from "sonner";

toast.success("Sample registered successfully");
toast.error("Could not register sample");
```

`toast.loading` / `toast.dismiss` are also in use — see the PDF export flow in
`pages/samples/report.tsx`.

### 4.6 Add a role-gating rule

| Level | Where | How |
|---|---|---|
| Route | `src/App.tsx` | `<ProtectedRoute roles={["admin"]}>…</ProtectedRoute>` |
| Menu | `Sidebar.tsx` | A `roles` array on the nav entry, or the `useEffectiveMenuVisibility` filter |
| Component | anywhere | `useAuth().user?.role`, or the `useRolePermissions()` hook |

Reminder: in demo mode these **demonstrate intent rather than enforce
security**. The backend's `user.role` is the real authority when
`VITE_USE_API=true`.

---

## 5. Bug-hunting — the systematic flow

This is the part people skip. Use the checklist; the bug is almost always in
the first or second place you look.

### 5.1 Write down the reproduction first

Before touching code, answer these three:

1. What page, what action, what was the symptom?
2. Is it in mock mode, API mode (`VITE_USE_API`), or **both**?
   - "Both" → the bug is in presentation or domain.
   - "Only API mode" → the bug is in an HTTP adapter or mapper.
   - "Only mock mode" → the bug is in the mock adapter or the store.
3. Does a hard refresh fix it? If yes, you are almost certainly looking at
   stale in-memory state, not real persistence.

### 5.2 The 4 places a UI bug can live

Work down this list:

1. **The page component** — `src/presentation/pages/…`. Check `useEffect`
   dependency arrays, the `useSyncExternalStore` call, and every conditional
   render branch.
2. **The feature component** — `src/presentation/components/features/<area>/…`.
   Many pages delegate to these and pass props down. Trace the prop.
3. **The store (mock mode only)** —
   `src/infrastructure/mock/repositories/sampleStore.ts`. Ask: is the
   mutation hitting `samplesStore` or accidentally the seed array? Was
   `notifyStoreChanged()` actually called after the write?
4. **The API client (API mode only)** —
   `src/infrastructure/api/clients/…` or `…/repositories/…`. Check the
   `unwrap()` helper, any `normalizeX`, and whether the envelope is
   `{data: T}` or bare `T`. Then open DevTools → Network and read the actual
   URL, status, request body, and response body.

### 5.3 The 3 places a data-shape bug can live

1. **The backend response.** Curl the endpoint. Save the response. Compare it
   to the TypeScript type in `infrastructure/api/clients/*.ts`. Is the wire
   format snake_case where the type says camelCase? Is it wrapped in
   `{data: …}`?
2. **The domain type.** `domain/<entity>/model.ts` is the source of truth. The
   mapper's job is to hand back exactly this shape.
3. **The mapper.** e.g. `usersApi.ts:251 normalizeUser`,
   `api/repositories/authSession.ts:84 normaliseUser`. Is every field mapped?
   Does it tolerate both casings? (The auth one deliberately does.)

### 5.4 The 2 places an auth bug can live

1. **`infrastructure/api/repositories/authSession.ts`** — the HTTP adapter,
   home of the monotonic generation counter. If users are logging in and then
   silently getting logged out by a stale `/me`, read this file before
   changing anything. See [§6.3](#63-the-auth-race-guard--read-this-before-fixing-anything).
2. **`presentation/providers/AuthContext.tsx`** — pure provider state. There
   is deliberately **no `isApiEnabled()` branch** here; the provider doesn't
   know or care which backend is live.

### 5.5 The 3 places a paging / filter bug can live

1. **`domain/shared/pagination.ts`** — `Page<T>` is
   `{ items, total, limit, offset }`. `total` is the count of **all** matching
   rows, not the page size. Getting that wrong breaks every pager.
2. **The mock adapter** — `sampleRepository.ts` paginates in memory via
   `paginate()` from `domain/shared/pagination.ts`.
3. **The HTTP adapter** (when you write one) — it must map `limit`/`offset`/
   `total` from the server envelope. Do **not** let it return a bare
   `Sample[]`; that asymmetry is exactly what the port exists to prevent.

### 5.6 Five pre-existing gotchas you will hit

These are documented in code comments; knowing them saves diagnostic time.

- **"My sample registration vanished."** It wasn't persisted. Writes must go
  through `container.samples.create()` / `.update()`. Local `useState` is not a
  store.
- **Detail page showing the wrong sample.** The old code fell back to
  `mockSamples[0]` when an id didn't resolve. `pages/samples/[id].tsx` now
  shows an explicit not-found state — **don't copy the old fallback pattern**
  back in.
- **`pages/samples/report.tsx` bypasses the port.** It imports `findSample`
  straight from the store. Works in mock mode, but it's the inconsistency
  flagged in the roadmap — if you touch that file, route it through
  `container.samples.get(id)`.
- **`useTranslation` is defined but uncalled.** Don't adopt it in a new file
  unless you're deliberately migrating a whole vertical.
- **`MenuEntry.iconName` is a `string`, but the icon registry imports real
  `lucide-react` components.** That's a layering violation the guard can't
  catch, because the fixture legitimately lives in `infrastructure/`, which
  *is* allowed to import React. Leave it.

---

## 6. Backend integration — the exact seams

This section is for backend ↔ frontend coupling. Everything here was read
directly out of the code.

### 6.1 The HTTP client — `src/infrastructure/api/api.ts`

- **`getBaseUrl()`** (L41) returns `VITE_API_BASE_URL` when set and non-empty,
  otherwise the literal `"/api/v1"`.
- **`apiFetch<T>(path, init)`** (L82) prepends that base. So
  `apiFetch("/auth/me")` becomes `GET /api/v1/auth/me`, which the dev proxy
  forwards to `http://localhost:8000/api/v1/auth/me`.
- **Auth is automatic unless you opt out.** Every request gets
  `Authorization: Bearer <token>` from `getToken()` — localStorage key
  `glims_auth_token` — falling back to the build-time `VITE_API_TOKEN` env var.
  Pass `skipAuth: true` on the login call itself, or it will carry a stale
  token. The login function does exactly this (L155).
- **`credentials: "include"` is the default** (L114). So if your backend uses
  httpOnly cookies — which the spec apparently contemplates — they flow
  automatically, alongside the Bearer header. You don't need to change
  anything for cookie auth to work.
- **Envelopes are NOT handled centrally.** `apiFetch` returns the raw parsed
  body. Each caller does its own `unwrap<T>()` — in
  `infrastructure/api/auth.ts:139` and in each file under `api/clients/`. They
  tolerate both `{ data: T }` and bare `T`. **Read the unwrap helper before
  assuming a shape.**
- **`204 No Content` becomes `undefined as T`** (L118). Handle it at call sites.
- **Errors — and the distinction is load-bearing:**
  - Non-2xx → `new ApiError(status, message, body, requestId)` (L130). The
    message is pulled from `body.message` when the response is JSON, else
    `HTTP <status>`. The `X-Request-ID` response header is captured for
    correlation.
  - Network failure (backend down, DNS, CORS) → the browser raises a plain
    **`TypeError("Failed to fetch")`**. `apiFetch` does **not** wrap it.
  - `login.tsx` branches on exactly this: `err instanceof ApiError` → "invalid
    password"; `err instanceof TypeError` → "backend unreachable", with a
    Vite-proxy URL hint. Collapsing both into one `RepositoryError` destroys
    the diagnostic. **Don't.**
- **`isApiEnabled()`** (L32) reads `import.meta.env.VITE_USE_API === "true"`.
  It is evaluated **once** at module load in
  `infrastructure/di/container.ts:72`. Changing the env at runtime does
  nothing until you restart the dev server.

### 6.2 Auth endpoints — `src/infrastructure/api/auth.ts`

| Function | Line | Method + path |
|---|---|---|
| `login` | 155 | `POST /auth/login` (uses `skipAuth`) |
| `superadminLogin` | 158 | `POST /auth/superadmin/login` |
| `logout` | 174 | `POST /auth/logout` — body `{ refresh_token }`, or `{}` |
| `superadminLogout` | 179 | `POST /auth/superadmin/logout` |
| `me` | 184 | `GET /auth/me` |
| `requestRegister` | 187 | `POST /auth/register` |
| `forgotPassword` | 190 | `POST /auth/password/forgot` |
| `verifyOtp` | 197 | `POST /auth/otp/verify` |
| `resendOtp` | 204 | `POST /auth/otp/resend` |

**Token storage** (`auth.ts` L14–15, both `try`/`catch`-wrapped so private
browsing can't crash the app):

- `glims_auth_token` — the bearer token, read on **every** request.
- `glims_auth_refresh` — the refresh token, sent on `/auth/logout`.

`LoginResponse` (L111) carries **snake_case** `access_token` and optional
`refresh_token`. The adapter's `normaliseUser` (`authSession.ts` L84)
deliberately tolerates both snake_case and camelCase on user fields, because
several endpoints already return camelCase in practice.

**OTP quirk worth knowing:** `/auth/otp/verify` returns a real token pair, the
same shape as `/auth/login`. The OTP page already holds that response, so it
hands it to `AuthContext.applyLoginResponse()` → `container.auth.adoptSession()`.
`adoptSession` (`authSession.ts` L194) bumps the generation counter **first**,
then persists the token — that ordering is what stops an in-flight `restore()`
from clobbering the freshly-minted OTP session.

### 6.3 The auth race guard — read this before "fixing" anything

In `src/infrastructure/api/repositories/authSession.ts`:

- `let authGeneration = 0` (L58).
- Every **mutation** — `signIn` (L162), `adoptSession` (L197), `signOut` (L206)
  — calls `nextGeneration()`.
- Every **read** — `restore()` — snapshots the counter at entry (L134) and
  refuses to publish its result if the counter moved while it was awaiting
  (L145, L150).
- The **login failure path** (L169–177) checks it too: if a newer mutation
  landed during the login attempt, that failure describes a state that no
  longer exists, so it's discarded in favour of `currentSession`.

**Why it exists.** On mount, `restore()` fires `GET /auth/me`. If the user
submits the login form while that's in flight, the slow `/me` used to land
*after* the successful login and reset state to "anonymous" — throwing a
correctly-logged-in user back to the login screen.

**Why it's a counter and not a timer.** The previous fix was
`if (Date.now() - lastExplicitMutationAt.current < 2000) return;` — a
two-second window repeated at three call sites in `AuthContext`, each one a
chance to forget it. Worse, a *time* heuristic was guarding an *ordering*
problem: on a slow connection a legitimate login could take longer than 2s
and be thrown away. The counter is exact.

**Do not "simplify" this.** If you change it, document the reasoning in the
file header the way the current comment does.

### 6.4 The test-parameter seam — the other live backend edge

`infrastructure/api/clients/testParametersApi.ts` uses **snake_case on the
wire** (`test_name`, `sop_code`, `created_at`, …) and its local types match
that shape — there is no normalize step here, unlike the users client.

`normalizePaginated` (L178) tolerates both `Paginated<T>` and a raw
`TestParameter[]` response.

| Function | Line | Path |
|---|---|---|
| `listTestParameters` | 166 | `GET /test-parameters?search&spec&sop_code&is_active&limit&offset` |
| `getTestParameter` | 224 | `GET /test-parameters/{id}` |
| `createTestParameter` | 229 | `POST` |
| `updateTestParameter` | 236 | `PATCH` |
| `deleteTestParameter` | 247 | `DELETE` |

The calling hooks live in `infrastructure/api/tanstack-queries.ts`.

**Every `useQuery` there is gated on `enabled: isApiEnabled()` — but no
`useMutation` is.** That's an inconsistency, and it's exactly what porting
`TestParameterRepository` would fix. Don't add more gates in the same style.

### 6.5 The users and roles clients

| File | Wire shape | Notable behaviour |
|---|---|---|
| `clients/usersApi.ts` | camelCase domain type + `RawUser` with snake shadows (L44) | `normalizeUser` (L251) maps snake→camel. `normalizeUserPage` (L271) tolerates **five** envelope shapes (`{data,pagination}`, raw array, `{items}`, `{users}`, `{results}`). `updateUser` sends an `If-Match` header. `deleteUser` requires a `confirm=<username>` query param. |
| `clients/rolesApi.ts` | camelCase only — no snake adapter | `If-Match` on `updateRole` (L134). |

Contract source for both: `docs/api/users.md`.

### 6.6 The dev proxy — one gotcha

`vite.config.ts` L32–38 proxies `/api` → `process.env.VITE_API_PROXY_TARGET`
or `http://localhost:8000`.

⚠️ **`VITE_API_PROXY_TARGET` is read from your shell environment at config
time.** `vite.config.ts` cannot read `.env.local`, so putting
`VITE_API_PROXY_TARGET` in `.env.local` does **nothing**. Set it in the shell
before `npm run dev`. (There's an explanatory comment in `vite.config.ts`
saying the same thing — read it before debugging a proxy that "ignores" your
env.)

For a Dockerised backend on another host, port-forward it so it appears at
`localhost:8000` on the machine running Vite.

### 6.7 Where the contracts live

```
docs/SUPERADMIN_API.md          not wired into any TS client yet
docs/test_parameter_api.md      source of truth for testParametersApi
docs/api/openapi.yaml           3411 lines — /auth/*, /admin/*, /clients,
                                /samples*, /tests*, /reports, /invoices*,
                                /chart-of-accounts, /journals*, /ledger,
                                /expenses, /accounting/reports/*,
                                /specifications*, /reagents*
docs/api/users.md               source of truth for usersApi + rolesApi
docs/api/endpoints.md           narrative companion
docs/api/data-model.md          narrative companion
docs/api/integration-guide.md   narrative companion
docs/api/gaps.md                known contract gaps
```

If you change a contract, update the `.md` **and** the `.ts` client together.

---

## 7. Adding a new domain entity (the right way)

For a brand-new entity that genuinely earns a repository port.

| Step | File | Action |
|---|---|---|
| 1 | `src/domain/<entity>/model.ts` | Types only. No behaviour. |
| 2 | `src/domain/<entity>/rules.ts` | Pure functions if there's real logic — see `domain/sample/rules.ts` for the expected shape and comment style. |
| 3 | `src/domain/<entity>/ports.ts` | The interface consumers will code against. **Methods return `Result<Page<T>>`, not bare arrays.** |
| 4 | `src/infrastructure/mock/data/<entity>.ts` | Fixtures, typed from the domain model. No duplicate local interfaces. |
| 5 | `src/infrastructure/mock/repositories/<entity>Repository.ts` | Implements the port over the fixtures. Route through a store if the data has cross-references that must stay consistent. |
| 6 | `src/infrastructure/api/repositories/<entity>Repository.ts` | Implements the same port over FastAPI. All snake→camel mapping lives here. |
| 7 | `src/infrastructure/di/container.ts` | Add a slot to the `Container` interface and wire both adapters. If only the mock exists, hard-pin it and leave a comment saying so. |
| 8 | consumers | `import { container } from "@/infrastructure/di/container"` then `await container.<entity>.list(...)`. |
| 9 | `src/domain/index.ts` | Add to the barrel **only if cross-cutting**. Entity-specific imports should use `@/domain/<entity>` directly so `grep` shows the real dependency graph. |
| 10 | gates | `npm run typecheck && npm run lint:layers && npm run build` |

### 7.1 Four ways people get ports wrong

- **Returning `Sample[]` instead of `Page<Sample>`.** The tempting argument
  is "the page already `.filter()`s the whole array." That's precisely the
  problem the port exists to solve — a bad port guarantees adapter asymmetry.
- **Throwing inside a repository.** Use `Result<T, RepositoryError>` for
  *expected* failures. Reserve exceptions for genuine bugs.
- **Making `AuthSession.signIn` return a `Result`.** Don't — see
  [§6.1](#61-the-http-client--srcinfrastructureapiapits). The login UX depends
  on `ApiError` and `TypeError` staying distinguishable.
- **Importing an adapter directly into a page.** Always go through the
  container. If you catch yourself writing an import from
  `infrastructure/mock/repositories/…` inside a component, that's the signal
  you've skipped the port.

---

## 8. Verification checklist for every change

Always, before committing:

```bash
npm run typecheck      # tsc --noEmit — zero errors
npm run lint:layers    # architecture guard — zero violations
npm run build          # green
```

TypeScript was only added to this project during the architecture work.
Before that, Vite bundled via esbuild, which *strips* types without *checking*
them — so a green build told you almost nothing. Fixing the 52 errors that
surfaced on the first `tsc` run uncovered three real runtime crashes that
would otherwise have shipped.

### If you touched UI

```bash
npm run dev            # click through in EN, then switch to AR
```

Check the RTL flip. Any `ml-`/`mr-` you wrote is a bug.

### If you touched auth

Run this six-case matrix — it's the one that catches real regressions:

- Hard refresh with a valid token → lands authenticated
- Hard refresh after `localStorage.clear()` → lands anonymous
- Submit login while a slow `/me` is in flight (DevTools → Network → Slow 3G,
  throttle *after* page load) → still ends authenticated
- Logout while the server errors → still clears local state
- OTP verify (`pages/otp-verify.tsx`) → still authenticates
- Both `VITE_USE_API=false` and `=true`

### If you touched an API client

- Curl the endpoint and diff the response against the TS type
- Toggle `VITE_USE_API` and confirm both modes behave sanely
- DevTools → Network: verify URL, headers, request body, response body
- Force a 4xx/5xx and confirm the error renders usefully

### If you split an oversized page

⚠️ **Manual form walkthrough required.** `tsc` will **not** catch a controlled
input that silently became uncontrolled. For every form on the page: type into
a field, confirm the input reflects state, confirm the submit handler reads
that state.

### If you changed i18n

Switch to Arabic and confirm every new label renders in both languages, and
that the layout still flips.

### If you're tempted to write a test

There is **no test framework installed**. Don't add a `*.test.ts` expecting it
to run — that's deliberate Phase 7 work. (It's the largest remaining gap in
the whole project.)

---

## 9. When you are stuck

Read in this order:

1. **The file you're touching.** Its top-of-file comment explains *why* it's
   shaped that way. The load-bearing files all have one: `container.ts`, both
   `authSession.ts` adapters, `sampleStore.ts`, every `domain/*/ports.ts`.
2. **`README.md` § Current State & Roadmap.** It lists every known gap. If
   your task is on that list, the README tells you which workaround path to
   take.
3. **`CLAUDE.md` / `PUKU.md`.** These predate the architecture work. Treat
   with suspicion — where they disagree with the README, the README wins.
4. **`.puku-cli/skills/*/SKILL.md`.** ⚠️ Three of them (`add-page`,
   `add-mock-data`, `bilingual-component`) still teach the **old flat tree** —
   `@/components/ui`, `@/mock-data`, `@/context/AppContext`. Those directories
   no longer exist. Follow the *steps*, but repoint every path to the new
   locations.
5. **The layering guard's output.** Read the complaint literally. Every
   violation it has ever raised was a genuine design error — move the file,
   don't suppress the rule.
6. **The git log.** The architectural moves are in history with explanatory
   messages.

Then grep aggressively — the filenames and aliases tell you almost everything:

```bash
# Every consumer of the sample port
grep -rn "container.samples" src/

# Every place that still branches on the API flag
grep -rn "isApiEnabled" src/

# Stale imports — these directories were deleted in the Phase 1 refactor.
# ANY match here is a broken import.
grep -rn "@/mock-data\|@/components/ui\|@/hooks\|@/context\|@/lib" src/
```

---

## 10. Quick command crib

```bash
# Setup
npm install

# Dev server → http://localhost:3000
npm run dev

# The three gates — run before every commit, in this order
npm run typecheck      # tsc --noEmit
npm run lint:layers    # architecture guard
npm run build          # vite build

# Preview the production build
npm run serve

# Switch between mock and real backend
#   edit .env.local → VITE_USE_API="false" | "true"
#   then RESTART npm run dev (the container reads the flag once, at load)
#   remember: .env.local is gitignored and currently says "true"

# All supported env overrides
cat .env.example
```

---

## 11. What this doc deliberately does NOT teach

- React hooks fundamentals, TypeScript basics — assumed known.
- **How to write tests** — no framework is installed. This is the single
  largest remaining gap; the domain `rules.ts` functions were extracted
  specifically so that `isBalanced` (Σdebits === Σcredits, never previously
  checked) and VAT rounding become testable when someone installs Vitest.
- **How to "fix" the ZATCA simulation.** `ZatcaService.generateHash` returns
  `Math.random()` despite its "SHA-256 simulation" label, and `generateQR` is a
  base64 pipe-delimited string rather than ZATCA TLV. These are documented
  rather than quietly improved, because real FATOORA compliance needs a
  backend and the actual spec.
- **The four oversized pages** — `specifications/test-parameters.tsx` (1190L),
  `admin/roles.tsx` (1152L), `samples/index.tsx` (1142L), `admin/users.tsx`
  (1049L). Splitting them is separate roadmap work, not part of bug-fixing.

---

## 12. When your task touches multiple layers

Most changes touch one layer. When yours doesn't:

| Your change | The path it takes |
|---|---|
| A domain type gains a field | `domain/` → `mock/data/` → `mock/repositories/` → pages → container comment if the port signature changed |
| New endpoint on an already-ported seam | `api/repositories/` adapter → container → page → `docs/api/*.md` |
| New endpoint on an **un**ported seam | Declare `domain/<entity>/ports.ts` → both adapters → container → migrate consumers. Deliberate work; don't shortcut it by importing `apiFetch` into a page. |
| A new role behaviour | `shared/lib/types.ts` (the union) → `AppContext.tsx` (if state-shaped) → `Sidebar.tsx` (nav) → `ProtectedRoute roles={[…]}` (routes) |
| A new bilingual label | Find the file's existing i18n pattern. Don't introduce a new one mid-edit. |
| Dev proxy misbehaving | `vite.config.ts`. Set `VITE_API_PROXY_TARGET` in the **shell**, not `.env.local` — it's a config-time read. |

You should almost never need to edit `scripts/check-layering.mjs` — its rule
table is stable. If the guard trips, it's pointing at something real.

---

## 13. The single-sentence version

If you forget everything else, remember this:

> **A page never imports an adapter directly; it imports `container` from
> `src/infrastructure/di/container.ts`, which is the only place in the codebase
> that knows whether the answer comes from a `fetch()` or from a fixture.**