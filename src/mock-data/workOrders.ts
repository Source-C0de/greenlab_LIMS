// =========================================================================
// Pre-sample pipeline work orders
// =========================================================================
// A workOrder is the parent entity that flows through the 5-stage pipeline:
//   client_requested -> csr_drafting -> te_pending -> te_approved
//   -> quotation_drafting -> sales_order_pending -> sales_order_confirmed
//   -> ready_for_receiving
// When `ready_for_receiving`, the user is sent to /samples/receiving with the
// work order's client/sample info pre-populated.

export type WorkOrderStage =
  | "client_requested"
  | "csr_drafting"
  | "te_pending"
  | "te_approved"
  | "te_rejected"
  | "quotation_drafting"
  | "sales_order_pending"
  | "sales_order_confirmed"
  | "ready_for_receiving";

export type WorkOrderRole =
  | "admin"
  | "lab_manager"
  | "receptionist"
  | "analyst"
  | "qa";

export interface WorkOrderTestRow {
  id: string;
  testRequired: string;
  techniqueInstrument: string;
  status: "Applicable" | "Not Applicable" | "Applicable (need samples)" | "Outsource";
  reference: string;
  numberOfSamples: string;
  column: string;
  std: string;
  chemicalReagent: string;
  timeFrame: string;
}

export interface WorkOrderStageEntry {
  stage: WorkOrderStage;
  byUserId: string;
  byUserName: string;
  byUserRole: WorkOrderRole;
  at: string;
  note?: string;
}

export interface WorkOrder {
  id: string;
  clientId: string;
  clientName: string;
  sampleType: string;
  sampleName: string;
  description: string;
  requestedBy: string;
  aofNumber: string;
  receivedVia: "Email" | "Phone" | "In-Person" | "Portal";
  requestedAt: string;
  stage: WorkOrderStage;
  stageHistory: WorkOrderStageEntry[];
  testRows: WorkOrderTestRow[];
  preparedByName: string;
  preparedByPosition: string;
  checkedByName: string;
  checkedByPosition: string;
  rejectionReason?: string;
}

