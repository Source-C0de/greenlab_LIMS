// =========================================================================
// useMySubmittedTests — analyst view of their own submitted tests
// =========================================================================

import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import { samplesStore, getStoreSnapshot, subscribe } from "./store";
import type { Test } from "@/mock-data/samples";
import { MOCK_CURRENT_USER_ID } from "./types";

export interface MySubmittedTests {
  submitted: Test[];
  changesRequested: (Test & { latestReason?: string })[];
}

export function useMySubmittedTests(userId: string = MOCK_CURRENT_USER_ID): MySubmittedTests {
  useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);

  return useMemo(() => {
    const submitted: Test[] = [];
    const changesRequested: (Test & { latestReason?: string })[] = [];

    for (const sample of samplesStore) {
      for (const test of sample.tests) {
        if (test.assignedTo !== userId) continue;
        if (test.reviewStatus === "submitted_for_review") {
          submitted.push(test);
        } else if (test.reviewStatus === "changes_requested") {
          const lastReject = [...test.reviewHistory]
            .reverse()
            .find((r) => r.decision === "changes_requested");
          changesRequested.push({ ...test, latestReason: lastReject?.reason });
        }
      }
    }

    return { submitted, changesRequested };
  }, [userId, getStoreSnapshot()]);
}