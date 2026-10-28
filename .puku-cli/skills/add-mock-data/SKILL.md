---
name: add-mock-data
description: "Add a new typed mock-data collection to GreenLabLIMS KSA. Creates a new file under src/infrastructure/mock/data with a TypeScript interface and a typed const, then re-exports it from the src/infrastructure/mock/data/index.ts barrel. Use when the user says 'add a new entity', 'I need a list of X', 'mock data for Y', 'add fixtures for Z', or 'add sample data'."
when-to-use: "User asks to add a new mock dataset, fixture, or entity. Triggers: 'add a new entity', 'I need a list of X', 'mock data for Y', 'add fixtures', 'add sample data', 'mock 10 widgets', 'seed some X'."
allowed-tools: Read, Write, Edit, Grep, Glob
---

# add-mock-data

All mock data in this project lives in `src/infrastructure/mock/data/` as
TypeScript constants (the **infrastructure** layer — presentation pages must
not import data files directly, they go through the layer boundary).
The barrel at `src/infrastructure/mock/data/index.ts` re-exports everything
for `import { … } from "@/mock-data"`.

## 1. Create the file

Path: `src/infrastructure/mock/data/<entity>.ts` (singular, lowercase, kebab-case is fine).

Convention from existing files: use the `mock` prefix for the array name.

```ts
// src/infrastructure/mock/data/widgets.ts
export interface Widget {
  id: string;
  nameEn: string;
  nameAr: string;
  status: "active" | "archived";
  createdAt: string; // ISO
}

export const mockWidgets: Widget[] = [
  { id: "w-001", nameEn: "Alpha",  nameAr: "ألفا",   status: "active",   createdAt: "2025-01-12T08:00:00Z" },
  { id: "w-002", nameEn: "Beta",   nameAr: "بيتا",   status: "active",   createdAt: "2025-02-04T11:30:00Z" },
  { id: "w-003", nameEn: "Gamma",  nameAr: "غاما",   status: "archived", createdAt: "2025-03-19T14:15:00Z" },
];
```

Rules:
- Bilingual fields are `nameEn` / `nameAr` (or `titleEn` / `titleAr`, `labelEn` / `labelAr`) — match the field name used by related existing entities. **Do not localize status codes.**
- `id` is a string, typically `<prefix>-<n>` (e.g. `S-001`, `C001`, `INV-2025-0007`).
- Dates are ISO 8601 strings; convert to `Date` at the consumption site.
- Currency values, when present, are SAR numbers (e.g. `1245.50`). Tax/VAT computed at 15%.
- Add a meaningful **seed of at least 5 rows** so list pages look real.

## 2. Re-export from the barrel

Open `src/infrastructure/mock/data/index.ts` and append one line in alphabetical order:

```ts
export * from "./widgets";
```

The barrel re-exports both the array and the type, so consumers do:

```ts
import { mockWidgets, type Widget } from "@/mock-data";
```

## Verification

```bash
# In a page or component
import { mockWidgets, type Widget } from "@/mock-data";

const rows: Widget[] = mockWidgets;
```

- The import should resolve from `@/mock-data` (no relative `../../`).
- Hovering `mockWidgets[0]` in your editor should show all fields typed (no `any` leaking through).
- If the new entity needs list rendering, drop it into a page and use `<DataTable<Widget>>` with typed column `render` props.
- Run `npm run typecheck` and `npm run lint:layers` — the layering guard will fail if a presentation file imports the data file directly.

## Out of scope

- Persisting the data to a real backend — the app is mock-first; API-backed modules go through `src/infrastructure/di/container.ts`.
- Adding a Zustand/Redux store — the project uses local `useState` for list mutations.
- Adding a CRUD page that writes back to the dataset — the data is read-only consts; mutations are local React state, not data writes.