export const mockWorkOrders: WorkOrder[] = [
  {
    id: "WO-2026-0001",
    clientId: "C005",
    clientName: "Abdullah Alzahran",
    sampleType: "Food",
    sampleName: "Chocolate",
    description: "Full nutritional analysis for chocolate sample received via email.",
    requestedBy: "Abdullah Alzahran",
    aofNumber: "NA",
    receivedVia: "Email",
    requestedAt: "2026-09-02",
    stage: "te_pending",
    stageHistory: [
      {
        stage: "client_requested",
        byUserId: "R-001",
        byUserName: "Waseem Dad Khan",
        byUserRole: "receptionist",
        at: "2026-09-02T08:30:00Z",
      },
      {
        stage: "csr_drafting",
        byUserId: "R-001",
        byUserName: "Waseem Dad Khan",
        byUserRole: "receptionist",
        at: "2026-09-02T09:15:00Z",
      },
      {
        stage: "te_pending",
        byUserId: "R-001",
        byUserName: "Waseem Dad Khan",
        byUserRole: "receptionist",
        at: "2026-09-02T11:00:00Z",
      },
    ],
    testRows: [
      {
        id: "WOTR-001",
        testRequired: "Moisture",
        techniqueInstrument: "Hot oven / Moisture Analyzer",
        status: "Applicable",
        reference: "GSO 1322:2002",
        numberOfSamples: "5 gm",
        column: "Not needed",
        std: "Not needed",
        chemicalReagent: "Not needed",
        timeFrame: "1 days",
      },
      {
        id: "WOTR-002",
        testRequired: "Total Fat",
        techniqueInstrument: "Soxhlet Extraction",
        status: "Applicable (2 samples per day)",
        reference: "GSO 1322:2002",
        numberOfSamples: "50 gm",
        column: "Not needed",
        std: "Not needed",
        chemicalReagent: "Not needed",
        timeFrame: "1 days",
      },
      {
        id: "WOTR-003",
        testRequired: "Sugar (Sucrose)",
        techniqueInstrument: "Polarimeter",
        status: "Applicable",
        reference: "GSO 1322:2002",
        numberOfSamples: "5 gm",
        column: "Not needed",
        std: "Not needed",
        chemicalReagent: "Not needed",
        timeFrame: "1 days",
      },
      {
        id: "WOTR-004",
        testRequired: "Total Ash",
        techniqueInstrument: "Muffle Furnace",
        status: "Applicable",
        reference: "GSO 1322:2002",
        numberOfSamples: "10 gm",
        column: "Not needed",
        std: "Not needed",
        chemicalReagent: "Not needed",
        timeFrame: "1 days",
      },
      {
        id: "WOTR-005",
        testRequired: "Milk Protein",
        techniqueInstrument: "Kjeldahl apparatus",
        status: "Not Applicable",
        reference: "GSO 1322:2002",
        numberOfSamples: "50 gm",
        column: "NA",
        std: "Not needed",
        chemicalReagent: "1.Sodium oxalate 2.Tannic acid",
        timeFrame: "1 days",
      },
      {
        id: "WOTR-006",
        testRequired: "Cocoa Butter",
        techniqueInstrument: "1.Knorr filter rube 2.Bell jar",
        status: "Not Applicable",
        reference: "GSO 1322:2002",
        numberOfSamples: "50 gm",
        column: "Not needed",
        std: "Not needed",
        chemicalReagent: "Not needed",
        timeFrame: "1 days",
      },
      {
        id: "WOTR-007",
        testRequired: "Fat-Free Cocoa Solids",
        techniqueInstrument: "Electric air-oven",
        status: "Applicable (need some requirements)",
        reference: "GSO 1322:2002",
        numberOfSamples: "50 gm",
        column: "Not needed",
        std: "Not needed",
        chemicalReagent: "Sodium oxalate",
        timeFrame: "1 days",
      },
    ],
    preparedByName: "Mohammad Nazmul Alam",
    preparedByPosition: "QC supervisor",
    checkedByName: "Dr. Shymaa Ali",
    checkedByPosition: "CHEM. LM",
  },
  {
    id: "WO-2026-0002",
    clientId: "C002",
    clientName: "Al-Faiha Water",
    sampleType: "Water",
    sampleName: "Drinking Water Batch #2",
    description: "Routine quarterly microbiological screen.",
    requestedBy: "Al-Faiha Water QA",
    aofNumber: "AOF-2026-0228",
    receivedVia: "Email",
    requestedAt: "2026-09-20",
    stage: "csr_drafting",
    stageHistory: [
      {
        stage: "client_requested",
        byUserId: "R-001",
        byUserName: "Waseem Dad Khan",
        byUserRole: "receptionist",
        at: "2026-09-20T10:00:00Z",
      },
      {
        stage: "csr_drafting",
        byUserId: "R-001",
        byUserName: "Waseem Dad Khan",
        byUserRole: "receptionist",
        at: "2026-09-20T10:30:00Z",
      },
    ],
    testRows: [
      {
        id: "WOTR-008",
        testRequired: "E.coli",
        techniqueInstrument: "Membrane Filtration",
        status: "Applicable",
        reference: "Standard Methods 9222B",
        numberOfSamples: "100 ml",
        column: "Not needed",
        std: "Not needed",
        chemicalReagent: "m-Endo Agar",
        timeFrame: "2 days",
      },
      {
        id: "WOTR-009",
        testRequired: "Total Coliforms",
        techniqueInstrument: "Membrane Filtration",
        status: "Applicable",
        reference: "Standard Methods 9222B",
        numberOfSamples: "100 ml",
        column: "Not needed",
        std: "Not needed",
        chemicalReagent: "m-Endo Agar",
        timeFrame: "2 days",
      },
    ],
    preparedByName: "Waseem Dad Khan",
    preparedByPosition: "CSR",
    checkedByName: "Dr. Shymaa Ali",
    checkedByPosition: "CHEM. LM",
  },
  {
    id: "WO-2026-0003",
    clientId: "C003",
    clientName: "Al-Razi Pharma",
    sampleType: "Pharmaceutical",
    sampleName: "Metformin Tablet 500mg",
    description: "Stability study — 6 month time-point.",
    requestedBy: "Al-Razi Pharma R&D",
    aofNumber: "AOF-2026-0301",
    receivedVia: "Email",
    requestedAt: "2026-09-25",
    stage: "client_requested",
    stageHistory: [
      {
        stage: "client_requested",
        byUserId: "R-001",
        byUserName: "Waseem Dad Khan",
        byUserRole: "receptionist",
        at: "2026-09-25T09:00:00Z",
      },
    ],
    testRows: [],
    preparedByName: "Waseem Dad Khan",
    preparedByPosition: "CSR",
    checkedByName: "Dr. Shymaa Ali",
    checkedByPosition: "CHEM. LM",
  },
];