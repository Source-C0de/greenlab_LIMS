// =========================================================================
// useTestHistory — full audit trail of approval actions on one test
// =========================================================================

import { useSyncExternalStore } from "react";
import { findTestById, getStoreSnapshot, subscribe } from "./store";
import type { TestReviewEntry } from "@/mock-data/samples";

export function useTestHistory(testId: string | null | undefined): TestReviewEntry[] {
  useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);

  if (!testId) return [];
  const found = findTestById(testId);
  if (!found) return [];
  return [...found.sample.tests[found.testIndex].reviewHistory].reverse();
}