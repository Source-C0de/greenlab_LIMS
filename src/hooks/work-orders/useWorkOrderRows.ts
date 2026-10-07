// =========================================================================
// useWorkOrderRows — add / update / delete test rows on a work order.
// =========================================================================

import { useCallback, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  workOrdersStore,
  notifyWorkOrdersChanged,
  findWorkOrder,
} from "@/mock-data/workOrderStore";
import type { WorkOrderTestRow } from "@/mock-data/workOrders";
import type {
  AddTestRowInput,
  UpdateTestRowInput,
  DeleteTestRowInput,
  WorkOrderRowDraft,
} from "./types";

const ALLOWED_ROLES = new Set(["receptionist", "lab_manager", "admin"]);

let rowCounter = 200;
function nextRowId(): string {
  return `WOTR-${String(rowCounter++).padStart(3, "0")}`;
}

export function useWorkOrderRows() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const addRow = useCallback(
    (input: AddTestRowInput): WorkOrderTestRow | null => {
      setError(null);
      if (!ALLOWED_ROLES.has(currentRole)) {
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
        const newRow: WorkOrderTestRow = { ...input.row, id: nextRowId() };
        const idx = workOrdersStore.findIndex((w) => w.id === input.workOrderId);
        if (idx === -1) return null;
        workOrdersStore[idx].testRows = [...workOrdersStore[idx].testRows, newRow];
        notifyWorkOrdersChanged();
        return newRow;
      } finally {
        inFlight.current = false;
      }
    },
    [currentRole, isRtl],
  );

  const updateRow = useCallback(
    (input: UpdateTestRowInput): WorkOrderTestRow | null => {
      setError(null);
      if (!ALLOWED_ROLES.has(currentRole)) {
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
        const idx = workOrdersStore.findIndex((w) => w.id === input.workOrderId);
        if (idx === -1) return null;
        let updated: WorkOrderTestRow | null = null;
        workOrdersStore[idx].testRows = workOrdersStore[idx].testRows.map(
          (r) => {
            if (r.id !== input.rowId) return r;
            updated = { ...input.row, id: r.id };
            return updated;
          },
        );
        if (!updated) return null;
        notifyWorkOrdersChanged();
        return updated;
      } finally {
        inFlight.current = false;
      }
    },
    [currentRole, isRtl],
  );

  const deleteRow = useCallback(
    (input: DeleteTestRowInput): boolean => {
      setError(null);
      if (!ALLOWED_ROLES.has(currentRole)) {
        setError(isRtl ? "غير مصرح" : "Not authorized");
        return false;
      }
      if (inFlight.current) return false;

      const wo = findWorkOrder(input.workOrderId);
      if (!wo) {
        setError(isRtl ? "أمر العمل غير موجود" : "Work order not found");
        return false;
      }

      inFlight.current = true;
      try {
        const idx = workOrdersStore.findIndex((w) => w.id === input.workOrderId);
        if (idx === -1) return false;
        const before = workOrdersStore[idx].testRows.length;
        workOrdersStore[idx].testRows = workOrdersStore[idx].testRows.filter(
          (r) => r.id !== input.rowId,
        );
        if (workOrdersStore[idx].testRows.length === before) return false;
        notifyWorkOrdersChanged();
        return true;
      } finally {
        inFlight.current = false;
      }
    },
    [currentRole, isRtl],
  );

  return { addRow, updateRow, deleteRow, error };
}

export type { WorkOrderRowDraft };