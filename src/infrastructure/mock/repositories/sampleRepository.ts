/**
 * In-memory `SampleRepository` adapter.
 *
 * Implements the port declared in `domain/sample/ports.ts` against the
 * mutable sample store that the approval hooks have used since before the
 * ports existed.
 *
 * WHY THE STORE MOVED NEXT DOOR: `store.ts` used to live at
 * `presentation/hooks/test-approvals/`, which made this adapter impossible to
 * write — infrastructure may not depend on presentation, and the layering
 * guard refused the import. The store is in-memory state with no React
 * dependency, so it belongs in infrastructure; it moved to
 * `sampleStore.ts` alongside this file and the 14 import sites were repointed.
 *
 * So the store stays where it is, and this adapter *wraps* it. That still buys
 * the thing the port exists for: every caller of `SampleRepository.list()`
 * depends on `domain/sample/ports.ts`, not on where the data happens to live.
 * When the HTTP adapter arrives in Phase 4, `container.samples` swaps and no
 * caller changes.
 *
 * What this adapter does NOT yet do: it does not replace the hooks. The
 * approval workflow mutates in place and reports changes via a tick counter,
 * which is a synchronous, React-subscribed concern rather than a promise-based
 * one. Bridging that to `Promise<Result<...>>` is Phase 3's remaining work;
 * this file establishes the seam first.
 */

import type { SampleRepository, SampleQuery } from "@/domain/sample/ports";
import type { Result } from "@/domain/shared/result";
import { Ok, Err, notFound } from "@/domain/shared/result";
import { paginate, normalisePaging } from "@/domain/shared/pagination";
import type { Page } from "@/domain/shared/pagination";
import type { Sample } from "@/domain/sample/model";

import { samplesStore, notifyStoreChanged } from "@/infrastructure/mock/repositories/sampleStore";
import { generateSampleId } from "@/shared/lib/sample-id";

/**
 * Case-insensitive substring match across the fields the samples list page
 * actually searches. Kept here (not in the page) so the HTTP adapter can
 * reproduce identical semantics against a server-side `q` parameter.
 */
function matchesSearch(sample: Sample, needle: string): boolean {
  const hay = `${sample.id} ${sample.clientName} ${sample.description}`.toLowerCase();
  return hay.includes(needle);
}

/**
 * Apply a `SampleQuery` to the full store. Exported so the samples list page
 * can use the *same* filter predicate for its client-side passes (exports,
 * status dropdown) without duplicating the rules.
 */
export function filterSamples(
  query: SampleQuery,
  source: readonly Sample[] = samplesStore,
): Sample[] {
  const needle = query.search?.trim().toLowerCase() ?? "";

  return source.filter((s) => {
    if (needle && !matchesSearch(s, needle)) return false;
    if (query.clientId && s.clientId !== query.clientId) return false;
    if (query.status && s.status !== query.status) return false;
    if (query.priority && s.priority !== query.priority) return false;
    if (query.assignedAnalyst && s.assignedAnalyst !== query.assignedAnalyst) return false;
    if (query.fromDate && s.receivedDate < query.fromDate) return false;
    if (query.toDate && s.receivedDate > query.toDate) return false;
    return true;
  });
}

export const mockSampleRepository: SampleRepository = {
  async list(query: SampleQuery = {}): Promise<Result<Page<Sample>>> {
    const matching = filterSamples(query);
    return Ok(paginate(matching, query));
  },

  async get(id: string): Promise<Result<Sample>> {
    const sample = samplesStore.find((s) => s.id === id);
    if (!sample) {
      return Err(notFound(`Sample ${id} not found`));
    }
    return Ok(sample);
  },

  async create(input: Omit<Sample, "id">): Promise<Result<{ id: string }>> {
    // ID minting lives here, not in the form. `generateSampleId` is pure and
    // derives the next serial by scanning the existing corpus, so it needs the
    // full set — which only the adapter holds. It is also the right layer: a
    // real HTTP backend assigns its own id, so keeping generation in the
    // presentation layer would be a mock-only concept leaking upward.
    const id = generateSampleId(input.sampleType, samplesStore);

    // `Omit<Sample, "id">` omits only `id`, so every other required field is
    // present by construction; no cast is needed.
    const sample: Sample = { ...input, id };
    samplesStore.push(sample);
    notifyStoreChanged();
    return Ok({ id });
  },

  async update(id: string, patch: Partial<Sample>): Promise<Result<Sample>> {
    const index = samplesStore.findIndex((s) => s.id === id);
    if (index === -1) {
      return Err(notFound(`Sample ${id} not found`));
    }
    const existing = samplesStore[index];
    // The store is mutated in place by design — `findSample` returns the live
    // object and callers (e.g. the samples detail page) hold references to it.
    // Replacing the array slot instead would break those references, so the
    // existing object is patched field-by-field and kept.
    Object.assign(existing, patch);
    notifyStoreChanged();
    return Ok(existing);
  },

  async remove(id: string): Promise<Result<void>> {
    const index = samplesStore.findIndex((s) => s.id === id);
    if (index === -1) {
      return Err(notFound(`Sample ${id} not found`));
    }
    samplesStore.splice(index, 1);
    notifyStoreChanged();
    return Ok(undefined as void);
  },
};

/** Convenience for callers that want the paging bounds without a full page. */
export { normalisePaging };