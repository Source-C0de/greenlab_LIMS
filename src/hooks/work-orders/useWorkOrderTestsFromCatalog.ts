// =========================================================================
// useWorkOrderTestsFromCatalog — derive WorkOrderTestRow[] from the test
// catalog (TestMaster records) and persist them onto a work order.
// =========================================================================
// The Client Request pipeline is now catalog-driven: when a user picks one
// or more tests from the technical-specification catalog (filtered by sample
// type), each picked TestMaster becomes exactly one WorkOrderTestRow on the
// work order. The 9 fields on a WorkOrderTestRow are populated from the
// TestMaster so that:
//   - testRequired     <- testName
//   - techniqueInstrument <- methodType
//   - status           <- "Applicable"
//   - reference        <- methodReference
//   - numberOfSamples  <- (sampleType hint; defaults to "Not specified")
//   - column           <- "Not needed"
//   - std              <- "Not needed"
//   - chemicalReagent  <- warehouseItems (if provided)
//   - timeFrame        <- "1 days"
//
// "Hard sync" semantics: saving a selection replaces the work order's full
// testRows array with the freshly derived rows.

import { useCallback, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { workOrdersStore, findWorkOrder, notifyWorkOrdersChanged } from "@/mock-data/workOrderStore";
import type { WorkOrderTestRow } from "@/mock-data/workOrders";
import type { TestMaster } from "@/mock-data/specifications";

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

interface SyncResult {
  ok: boolean;
  added: number;
  rows: WorkOrderTestRow[];
}

export function useWorkOrderTestsFromCatalog() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [error, setError] = useState<string | null>(null);

  const syncFromCatalog = useCallback(
    (workOrderId: string, picked: TestMaster[]): SyncResult => {
      setError(null);
      if (!ALLOWED_ROLES.has(currentRole)) {
        setError(isRtl ? "غير مصرح" : "Not authorized");
        return { ok: false, added: 0, rows: [] };
      }

      const wo = findWorkOrder(workOrderId);
      if (!wo) {
        setError(isRtl ? "أمر العمل غير موجود" : "Work order not found");
        return { ok: false, added: 0, rows: [] };
      }

      const idx = workOrdersStore.findIndex((w) => w.id === workOrderId);
      if (idx === -1) return { ok: false, added: 0, rows: [] };

      const rows = picked.map(testMasterToRow);
      const before = workOrdersStore[idx].testRows.length;
      workOrdersStore[idx].testRows = rows;
      notifyWorkOrdersChanged();
      return { ok: true, added: rows.length - before, rows };
    },
    [currentRole, isRtl],
  );

  return { syncFromCatalog, error };
}