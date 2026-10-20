/**
 * Pagination primitives.
 *
 * WHY THIS EXISTS: every repository port returns `Page<T>`, never a bare
 * array. Two concrete reasons, both learned from this codebase:
 *
 *  1. `presentation/pages/samples/index.tsx` currently does client-side
 *     `.filter()` over the ENTIRE sample array and then paginates in JS.
 *     Reproducing that inside the mock adapter would bake the inefficiency in
 *     and make the eventual backend swap a rewrite rather than a config flip.
 *
 *  2. The Test Parameter Catalogue already has a real HTTP contract
 *     (`limit`/`offset`/`total`, see `infrastructure/api/clients/testParametersApi.ts`).
 *     If the port returned `TestParameter[]`, adding that backend would force a
 *     signature change on the port and every caller. With `Page<T>`, the mock
 *     adapter paginates in memory and the HTTP adapter maps the server envelope
 *     — and the interface never changes.
 *
 * `total` is the count of ALL matching rows, not of the returned page — that is
 * what a pager needs to render "showing 1–20 of 347".
 */

export interface Page<T> {
  readonly items: readonly T[];
  /** Total matching rows across all pages. */
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

/** Server-side sort. Direction is explicit rather than a prefix string. */
export interface SortSpec {
  readonly field: string;
  readonly direction: "asc" | "desc";
}

export interface PageRequest {
  readonly limit?: number;
  readonly offset?: number;
  readonly sort?: readonly SortSpec[];
}

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 200;

/** Clamp caller-supplied paging values to something safe. */
export function normalisePaging(
  request: PageRequest = {},
): Required<Pick<PageRequest, "limit" | "offset">> {
  const rawLimit = request.limit ?? DEFAULT_PAGE_LIMIT;
  const limit = Math.min(Math.max(1, Math.trunc(rawLimit)), MAX_PAGE_LIMIT);
  const rawOffset = request.offset ?? 0;
  const offset = Math.max(0, Math.trunc(rawOffset));
  return { limit, offset };
}

/** Build a `Page<T>` from an already-materialised collection. */
export function paginate<T>(
  all: readonly T[],
  request: PageRequest = {},
): Page<T> {
  const { limit, offset } = normalisePaging(request);
  return {
    items: all.slice(offset, offset + limit),
    total: all.length,
    limit,
    offset,
  };
}

/** True when the pager should render a "next" control. */
export function hasNextPage<T>(page: Page<T>): boolean {
  return page.offset + page.items.length < page.total;
}