# GreenLabLIMS KSA — Puku Session Context

> **Read this at the start of every Puku CLI session.**
> For the full project context, read **[`CLAUDE.md`](./CLAUDE.md)** in this
> same directory — it is the canonical source of truth (16 sections, ~13KB).

## What this is

`greenlims-ksa` — Saudi-localized LIMS SPA. React 18 + Vite 6 + TypeScript,
**100% mock-data**, bilingual EN/AR with RTL, 6 user roles, mock ZATCA
FATOORA-compliant invoicing. **No backend.**

## Quick commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port `3000` |
| `npm run build` | Production build → `dist/` |
| `npm run serve` | Preview the production build |

There is no `typecheck`, `lint`, or `test` script in `package.json`.

## Path aliases

`@/*` → `src/*`. Key entry points:

- `@/components/ui` — shadcn primitives (55+)
- `@/components/shared` — `DataTable`, `KpiCard`, `StatusBadge`, `RoleSwitcher`
- `@/components/layout` — `AppLayout`, `Sidebar`, `Header`, `Breadcrumb`, `NotificationBell`
- `@/context` — `AppContext` (role, language), `NotificationContext`
- `@/lib/utils` — `cn()` (clsx + tailwind-merge)
- `@/lib/accounting-utils` — `ZatcaService`, `AccountingEngine`
- `@/mock-data` — barrel: `import { samples, type Sample } from "@/mock-data"`

## Puku-specific

- **Skills** (already installed): `add-page`, `add-mock-data`,
  `bilingual-component`, `code-review` — see `.puku-cli/skills/<name>/SKILL.md`.
- **Plans** live in `~/.puku-cli/plans/` — check `TaskList` / `TaskGet` first
  to resume prior work in this repo.
- **Plugin enabled**: `ponytail` (review / debt / audit / gain / help modes).

## Hard rules (full list in CLAUDE.md §10)

- **Don't introduce React Router** — this project uses Wouter.
- **Don't add a backend, `fetch`, `axios`, or Supabase** — data is mock-only.
- **Don't add real auth** — `Login` is a demo role picker; routes are unguarded.
- **Don't use `react-i18next`** — i18n is hand-rolled via `AppContext.language`.
- **Don't touch `.backup_*` dirs** (`.backup_artifacts`, `.backup_lib`,
  `.backup_scripts`) — historical artifacts from a prior pnpm monorepo.
- **Don't commit `dist/signatures/*.png`** — they are pre-baked employee
  signatures (PII).
- **Bilingual EN/AR pairs are mandatory** for every user-facing string in nav,
  sidebar, page headers, buttons, and form labels. Prefer Tailwind logical
  properties (`ms-*`, `me-*`, `start-*`, `end-*`) over directional ones.

## Where to look first

1. `CLAUDE.md` — full context: stack, roles, bilingual contract, recipes,
   do-not list, open gaps, out-of-scope.
2. `src/App.tsx` — provider tree + routes.
3. `src/components/layout/Sidebar.tsx` — role-gated bilingual nav.
4. `src/context/AppContext.tsx` — `currentRole`, `language`, RTL toggle.
5. `src/lib/accounting-utils.ts` — ZATCA + accounting engine.
6. `src/mock-data/index.ts` — entity barrel.
7. `src/components/shared/DataTable.tsx` — generic list table (prefer over
   reinventing table JSX).

## Open gaps to flag (don't silently fix)

- No `typecheck`, `lint`, or `test` script.
- TanStack Query is wired in `App.tsx` but unused at runtime — don't add
  query calls without a data-layer decision.
- Routes are unguarded — anyone can hit `/admin`, `/accounting/*`, etc.
- 3 oversized files: `pages/specifications/new.tsx` (1370L),
  `pages/specifications/test-master.tsx` (995L),
  `pages/samples/receiving.tsx` (707L) — candidates for splitting.
- `dist/` is committed to git; `dist/signatures/*.png` is a PII concern.

## Recipes (pointers, not full templates)

- **Add a new page** → `.puku-cli/skills/add-page/SKILL.md` (3-step:
  file → `App.tsx` route → `Sidebar.tsx` nav entry).
- **Add mock data** → `.puku-cli/skills/add-mock-data/SKILL.md` (2-step:
  typed collection → barrel re-export).
- **Make a component bilingual** → `.puku-cli/skills/bilingual-component/SKILL.md`.
- **Review staged changes** → `.puku-cli/skills/code-review/SKILL.md`.

For the full context — including role definitions, ZATCA spec, code-quality
rules, and refactor backlog — see [`CLAUDE.md`](./CLAUDE.md).
