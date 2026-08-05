// =========================================================================
// useApproveTest — advance a test through the 3-stage approval chain
//   lab_supervisor → tech_manager → qa
// Each call fills the next empty approval slot based on the current
// `reviewStatus`. After QA signs, the test becomes `qa_approved` and
// cascades the parent sample status to "Approved" once every test on the
// sample has reached `qa_approved`.
// =========================================================================

import { useCallback } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { findTestById, notifyStoreChanged } from "./store";
import type { ApproveTestInput } from "./types";
import type { Test, TestReviewStatus } from "@/mock-data/samples";
import { approvalLabels } from "./labels";
import { toast } from "sonner";

export interface ApproveResult {
  test: Test | null;
  advancedTo: TestReviewStatus | null;
  sampleApproved: boolean;
}

const SIM_LATENCY_MS = 600;

/** Where the status lands once a given stage approves. */
function nextStatus(current: TestReviewStatus): TestReviewStatus | null {
  switch (current) {
    case "awaiting_lab_supervisor":
      return "awaiting_tech_manager";
    case "awaiting_tech_manager":
      return "awaiting_qa";
    case "awaiting_qa":
      return "qa_approved";
    default:
      return null;
  }
}

export function useApproveTest(): (input: ApproveTestInput) => Promise<ApproveResult> {
  const { addNotification } = useNotifications();

  return useCallback(
    async (input: ApproveTestInput) => {
      const lang = document.documentElement.lang === "ar" ? "ar" : "en";
      const labels = approvalLabels(lang);

      const found = findTestById(input.testId);
      if (!found) {
        toast.error(labels.notFound);
        return { test: null, advancedTo: null, sampleApproved: false };
      }

      const { sample, testIndex } = found;
      const test = sample.tests[testIndex];
      const target = nextStatus(test.reviewStatus);
      if (!target) {
        toast.error(labels.cannotApprove);
        return { test: null, advancedTo: null, sampleApproved: false };
      }

      // Determine which stage we just signed off, to populate approvals[]
      let stage: "lab_supervisor" | "tech_manager" | "qa" | null = null;
      if (test.reviewStatus === "awaiting_lab_supervisor") stage = "lab_supervisor";
      else if (test.reviewStatus === "awaiting_tech_manager") stage = "tech_manager";
      else if (test.reviewStatus === "awaiting_qa") stage = "qa";
      if (!stage) {
        toast.error(labels.cannotApprove);
        return { test: null, advancedTo: null, sampleApproved: false };
      }

      await new Promise((resolve) => setTimeout(resolve, SIM_LATENCY_MS));

      const now = new Date().toISOString();
      const approverName =
        input.approverName?.trim() || (lang === "ar" ? "المراجع الحالي" : "Current reviewer");
      const approverRole = input.approverRole ?? "lab_manager";
      const approverEmail = input.approverEmail ?? "reviewer@greenlablims.sa";
      const approverId = input.approverId ?? "RV-001";

      const updated: Test = {
        ...test,
        reviewStatus: target,
        updatedAt: now,
        ...(target === "qa_approved" ? { qaApprovedAt: now } : {}),
        approvals: {
          ...test.approvals,
          [stage]: {
            stage,
            approverRole,
            approverId,
            approverName,
            approverEmail,
            approvedAt: now,
            comment: input.comment,
          },
        },
        reviewHistory: [
          ...test.reviewHistory,
          {
            id: `rev-${Date.now()}`,
            reviewerId: approverId,
            reviewerName: approverName,
            reviewerRole: approverRole,
            reviewerEmail: approverEmail,
            decision: "approved",
            stage,
            comment: input.comment,
            previousReviewStatus: test.reviewStatus,
            newReviewStatus: target,
            createdAt: now,
          },
        ],
      };
      sample.tests[testIndex] = updated;
      notifyStoreChanged();

      // Cascade sample status when the entire chain is closed.
      const allQaApproved = sample.tests.every((t) => t.reviewStatus === "qa_approved");
      if (allQaApproved) {
        sample.status = "Approved";
        sample.completedDate = now.split("T")[0];
      } else if (sample.status === "Received" || sample.status === "Testing") {
        // The moment the first test moves into the approval chain the sample
        // becomes "Review" — matches how the legacy workflow behaved.
        sample.status = "Review";
      }

      // Tell the analyst their submission advanced.
      const stageLabel =
        stage === "lab_supervisor"
          ? labels.stageLabSupervisor
          : stage === "tech_manager"
          ? labels.stageTechManager
          : labels.stageQa;
      addNotification({
        title:
          target === "qa_approved"
            ? lang === "ar"
              ? "تم اعتماد الاختبار بالكامل"
              : "Test fully approved"
            : lang === "ar"
            ? `اعتمدت ${stageLabel}`
            : `Approved by ${stageLabel}`,
        titleAr:
          target === "qa_approved" ? "تم اعتماد الاختبار بالكامل" : `اعتمدت ${stageLabel}`,
        message: `${updated.name} • ${sample.id}`,
        messageAr: `${updated.name} • ${sample.id}`,
        type: "success",
        link: `/samples/${sample.id}`,
        roles: ["analyst", "lab_manager", "admin"],
      });

      toast.success(labels.approvedToast, {
        description:
          target === "qa_approved"
            ? `${updated.name} • ${sample.id}`
            : `${stageLabel}: ${updated.name}`,
      });

      return { test: updated, advancedTo: target, sampleApproved: allQaApproved };
    },
    [addNotification],
  );
}