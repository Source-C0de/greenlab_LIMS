// =========================================================================
// useSupplementarySample — clone an approved sample into a new one with
// id `<base>-S<next>`. Mirrors useReissueSample: preserves every byte of
// test work on the new sample, but the new sample's status is
// "Supplementary" instead of "Reissue", and the user is expected to add
// additional tests/parameters via the existing "Add Test" flow on the
// detail page. Chains: FD/2024/0001-S1 -> -S2 -> -S3.
// =========================================================================

import { useCallback, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { samplesStore, notifyStoreChanged, findSample } from "./store";
import type { MockSample, Test } from "@/mock-data/samples";
import type {
  SupplementarySampleInput,
  SupplementarySampleResult,
} from "./types";
import {
  maxExistingParamNumber,
  maxExistingTestNumber,
} from "./useReissueSample";

const ALLOWED_ROLES = new Set(["admin", "lab_manager"]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Pure — exported for testability.
 *
 * Compute the next available `<base>-S<n>` id. Independent from
 * nextReissueId's counter — reissuing and supplementing a sample produce
 * parallel chains.
 */
export function nextSupplementaryId(
  sourceId: string,
  existingIds: string[],
): string {
  const base = sourceId.replace(/-S\d+$/, "");
  const pattern = new RegExp(`^${escapeRegExp(base)}-S(\\d+)$`);
  const used = existingIds
    .filter((id) => pattern.test(id))
    .map((id) => {
      const m = /-S(\d+)$/.exec(id);
      return m ? parseInt(m[1], 10) : NaN;
    })
    .filter((n) => Number.isFinite(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${base}-S${next}`;
}

export function useSupplementarySample() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const supplementary = useCallback(
    (input: SupplementarySampleInput): SupplementarySampleResult | null => {
      setError(null);

      if (!ALLOWED_ROLES.has(currentRole)) {
        setError(isRtl ? "غير مصرح" : "Not authorized");
        return null;
      }
      if (inFlight.current) return null;

      const source = findSample(input.sourceSampleId);
      if (!source) {
        setError(isRtl ? "العينة غير موجودة" : "Sample not found");
        return null;
      }

      inFlight.current = true;
      try {
        const existingIds = samplesStore.map((s) => s.id);
        const newId = nextSupplementaryId(source.id, existingIds);

        const cloned: MockSample = structuredClone(source);

        const today = new Date().toISOString().split("T")[0];
        const now = new Date().toISOString();

        let testSeq = maxExistingTestNumber(samplesStore) + 1;
        cloned.id = newId;
        cloned.status = "Supplementary";
        cloned.receivedDate = today;
        cloned.completedDate = null;
        cloned.testStartDate = undefined;
        cloned.testCompletionDate = undefined;
        cloned.tests = cloned.tests.map((t: Test) => {
          let paramSeq = maxExistingParamNumber(samplesStore) + 1;
          const newTestId = `T-${String(testSeq++).padStart(3, "0")}`;
          return {
            ...t,
            id: newTestId,
            sampleId: newId,
            createdAt: now,
            updatedAt: now,
            parameters: t.parameters.map((p) => ({
              ...p,
              id: `P-${String(paramSeq++).padStart(2, "0")}`,
            })),
            // approvals, reviewHistory, parameter values, submittedAt,
            // qaApprovedAt, assignedTo, reviewStatus — all carried over.
          };
        });

        samplesStore.push(cloned);
        notifyStoreChanged();
        return { newSample: cloned, newId };
      } finally {
        inFlight.current = false;
      }
    },
    [currentRole, isRtl],
  );

  return { supplementary, error };
}