// =========================================================================
// useRejectTest — any stage can reject a test. Rejection pushes the test
// back to `changes_requested` so the analyst must revise and resubmit; the
// previous approvals are cleared so the test re-enters the chain at the top.
// =========================================================================

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
      const rejectable = [
        "awaiting_lab_supervisor",
        "awaiting_tech_manager",
        "awaiting_qa",
      ].includes(test.reviewStatus as string);
      if (!rejectable) {
        toast.error(labels.cannotReject);
        return { test: null };
      }

      // Derive the stage from the current status if not provided.
      let stage = input.stage;
      if (!stage) {
        if (test.reviewStatus === "awaiting_lab_supervisor") stage = "lab_supervisor";
        else if (test.reviewStatus === "awaiting_tech_manager") stage = "tech_manager";
        else stage = "qa";
      }

      await new Promise((resolve) => setTimeout(resolve, SIM_LATENCY_MS));

      const now = new Date().toISOString();
      const reviewerName = input.reviewerName?.trim() || (lang === "ar" ? "المراجع" : "Reviewer");
      const reviewerRole = input.reviewerRole ?? "lab_manager";
      const reviewerEmail = input.reviewerEmail ?? "reviewer@greenlablims.sa";
      const reviewerId = input.reviewerId ?? "RV-001";

      const updated: Test = {
        ...test,
        reviewStatus: "changes_requested",
        updatedAt: now,
        // Clear the approval slot the rejection came from — the test will
        // re-enter the chain at the top when the analyst resubmits.
        approvals: {
          ...test.approvals,
          [stage]: null,
        },
        reviewHistory: [
          ...test.reviewHistory,
          {
            id: `rev-${Date.now()}`,
            reviewerId,
            reviewerName,
            reviewerRole,
            reviewerEmail,
            decision: "changes_requested",
            stage,
            reason: input.reason,
            comment: input.comment,
            previousReviewStatus: test.reviewStatus,
            newReviewStatus: "changes_requested",
            createdAt: now,
          },
        ],
      };
      sample.tests[testIndex] = updated;
      sample.status = "Review";
      notifyStoreChanged();

      const stageLabel =
        stage === "lab_supervisor"
          ? labels.stageLabSupervisor
          : stage === "tech_manager"
          ? labels.stageTechManager
          : labels.stageQa;

      addNotification({
        title: lang === "ar" ? "تم رفض الاختبار" : "Test rejected",
        titleAr: "تم رفض الاختبار",
        message:
          lang === "ar"
            ? `${updated.name} • ${sample.id} • ${stageLabel}`
            : `${updated.name} • ${sample.id} • ${stageLabel}`,
        messageAr: `${updated.name} • ${sample.id} • ${stageLabel}`,
        type: "warning",
        link: `/samples/${sample.id}`,
        roles: ["analyst", "lab_manager", "admin"],
      });

      toast.warning(labels.rejectedToast, {
        description: `${stageLabel}: ${input.reason}`,
      });

      return { test: updated };
    },
    [addNotification],
  );
}