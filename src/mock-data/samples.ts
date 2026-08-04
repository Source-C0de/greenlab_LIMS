// =========================================================================
// Test approval workflow — typed interfaces + status pipeline
// =========================================================================
// Backend ref: .backup_lib/api-spec/superadmin.openapi.yaml (section K)

export type TestReviewStatus =
  | "pending"
  | "in_progress"
  | "submitted_for_review"
  | "approved"
  | "changes_requested";

export type ParameterStatus = "pending" | "pass" | "fail";
export type ReviewDecision = "approved" | "changes_requested";

export interface ParameterValue {
  id: string;
  name: string;
  value: string;
  unit: string;
  min: number | null;
  max: number | null;
  target?: number;
  limitType?: string;
  status: ParameterStatus;
  note?: string;
}

export interface TestReviewEntry {
  id: string;
  reviewerId: string;
  reviewerEmail: string;
  decision: ReviewDecision;
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
  submittedAt?: string;
  approvedAt?: string;
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
// Seed data — every test now carries the typed reviewStatus + history
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
        reviewStatus: "approved",
        submittedAt: "2024-01-17T14:00:00Z",
        approvedAt: "2024-01-18T10:00:00Z",
        parameters: [
          { id: "P-01", name: "pH", value: "6.7", unit: "", min: 6.5, max: 6.8, status: "pass" },
          { id: "P-02", name: "Fat Content", value: "3.2", unit: "%", min: 3.0, max: 3.5, status: "pass" },
          { id: "P-03", name: "Solid Non-Fat", value: "8.6", unit: "%", min: 8.5, max: 9.0, status: "pass" },
        ],
        reviewHistory: [
          {
            id: "rev-001-1",
            reviewerId: "LM-001",
            reviewerEmail: "manager@greenlablims.sa",
            decision: "approved",
            comment: "All within spec.",
            previousReviewStatus: "submitted_for_review",
            newReviewStatus: "approved",
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
        reviewStatus: "approved",
        submittedAt: "2024-01-17T15:30:00Z",
        approvedAt: "2024-01-18T10:00:00Z",
        parameters: [
          { id: "P-04", name: "Total Plate Count", value: "500", unit: "CFU/ml", min: null, max: 10000, status: "pass" },
          { id: "P-05", name: "Coliforms", value: "Negative", unit: "", min: null, max: null, status: "pass" },
        ],
        reviewHistory: [
          {
            id: "rev-002-1",
            reviewerId: "LM-001",
            reviewerEmail: "manager@greenlablims.sa",
            decision: "approved",
            previousReviewStatus: "submitted_for_review",
            newReviewStatus: "approved",
            createdAt: NOW,
          },
        ],
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
          { id: "P-06", name: "Turbidity", value: "0.2", unit: "NTU", min: 0, max: 1.0, status: "pass" },
          { id: "P-07", name: "TDS", value: "120", unit: "mg/L", min: 0, max: 500, status: "pass" },
          { id: "P-08", name: "Chloride", value: "", unit: "mg/L", min: 0, max: 250, status: "pending" },
        ],
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
        reviewStatus: "submitted_for_review",
        submittedAt: "2024-01-18T08:30:00Z",
        parameters: [
          { id: "P-09", name: "Ethanol %", value: "85", unit: "%", min: 80, max: 90, status: "pass" },
          { id: "P-10", name: "Water Content", value: "2.5", unit: "%", min: 0, max: 5.0, status: "pass" },
        ],
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
        reviewStatus: "submitted_for_review",
        submittedAt: "2024-01-18T09:15:00Z",
        parameters: [
          { id: "P-11", name: "Active Ingredient", value: "498", unit: "mg", min: 475, max: 525, status: "pass" },
        ],
        reviewHistory: [],
        createdAt: "2024-01-17T09:00:00Z",
        updatedAt: "2024-01-18T09:15:00Z",
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
        reviewStatus: "submitted_for_review",
        submittedAt: "2024-01-18T07:45:00Z",
        parameters: [
          { id: "P-12", name: "COD", value: "45", unit: "mg/L", min: 0, max: 50, status: "pass" },
        ],
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
          { id: "P-13", name: "MFI", value: "0.45", unit: "g/10min", min: 0.5, max: 1.0, status: "fail" },
          { id: "P-14", name: "Density", value: "0.952", unit: "g/cm³", min: 0.94, max: 0.96, status: "pass" },
        ],
        reviewHistory: [
          {
            id: "rev-007-1",
            reviewerId: "LM-001",
            reviewerEmail: "manager@greenlablims.sa",
            decision: "changes_requested",
            reason: "MFI value 0.45 is below the minimum 0.5 — please re-measure and confirm.",
            comment: "Re-run the test using the fresh calibration standard.",
            previousReviewStatus: "submitted_for_review",
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