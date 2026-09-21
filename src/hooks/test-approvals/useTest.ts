// =========================================================================
// useTest — read a single test (re-renders when the store changes)
// =========================================================================

import { useSyncExternalStore } from "react";
import { findTestById, getStoreSnapshot, subscribe } from "./store";
import type { Test, MockSample } from "@/mock-data/samples";

interface UseTestResult {
  test: Test | null;
  sample: MockSample | null;
}

export function useTest(testId: string | null | undefined): UseTestResult {
  // Give the component a stable re-render trigger when the store mutates.
  // The snapshot is just a numeric tick; the actual data is read from the
  // store each render.
  const snapshot = useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);
  // snapshot is referenced purely to keep the hook subscribed
  void snapshot;

  if (!testId) return { test: null, sample: null };
  const found = findTestById(testId);
  if (!found) return { test: null, sample: null };
  return { test: found.sample.tests[found.testIndex], sample: found.sample };
}