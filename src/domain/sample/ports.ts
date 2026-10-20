/**
 * Sample repository port.
 *
 * The `Page<T>` shape (see `domain/shared/pagination.ts`) deliberately is the
 * return type of every `list` method, NOT a bare `Sample[]`. Two adapters —
 * `infrastructure/mock/repositories/sampleRepository.ts` (in-memory) and
 * `infrastructure/api/repositories/sampleRepository.ts` (HTTP) — both
 * implement this interface. The presentation layer depends only on the port,
 * so a future backend swap is a single container swap (Phase 4).
 */
import type { PageRequest, Page } from "@/domain/shared/pagination";
import type { Result } from "@/domain/shared/result";
import type { Sample } from "./model";

export interface SampleQuery extends PageRequest {
  readonly search?: string;
  readonly clientId?: string;
  readonly status?: string;
  readonly priority?: string;
  readonly assignedAnalyst?: string;
  /** Inclusive lower bound for `receivedDate` (YYYY-MM-DD). */
  readonly fromDate?: string;
  /** Inclusive upper bound for `receivedDate` (YYYY-MM-DD). */
  readonly toDate?: string;
}

export interface SampleRepository {
  list(query?: SampleQuery): Promise<Result<Page<Sample>>>;
  get(id: string): Promise<Result<Sample>>;
  /** Returns the new id. Used by the sample-registration form. */
  create(input: Omit<Sample, "id">): Promise<Result<{ id: string }>>;
  update(id: string, patch: Partial<Sample>): Promise<Result<Sample>>;
  remove(id: string): Promise<Result<void>>;
}