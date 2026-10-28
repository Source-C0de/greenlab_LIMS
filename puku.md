# GreenLabLIMS KSA — Puku Session Context

> **Read this at the start of every Puku CLI session.**
> For the full project context, read **[`CLAUDE.md`](./CLAUDE.md)** in this
> same directory — it is the canonical source of truth (16 sections, ~13KB).

## What this is

`greenlims-ksa` — Saudi-localized LIMS SPA. React 18 + Vite 6 + TypeScript,
bilingual EN/AR with RTL, 6 user roles, mock ZATCA FATOORA-compliant
invoicing.

**Data mode:** the app is **mock-first**. Every page reads from mock
repositories by default. Setting `VITE_USE_API=true` switches the API-backed
modules (auth, users, roles, test catalogues) to the real FastAPI backend.
The backend lives in a separate repository — see
[`docs/API_CLIENT_AUDIT_REPORT.md`](./docs/API_CLIENT_AUDIT_REPORT.md).

## Quick commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port `3000` |
| `npm run build` | Production build → `dist/` (`tsc --noEmit` + `vite build`) |
| `npm run serve` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.json` |
| `npm run lint:layers` | One-way dependency guard (`scripts/check-layering.mjs`) |
| `npm test` | Vitest unit + contract tests (72 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:contract` | Just the frontend↔backend route contract test |

## Path aliases

`@/*` → `src/*`.

### The four layers

The repo is layered, and the one-way rule is enforced by `npm run lint:layers`:

```
presentation/  →  infrastructure/  →  domain/  →  shared/
```

`presentation` may import from `infrastructure`, `domain`, and `shared`.
`infrastructure` may import from `domain` and `shared`. `domain` may import
from `shared` only. Nothing may import from `presentation`.

| Directory | Contents |
|---|---|
| `src/domain/` | Pure business concepts and ports. `identity/`, `client/`, `sample/`, `testParameter/`, `accounting/`, `quotation/`, `shared/` |
| `src/infrastructure/` | Adapters. `api/` (HTTP client), `di/` (composition root), `mock/` (mock repositories), `domain-support/` |
| `src/presentation/` | UI. `pages/`, `components/`, `providers/`, `hooks/` |
| `src/shared/` | Framework-agnostic utilities and primitives. `ui/` (shadcn), `lib/`, `i18n/` |

### Key entry points

- `src/App.tsx` — provider tree + routes (Wouter)
- `src/presentation/components/layout/Sidebar.tsx` — role-gated bilingual nav
- `src/presentation/providers/AppContext.tsx` — `currentRole`, `language`, RTL toggle
- `src/presentation/providers/AuthContext.tsx` — auth state machine
- `src/infrastructure/api/api.ts` — the **only** place `fetch` is called
- `src/infrastructure/api/response.ts` — envelope types + unwrap helpers
- `src/infrastructure/api/errors.ts` — bilingual error-code map
- `src/infrastructure/api/auth.ts` — token storage + auth endpoints
- `src/infrastructure/api/clients/` — `usersApi`, `rolesApi`, `testParametersApi`, `testListApi`
- `src/infrastructure/api/repositories/authSession.ts` — HTTP auth adapter
- `src/infrastructure/di/container.ts` — ports-and-adapters composition root
- `src/shared/lib/utils.ts` — `cn()` (clsx + tailwind-merge)

## Puku-specific

- **Skills** (already installed): `add-page`, `add-mock-data`,
  `bilingual-component`, `code-review` — see `.puku-cli/skills/<name>/SKILL.md`.
- **Plans** live in `~/.puku-cli/plans/` — check `TaskList` / `TaskGet` first
  to resume prior work in this repo.
- **Plugin enabled**: `ponytail` (review / debt / audit / gain / help modes).

## Hard rules (full list in CLAUDE.md §10)

- **Don't introduce React Router** — this project uses Wouter.
- **Don't add a new HTTP client.** `src/infrastructure/api/api.ts` is the
  single source of truth for HTTP calls. Use `apiFetch`; do not call `fetch`
  directly, and do not add axios / XMLHttpRequest / Supabase.
- **The API client must stay mock-first.** Every query hook is gated by
  `enabled: isApiEnabled()`; the adapter is chosen once in the DI container,
  not branched at call sites.
- **Don't touch `.backup_*` dirs** (`.backup_artifacts`, `.backup_lib`,
  `.backup_scripts`) — historical artifacts from a prior pnpm monorepo.
- **Don't commit `dist/signatures/*.png`** — they are pre-baked employee
  signatures (PII).
- **Bilingual EN/AR pairs are mandatory** for every user-facing string in nav,
  sidebar, page headers, buttons, and form labels. Prefer Tailwind logical
  properties (`ms-*`, `me-*`, `start-*`, `end-*`) over directional ones.
