// =========================================================================
// useAddTestsFromCatalog — append TestMaster rows to a work order.
// =========================================================================
// This hook appends: rows whose testRequired matches an existing row are
// skipped (treated as duplicates); new TestMasters become new
// WorkOrderTestRow entries via testMasterToRow().
//
// Used on the Technical Evaluation detail page, where the lab_manager adds
// the tests required for the request. Tests are authored in TE — the CSR
// creates the request without any.

import { useCallback, useState } from "react";
import { useAppContext } from "@/presentation/providers/AppContext";
import {
  workOrdersStore,
  findWorkOrder,
  notifyWorkOrdersChanged,
} from "@/infrastructure/mock/data/workOrderStore";
import type { WorkOrderTestRow } from "@/infrastructure/mock/data/workOrders";
import type { TestMaster } from "@/infrastructure/mock/data/specifications";

const ALLOWED_ROLES = new Set(["receptionist", "lab_manager", "admin"]);

let rowCounter = 400;
function nextRowId(): string {
  return `WOTR-${String(rowCounter++).padStart(3, "0")}`;
}

/** Convert one TestMaster into one WorkOrderTestRow. */
export function testMasterToRow(m: TestMaster): WorkOrderTestRow {
  return {
    id: nextRowId(),
    testRequired: m.testName,
    techniqueInstrument: m.methodType,
    status: "Applicable",
    reference: m.methodReference,
    numberOfSamples: "Not specified",
    column: "Not needed",
    std: "Not needed",
    chemicalReagent: m.warehouseItems ?? "Not needed",
    timeFrame: "1 days",
  };
}

export interface AddFromCatalogResult {
  ok: boolean;
  addedCount: number;
  skippedCount: number;
  addedIds: string[];
  skippedNames: string[];
}

export function useAddTestsFromCatalog() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [error, setError] = useState<string | null>(null);

  const addFromCatalog = useCallback(
    (workOrderId: string, picked: TestMaster[]): AddFromCatalogResult => {
      setError(null);
      if (!ALLOWED_ROLES.has(currentRole)) {
        setError(isRtl ? "غير مصرح" : "Not authorized");
        return {
          ok: false,
          addedCount: 0,
          skippedCount: 0,
          addedIds: [],
          skippedNames: [],
        };
      }

      const idx = workOrdersStore.findIndex((w) => w.id === workOrderId);
      if (idx === -1) {
        setError(isRtl ? "أمر العمل غير موجود" : "Work order not found");
        return {
          ok: false,
          addedCount: 0,
          skippedCount: 0,
          addedIds: [],
          skippedNames: [],
        };
      }

      const wo = findWorkOrder(workOrderId);
      if (!wo) {
        setError(isRtl ? "أمر العمل غير موجود" : "Work order not found");
        return {
          ok: false,
          addedCount: 0,
          skippedCount: 0,
          addedIds: [],
          skippedNames: [],
        };
      }

      const existingNames = new Set(wo.testRows.map((r) => r.testRequired));
      const addedIds: string[] = [];
      const skippedNames: string[] = [];
      const newRows = [];

      for (const m of picked) {
        if (existingNames.has(m.testName)) {
          skippedNames.push(m.testName);
          continue;
        }
        const row = testMasterToRow(m);
        newRows.push(row);
        addedIds.push(row.id);
        existingNames.add(m.testName); // guard against dupes inside the same batch
      }

      if (newRows.length > 0) {
        workOrdersStore[idx].testRows = [...wo.testRows, ...newRows];
        notifyWorkOrdersChanged();
      }

      return {
        ok: true,
        addedCount: newRows.length,
        skippedCount: skippedNames.length,
        addedIds,
        skippedNames,
      };
    },
    [currentRole, isRtl],
  );

  return { addFromCatalog, error };
}