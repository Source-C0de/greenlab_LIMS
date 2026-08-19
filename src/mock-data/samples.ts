// =========================================================================
// Test approval workflow — typed interfaces + 3-stage status pipeline
// =========================================================================
// Approval chain per test:
//   Analyst submits
//     → Lab Supervisor approves
//       → Technical Manager approves
//         → QA approves (terminal "qa_approved")

import type { Role } from "@/context/AppContext";

export type TestReviewStatus =
  | "pending"
  | "in_progress"
  | "changes_requested"
  | "awaiting_lab_supervisor"
  | "awaiting_tech_manager"
  | "awaiting_qa"
  | "qa_approved";

export type ParameterStatus = "pending" | "pass" | "fail";
export type ReviewDecision = "approved" | "changes_requested";

/** Which approval stage a review entry corresponds to. */
export type ApprovalStage =
  | "lab_supervisor"
  | "tech_manager"
  | "qa";

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

export interface ParameterValue {
  id: string;
  name: string;
  value: string;
  unit: string;
  min: number | null;
  max: number | null;
  target?: number;
  limitType?: string;
  /** Measurement uncertainty (e.g. "±0.05"). */
  mu?: string;
  /** Reference / standard method number (e.g. "ISO 10523"). */
  reference?: string;
  status: ParameterStatus;
  note?: string;
}

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

