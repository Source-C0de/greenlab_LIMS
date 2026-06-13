# GreenLabLIMS KSA — AI Context

> A Saudi-localized Laboratory Information Management System.
> React 18 + Vite 6 + TypeScript SPA, **100% mock-data driven** (no backend calls).

## 1. What this is

`greenlims-ksa` is a single-page Vite app for a Saudi Arabia LIMS. It ships
with full mock data (Al-Marai, Saudi Aramco, Ajmal, etc.), bilingual EN/AR
with RTL flipping, dark/light theming, role-based UI for 6 user types, and
mock ZATCA FATOORA-compliant invoice/accounting logic. **There is no real
backend.** `.backup_*` directories at the root hold an unused Express +
Drizzle + OpenAPI stack from a prior pnpm monorepo.

## 2. Stack at a glance

| Layer | Tech | Notes |
|---|---|---|
| Framework | React 18.3.1 + TypeScript (strict) | `react-jsx`, `target: ES2020` |
| Build | Vite 6.0.7 | plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`; port `3000` |
| Styling | **Tailwind CSS v4** (CSS-first, no `tailwind.config.js`) | uses `@tailwindcss/vite` |
| UI | **shadcn/ui `new-york` style, `neutral` base** (see `components.json`) | 55+ primitives in `src/components/ui/`; copy from ui.shadcn.com rather than `npx shadcn add` (CLI is not installed) |
| Routing | **Wouter 3.3.5** (not React Router) | `<Switch>`/`<Route>`/`<Link>`; all routes live in `src/App.tsx` |
| State | React Context only | `AppContext` (role, language), `NotificationContext` |
| Server-state | **TanStack Query 5** is installed and `QueryClient` is mounted in `App.tsx`, **but currently unused** at runtime |
| Forms | react-hook-form + zod + @hookform/resolvers (installed, **not yet wired** in pages) | shadcn `<Form>` primitive available |
| Charts | Recharts 2.15 (via shadcn `chart.tsx`) | `hsl(var(--chart-N))` tokens |
| Animation | framer-motion | |
| DnD | @hello-pangea/dnd (workflow kanban) | |
| Theme | next-themes | `attribute="class"`, `defaultTheme="light"` |
| Toasts | **sonner** is the default. shadcn `useToast` exists as a parallel system — prefer **sonner** for new code |
| PDF | jspdf + html2canvas | used by reports and invoice detail |
| Auth | **Mock** — `Login` is a demo role picker. **Routes are not guarded.** | |
| i18n | **Hand-rolled** via `AppContext.language` + DOM `dir="rtl"`. No react-i18next | |
| Money | **SAR**, 15% VAT. ZATCA mocks in `src/lib/accounting-utils.ts` | |
| Testing | **None.** No Jest/Vitest/Playwright. **No `typecheck` or `lint` script in `package.json`.** | |

## 3. Path conventions

| Alias | Resolves to |
|---|---|
| `@/*` | `src/*` (Vite + tsconfig) |
| `@/components/ui/*` | shadcn primitives |
| `@/components/shared/*` | app-level reusable UI (`DataTable`, `KpiCard`, `StatusBadge`, `RoleSwitcher`, …) |
| `@/components/layout/*` | shell (`AppLayout`, `Sidebar`, `Header`, `Breadcrumb`, `NotificationBell`) |
| `@/context/*` | `AppContext`, `NotificationContext` |
| `@/lib/utils` | `cn()` (clsx + tailwind-merge) |
| `@/lib/accounting-utils` | `ZatcaService`, `AccountingEngine` |
| `@/mock-data` | the barrel — `import { samples, type Sample } from "@/mock-data"` |
| `@/hooks/use-mobile`, `@/hooks/use-toast` | |

## 4. Roles & auth

Six roles defined in `src/context/AppContext.tsx`:

```ts
type Role = "admin" | "lab_manager" | "analyst" | "client" | "accountant" | "receptionist";
```

- `currentRole` is held in `AppContext`; the default is `"admin"`.
- `RoleSwitcher` (in the header) mutates `currentRole` directly — there is no real session.
- `Login` (`src/pages/login.tsx`) is a demo role picker.
- **Routes are NOT auth-guarded** — anyone can hit `/admin`, `/accounting/*`, etc.
- Nav-item visibility is the only place role gating actually happens, in `Sidebar.tsx → getNavItems()`. Each nav entry has a `roles: Role[]` array, and the final `.filter(item => item.roles.includes(currentRole))` does the work.

## 5. Bilingual / RTL rule

Every user-facing string in nav, sidebar, page headers, buttons, table headers,
and form labels must have a paired EN/AR variant.

```tsx
import { useAppContext } from "@/context/AppContext";

const { language } = useAppContext();
const isRtl = language === "ar";   // not exposed on the context — derive inline
const t = (en: string, ar: string) => (isRtl ? ar : en);
```

For data entities (clients, samples, tests, etc.) the convention is parallel
`nameEn` / `nameAr` (or `titleEn` / `titleAr`, `labelEn` / `labelAr`) fields on
the type. See `src/mock-data/clients.ts`, `src/components/layout/Sidebar.tsx`.

**Layout**: prefer Tailwind logical properties:

- `ms-*` / `me-*` (not `ml-*` / `mr-*`)
- `ps-*` / `pe-*` (not `pl-*` / `pr-*`)
- `start-*` / `end-*` (not `left-*` / `right-*`)

Set the document direction with `dir={isRtl ? "rtl" : "ltr"}` on the root
container; `AppProvider` already toggles `document.documentElement.dir` when
`language` changes.

## 6. Money & compliance

- **Currency**: SAR (Saudi Riyal).
- **VAT**: 15% — `AccountingEngine.VAT_RATE`.
- **ZATCA**: Phase 1 + 2 mock via `ZatcaService` (`generateQR`, `generateHash`, `reportToZatca`) — TLV encoding, SHA-256 hash, IRN.
- **Double-entry postings**: `AccountingEngine.postInvoice(invoice)`, `.postPayment(...)` return `JournalEntry` lines. Use these — don't hand-roll journal lines.

`src/lib/accounting-utils.ts` is the only place these utilities live.

## 7. Adding a new page (3 steps)

1. **Create the file** under `src/pages/<area>/<page>.tsx` (or `src/pages/<page>.tsx` for top-level pages). Default-export a React component. Use the bilingual scaffold (see §5) and `<DataTable>` (from `@/components/shared`) for lists.

2. **Register the route** in `src/App.tsx`:
   ```tsx
   import Foo from "@/pages/foo";
   // ...
   <Route path="/foo"><LayoutWrapper component={Foo} /></Route>
   ```
   Drop the `<LayoutWrapper>` for auth pages (they render without the sidebar).

3. **Add a nav entry** in `src/components/layout/Sidebar.tsx → getNavItems()` with `labelEn`, `labelAr`, `href`, `icon` (from `lucide-react`), and a `roles: Role[]` array. The trailing `.filter(...)` handles visibility.

> **Skill**: see `.puku-cli/skills/add-page/SKILL.md` for a copy-paste template.

## 8. Adding mock data (2 steps)

1. **Create the typed collection** at `src/mock-data/<entity>.ts`. Define a TypeScript `interface` (or `type`) at the top, then `export const mock<Entity>s: <Entity>[] = [...] as const;`. Note: existing files use the `mock` prefix (`mockClients`, `mockSamples`, …) — keep that convention.

2. **Re-export from the barrel**: open `src/mock-data/index.ts` and append `export * from "./<entity>";`.

> **Skill**: see `.puku-cli/skills/add-mock-data/SKILL.md`.

## 9. Bilingual component skeleton

```tsx
import { useAppContext } from "@/context/AppContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Label = { en: string; ar: string };

export function BilingualCard({ title, onAction }: { title: Label; onAction: () => void }) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="p-6 space-y-4">
      <Card>
        <CardHeader><CardTitle>{isRtl ? title.ar : title.en}</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={onAction} className="ms-2">
            {isRtl ? "تنفيذ" : "Run"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

> **Skill**: see `.puku-cli/skills/bilingual-component/SKILL.md` for the audit checklist.

## 10. Do not

- **Don't introduce React Router.** This project uses Wouter.
- **Don't add a backend, `fetch`, `axios`, or Supabase calls** without an explicit decision — data is in `src/mock-data/`.
- **Don't add a real auth library** (NextAuth, Clerk, …). `Login` is a demo role picker.
- **Don't add hard-coded English-only strings** in nav, sidebar, page headers, or buttons — always EN/AR pairs.
- **Don't touch `.backup_artifacts/`, `.backup_lib/`, `.backup_scripts/`.** They are historical artifacts from the original pnpm monorepo (see `migrate.sh`). Wiring the backend (if ever) is a separate decision.
- **Don't commit to `dist/`.** Build output is currently checked in (PII concern: `dist/signatures/*.png` are pre-baked employee signatures).
- **Don't use `react-i18next`** — i18n is hand-rolled via `AppContext`.
- **Don't introduce new `any` annotations on column render props or component props.** Type with domain interfaces from `@/mock-data`.
- **Don't add `@ts-ignore` markers** — there are 2 existing ones in `src/pages/samples/receiving.tsx:104,120`; they are documented hacks to fix, not to copy.
- **Don't write empty `catch {}` blocks** — log or rethrow. The one legitimate `console.error` is at `src/pages/reports/[id].tsx:53`; preserve that pattern.

## 11. Code-quality rules for new code

- **Type all column `render` props and component props** with domain interfaces. `DataTable<T>` (`src/components/shared/DataTable.tsx`) is already generic; tighten the column prop type at the call site instead of `: any`. See refactor note §15.
- **No `@ts-ignore`**, no `@ts-nocheck`, no `as any` (one existing instance at `src/pages/specifications/test-master.tsx:816` is a known smell).
- **No empty `catch {}`** — the only borderline one is `src/pages/specifications/test-master.tsx:96`; preserve the one legitimate logger at `src/pages/reports/[id].tsx:53`.
- **Reuse the shared table** — prefer `<DataTable<T>>` from `@/components/shared` over reinventing table JSX in a page.
- **Use the existing utility**: `import { cn } from "@/lib/utils"` for class merging.
- **Use the design tokens**: Tailwind v4 CSS variables (`bg-card`, `text-muted-foreground`, `hsl(var(--chart-N))`) — avoid hard-coded hex colors in new code. Hard-coded `COLORS` arrays exist in `src/pages/accounting/dashboard.tsx:34`; don't propagate.
- **One component per file.** Default-export the page component from each page file.

## 12. Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port `3000` |
| `npm run build` | Production build to `dist/` |
| `npm run serve` | Preview the production build |

There is **no** `typecheck`, `lint`, or `test` script. If you need them, add them
to `package.json` (e.g. `typecheck: "tsc --noEmit"`).

## 13. Files to read first (cheat-sheet)

When you start a new task, these are the only files you need most of the time:

- `src/App.tsx` — provider tree, routes
- `src/components/layout/Sidebar.tsx` — role-gated bilingual nav
- `src/context/AppContext.tsx` — `currentRole`, `language`, RTL
- `src/lib/utils.ts` — `cn()`
- `src/lib/accounting-utils.ts` — ZATCA + accounting
- `src/mock-data/index.ts` — entity barrel
- `src/components/shared/DataTable.tsx` — generic list table

## 14. Open gaps to flag if encountered

If a task touches any of these, **flag it** before changing them — they need
an explicit decision, not a silent fix:

- **No tests, no lint, no typecheck script.** `package.json` only has `dev`/`build`/`serve`.
- **No real auth guards.** Routes are reachable by anyone.
- **TanStack Query** is wired in `App.tsx` but not used. Don't add query calls without first deciding the data-layer migration path.
- **`@hookform/resolvers`** is in `dependencies` but not yet imported anywhere — may be dead.
- **3 huge files** (candidates for splitting): `src/pages/specifications/new.tsx` (1370L), `src/pages/specifications/test-master.tsx` (995L), `src/pages/samples/receiving.tsx` (707L).
- **`dist/` is committed to git** — when this gets cleaned up, scrub the `dist/signatures/*.png` files (PII).
- **`.gitignore` references** `.cursor/rules/nx-rules.mdc` and `.github/instructions/nx.instructions.md` from a previous template, but those files don't exist in this project — leave them alone or remove the lines.

## 15. Refactor recommendations (deferred — not in this pass)

These are **recommendations only**; do not silently apply them:

- **Tighten `DataTable` column-prop types at call sites.** The component is already generic, but pages do `columns: [{ key, header, render: (item: any) => … }]`. Replace the `any` with the row interface. ~12 files affected.
- **Replace `@ts-ignore` in `samples/receiving.tsx:104,120`** with proper `Sample` typing.
- **Split oversized files** (§14) into sub-components.
- **Unify chart palette** — replace `stroke="#888888"` (dashboard.tsx, analytics.tsx) with `hsl(var(--border))`; move the `COLORS` array from `accounting/dashboard.tsx:34` to theme tokens.
- **Add `typecheck` and `lint` scripts** to `package.json` to catch type drift.

## 16. Out of scope

- Wiring a real backend (the `.backup_lib/db/` Drizzle schema, `.backup_lib/api-spec/` OpenAPI, `.backup_lib/api-zod/` schemas, etc.).
- Adding auth guards to routes.
- Removing `.backup_*` directories.
- Removing committed `dist/` and signature PNGs.
- Migrating mock data into a real DB.
- Adding the remaining candidate skills (`add-form`, `add-list`, `i18n-audit`, `role-audit`, `add-zatca-invoice`, `add-journal-entry`, `add-shadcn-component`, `add-role-gated-nav-item`, `rtl-audit`, `tanstack-query-mutation-from-mock`, `add-mock-page`) — all in the analysis notes, to be added incrementally.
