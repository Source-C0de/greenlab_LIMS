// =========================================================================
// useApprovalQueue — paginated, filterable queue of tests awaiting review
// across any of the three approval stages.
// =========================================================================

import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import { samplesStore, getStoreSnapshot, subscribe } from "./store";
import { lookupAnalyst } from "@/mock-data/testQueue";
import type { ListTestsQuery, PaginatedTests } from "./types";
import type { TestQueueItem } from "@/mock-data/testQueue";

const AWAITING_STATUSES = new Set([
  "awaiting_lab_supervisor",
  "awaiting_tech_manager",
  "awaiting_qa",
]);

export function useApprovalQueue(query: ListTestsQuery = {}): PaginatedTests {
  useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);

  const result = useMemo(() => {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? "submittedAt";
    const sortOrder = query.sortOrder ?? "asc";
    const statusFilter = query.status && query.status.length > 0 ? new Set(query.status) : null;

    const all: TestQueueItem[] = [];
    for (const sample of samplesStore) {
      for (const test of sample.tests) {
        // Default queue = anything in the 3-stage pipeline.
        const matchesStatus = statusFilter
          ? statusFilter.has(test.reviewStatus as never)
          : AWAITING_STATUSES.has(test.reviewStatus);
        if (!matchesStatus) continue;
        if (query.sampleId && sample.id !== query.sampleId) continue;
        if (query.sampleType && sample.sampleType !== query.sampleType) continue;
        if (query.priority && sample.priority !== query.priority) continue;
        if (query.assignedTo && test.assignedTo !== query.assignedTo) continue;
        if (query.submittedFrom && (test.submittedAt ?? "") < query.submittedFrom) continue;
        if (query.submittedTo && (test.submittedAt ?? "") > query.submittedTo) continue;

        all.push({
          test,
          sample: {
            id: sample.id,
            clientName: sample.clientName,
            sampleType: sample.sampleType,
            priority: sample.priority,
            status: sample.status,
          },
          analyst: test.assignedTo ? lookupAnalyst(test.assignedTo) : null,
        });
      }
    }

    all.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "submittedAt") {
        cmp = (a.test.submittedAt ?? "").localeCompare(b.test.submittedAt ?? "");
      } else if (sortBy === "priority") {
        const rank = (p: string) => (p === "Urgent" ? 3 : p === "High" ? 2 : 1);
        cmp = rank(a.sample.priority) - rank(b.sample.priority);
      } else if (sortBy === "sampleId") {
        cmp = a.sample.id.localeCompare(b.sample.id);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const data = all.slice(start, start + pageSize);

    return {
      data,
      pagination: { page, pageSize, total, totalPages },
    };
  }, [
    query.page,
    query.pageSize,
    query.sampleId,
    query.sampleType,
    query.priority,
    query.assignedTo,
    query.submittedFrom,
    query.submittedTo,
    query.sortBy,
    query.sortOrder,
    query.status?.join("|"),
    getStoreSnapshot(),
  ]);

  return result;
}