export interface Test {
  id: string;
  sampleId: string;
  name: string;
  category: string;
  method: string;
  assignedTo: string | null;
  reviewStatus: TestReviewStatus;
  parameters: ParameterValue[];
  reviewHistory: TestReviewEntry[];
  /** Three sign-off slots — one per approval stage. */
  approvals: {
    lab_supervisor: StageApproval | null;
    tech_manager: StageApproval | null;
    qa: StageApproval | null;
  };
  submittedAt?: string;
  /** Set when QA signs off the final stage. */
  qaApprovedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockSample {
  id: string;
  clientId: string;
  clientName: string;
  sampleType: string;
  description: string;
  status: string;
  assignedAnalyst: string | null;
  receivedDate: string;
  completedDate: string | null;
  priority: "Normal" | "High" | "Urgent";
  tests: Test[];
}

// =========================================================================
// Helpers — what stage a test is currently sitting at
// =========================================================================

/** Returns the stage that must approve the test right now, or null if done. */
export function currentStage(
  test: Pick<Test, "reviewStatus" | "approvals">,
): ApprovalStage | null {
  if (test.reviewStatus === "qa_approved") return null;
  if (test.reviewStatus === "awaiting_lab_supervisor") return "lab_supervisor";
  if (test.reviewStatus === "awaiting_tech_manager") return "tech_manager";
  if (test.reviewStatus === "awaiting_qa") return "qa";
  return null;
}

/** Role that owns a given stage — single source of truth for UI gating. */
export function roleForStage(stage: ApprovalStage): Role {
  switch (stage) {
    case "lab_supervisor":
      return "lab_manager"; // Lab Supervisor maps to the lab_manager role
    case "tech_manager":
      return "admin"; // Technical Manager — modeled as admin in this mock
    case "qa":
      return "admin"; // QA — modeled as admin in this mock
  }
}

/** Human-readable stage label key — used by i18n. */
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

// =========================================================================
// Seed data — every test carries the three-slot approvals block
// =========================================================================

const NOW = "2024-01-18T10:00:00Z";

export const mockSamples: MockSample[] = [
  {
    id: "SAM-2024-001",
    clientId: "C001",
    clientName: "Al-Marai Company",
    sampleType: "Food",
    description: "Full Cream Milk Batch #FM-2024-089",
    status: "Approved",
    assignedAnalyst: "Shahjahan",
    receivedDate: "2024-01-15",
    completedDate: "2024-01-18",
    priority: "Normal",
    tests: [
      {
        id: "T-001",
        sampleId: "SAM-2024-001",
        name: "Chemical Analysis",
        category: "Chemical",
        method: "AOAC 989.05",
        assignedTo: "A001",
        reviewStatus: "qa_approved",
        submittedAt: "2024-01-17T14:00:00Z",
        qaApprovedAt: NOW,
        parameters: [
          { id: "P-01", name: "pH", value: "6.7", unit: "", min: 6.5, max: 6.8, mu: "±0.05", reference: "ISO 10523", status: "pass" },
          { id: "P-02", name: "Fat Content", value: "3.2", unit: "%", min: 3.0, max: 3.5, mu: "±0.1", reference: "AOAC 989.05", status: "pass" },
          { id: "P-03", name: "Solid Non-Fat", value: "8.6", unit: "%", min: 8.5, max: 9.0, mu: "±0.1", reference: "AOAC 990.20", status: "pass" },
        ],
        approvals: {
          lab_supervisor: {
            stage: "lab_supervisor",
            approverRole: "lab_manager",
            approverId: "LS-001",
            approverName: "Ahmed Al-Otaibi",
            approverEmail: "lab.supervisor@greenlablims.sa",
            approvedAt: "2024-01-17T16:00:00Z",
            comment: "All within spec.",
          },
          tech_manager: {
            stage: "tech_manager",
            approverRole: "admin",
            approverId: "TM-001",
            approverName: "Sara Al-Mutairi",
            approverEmail: "tech.manager@greenlablims.sa",
            approvedAt: "2024-01-17T18:00:00Z",
            comment: "Confirmed.",
          },
          qa: {
            stage: "qa",
            approverRole: "admin",
            approverId: "QA-001",
            approverName: "Mansour Al-Harbi",
            approverEmail: "qa@greenlablims.sa",
            approvedAt: NOW,
            comment: "Released.",
          },
        },
        reviewHistory: [
          {
            id: "rev-001-1",
            reviewerId: "LS-001",
            reviewerName: "Ahmed Al-Otaibi",
            reviewerRole: "lab_manager",
            reviewerEmail: "lab.supervisor@greenlablims.sa",
            decision: "approved",
            stage: "lab_supervisor",
            comment: "All within spec.",
            previousReviewStatus: "awaiting_lab_supervisor",
            newReviewStatus: "awaiting_tech_manager",
            createdAt: "2024-01-17T16:00:00Z",
          },
          {
            id: "rev-001-2",
            reviewerId: "TM-001",
            reviewerName: "Sara Al-Mutairi",
            reviewerRole: "admin",
            reviewerEmail: "tech.manager@greenlablims.sa",
            decision: "approved",
            stage: "tech_manager",
            comment: "Confirmed.",
            previousReviewStatus: "awaiting_tech_manager",
            newReviewStatus: "awaiting_qa",
            createdAt: "2024-01-17T18:00:00Z",
          },
          {
            id: "rev-001-3",
            reviewerId: "QA-001",
            reviewerName: "Mansour Al-Harbi",
            reviewerRole: "admin",
            reviewerEmail: "qa@greenlablims.sa",
            decision: "approved",
            stage: "qa",
            comment: "Released.",
            previousReviewStatus: "awaiting_qa",
            newReviewStatus: "qa_approved",
            createdAt: NOW,
          },
        ],
        createdAt: "2024-01-15T09:00:00Z",
        updatedAt: NOW,
      },
      {
        id: "T-002",
        sampleId: "SAM-2024-001",
        name: "Microbial Screening",
        category: "Microbiology",
        method: "ISO 4833-1",
        assignedTo: "A002",
        reviewStatus: "qa_approved",
        submittedAt: "2024-01-17T15:30:00Z",
        qaApprovedAt: NOW,
        parameters: [
          { id: "P-04", name: "Total Plate Count", value: "500", unit: "CFU/ml", min: null, max: 10000, mu: "±50", reference: "ISO 4833-1", status: "pass" },
          { id: "P-05", name: "Coliforms", value: "Negative", unit: "", min: null, max: null, mu: "—", reference: "ISO 7251", status: "pass" },
        ],
        approvals: {
          lab_supervisor: {
            stage: "lab_supervisor",
            approverRole: "lab_manager",
            approverId: "LS-001",
            approverName: "Ahmed Al-Otaibi",
            approverEmail: "lab.supervisor@greenlablims.sa",
            approvedAt: "2024-01-17T17:00:00Z",
          },
          tech_manager: {
            stage: "tech_manager",
            approverRole: "admin",
            approverId: "TM-001",
            approverName: "Sara Al-Mutairi",
            approverEmail: "tech.manager@greenlablims.sa",
            approvedAt: "2024-01-17T19:00:00Z",
          },
          qa: {
            stage: "qa",
            approverRole: "admin",
            approverId: "QA-001",
            approverName: "Mansour Al-Harbi",
            approverEmail: "qa@greenlablims.sa",
            approvedAt: NOW,
          },
        },
        reviewHistory: [],
        createdAt: "2024-01-15T09:00:00Z",
        updatedAt: NOW,
      },
    ],
  },
  {
    id: "SAM-2024-002",
    clientId: "C007",
    clientName: "SWCC - Saline Water",
    sampleType: "Water",
    description: "Desalinated Water Sample - Plant #3",
    status: "Testing",
    assignedAnalyst: "Tariq masum",
    receivedDate: "2024-01-16",
    completedDate: null,
    priority: "High",
    tests: [
      {
        id: "T-003",
        sampleId: "SAM-2024-002",
        name: "Physico-Chemical Water Test",
        category: "Chemical",
        method: "APHA 2320 B",
        assignedTo: "A002",
        reviewStatus: "in_progress",
        parameters: [
          { id: "P-06", name: "Turbidity", value: "0.2", unit: "NTU", min: 0, max: 1.0, mu: "±0.05", reference: "APHA 2130 B", status: "pass" },
          { id: "P-07", name: "TDS", value: "120", unit: "mg/L", min: 0, max: 500, mu: "±5", reference: "APHA 2540 C", status: "pass" },
          { id: "P-08", name: "Chloride", value: "", unit: "mg/L", min: 0, max: 250, mu: "±2", reference: "APHA 4500-Cl B", status: "pending" },
        ],
        approvals: { lab_supervisor: null, tech_manager: null, qa: null },
        reviewHistory: [],
        createdAt: "2024-01-16T09:00:00Z",
        updatedAt: "2024-01-16T09:00:00Z",
      },
    ],
  },
  {
    id: "SAM-2024-003",
    clientId: "C003",
    clientName: "Ajmal Perfumes",
    sampleType: "Perfume/Oud",
    description: "Oud Al-Layl Fragrance Batch #OL-089",
    status: "Review",
    assignedAnalyst: "Khaled",
    receivedDate: "2024-01-16",
    completedDate: null,
    priority: "Normal",
    tests: [
      {
        id: "T-004",
        sampleId: "SAM-2024-003",
        name: "Purity & Composition",
        category: "Instrumentation",
        method: "GC-MS Internal",
        assignedTo: "A003",
        reviewStatus: "awaiting_lab_supervisor",
        submittedAt: "2024-01-18T08:30:00Z",
        parameters: [
          { id: "P-09", name: "Ethanol %", value: "85", unit: "%", min: 80, max: 90, mu: "±0.5", reference: "GC-FID Internal", status: "pass" },
          { id: "P-10", name: "Water Content", value: "2.5", unit: "%", min: 0, max: 5.0, mu: "±0.1", reference: "Karl Fischer ASTM E1064", status: "pass" },
        ],
        approvals: { lab_supervisor: null, tech_manager: null, qa: null },
        reviewHistory: [],
        createdAt: "2024-01-16T09:00:00Z",
        updatedAt: "2024-01-18T08:30:00Z",
      },
    ],
  },
  {
    id: "SAM-2024-004",
    clientId: "C005",
    clientName: "Tabuk Pharmaceuticals",
    sampleType: "Pharmaceutical",
    description: "Amoxicillin 500mg Capsules",
    status: "Received",
    assignedAnalyst: null,
    receivedDate: "2024-01-17",
    completedDate: null,
    priority: "Urgent",
    tests: [
      {
        id: "T-005",
        sampleId: "SAM-2024-004",
        name: "Assay of Amoxicillin",
        category: "Pharmaceutical",
        method: "USP 42",
        assignedTo: "A004",
        reviewStatus: "awaiting_tech_manager",
        submittedAt: "2024-01-18T09:15:00Z",
        parameters: [
          { id: "P-11", name: "Active Ingredient", value: "498", unit: "mg", min: 475, max: 525, mu: "±5", reference: "USP 42 <621>", status: "pass" },
        ],
        approvals: {
          lab_supervisor: {
            stage: "lab_supervisor",
            approverRole: "lab_manager",
            approverId: "LS-001",
            approverName: "Ahmed Al-Otaibi",
            approverEmail: "lab.supervisor@greenlablims.sa",
            approvedAt: "2024-01-18T10:00:00Z",
            comment: "Verified.",
          },
          tech_manager: null,
          qa: null,
        },
        reviewHistory: [],
        createdAt: "2024-01-17T09:00:00Z",
        updatedAt: "2024-01-18T10:00:00Z",
      },
    ],
  },
  {
    id: "SAM-2024-005",
    clientId: "C002",
    clientName: "Saudi Aramco",
    sampleType: "Water",
    description: "Process Water - Ras Tanura Refinery",
    status: "Review",
    assignedAnalyst: "Nazmul Alam",
    receivedDate: "2024-01-14",
    completedDate: null,
    priority: "High",
    tests: [
      {
        id: "T-006",
        sampleId: "SAM-2024-005",
        name: "Chemical Oxygen Demand",
        category: "Chemical",
        method: "EPA 410.4",
        assignedTo: "A004",
        reviewStatus: "awaiting_lab_supervisor",
        submittedAt: "2024-01-18T07:45:00Z",
        parameters: [
          { id: "P-12", name: "COD", value: "45", unit: "mg/L", min: 0, max: 50, mu: "±2", reference: "APHA 5220 B", status: "pass" },
        ],
        approvals: { lab_supervisor: null, tech_manager: null, qa: null },
        reviewHistory: [],
        createdAt: "2024-01-14T09:00:00Z",
        updatedAt: "2024-01-18T07:45:00Z",
      },
    ],
  },
  {
    id: "SAM-2024-006",
    clientId: "C004",
    clientName: "SABIC",
    sampleType: "Chemical",
    description: "Polyethylene Resin Batch #PE-789",
    status: "Review",
    assignedAnalyst: "Shahjahan",
    receivedDate: "2024-01-15",
    completedDate: null,
    priority: "Normal",
    tests: [
      {
        id: "T-007",
        sampleId: "SAM-2024-006",
        name: "Melt Flow Index",
        category: "Chemical",
        method: "ASTM D1238",
        assignedTo: "A001",
        reviewStatus: "changes_requested",
        submittedAt: "2024-01-17T11:00:00Z",
        parameters: [
          { id: "P-13", name: "MFI", value: "0.45", unit: "g/10min", min: 0.5, max: 1.0, mu: "±0.02", reference: "ASTM D1238", status: "fail" },
          { id: "P-14", name: "Density", value: "0.952", unit: "g/cm³", min: 0.94, max: 0.96, mu: "±0.002", reference: "ASTM D792", status: "pass" },
        ],
        approvals: { lab_supervisor: null, tech_manager: null, qa: null },
        reviewHistory: [
          {
            id: "rev-007-1",
            reviewerId: "LS-001",
            reviewerName: "Ahmed Al-Otaibi",
            reviewerRole: "lab_manager",
            reviewerEmail: "lab.supervisor@greenlablims.sa",
            decision: "changes_requested",
            stage: "lab_supervisor",
            reason: "MFI value 0.45 is below the minimum 0.5 — please re-measure and confirm.",
            comment: "Re-run the test using the fresh calibration standard.",
            previousReviewStatus: "awaiting_lab_supervisor",
            newReviewStatus: "changes_requested",
            createdAt: "2024-01-17T13:00:00Z",
          },
        ],
        createdAt: "2024-01-15T09:00:00Z",
        updatedAt: "2024-01-17T13:00:00Z",
      },
    ],
  },
];

// =========================================================================
// Marketing Reports — derived view used by the Dashboard's Marketing
// Reports segment. Keeps MockSample unchanged; computes the four
// columns that aren't stored on the seed (delivery, due, days,
// progress) on demand.
// =========================================================================

export interface MarketingSampleRow {
  sample: MockSample;
  /** Same as receivedDate — surfaced separately to mirror the screenshot. */
  deliveryDate: string;
  /** receivedDate + priority-based SLA window. */
  dueDate: string;
  /** Signed calendar-day delta from today to dueDate (positive = late). */
  daysRemaining: number;
  /** 0..100 completion percentage. */
  progress: number;
  /** Flat list of parameter names performed, joined for the cell. */
  performedParameters: string;
}

/** SLA window per priority — mirrors common LIMS TAT contracts. */
const PRIORITY_DAYS: Record<MockSample["priority"], number> = {
  Urgent: 2,
  High: 5,
  Normal: 10,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Adds N whole days to an ISO yyyy-mm-dd string and returns the new ISO date. */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Computes the marketing-row view for a single sample. */
export function deriveMarketingRow(
  sample: MockSample,
  nowIso: string,
): MarketingSampleRow {
  const slaDays = PRIORITY_DAYS[sample.priority] ?? 10;
  const dueDate = addDays(sample.receivedDate, slaDays);
  const today = new Date(nowIso + "T00:00:00Z").getTime();
  const due = new Date(dueDate + "T00:00:00Z").getTime();
  const daysRemaining = Math.round((due - today) / MS_PER_DAY);

  // Progress = avg of per-test pass ratio over all parameters, fallback 100
  // for samples already completed (status "Approved") and 0 for the rest.
  let progress: number;
  if (sample.status === "Approved") {
    progress = 100;
  } else {
    const params = sample.tests.flatMap((t) => t.parameters);
    if (params.length === 0) {
      progress = 0;
    } else {
      const passed = params.filter((p) => p.status === "pass").length;
      progress = Math.round((passed / params.length) * 100);
    }
  }

  const performed = sample.tests
    .flatMap((t) => t.parameters.map((p) => p.name))
    .filter(Boolean);

  return {
    sample,
    deliveryDate: sample.receivedDate,
    dueDate,
    daysRemaining,
    progress,
    performedParameters: performed.join(", "),
  };
}

/** Convenience: derive rows for the full sample list. */
export function deriveMarketingRows(
  nowIso: string,
  samples: MockSample[] = mockSamples,
): MarketingSampleRow[] {
  return samples.map((s) => deriveMarketingRow(s, nowIso));
}