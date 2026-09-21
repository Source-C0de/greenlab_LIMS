---
name: bilingual-component
description: "Make a component in GreenLabLIMS KSA bilingual (EN/AR) and RTL-safe. Produces the canonical useAppContext() + isRtl pattern, paired label objects, and a logical-CSS-property audit checklist. Use when the user says 'make this bilingual', 'add Arabic labels', 'RTL-safe component', 'i18n this component', 'add EN/AR strings', or 'localize this UI'."
when-to-use: "User asks to localize a component, add Arabic labels, or make UI RTL-safe. Triggers: 'make this bilingual', 'add Arabic labels', 'RTL safe', 'i18n this component', 'add EN/AR strings', 'localize this UI', 'add Arabic translation'."
allowed-tools: Read, Write, Edit, Grep, Glob
---

# bilingual-component

GreenLabLIMS KSA is fully bilingual (EN/AR) with RTL flipping. Every
user-facing string in nav, sidebar, page headers, buttons, table headers,
and form labels must have a paired EN/AR variant.

## Canonical pattern (use this exact shape)

`useAppContext()` exposes `language` only. Derive `isRtl` inline — it is
**not** exported from the context.

```tsx
import { useAppContext } from "@/context/AppContext";

type Label = { en: string; ar: string };

export function BilingualCard({
  title,
  body,
  onAction,
}: {
  title: Label;
  body: Label;
  onAction: () => void;
}) {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">{isRtl ? title.ar : title.en}</h2>
      <p className="text-muted-foreground">{isRtl ? body.ar : body.en}</p>
      <button
        onClick={onAction}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground ms-2"
      >
        {isRtl ? "تنفيذ" : "Run"}
      </button>
    </div>
  );
}
```

## Two styles for label sets

Pick one and stay consistent within a component:

**Style A — Pair helper (good for one-offs in JSX):**
```tsx
const t = (en: string, ar: string) => (isRtl ? ar : en);
<h1>{t("Samples", "العينات")}</h1>
```

**Style B — Object literal (good for repeated lookups):**
```tsx
const TITLES = {
  dashboard:   { en: "Dashboard",  ar: "لوحة القيادة" },
  reports:     { en: "Reports",    ar: "التقارير" },
  clients:     { en: "Clients",    ar: "العملاء" },
} as const satisfies Record<string, Label>;
```

For data entities, follow the mock-data convention: parallel `nameEn`/`nameAr`,
`titleEn`/`titleAr`, or `labelEn`/`labelAr` fields on the type. **Do not localize
status codes** — `status: "active"` stays "active" in both languages.

## Audit checklist (run before merging)

- [ ] Every visible string has an `en` and `ar` variant.
- [ ] `useAppContext()` is the only source of `language`; `isRtl` is derived inline.
- [ ] Tailwind uses logical properties: `ms-*` / `me-*` / `ps-*` / `pe-*` / `start-*` / `end-*` — never `ml-*` / `mr-*` / `pl-*` / `pr-*` / `left-*` / `right-*`.
- [ ] Icons are not hard-flipped (`rotate-180` etc.) — let the `dir="rtl"` cascade handle mirroring.
- [ ] Date/number formatting uses `Intl` with the `language` value as the locale (`"ar-SA"`, `"en-SA"`).
- [ ] The `dir` attribute is set on the root container of any new top-level component (`dir={isRtl ? "rtl" : "ltr"}`).
- [ ] Forms, inputs, and `<Input>`/`<Select>`/`<Textarea>` are inside the `dir` boundary so cursor and text alignment follow the language.

## Reference: existing patterns

- `src/components/layout/Sidebar.tsx` — `getNavItems()` builds bilingual nav with role gating.
- `src/components/shared/StatusBadge.tsx` — status colors with bilingual labels.
- `src/pages/login.tsx` — full auth screen with EN/AR strings.
- `src/context/AppContext.tsx` — toggles `document.documentElement.dir` when `language` changes.

## Verification

1. Render the component with `language = "en"` and confirm strings and layout.
2. Switch `language = "ar"` (via the header language toggle) and confirm:
   - strings swap,
   - logical properties mirror correctly (the `ms-2` margin now sits on the right of the button),
   - icon direction (arrows, chevrons) flips automatically.

## Out of scope

- Adding a real i18n library (react-i18next, etc.) — the project uses hand-rolled context.
- Localizing backend strings — there is no backend.
- Translating into languages other than EN/AR — these are the only two supported.
