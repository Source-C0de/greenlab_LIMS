/**
 * Sample domain rules — pure functions, no React, no I/O.
 *
 * These are EXTRACTED, not invented. `currentStage`, `roleForStage` and
 * `labelKeyForStage` currently live in
 * `infrastructure/mock/data/samples.ts`; they are domain logic sitting in an
 * infrastructure file, which is precisely the layering mistake this refactor
 * exists to remove. Behaviour is unchanged — Phase 3 re-points the callers.
 */
import type { ApprovalStage, Test, TestReviewStatus } from "./model";
import type { Role } from "@/shared/lib/types";

/** The stage that must approve this test right now, or null if none pending. */
export function currentStage(
  test: Pick<Test, "reviewStatus" | "approvals">,
): ApprovalStage | null {
  if (test.reviewStatus === "qa_approved") return null;
  if (test.reviewStatus === "awaiting_lab_supervisor") return "lab_supervisor";
  if (test.reviewStatus === "awaiting_tech_manager") return "tech_manager";
  if (test.reviewStatus === "awaiting_qa") return "qa";
  return null;
}

/** Role that owns a stage — single source of truth for UI gating. */
export function roleForStage(stage: ApprovalStage): Role {
  switch (stage) {
    case "lab_supervisor":
      return "lab_manager";
    case "tech_manager":
      return "admin";
    case "qa":
      return "admin";
  }
}

/** i18n key for a stage's human-readable label. */
export function labelKeyForStage(stage: ApprovalStage): string {
  switch (stage) {
    case "lab_supervisor":
      return "stageLabSupervisor";
    case "tech_manager":
      return "stageTechManager";
    case "qa":
      return "stageQa";
  }
}

/** The stage that follows `stage`, or null when it is the last one. */
export function nextStage(stage: ApprovalStage): ApprovalStage | null {
  switch (stage) {
    case "lab_supervisor":
      return "tech_manager";
    case "tech_manager":
      return "qa";
    case "qa":
      return null;
  }
}

/** Status a test takes once `stage` approves it. */
export function statusAfterApproval(stage: ApprovalStage): TestReviewStatus {
  switch (stage) {
    case "lab_supervisor":
      return "awaiting_tech_manager";
    case "tech_manager":
      return "awaiting_qa";
    case "qa":
      return "qa_approved";
  }
}

/** True when the test is sitting in the chain, i.e. not yet finished. */
export function isInApprovalChain(
  test: Pick<Test, "reviewStatus">,
): boolean {
  return (
    test.reviewStatus === "awaiting_lab_supervisor" ||
    test.reviewStatus === "awaiting_tech_manager" ||
    test.reviewStatus === "awaiting_qa"
  );
}

/**
 * Whether `role` may act on `test` at its current stage.
 *
 * Extracted because the same check is duplicated across
 * `presentation/pages/approvals/queue.tsx`, `ApprovalChainPanel.tsx` and
 * `RejectTestDialog.tsx` — three copies of one rule is how they drift.
 */
export function canApprove(
  test: Pick<Test, "reviewStatus" | "approvals">,
  role: Role,
): boolean {
  const stage = currentStage(test);
  if (!stage) return false;
  if (stage === "lab_supervisor") return role === "lab_manager" || role === "admin";
  return role === "admin";
}