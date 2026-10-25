// =========================================================================
// Work-order pipeline hook types
// =========================================================================

import type {
  WorkOrder,
  WorkOrderStage,
  WorkOrderTestRow,
  WorkOrderRole,
  WorkOrderAttachment,
} from "@/infrastructure/mock/data/workOrders";

export interface CreateWorkOrderInput {
  clientId: string;
  /** Optional display name; `useCreateWorkOrder` falls back to `clientId`. */
  clientName?: string;
  sampleType: string;
  sampleName: string;
  description: string;
  requestedBy: string;
  aofNumber: string;
  receivedVia: "Email" | "Phone" | "In-Person" | "Portal";
  requestedAt: string;
  testRows: Omit<WorkOrderTestRow, "id">[];
  /**
   * Files attached to the request. Metadata only — the mock app never reads
   * or stores file contents. `id` and `addedAt` are assigned on save.
   */
  attachments?: Omit<WorkOrderAttachment, "id" | "addedAt">[];
  preparedByName: string;
  preparedByPosition: string;
  checkedByName: string;
  checkedByPosition: string;
}

export interface AdvanceWorkOrderInput {
  workOrderId: string;
  toStage: WorkOrderStage;
  note?: string;
  rejectionReason?: string;
}

export interface WorkOrderRowDraft {
  testRequired: string;
  techniqueInstrument: string;
  status: WorkOrderTestRow["status"];
  reference: string;
  numberOfSamples: string;
  column: string;
  std: string;
  chemicalReagent: string;
  timeFrame: string;
}

export interface AddTestRowInput {
  workOrderId: string;
  row: WorkOrderRowDraft;
}

export interface UpdateTestRowInput {
  workOrderId: string;
  rowId: string;
  row: WorkOrderRowDraft;
}

export interface DeleteTestRowInput {
  workOrderId: string;
  rowId: string;
}

export interface WorkOrderActor {
  userId: string;
  userName: string;
  role: WorkOrderRole;
}

export type { WorkOrder, WorkOrderStage, WorkOrderTestRow, WorkOrderRole };