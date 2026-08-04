// =========================================================================
// Shared hook types for the test approval workflow
// =========================================================================
// Mirrors the backend OpenAPI spec (section K).

import type { Test, TestQueueItem } from "@/mock-data";

export interface ListTestsQuery {
  page?: number;
  pageSize?: number;
  sampleId?: string;
  sampleType?: string;
  priority?: "Normal" | "High" | "Urgent";
  assignedTo?: string;
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
}

export interface RejectTestInput {
  testId: string;
  reason: string;
  comment?: string;
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
}

export interface BulkApproveResult {
  approved: Test[];
  failed: Array<{ testId: string; reason: string }>;
}

/** Mock "current user id" — used to scope the analyst "my submissions" view. */
export const MOCK_CURRENT_USER_ID = "A001"; // Shahjahan by default
