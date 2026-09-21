---
name: add-page
description: "Scaffold a new page in the GreenLabLIMS KSA React SPA. Creates the file under src/pages, registers the route in src/App.tsx, and adds a role-gated bilingual nav entry in src/components/layout/Sidebar.tsx. Use when the user says 'add a new page', 'create a route for X', 'I need a /foo page', 'add a screen', or 'add a view for Y'."
when-to-use: "User asks to add a new page, route, screen, or view to the GreenLabLIMS KSA app. Triggers: 'add a new page', 'create a route', '/foo page', 'add a screen', 'new view for X', 'scaffold a page'."
allowed-tools: Read, Write, Edit, Grep, Glob
---

# add-page

A page in GreenLabLIMS KSA lives in **3 places**. Do all three.

## 1. Create the file

Path: `src/pages/<area>/<page>.tsx` (or `src/pages/<page>.tsx` for top-level pages).

Re-export the component as `default`. Mirror the bilingual scaffold:

```tsx
// src/pages/foo.tsx
import { useAppContext } from "@/context/AppContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable } from "@/components/shared/DataTable";

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
- For list pages, use `<DataTable<T>>` from `@/components/shared` — it's already generic. Type the `columns` prop, don't use `: any`.

## 2. Register the route in `src/App.tsx`

Two edits in the same file:

1. Add the import near the other page imports (around lines 21–47):
   ```tsx
   import Foo from "@/pages/foo";
   ```

2. Add a `<Route>` inside `<Switch>` (around lines 71–100), wrapped in `<LayoutWrapper>` for app pages, or unwrapped for auth pages:
   ```tsx
   <Route path="/foo"><LayoutWrapper component={Foo} /></Route>
   ```

   Pattern order matches the existing file: auth routes first (unwrapped), then app routes, then accounting, then specifications, then 404.

## 3. Add a nav entry in `src/components/layout/Sidebar.tsx`

Open `getNavItems()` (around line 34) and push a new entry with these fields:
- `href` — the route path.
- `labelEn` — English label.
- `labelAr` — Arabic label.
- `icon` — from `lucide-react` (e.g. `Box`, `Tag`, `TestTube`).
- `roles` — `Role[]` — which roles see this entry. The trailing `.filter(item => item.roles.includes(currentRole))` does the work.

Pick the right insertion point by role-bucket:
- **`client`** bucket (around line 42): client portal–only items.
- **`accountant`** bucket (around line 49): finance/ledger items.
- Default lab/staff bucket (around line 59): samples, clients, reports, inventory, analytics.
- **`admin`-only** (around line 79): billing, accounting dashboard.
- **`admin`-only** (around line 87): SaaS admin panel.
- **`admin` + `lab_manager`** (around line 92): specifications tree.

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
```

## Out of scope

- Adding mock data for the page → use the `add-mock-data` skill.
- Building a bilingual-only component → use the `bilingual-component` skill.
- Adding form validation (react-hook-form + zod wiring) → see `pages/specifications/new.tsx` for the largest current example.
