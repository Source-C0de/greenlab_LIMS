// =========================================================================
// Shared in-memory store for the work-order pipeline
// =========================================================================
// Mirrors src/hooks/test-approvals/store.ts — mutable deep-copy of the seed
// data, with pub/sub so any subscribed React component re-renders on change.
// No Zustand, no localStorage. Resets on full page reload.

import { mockWorkOrders } from "./workOrders";
import type { WorkOrder } from "./workOrders";

export const workOrdersStore: WorkOrder[] = mockWorkOrders.map((w) => ({
  ...w,
  stageHistory: [...w.stageHistory],
  testRows: w.testRows.map((r) => ({ ...r })),
}));

const listeners = new Set<() => void>();

export function subscribeWorkOrders(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyWorkOrdersChanged() {
  bumpTick();
  for (const fn of listeners) fn();
}

let workOrdersTick = 0;
export function getWorkOrdersSnapshot(): number {
  return workOrdersTick;
}
function bumpTick() {
  workOrdersTick += 1;
}

export function findWorkOrder(id: string): WorkOrder | null {
  return workOrdersStore.find((w) => w.id === id) ?? null;
}

/** Compute the next WO-NNN id given the current store. */
export function nextWorkOrderId(): string {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;
  const used = workOrdersStore
    .filter((w) => w.id.startsWith(prefix))
    .map((w) => parseInt(w.id.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/**
 * Pure — exported for testability.
 *
 * Deep-clone an existing work order into a new pending TE. The clone
 * preserves every field (client, sample, test rows, preparedBy/checkedBy
 * signatures) but resets:
 *   - id          → fresh `WO-YYYY-NNNN` via `nextWorkOrderId()`
 *   - stage       → `te_pending`
 *   - requestedAt → now
 *   - stageHistory → single entry recording the duplication
 *   - rejectionReason → removed (stale from a prior rejection)
 *
 * The clone is **not** pushed onto the store and no notification is fired
 * here; callers are responsible for `workOrdersStore.push(clone)` and
 * `notifyWorkOrdersChanged()`.
 */
export function cloneWorkOrder(sourceId: string): WorkOrder | null {
  const source = findWorkOrder(sourceId);
  if (!source) return null;

  const cloned: WorkOrder = structuredClone(source);
  const now = new Date().toISOString();
  cloned.id = nextWorkOrderId();
  cloned.stage = "te_pending";
  cloned.requestedAt = now;
  cloned.stageHistory = [
    {
      stage: "te_pending",
      byUserId: "current-user",
      byUserName: "current-user",
      byUserRole: "lab_manager",
      at: now,
      note: `Duplicated from ${source.id}`,
    },
  ];
  delete cloned.rejectionReason;
  return cloned;
}

export function resetWorkOrdersStore() {
  workOrdersStore.length = 0;
  workOrdersStore.push(
    ...mockWorkOrders.map((w) => ({
      ...w,
      stageHistory: [...w.stageHistory],
      testRows: w.testRows.map((r) => ({ ...r })),
    })),
  );
  notifyWorkOrdersChanged();
}