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