- **Don't break the layering rule.** Run `npm run lint:layers` after moving
  or adding imports.

## The backend contract

The backend is a separate FastAPI repository. It mounts **two sibling API
surfaces** — this is the single most important fact for API work:

| Surface | Prefix | Notes |
|---|---|---|
| Tenant API | **`/api/v1`** | The default. `getBaseUrl()` resolves to this. |
| Superadmin API | **`/api/superadmin`** | Separate router, separate token family. `getSuperadminBaseUrl()` resolves to this. |

Do **not** address superadmin routes as `/api/v1/auth/superadmin/...` — that
was the original bug. Superadmin calls pass
`baseUrl: getSuperadminBaseUrl()` explicitly.

The client requests the **`enveloped`** contract via the
`X-LIMS-API-Version: enveloped` header, so responses arrive as
`{ data, meta }` and errors as `{ error, meta }`. Unwrapping is explicit at
each call site (`unwrapData` / `unwrapPage`) — there is no hidden global
unwrap.

`VITE_API_BASE_URL` may be a bare origin (`http://localhost:8000`) or include
the prefix (`http://localhost:8000/api/v1`); `getBaseUrl()` normalises both.
Leave it **empty** in dev to use the Vite `/api` proxy.

The backend is **Bearer-only** — no cookies, no CSRF. Tokens live in
`localStorage` under `glims_auth_token` / `glims_auth_refresh`.

The authoritative backend documentation is
`F:/Project/lims_backend/docs/api_rollout.md` and
`F:/Project/lims_backend/adr/0008-standard-response-envelope.md`.

## Where to look first

1. `CLAUDE.md` — full context: stack, roles, bilingual contract, recipes,
   do-not list, open gaps, out-of-scope.
2. `src/App.tsx` — provider tree + routes.
3. `src/presentation/components/layout/Sidebar.tsx` — role-gated bilingual nav.
4. `src/presentation/providers/AppContext.tsx` — `currentRole`, `language`, RTL.
5. `src/infrastructure/api/api.ts` — the HTTP primitive.
6. `src/infrastructure/di/container.ts` — adapter selection.
7. `src/presentation/components/shared/DataTable.tsx` — generic list table
   (prefer over reinventing table JSX).

## Open gaps to flag (don't silently fix)

- **Routes are unguarded** — anyone can hit `/admin`, `/accounting/*`, etc.
  `Login` is a demo role picker; there is no real auth guard.
- **Two frontend routes have no backend counterpart** — `POST /auth/register`
  and `POST /auth/otp/resend`. The UI affordances for these are live but
  will 404 in API mode. Awaiting a product decision.
- **Backend rate limiting is not implemented**, so the `rate_limited` error
  message has no live trigger.
- 3 oversized files: `pages/specifications/new.tsx` (1370L),
  `pages/specifications/test-master.tsx` (995L),
  `pages/samples/receiving.tsx` (707L) — candidates for splitting.
- `dist/` is committed to git; `dist/signatures/*.png` is a PII concern.
- The backend repo has a **large uncommitted working tree** (Docker, worker,
  tasks). Do not modify the backend without authorization.

## Recipes (pointers, not full templates)

- **Add a new page** → `.puku-cli/skills/add-page/SKILL.md`
- **Add mock data** → `.puku-cli/skills/add-mock-data/SKILL.md`
- **Make a component bilingual** → `.puku-cli/skills/bilingual-component/SKILL.md`
- **Review staged changes** → `.puku-cli/skills/code-review/SKILL.md`

## Documentation

- `docs/API_CLIENT_AUDIT_REPORT.md` — the Task 4 audit: findings, evidence,
  risks, and the implementation plan.
- `docs/API_CLIENT_HANDOFF.md` — the pre-audit handoff.
- `docs/api/` — **historical**. A pre-implementation contract that the
  shipped backend does not follow (it describes httpOnly-cookie auth, CSRF,
  camelCase pagination, and routes that do not exist). Do not use it as a
  type source or a contract reference.
- `docs/SUPERADMIN_API.md` — superadmin surface notes.
- `docs/test_parameter_api.md` — test-parameter catalogue endpoint notes.

## Verification

Before claiming a change works:

```bash
npm run typecheck     # 0 diagnostics
npm run lint:layers   # 0 violations
npm test              # 72 tests
npm run build         # production build
```

Backend (separate repo, `F:/Project/lims_backend`):

```bash
make test        # 284 tests
make lint        # ruff
make typecheck   # mypy
```

For the full project context — including role definitions, ZATCA spec,
code-quality rules, and refactor backlog — see [`CLAUDE.md`](./CLAUDE.md).
