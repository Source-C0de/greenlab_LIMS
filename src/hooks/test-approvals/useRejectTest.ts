// =========================================================================
// useRejectTest — mutation hook: reject a test, send it back to the analyst
// =========================================================================
// Backend ref: POST /api/superadmin/tests/{id}/reject

import { useCallback } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { findTestById, notifyStoreChanged } from "./store";
import type { RejectTestInput } from "./types";
import type { Test } from "@/mock-data/samples";
import { toast } from "sonner";
import { approvalLabels } from "./labels";

interface RejectResult {
  test: Test | null;
}

const SIM_LATENCY_MS = 600;

export function useRejectTest(): (input: RejectTestInput) => Promise<RejectResult> {
  const { addNotification } = useNotifications();

  return useCallback(
    async (input: RejectTestInput) => {
      const lang = document.documentElement.lang === "ar" ? "ar" : "en";
      const labels = approvalLabels(lang);

      if (!input.reason || input.reason.trim().length < 5) {
        toast.error(labels.reasonRequiredToast);
        throw new Error(labels.reasonRequired);
      }

      const found = findTestById(input.testId);
      if (!found) {
        toast.error(labels.notFound);
        return { test: null };
      }

      const { sample, testIndex } = found;
      const test = sample.tests[testIndex];
      if (test.reviewStatus !== "submitted_for_review") {
        toast.error(labels.cannotReject);
        return { test: null };
      }

      await new Promise((resolve) => setTimeout(resolve, SIM_LATENCY_MS));

      const now = new Date().toISOString();
      const updated: Test = {
        ...test,
        reviewStatus: "changes_requested",
        updatedAt: now,
        reviewHistory: [
          ...test.reviewHistory,
          {
            id: `rev-${Date.now()}`,
            reviewerId: "LM-001",
            reviewerEmail: "manager@greenlablims.sa",
            decision: "changes_requested",
            reason: input.reason,
            comment: input.comment,
            previousReviewStatus: "submitted_for_review",
            newReviewStatus: "changes_requested",
            createdAt: now,
          },
        ],
      };
      sample.tests[testIndex] = updated;
      notifyStoreChanged();

      // Surface the rejection in the analyst's notification bell.
      addNotification({
        title: lang === "ar" ? "تم رفض الاختبار" : "Test rejected",
        titleAr: "تم رفض الاختبار",
        message:
          lang === "ar"
            ? `${updated.name} • ${sample.id} • ${input.reason}`
            : `${updated.name} • ${sample.id} • ${input.reason}`,
        messageAr: `${updated.name} • ${sample.id} • ${input.reason}`,
        type: "warning",
        link: `/samples/${sample.id}`,
        roles: ["analyst", "lab_manager"],
      });

      toast.warning(labels.rejectedToast, {
        description: input.reason,
      });

      return { test: updated };
    },
    [addNotification],
  );
}