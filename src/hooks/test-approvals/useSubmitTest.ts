// =========================================================================
// useSubmitTest — analyst-side mutation: submit a test for the approval
// chain. The test enters the queue at `awaiting_lab_supervisor`.
// =========================================================================
// Backend ref: POST /api/superadmin/tests/{id}/submit

import { useCallback } from "react";
import { findTestById, notifyStoreChanged } from "./store";
import type { SubmitTestInput } from "./types";
import type { Test } from "@/mock-data/samples";
import { toast } from "sonner";
import { approvalLabels } from "./labels";

interface SubmitResult {
  test: Test | null;
}

const SIM_LATENCY_MS = 500;

export function useSubmitTest(): (input: SubmitTestInput) => Promise<SubmitResult> {
  return useCallback(async (input: SubmitTestInput) => {
    const lang = document.documentElement.lang === "ar" ? "ar" : "en";
    const labels = approvalLabels(lang);

    const found = findTestById(input.testId);
    if (!found) {
      toast.error(labels.notFound);
      return { test: null };
    }

    const { sample, testIndex } = found;
    const test = sample.tests[testIndex];

    // Pre-condition: test must be in_progress or changes_requested.
    if (!["in_progress", "changes_requested", "pending"].includes(test.reviewStatus)) {
      toast.error(labels.cannotApprove);
      return { test: null };
    }

    // All parameters must have a non-blank value.
    const blank = test.parameters.filter((p) => !p.value || p.value.trim() === "");
    if (blank.length > 0) {
      toast.error(labels.allParametersRequired, {
        description: blank.map((p) => p.name).join(", "),
      });
      return { test: null };
    }

    await new Promise((resolve) => setTimeout(resolve, SIM_LATENCY_MS));

    const now = new Date().toISOString();
    const previous = test.reviewStatus;
    const updated: Test = {
      ...test,
      // Re-entering the chain at the top: any prior approvals are wiped.
      reviewStatus: "awaiting_lab_supervisor",
      submittedAt: now,
      updatedAt: now,
      approvals: { lab_supervisor: null, tech_manager: null, qa: null },
      reviewHistory: [
        ...test.reviewHistory,
        {
          id: `rev-${Date.now()}`,
          reviewerId: test.assignedTo ?? "ANALYST",
          reviewerName: test.assignedTo ?? "Analyst",
          reviewerRole: "analyst",
          reviewerEmail: "analyst@greenlablims.sa",
          decision: "approved",
          comment: "Submitted for review",
          previousReviewStatus: previous,
          newReviewStatus: "awaiting_lab_supervisor",
          createdAt: now,
        },
      ],
    };
    sample.tests[testIndex] = updated;
    sample.status = "Review";
    notifyStoreChanged();

    toast.success(labels.submittedToast, {
      description: `${updated.name} • ${sample.id}`,
    });

    return { test: updated };
  }, []);
}