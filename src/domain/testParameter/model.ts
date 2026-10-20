/**
 * Test Parameter domain model.
 *
 * NAMING: this is camelCase, but the FastAPI backend speaks snake_case
 * (`test_name`, `sop_code`, `is_active`, `created_at`). The domain declares the
 * canonical form; the HTTP adapter owns the mapping. Keeping snake_case in the
 * domain would leak a transport concern into every consumer — and today
 * `usersApi.ts` has ~438 lines of exactly that scattered mapping, which Phase 4
 * consolidates.
 *
 * Transport shapes remain in `infrastructure/api/clients/testParametersApi.ts`.
 */

export interface TestParameter {
  /** UUID. */
  readonly id: string;
  readonly code: string;
  readonly spec: string | null;
  readonly testName: string | null;
  readonly parameter: string;
  readonly reference: string | null;
  readonly tests: string | null;
  /** Measurement uncertainty (e.g. "±0.05"). */
  readonly mu: string | null;
  readonly sopCode: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Fields the caller supplies on create. Server owns `id`/timestamps. */
export interface TestParameterDraft {
  readonly code: string;
  readonly spec?: string | null;
  readonly testName?: string | null;
  readonly parameter: string;
  readonly reference?: string | null;
  readonly tests?: string | null;
  readonly mu?: string | null;
  readonly sopCode?: string | null;
}

export type TestParameterUpdate = Partial<TestParameterDraft> & {
  readonly isActive?: boolean;
};