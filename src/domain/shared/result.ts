/**
 * `Result<T, E>` — explicit success/failure without exceptions.
 *
 * Repositories in `domain/<entity>/ports.ts` return `Result<Page<T>, RepositoryError>`
 * rather than throwing, so callers cannot forget to handle the failure branch.
 *
 * Exceptions are still correct for programmer errors (a broken invariant); this
 * is for *expected* operational failures — "not found", "conflict", "denied",
 * "network unreachable". A thrown error in a repository would otherwise be
 * caught by whichever `try` happened to be nearest, which is rarely the layer
 * that knows what to do about it.
 */

export type Result<T, E = RepositoryError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Narrowing helper — throws only if the result is an error. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(
    `unwrap() called on an error result: ${JSON.stringify(result.error)}`,
  );
}

/** Transform the success value, leaving an error untouched. */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return result.ok ? Ok(fn(result.value)) : result;
}

// ---------------------------------------------------------------------------
// Repository errors
// ---------------------------------------------------------------------------

/**
 * The closed set of failures a repository may report. Deliberately coarse:
 * adding a variant here means every adapter has to handle it, which is the
 * point — it forces the two adapters to stay behaviourally comparable.
 */
export type RepositoryErrorCode =
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "unauthorized"
  | "forbidden"
  | "network"
  | "unknown";

export interface RepositoryError {
  readonly code: RepositoryErrorCode;
  /** Operator-facing message. Already localised by the adapter when it can. */
  readonly message: string;
  /**
   * Field-level problems, e.g. the Pydantic 422 `detail[]` array the FastAPI
   * backend returns. Rendered by `ParameterValidationSummary` in the Test
   * Parameter Catalogue — which is why it is part of the domain error and not
   * an HTTP-layer detail.
   */
  readonly issues?: readonly ValidationIssue[];
}

export interface ValidationIssue {
  /** Field path, e.g. "code" or "parameters.0.min". */
  readonly field: string;
  readonly message: string;
}

export const notFound = (message = "Not found"): RepositoryError => ({
  code: "not_found",
  message,
});

export const validationFailed = (
  message: string,
  issues?: readonly ValidationIssue[],
): RepositoryError => ({
  code: "validation_failed",
  message,
  ...(issues?.length ? { issues } : {}),
});