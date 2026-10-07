// =========================================================================
// useAdvanceWorkOrder — move a work order to its next pipeline stage.
// =========================================================================

import { useCallback, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  workOrdersStore,
  notifyWorkOrdersChanged,
  findWorkOrder,
} from "@/mock-data/workOrderStore";
import type {
  WorkOrder,
  WorkOrderStage,
} from "@/mock-data/workOrders";
import type { AdvanceWorkOrderInput, WorkOrderActor } from "./types";

/** Roles allowed to advance a work order at any stage. */
const ALLOWED_ROLES = new Set(["receptionist", "lab_manager", "admin"]);

/** Stages that ONLY lab_manager / admin can transition into. */
const TE_STAGES = new Set<WorkOrderStage>(["te_approved", "te_rejected"]);

export function useAdvanceWorkOrder() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const advance = useCallback(
    (
      input: AdvanceWorkOrderInput,
      actor?: WorkOrderActor,
    ): WorkOrder | null => {
      setError(null);

      if (!ALLOWED_ROLES.has(currentRole)) {
        setError(isRtl ? "غير مصرح" : "Not authorized");
        return null;
      }
      // TE-only transitions must be done by lab_manager / admin.
      if (TE_STAGES.has(input.toStage) && currentRole === "receptionist") {
        setError(isRtl ? "غير مصرح" : "Not authorized");
        return null;
      }
      if (inFlight.current) return null;

      const wo = findWorkOrder(input.workOrderId);
      if (!wo) {
        setError(isRtl ? "أمر العمل غير موجود" : "Work order not found");
        return null;
      }

      inFlight.current = true;
      try {
        const now = new Date().toISOString();
        const actorUserId = actor?.userId ?? "R-001";
        const actorUserName = actor?.userName ?? "Actor";
        const actorRole =
          actor?.role ?? (currentRole as WorkOrder["stageHistory"][number]["byUserRole"]);

        // Locate the work order reference inside the store array (findWorkOrder
        // returned the same object, so this is just to satisfy TS).
        const idx = workOrdersStore.findIndex((w) => w.id === input.workOrderId);
        if (idx === -1) return null;
        const target = workOrdersStore[idx];

        target.stage = input.toStage;
        target.stageHistory = [
          ...target.stageHistory,
          {
            stage: input.toStage,
            byUserId: actorUserId,
            byUserName: actorUserName,
            byUserRole: actorRole,
            at: now,
            note: input.note,
          },
        ];
        if (input.toStage === "te_rejected" && input.rejectionReason) {
          target.rejectionReason = input.rejectionReason;
        }
        if (input.toStage === "te_approved") {
          target.rejectionReason = undefined;
        }

        notifyWorkOrdersChanged();
        return target;
      } finally {
        inFlight.current = false;
      }
    },
    [currentRole, isRtl],
  );

  return { advance, error };
}