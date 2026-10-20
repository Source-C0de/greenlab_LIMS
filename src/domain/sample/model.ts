/**
 * Sample domain model.
 *
 * Mirrors the shape currently declared in
 * `infrastructure/mock/data/samples.ts` (`MockSample`) — but declared HERE, in
 * the domain, with the infrastructure implementing it rather than the other way
 * round. That inversion is the core of the Phase 2–3 work: today the mock data
 * owns the interface, so swapping in a real backend means rewriting every
 * consumer.
 *
 * This file must stay pure: no React, no fetch, no imports outside `shared/`.
 *
 * MUTABILITY: these fields are deliberately NOT `readonly`. `mockSamples` is a
 * live in-memory store that ~15 presentation hooks mutate in place (approve,
 * reject, reissue, supplementary, update-parameters). An earlier draft marked
 * every field `readonly`, which was aspirational rather than descriptive — it
 * produced 29 compile errors that were all real in-place assignments. The
 * domain model describes what a sample *is*; it does not, by itself, constrain
 * who may change it. Enforcing immutability is the job of the repository
 * interface written in Phase 3, not of the shape.
 */

import type { Role } from "@/shared/lib/types";

/**
 * Sample lifecycle.
 *
 * NOTE: the current data carries `status: string` (untyped) and the UI branches
 * on free-text values — including values NOT in this union, such as "Approved"
 * and "Reissue" (see `useReissueSample.ts`). The union below is the *intended*
 * state machine; reconciling the data with it is Phase 3 work. Until then
 * `Sample.status` stays `string` so this change remains additive.
 */
export const SAMPLE_STATUSES = [
  "Received",
  "In Progress",
  "Under Review",
  "Completed",
  "Reported",
  "Cancelled",
] as const;

export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export type SamplePriority = "Normal" | "High" | "Urgent";

export type ParameterStatus = "pending" | "pass" | "fail";

/** Which of the three approval stages a review entry belongs to. */
export const APPROVAL_STAGES = [
  "lab_supervisor",
  "tech_manager",
  "qa",
] as const;

export type ApprovalStage = (typeof APPROVAL_STAGES)[number];

export type ReviewDecision = "approved" | "changes_requested";

/**
 * Test review lifecycle. `"draft"` was added in Phase 0 — a freshly-created
 * test that has not entered the approval chain.
 */
export const TEST_REVIEW_STATUSES = [
  "draft",
  "pending",
  "in_progress",
  "changes_requested",
  "awaiting_lab_supervisor",
  "awaiting_tech_manager",
  "awaiting_qa",
  "qa_approved",
] as const;

export type TestReviewStatus = (typeof TEST_REVIEW_STATUSES)[number];

/** A completed sign-off for one of the three approval stages. */
export interface StageApproval {
  /** Stage this approval covers. */
  stage: ApprovalStage;
  /** Role that owns this stage — used to gate UI actions. */
  approverRole: Role;
  /** Display name of the person who approved. */
  approverName: string;
  approverId: string;
  approverEmail: string;
  /** ISO timestamp when they signed off. */
  approvedAt: string;
  /** Optional reviewer comment. */
  comment?: string;
}

/** One entry in a test's append-only review history. */
export interface TestReviewEntry {
  id: string;
  reviewerId: string;
  reviewerEmail: string;
  /** Free-form display name for the person taking this action. */
  reviewerName?: string;
  /** Role that took this action — drives stage gating. */
  reviewerRole?: Role;
  decision: ReviewDecision;
  /** Which approval stage this entry advances/cancels. */
  stage?: ApprovalStage;
  reason?: string;
  comment?: string;
  previousReviewStatus: TestReviewStatus;
  newReviewStatus: TestReviewStatus;
  createdAt: string;
}

export interface ParameterValue {
  id: string;
  name: string;
  value: string;
  unit: string;
  min: number | null;
  max: number | null;
  /**
   * Numeric for Range/Max/Min limits, but textual for Pass / Fail, Text and
   * Not Detected limits (e.g. "Absent", "Clear").
   */
  target?: number | string | null;
  limitType?: string;
  /** Measurement uncertainty (e.g. "±0.05"). */
  mu?: string;
  /** Analytical method (e.g. "Titration"). */
  method?: string;
  /** Reference / standard method number (e.g. "ISO 10523"). */
  reference?: string;
  status: ParameterStatus;
  note?: string;
}

export interface Test {
  id: string;
  sampleId: string;
  name: string;
  category: string;
  method: string;
  /** User-ID of the assigned analyst. NOT a display name — see
   *  `presentation/components/features/tests/TestRowExpandable.tsx`. */
  assignedTo: string | null;
  reviewStatus: TestReviewStatus;
  parameters: ParameterValue[];
  reviewHistory: TestReviewEntry[];
  /** Three sign-off slots — one per approval stage. */
  approvals: Record<ApprovalStage, StageApproval | null>;
  submittedAt?: string;
  /** Set when QA signs off the final stage. */
  qaApprovedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sample {
  id: string;
  clientId: string;
  clientName: string;
  sampleType: string;
  description: string;
  status: string;
  /** Analyst DISPLAY NAME (unlike `Test.assignedTo`, which is an ID). */
  assignedAnalyst: string | null;
  receivedDate: string;
  completedDate: string | null;
  priority: SamplePriority;
  tests: Test[];

  // Extended metadata shown on the COA Sample Details card. All optional so
  // older samples without them fall back to "—".
  sampleName?: string;
  batchNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  testStartDate?: string;
  testCompletionDate?: string;
  environmentalConditions?: string;
}