// =========================================================================
// Shared in-memory store for the approval hook layer
// =========================================================================
// Today: holds a mutable copy of mockSamples so hooks can read/mutate.
// Tomorrow: swap each hook's body to useQuery / useMutation against the
// real backend — the public hook signature never changes.

import { mockSamples } from "@/mock-data";
import type { MockSample } from "@/mock-data/samples";

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