// =========================================================================
// useDuplicateWorkOrder — clone an existing work order (in any stage) into
// a fresh TE in `te_pending` stage. Mirrors useReissueSample's structure:
// role guard, in-flight ref, structuredClone via cloneWorkOrder, push to
// the workOrdersStore, then notify subscribers.
// =========================================================================

import { useCallback, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  workOrdersStore,
  notifyWorkOrdersChanged,
  cloneWorkOrder,
} from "@/mock-data/workOrderStore";

const ALLOWED_ROLES = new Set(["admin", "lab_manager"]);

export interface DuplicateWorkOrderResult {
  newId: string;
}

export function useDuplicateWorkOrder() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const duplicate = useCallback(
    (sourceId: string): DuplicateWorkOrderResult | null => {
      setError(null);

      if (!ALLOWED_ROLES.has(currentRole)) {
        setError(isRtl ? "غير مصرح" : "Not authorized");
        return null;
      }
      // Guard against double-click races.
      if (inFlight.current) return null;

      const cloned = cloneWorkOrder(sourceId);
      if (!cloned) {
        setError(isRtl ? "التقييم غير موجود" : "Work order not found");
        return null;
      }

      inFlight.current = true;
      try {
        workOrdersStore.push(cloned);
        notifyWorkOrdersChanged();
        return { newId: cloned.id };
      } finally {
        inFlight.current = false;
      }
    },
    [currentRole, isRtl],
  );

  return { duplicate, error };
}
