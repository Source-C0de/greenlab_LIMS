// =========================================================================
// testQueue — flattened queue entity for the approval page
// =========================================================================
// Backend ref: .backup_lib/api-spec/superadmin.openapi.yaml
//   GET /superadmin/tests/queue → Paginated<TestQueueItem>

import type { MockSample, Test, TestReviewStatus } from "./samples";
import { mockAnalysts } from "./analysts";
import { mockSamples } from "./samples";

export interface TestQueueItem {
  test: Test;
  sample: {
    id: string;
    clientName: string;
    sampleType: string;
    priority: string;
    status: string;
  };
  analyst: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * Walk every test in every mockSample and yield a flat TestQueueItem.
 * This is what the lab-manager approval page consumes.
 */
export function flattenMockTestQueue(filter?: {
  reviewStatus?: TestReviewStatus;
}): TestQueueItem[] {
  const items: TestQueueItem[] = [];

  for (const sample of mockSamples) {
    for (const test of sample.tests) {
      if (filter?.reviewStatus && test.reviewStatus !== filter.reviewStatus) continue;
      items.push({
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

  return items;
}

/**
 * Lookup analyst by id. Falls back to a stub if the id isn't in mockAnalysts
 * (some seed data uses analyst names instead of ids — tolerate that).
 */
export function lookupAnalyst(idOrName: string): TestQueueItem["analyst"] {
  const a = mockAnalysts.find(
    (x) => x.id === idOrName || x.name === idOrName || x.nameAr === idOrName,
  );
  if (a) {
    return { id: a.id, name: a.name, email: a.email };
  }
  // Stub for unknown analyst names — keeps the queue rendering useful even
  // for legacy data that uses names like "Tariq masum" instead of "A002".
  return { id: idOrName, name: idOrName, email: `${idOrName.toLowerCase().replace(/\s+/g, ".")}@greenlablims.sa` };
}

/**
 * Find a single test by id across all samples. Returns null if not found.
 */
export function findMockTest(testId: string): { test: Test; sample: MockSample } | null {
  for (const sample of mockSamples) {
    const t = sample.tests.find((x) => x.id === testId);
    if (t) return { test: t, sample };
  }
  return null;
}

/**
 * Flatten every test across every sample, regardless of status. Used by the
 * analyst "my submissions" page and by the bulk-action surfaces.
 */
export function flattenAllMockTests(): TestQueueItem[] {
  return flattenMockTestQueue();
}