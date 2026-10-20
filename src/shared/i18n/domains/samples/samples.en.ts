// EN source of truth for the samples vertical. The AR table below is typed
// `typeof <this>`, so a missing key in `samples.ar.ts` is a compile error.
//
// The values here are kept MINIMAL on purpose — this is the Phase-0 primitive
// wiring. The bulk label migration is a follow-up pass that lifts the inline
// `labels = { en: {...}, ar: {...} }` objects out of pages.

export const samplesLabels = {
  title: "Samples",
  addSample: "Add Sample",
  noSamples: "No samples found",
};

/**
 * Keys are structural; values widen to `string`. Using `typeof samplesLabels`
 * directly would pin each value to its English *literal* ("Samples"), and the
 * Arabic table could never satisfy it. `{ [K in keyof T]: string }` keeps the
 * compile-time guarantee we actually want — every key must exist — while
 * letting each language supply its own text.
 */
export type SamplesLabels = { [K in keyof typeof samplesLabels]: string };