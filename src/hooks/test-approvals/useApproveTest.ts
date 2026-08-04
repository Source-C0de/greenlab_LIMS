// =========================================================================
// useApproveTest — mutation hook: approve a test, append review history,
// cascade sample status to "Approved" if all tests are now approved,
// and notify the analyst via the bell.
// =========================================================================
// Backend ref: POST /api/superadmin/tests/{id}/approve

import { useCallback } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { findTestById, notifyStoreChanged } from "./store";
import type { ApproveTestInput } from "./types";
import type { Test } from "@/mock-data/samples";
import { toast } from "sonner";
import { approvalLabels } from "./labels";

interface ApproveResult {
  test: Test | null;
  sampleApproved: boolean;
}

const SIM_LATENCY_MS = 600;

/** Returns an async function that performs the approval. */
export function useApproveTest(): (input: ApproveTestInput) => Promise<ApproveResult> {
  const { addNotification } = useNotifications();

  return useCallback(
    async (input: ApproveTestInput) => {
      const labels = approvalLabels(document.documentElement.lang === "ar" ? "ar" : "en");

      const found = findTestById(input.testId);
      if (!found) {
        toast.error(labels.notFound);
        return { test: null, sampleApproved: false };
      }

      const { sample, testIndex } = found;
      const test = sample.tests[testIndex];
      if (test.reviewStatus !== "submitted_for_review") {
        toast.error(labels.cannotApprove);
        return { test: null, sampleApproved: false };
      }

      await new Promise((resolve) => setTimeout(resolve, SIM_LATENCY_MS));

      const now = new Date().toISOString();
      const updated: Test = {
        ...test,
        reviewStatus: "approved",
        approvedAt: now,
        updatedAt: now,
        reviewHistory: [
          ...test.reviewHistory,
          {
            id: `rev-${Date.now()}`,
            reviewerId: "LM-001",
            reviewerEmail: "manager@greenlablims.sa",
            decision: "approved",
            comment: input.comment,
            previousReviewStatus: "submitted_for_review",
            newReviewStatus: "approved",
            createdAt: now,
          },
        ],
      };
      sample.tests[testIndex] = updated;

      // Cascade: if ALL tests on this sample are approved, flip the sample.
      const allApproved = sample.tests.every((t) => t.reviewStatus === "approved");
      if (allApproved) {
        sample.status = "Approved";
        sample.completedDate = now.split("T")[0];
      }

      notifyStoreChanged();

      // Notify the assigned analyst if there is one.
      if (updated.assignedTo) {
        const analystName =
          updated.assignedTo === "A001"
            ? "Shahjahan"
            : updated.assignedTo === "A002"
            ? "Tariq masum"
            : updated.assignedTo === "A003"
            ? "Khaled"
            : updated.assignedTo === "A004"
            ? "Nazmul Alam"
            : updated.assignedTo;
        addNotification({
          title: labels.approvedToast,
          titleAr: labels.approvedToast,
          message: `${updated.name} • ${sample.id}`,
          messageAr: `${updated.name} • ${sample.id}`,
          type: "success",
          link: `/samples/${sample.id}`,
          roles: ["analyst", "lab_manager", "admin"],
        });
        void analystName; // silence unused
      }

      toast.success(labels.approvedToast, {
        description: allApproved
          ? `${updated.name} • ${sample.id}`
          : updated.name,
      });

      return { test: updated, sampleApproved: allApproved };
    },
    [addNotification],
  );
}