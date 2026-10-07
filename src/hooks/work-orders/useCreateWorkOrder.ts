// =========================================================================
// useCreateWorkOrder — create a work order in `client_requested` stage.
// =========================================================================

import { useCallback, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  workOrdersStore,
  notifyWorkOrdersChanged,
  nextWorkOrderId,
} from "@/mock-data/workOrderStore";
import type { WorkOrder } from "@/mock-data/workOrders";
import type { CreateWorkOrderInput, WorkOrderActor } from "./types";

let rowCounter = 100;
function nextRowId(): string {
  return `WOTR-${String(rowCounter++).padStart(3, "0")}`;
}

export function useCreateWorkOrder() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const create = useCallback(
    (input: CreateWorkOrderInput, actor?: WorkOrderActor): WorkOrder | null => {
      setError(null);

      // Source-of-truth role check: only receptionist / lab_manager / admin.
      const allowed = new Set(["receptionist", "lab_manager", "admin"]);
      if (!allowed.has(currentRole)) {
        setError(isRtl ? "غير مصرح" : "Not authorized");
        return null;
      }
      if (inFlight.current) return null;

      inFlight.current = true;
      try {
        const now = new Date().toISOString();
        const actorUserId = actor?.userId ?? "R-001";
        const actorUserName = actor?.userName ?? "CSR";
        const actorRole =
          actor?.role ?? (currentRole as WorkOrder["stageHistory"][number]["byUserRole"]);

        const newWorkOrder: WorkOrder = {
          id: nextWorkOrderId(),
          clientId: input.clientId,
          clientName: input.clientName ?? input.clientId,
          sampleType: input.sampleType,
          sampleName: input.sampleName,
          description: input.description,
          requestedBy: input.requestedBy,
          aofNumber: input.aofNumber,
          receivedVia: input.receivedVia,
          requestedAt: input.requestedAt,
          stage: "client_requested",
          stageHistory: [
            {
              stage: "client_requested",
              byUserId: actorUserId,
              byUserName: actorUserName,
              byUserRole: actorRole,
              at: now,
            },
          ],
          testRows: input.testRows.map((r) => ({
            ...r,
            id: nextRowId(),
          })),
          preparedByName: input.preparedByName,
          preparedByPosition: input.preparedByPosition,
          checkedByName: input.checkedByName,
          checkedByPosition: input.checkedByPosition,
        };

        workOrdersStore.push(newWorkOrder);
        notifyWorkOrdersChanged();
        return newWorkOrder;
      } finally {
        inFlight.current = false;
      }
    },
    [currentRole, isRtl],
  );

  return { create, error };
}