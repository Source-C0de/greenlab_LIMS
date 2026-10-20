/**
 * Quotation domain rules.
 *
 * `computeTotals` is EXTRACTED verbatim from
 * `infrastructure/domain-support/quotation-utils.ts` — the logic is unchanged,
 * including the defensive `Number.isFinite` guard and the discount clamp.
 * Phase 7 turns this into the first real unit tests in the project.
 */
import type { Quotation, QuotationLineItem } from "./model";

export const VAT_RATE = 0.15;
export const DEFAULT_VALIDITY_DAYS = 14;

export interface QuotationTotals {
  readonly subtotal: number;
  readonly discountAmount: number;
  /** Net after discount, pre-VAT. */
  readonly net: number;
  readonly vatAmount: number;
  readonly total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampNumber(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/**
 * subtotal → discount → VAT → total, each step rounded to 2dp so the stored
 * values match what the printout and PDF display.
 *
 * Edge cases handled here (each one a real defect surface):
 *  - a non-finite `lineTotal` contributes 0 rather than NaN-poisoning subtotal
 *  - a discount can never exceed the subtotal
 *  - a negative or >100 percent discount is clamped rather than trusted
 */
export function computeTotals(
  lineItems: readonly QuotationLineItem[],
  discountType: "percent" | "fixed",
  discountValue: number,
  vatRate: number = VAT_RATE,
): QuotationTotals {
  const subtotal = round2(
    lineItems.reduce(
      (sum, li) => sum + (Number.isFinite(li.lineTotal) ? li.lineTotal : 0),
      0,
    ),
  );

  const rawDiscount =
    discountType === "percent"
      ? subtotal * (clampNumber(discountValue, 0, 100) / 100)
      : clampNumber(discountValue, 0, Number.POSITIVE_INFINITY);

  const discountAmount = round2(Math.min(rawDiscount, subtotal));
  const net = round2(subtotal - discountAmount);
  const vatAmount = round2(net * vatRate);
  const total = round2(net + vatAmount);

  return { subtotal, discountAmount, net, vatAmount, total };
}

/** A quotation past its validity window is expired, whatever its stored status. */
export function isExpired(
  quotation: Pick<Quotation, "validUntil" | "status">,
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (quotation.status === "superseded") return true;
  return quotation.validUntil < today;
}

/**
 * Status transition guard. Only these transitions are legal:
 *   draft → issued
 *   issued → expired | superseded
 *   expired → superseded
 */
export function canTransition(
  from: Quotation["status"],
  to: Quotation["status"],
): boolean {
  if (from === to) return false;
  switch (from) {
    case "draft":
      return to === "issued";
    case "issued":
      return to === "expired" || to === "superseded";
    case "expired":
      return to === "superseded";
    case "superseded":
      return false;
  }
}