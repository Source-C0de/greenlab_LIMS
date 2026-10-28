---
name: add-page
description: "Scaffold a new page in the GreenLabLIMS KSA React SPA. Creates the file under src/presentation/pages, registers the route in src/App.tsx, and adds a role-gated bilingual nav entry in src/presentation/components/layout/Sidebar.tsx. Use when the user says 'add a new page', 'create a route for X', 'I need a /foo page', 'add a screen', or 'add a view for Y'."
when-to-use: "User asks to add a new page, route, screen, or view to the GreenLabLIMS KSA app. Triggers: 'add a new page', 'create a route', '/foo page', 'add a screen', 'new view for X', 'scaffold a page'."
allowed-tools: Read, Write, Edit, Grep, Glob
---

# add-page

A page in GreenLabLIMS KSA lives in **3 places**. Do all three.

## 1. Create the file

Path: `src/presentation/pages/<area>/<page>.tsx` (or `src/presentation/pages/<page>.tsx` for top-level pages).

Re-export the component as `default`. Mirror the bilingual scaffold:

```tsx
// src/presentation/pages/foo.tsx
import { useAppContext } from "@/presentation/providers/AppContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { KpiCard } from "@/presentation/components/shared/KpiCard";
import { DataTable } from "@/presentation/components/shared/DataTable";

export default function Foo() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const t = (en: string, ar: string) => (isRtl ? ar : en);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t("Foo", "فو")}</h1>
      <p className="text-muted-foreground">{t("Page description", "وصف الصفحة")}</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={t("Samples", "العينات")} value={0} />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("Details", "التفاصيل")}</CardTitle></CardHeader>
        <CardContent>
          {/* <DataTable<Row> data={rows} columns={...} /> */}
        </CardContent>
      </Card>
    </div>
  );
}
```

Rules:
- `useAppContext()` is the only way to read role/language. `isRtl` is **not** exposed — derive it as `language === "ar"`.
- All visible strings need EN/AR pairs.
- Use logical Tailwind properties (`ms-*` / `me-*` / `start-*` / `end-*`), not `ml-*` / `mr-*` / `left-*` / `right-*`.
- For list pages, use `<DataTable<T>>` from `@/presentation/components/shared` — it's already generic. Type the `columns` prop, don't use `: any`.
- One component per file; default-export the page component.

## 2. Register the route in `src/App.tsx`

Two edits in the same file:

1. Add the import near the other page imports:
   ```tsx
   import Foo from "@/presentation/pages/foo";
   ```

2. Add a `<Route>` inside `<Switch>`, wrapped in `<LayoutWrapper>` for app pages, or unwrapped for auth pages:
   ```tsx
   <Route path="/foo"><LayoutWrapper component={Foo} /></Route>
   ```

   Pattern order matches the existing file: auth routes first (unwrapped), then app routes, then accounting, then specifications, then 404.

## 3. Add a nav entry in `src/presentation/components/layout/Sidebar.tsx`

Open `getNavItems()` and push a new entry with these fields:
- `href` — the route path.
- `labelEn` — English label.
- `labelAr` — Arabic label.
- `icon` — from `lucide-react` (e.g. `Box`, `Tag`, `TestTube`).
- `roles` — `Role[]` — which roles see this entry. The trailing `.filter(item => item.roles.includes(currentRole))` does the work.

Pick the right insertion point by role-bucket:
- **`client`** bucket: client portal–only items.
- **`accountant`** bucket: finance/ledger items.
- Default lab/staff bucket: samples, clients, reports, inventory, analytics.
- **`admin`-only**: billing, accounting dashboard.
- **`admin`-only**: SaaS admin panel.
- **`admin` + `lab_manager`**: specifications tree.

```tsx
{ href: "/foo", labelEn: "Foo", labelAr: "فو", icon: Box, roles: ["admin", "lab_manager"] }
```

If the new page is a child of an existing section that already has a `children: [...]` array, append it there too — children get a sub-link rendered.

## Verification

```bash
npm run dev
# open http://localhost:3000/foo
# 1. Confirm the page renders.
# 2. Toggle language in the header — strings swap, layout flips RTL.
# 3. Open the role switcher — confirm visibility matches the `roles` array.
# 4. Click the sidebar entry — it should highlight and route to /foo.
# 5. npm run typecheck && npm run lint:layers && npm test
```

## Out of scope

- Adding mock data for the page → use the `add-mock-data` skill.
- Building a bilingual-only component → use the `bilingual-component` skill.
- Adding form validation (react-hook-form + zod wiring) → see `src/presentation/pages/specifications/new.tsx` for the largest current example.
