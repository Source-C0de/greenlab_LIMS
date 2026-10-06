// =========================================================================
// useReissueSample — clone an approved sample into a new one with id
// `<base>-R<next>`. The copy preserves every byte of test work
// (approvals, review history, parameter values); only the wrapper fields
// (id, status, a handful of dates) are refreshed. Chains are allowed:
// FD/2024/0001-R1 -> -R2 -> -R3.
// =========================================================================

import { useCallback, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { samplesStore, notifyStoreChanged, findSample } from "./store";
import type { MockSample, Test } from "@/mock-data/samples";
import type { ReissueSampleInput, ReissueSampleResult } from "./types";

const ALLOWED_ROLES = new Set(["admin", "lab_manager"]);

/** Escape a literal for use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Pure — exported for testability.
 *
 * Given the source id and the current set of ids in the store, compute the
 * next available `<base>-R<n>` suffix. Chains are supported: reissuing
 * `FD/2024/0001-R1` yields the same base `FD/2024/0001`. Suffixes are
 * monotonic — a deleted middle link does NOT reuse its number.
 */
export function nextReissueId(sourceId: string, existingIds: string[]): string {
  // Strip any existing -R\d+ tail to find the base id.
  const base = sourceId.replace(/-R\d+$/, "");
  const pattern = new RegExp(`^${escapeRegExp(base)}-R(\\d+)$`);
  const used = existingIds
    .filter((id) => pattern.test(id))
    .map((id) => {
      const m = /-R(\d+)$/.exec(id);
      return m ? parseInt(m[1], 10) : NaN;
    })
    .filter((n) => Number.isFinite(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${base}-R${next}`;
}

/** Pure. Returns the highest `T-NNN` integer across the store, or 0. */
export function maxExistingTestNumber(samples: MockSample[]): number {
  let m = 0;
  for (const s of samples) {
    for (const t of s.tests) {
      const match = /^T-(\d+)$/.exec(t.id);
      if (match) m = Math.max(m, parseInt(match[1], 10));
    }
  }
  return m;
}

/** Pure. Returns the highest `P-NN` integer across the store, or 0. */
export function maxExistingParamNumber(samples: MockSample[]): number {
  let m = 0;
  for (const s of samples) {
    for (const t of s.tests) {
      for (const p of t.parameters) {
        const match = /^P-(\d+)$/.exec(p.id);
        if (match) m = Math.max(m, parseInt(match[1], 10));
      }
    }
  }
  return m;
}

export function useReissueSample() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const reissue = useCallback(
    (input: ReissueSampleInput): ReissueSampleResult | null => {
      setError(null);

      if (!ALLOWED_ROLES.has(currentRole)) {
        setError(isRtl ? "غير مصرح" : "Not authorized");
        return null;
      }
      // Guard against double-click races.
      if (inFlight.current) return null;

      const source = findSample(input.sourceSampleId);
      if (!source) {
        setError(isRtl ? "العينة غير موجودة" : "Sample not found");
        return null;
      }

      inFlight.current = true;
      try {
        const existingIds = samplesStore.map((s) => s.id);
        const newId = nextReissueId(source.id, existingIds);

        // structuredClone correctly handles nested arrays (tests, parameters,
        // reviewHistory) and the nested approvals object. ISO date strings
        // clone as strings — which is what the rest of the code expects.
        const cloned: MockSample = structuredClone(source);

        const today = new Date().toISOString().split("T")[0];
        const now = new Date().toISOString();

        // Regenerate unique test/parameter ids so the copy is safe to
        // mutate further without colliding with the source's ids.
        let testSeq = maxExistingTestNumber(samplesStore) + 1;
        cloned.id = newId;
        cloned.status = "Reissue";
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
            // qaApprovedAt, assignedTo, reviewStatus — all carried over
            // as-is (per the "Keep everything as-is" requirement).
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

  return { reissue, error };
}