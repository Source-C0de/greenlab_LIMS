// =========================================================================
// useAddTestsFromCatalog — append TestMaster rows to a work order.
// =========================================================================
// Different from useWorkOrderTestsFromCatalog.syncFromCatalog (which does a
// hard replace). This hook appends: rows whose testRequired matches an
// existing row are skipped (treated as duplicates); new TestMasters become
// new WorkOrderTestRow entries via testMasterToRow().
//
// Used on the Technical Evaluation detail page, where the lab_manager wants
// to add a test the CSR didn't pick from the catalog.

import { useCallback, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  workOrdersStore,
  findWorkOrder,
  notifyWorkOrdersChanged,
} from "@/mock-data/workOrderStore";
import type { TestMaster } from "@/mock-data/specifications";
import { testMasterToRow } from "./useWorkOrderTestsFromCatalog";

const ALLOWED_ROLES = new Set(["receptionist", "lab_manager", "admin"]);

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