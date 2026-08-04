// =========================================================================
// useUpdateTestParameters — analyst-side mutation: bulk-upsert parameter values
// Backend ref: PUT /api/superadmin/tests/{id}/parameters
// =========================================================================

import { useCallback } from "react";
import { findTestById, notifyStoreChanged } from "./store";
import type { UpdateTestParametersInput } from "./types";
import type { ParameterValue, Test } from "@/mock-data/samples";

interface UpdateResult {
  test: Test | null;
}

const SIM_LATENCY_MS = 400;

/** Recompute pass/fail for one parameter against its min/max. */
function recomputeStatus(p: ParameterValue): ParameterValue {
  const value = (p.value ?? "").trim();
  if (value === "") return { ...p, status: "pending" };

  // Try numeric comparison first; non-numeric values are treated as pending
  // (text values like "Negative" can't be auto-graded server-side either).
  const num = Number(value);
  if (Number.isNaN(num)) return { ...p, status: "pending" };

  let status: ParameterValue["status"] = "pass";
  if (p.min != null && num < p.min) status = "fail";
  if (p.max != null && num > p.max) status = "fail";
  return { ...p, status };
}

export function useUpdateTestParameters(): (input: UpdateTestParametersInput) => Promise<UpdateResult> {
  return useCallback(async (input: UpdateTestParametersInput) => {
    const found = findTestById(input.testId);
    if (!found) return { test: null };

    const { sample, testIndex } = found;
    const test = sample.tests[testIndex];

    // Editable only before final approval.
    if (!["pending", "in_progress", "changes_requested"].includes(test.reviewStatus)) {
      return { test: null };
    }

    await new Promise((resolve) => setTimeout(resolve, SIM_LATENCY_MS));

    const updated: Test = {
      ...test,
      parameters: test.parameters.map((p) => {
        const upd = input.parameters.find((u) => u.id === p.id);
        return recomputeStatus(upd ? { ...p, value: upd.value } : p);
      }),
      updatedAt: new Date().toISOString(),
    };
    sample.tests[testIndex] = updated;
    notifyStoreChanged();
    return { test: updated };
  }, []);
}