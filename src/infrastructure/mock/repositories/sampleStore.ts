// =========================================================================
// Mutable in-memory sample store — the backing data for the mock adapter
// =========================================================================
// MOVED HERE IN PHASE 3: this file used to live at
// `presentation/hooks/test-approvals/store.ts`, which made it impossible to
// write `infrastructure/mock/repositories/sampleRepository.ts` against it —
// infrastructure is not allowed to depend on presentation, and the layering
// guard (`npm run lint:layers`) correctly refused the dependency.
//
// It belongs here: it is in-memory state, not React. The hooks subscribe to
// it via `subscribe`/`getStoreSnapshot` (a `useSyncExternalStore` pair), but
// the store itself has no React dependency and is consumed by the repository
// adapter too.
//
// `mockSamples` is deep-copied rather than aliased so that hook mutations
// (approve/reject/reissue) don't write through into the seed data, which other
// modules still import as a pristine fixture.

import { mockSamples } from "@/infrastructure/mock/data";
import type { MockSample } from "@/infrastructure/mock/data/samples";

export const samplesStore: MockSample[] = mockSamples.map((s) => ({
  ...s,
  tests: s.tests.map((t) => ({
    ...t,
    parameters: t.parameters.map((p) => ({ ...p })),
    reviewHistory: [...t.reviewHistory],
  })),
}));

/** Notify any subscribed listeners that the store mutated. */
const listeners = new Set<() => void>();
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function notifyStoreChanged() {
  bumpTick();
  for (const fn of listeners) fn();
}

// Monotonic tick — used by hooks as a stable snapshot value so React knows
// when to re-render. Bumped on every store mutation.
let storeTick = 0;
export function getStoreSnapshot(): number {
  return storeTick;
}
function bumpTick() {
  storeTick += 1;
}

/** Look up a sample by id. Returns null if missing. */
export function findSample(sampleId: string): MockSample | null {
  return samplesStore.find((s) => s.id === sampleId) ?? null;
}

/** Look up a test by id (and return its parent sample). */
export function findTestById(testId: string): { sample: MockSample; testIndex: number } | null {
  const sample = samplesStore.find((s) => s.tests.some((t) => t.id === testId));
  if (!sample) return null;
  const testIndex = sample.tests.findIndex((t) => t.id === testId);
  return { sample, testIndex };
}

/** Reset to the seed data — useful for testing. */
export function resetStore() {
  samplesStore.length = 0;
  samplesStore.push(
    ...mockSamples.map((s) => ({
      ...s,
      tests: s.tests.map((t) => ({
        ...t,
        parameters: t.parameters.map((p) => ({ ...p })),
        reviewHistory: [...t.reviewHistory],
      })),
    })),
  );
  notifyStoreChanged();
}