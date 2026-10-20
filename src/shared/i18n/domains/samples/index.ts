import type { Language } from "@/shared/lib/types";
import { samplesLabels } from "./samples.en";
import { samplesLabelsAr } from "./samples.ar";

/** Barrel for the samples vertical — the only import surface pages should use. */
export const samplesLabelsByLanguage = {
  en: samplesLabels,
  ar: samplesLabelsAr,
} as const satisfies Readonly<Record<Language, typeof samplesLabels>>;

export type { SamplesLabels } from "./samples.en";