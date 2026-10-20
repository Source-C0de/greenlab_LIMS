import type { PageRequest, Page } from "@/domain/shared/pagination";
import type { Result } from "@/domain/shared/result";
import type { TestParameter, TestParameterDraft, TestParameterUpdate } from "./model";

/**
 * NOTE: `TestParameterQuery` is intentionally camelCase (`sopCode`,
 * `isActive`) while the HTTP envelope is snake_case. The HTTP adapter maps
 * between them; no caller ever sees the transport shape.
 */
export interface TestParameterQuery extends PageRequest {
  readonly search?: string;
  readonly spec?: string;
  readonly sopCode?: string;
  readonly isActive?: boolean;
}

/**
 * This is the one port where a second adapter is genuinely real rather than
 * aspirational: `infrastructure/api/clients/testParametersApi.ts` already
 * talks to a live FastAPI backend behind `VITE_USE_API=true`. Phase 5 builds
 * the HTTP adapter and the mock adapter against this same interface, so the
 * feature flag becomes an adapter choice rather than branching scattered
 * across 20+ call sites.
 */
export interface TestParameterRepository {
  list(query?: TestParameterQuery): Promise<Result<Page<TestParameter>>>;
  get(id: string): Promise<Result<TestParameter>>;
  create(input: TestParameterDraft): Promise<Result<TestParameter>>;
  update(id: string, patch: TestParameterUpdate): Promise<Result<TestParameter>>;
  remove(id: string): Promise<Result<void>>;
}