// =========================================================================
// Shared hook types for the test approval workflow
// =========================================================================
// Mirrors the backend OpenAPI spec (section K).

import type { Role } from "@/context/AppContext";
import type { Test, TestQueueItem } from "@/mock-data";

export interface ListTestsQuery {
  page?: number;
  pageSize?: number;
  sampleId?: string;
  sampleType?: string;
  priority?: "Normal" | "High" | "Urgent";
  assignedTo?: string;
  /** Filter to tests whose current review status is one of these. */
  status?: Array<
    | "awaiting_lab_supervisor"
    | "awaiting_tech_manager"
    | "awaiting_qa"
    | "qa_approved"
    | "changes_requested"
  >;
  submittedFrom?: string;
  submittedTo?: string;
  sortBy?: "submittedAt" | "priority" | "sampleId";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedTests {
  data: TestQueueItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApproveTestInput {
  testId: string;
  comment?: string;
  /** Identity of the person approving — captured into the audit trail. */
  approverId?: string;
  approverName?: string;
  approverEmail?: string;
  approverRole?: Role;
}

export interface RejectTestInput {
  testId: string;
  reason: string;
  comment?: string;
  /** Which stage is rejecting — defaults to the test's current stage. */
  stage?: "lab_supervisor" | "tech_manager" | "qa";
  reviewerId?: string;
  reviewerName?: string;
  reviewerEmail?: string;
  reviewerRole?: Role;
}

export interface SubmitTestInput {
  testId: string;
}

export interface UpdateTestParametersInput {
  testId: string;
  parameters: Array<{ id: string; value: string }>;
}

export interface BulkApproveInput {
  testIds: string[];
  comment?: string;
  approverId?: string;
  approverName?: string;
  approverEmail?: string;
  approverRole?: Role;
}

export interface BulkApproveResult {
  approved: Test[];
  failed: Array<{ testId: string; reason: string }>;
}

/** Mock "current user id" — used to scope the analyst "my submissions" view. */
export const MOCK_CURRENT_USER_ID = "A001"; // Shahjahan by default
