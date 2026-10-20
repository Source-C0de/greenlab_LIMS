import { useCallback, useMemo } from "react";
import { useAppContext, type Language } from "@/context/AppContext";

/**
 * Typed translation hook — the primitive introduced in Phase 0.
 *
 * Usage (per-vertical module under `shared/i18n/domains/<vertical>/`):
 *
 *   // samples.en.ts
 *   export const labels = {
 *     title: "Samples",
 *     addSample: "Add Sample",
 *   } as const;
 *
 *   // samples.ar.ts  — typed against the English table, so a missing or
 *   // misspelled key is a compile error.
 *   import type { typeof labels } from "./samples.en";
 *   export const labels: typeof labels = { title: "العينات", addSample: "إضافة عينة" };
 *
 *   // component
 *   const { t, isRtl, language } = useTranslation(labels);
 *   <h1>{t("title")}</h1>
 *
 * Because `labels` is passed in, it is typed at the call site — no global key
 * registry, no string-typed keys that can silently drift.
 */
export function useTranslation<T extends Record<string, unknown>>(
  labels: Readonly<Record<Language, T>>,
) {
  const { language } = useAppContext();

  const t = useCallback(
    <K extends keyof T>(key: K): T[K] => labels[language][key],
    [labels, language],
  );

  return useMemo(
    () => ({
      t,
      language,
      /** Arabic renders RTL. Prefer logical CSS (`ms-*`/`me-*`) over `ml-*`/`mr-*`. */
      isRtl: language === "ar",
    }),
    [t, language],
  );
}