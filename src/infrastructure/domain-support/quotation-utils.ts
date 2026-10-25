/**
 * Quotation math + formatters + reference numbers.
 *
 * Pure functions, no React imports — mirrors `src/lib/accounting-utils.ts`.
 * The rest of the codebase inlines SAR formatting today; this is the local
 * copy used by the Quotation module only.
 */

import type { Quotation, QuotationLineItem } from "@/infrastructure/mock/data/quotations";
import { mockSpecifications } from "@/infrastructure/mock/data";

/** ZATCA standard output VAT rate. */
export const VAT_RATE = 0.15;

/** Default days a quotation remains valid from issue. */
export const DEFAULT_VALIDITY_DAYS = 14;

/** Green Lab's own ZATCA VAT registration number (seller side). */
export const SELLER_VAT_NO = "300012345600003";

/** Default payment terms shown in the quotation's right-hand info column. */
export const DEFAULT_PAYMENT_TERMS_EN = "Net 30 days from invoice date";
export const DEFAULT_PAYMENT_TERMS_AR = "صافي ٣٠ يومًا من تاريخ الفاتورة";

/** Format a number as Saudi Riyals with 2 decimal places. */
export const SAR = (n: number): string => {
  const safe = Number.isFinite(n) ? n : 0;
  return `SAR ${safe.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/** Format just the digits — useful for `<input>` value bindings. */
export const formatNumber = (n: number, fractionDigits = 2): string => {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

export interface QuotationTotals {
  subtotal: number;
  discountAmount: number;
  /** Net after discount (pre-VAT). */
  net: number;
  vatAmount: number;
  total: number;
}

/** One printed row of the items table, with the discount already applied. */
export interface QuotationLineTotals {
  /** quantity × unitPrice, before discount. */
  gross: number;
  /** Discount allocated to this line. */
  discount: number;
  /** gross − discount. */
  net: number;
  /** VAT on this line's net amount. */
  vatAmount: number;
  /** net + vatAmount — what the client pays for this line. */
  vatTotal: number;
}

/**
 * Allocate the quotation-level discount across the lines, proportionally to
 * each line's gross amount.
 *
 * A percent discount distributes naturally; a FIXED SAR amount cannot be
 * repeated per line (that would charge the full amount once per row), so it
 * is spread by gross share. The last line absorbs the rounding remainder so
 * the allocations sum to the total discount exactly.
 */
export function allocateDiscounts(
  lineItems: QuotationLineItem[],
  discountType: "percent" | "fixed",
  discountValue: number,
): { gross: number[]; discounts: number[]; subtotal: number; discountAmount: number } {
  const gross = lineItems.map((li) => {
    const qty = Number.isFinite(li.quantity) ? li.quantity : 0;
    const price = Number.isFinite(li.unitPrice) ? li.unitPrice : 0;
    const computed = round2(qty * price);
    // Fall back to the stored line total when the inputs are unusable, so a
    // hand-edited row still contributes to the subtotal.
    if (computed === 0 && Number.isFinite(li.lineTotal) && li.lineTotal !== 0) {
      return round2(li.lineTotal);
    }
    return computed;
  });

  const subtotal = round2(gross.reduce((s, g) => s + g, 0));

  const rawDiscount =
    discountType === "percent"
      ? subtotal * (clampNumber(discountValue, 0, 100) / 100)
      : clampNumber(discountValue, 0, Number.POSITIVE_INFINITY);
  const discountAmount = round2(Math.min(rawDiscount, subtotal));

  if (gross.length === 0 || discountAmount === 0) {
    return { gross, discounts: gross.map(() => 0), subtotal, discountAmount: 0 };
  }

  const discounts: number[] = [];
  let allocated = 0;
  for (let i = 0; i < gross.length; i++) {
    const isLast = i === gross.length - 1;
    const share = subtotal > 0 ? gross[i] / subtotal : 0;
    const amount = isLast
      ? round2(discountAmount - allocated)
      : round2(discountAmount * share);
    discounts.push(amount);
    allocated = round2(allocated + amount);
  }

  return { gross, discounts, subtotal, discountAmount };
}

/**
 * Per-line totals for the printed items table. Shares its allocation with
 * `computeTotals`, so the rows and the Totals block always agree.
 */
export function computeLineTotals(
  lineItems: QuotationLineItem[],
  discountType: "percent" | "fixed",
  discountValue: number,
  vatRate: number = VAT_RATE,
): QuotationLineTotals[] {
  const { gross, discounts } = allocateDiscounts(lineItems, discountType, discountValue);
  return gross.map((g, i) => {
    const discount = discounts[i];
    const net = round2(g - discount);
    const vatAmount = round2(net * vatRate);
    return { gross: g, discount, net, vatAmount, vatTotal: round2(net + vatAmount) };
  });
}

/**
 * Compute subtotal → discount → VAT → total. All values are rounded to 2dp
 * to match how the printout / PDF will display them.
 *
 * The totals are derived FROM the per-line allocation (rather than computed
 * independently) so the printed rows and this summary reconcile to the cent.
 */
export function computeTotals(
  lineItems: QuotationLineItem[],
  discountType: "percent" | "fixed",
  discountValue: number,
  vatRate: number = VAT_RATE,
): QuotationTotals {
  const rows = computeLineTotals(lineItems, discountType, discountValue, vatRate);

  return {
    subtotal: round2(rows.reduce((s, r) => s + r.gross, 0)),
    discountAmount: round2(rows.reduce((s, r) => s + r.discount, 0)),
    net: round2(rows.reduce((s, r) => s + r.net, 0)),
    vatAmount: round2(rows.reduce((s, r) => s + r.vatAmount, 0)),
    total: round2(rows.reduce((s, r) => s + r.vatTotal, 0)),
  };
}

function clampNumber(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Add `days` to a YYYY-MM-DD string and return YYYY-MM-DD. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Today's date as YYYY-MM-DD (local). */
export function todayIso(): string {
  const dt = new Date();
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Generate the next reference number of the form `QUO-YYYY-NNNN`.
 * NNNN is the count of quotations issued this year, zero-padded to 4 digits.
 * Scoped to issued quotations only — drafts don't consume numbers.
 */
export function nextReferenceNumber(existing: Quotation[], year?: number): string {
  const y = year ?? new Date().getFullYear();
  const prefix = `QUO-${y}-`;
  const used = existing
    .filter((q) => typeof q.id === "string" && q.id!.startsWith(prefix))
    .map((q) => parseInt(q.id!.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));
  const max = used.length === 0 ? 0 : Math.max(...used);
  const next = String(max + 1).padStart(4, "0");
  return `${prefix}${next}`;
}

/** Cheap, dependency-free uid. */
export function localUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Default terms boilerplate shown on issued quotations (English). */
export const DEFAULT_TERMS_EN =
  "This quotation is valid until the date stated above. Prices are in SAR and inclusive of 15% VAT unless otherwise noted. Laboratory turnaround time begins upon sample receipt and accepted purchase order. Payment terms: net 30 days from invoice date.";

/** Arabic counterpart for the bilingual default terms. */
export const DEFAULT_TERMS_AR =
  "هذا العرض صالح حتى التاريخ المذكور أعلاه. الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة ١٥٪ ما لم يُذكر خلاف ذلك. تبدأ مدة التنفيذ في المختبر من تاريخ استلام العينة وقبول أمر الشراء. شروط الدفع: صافي ٣٠ يومًا من تاريخ الفاتورة.";

/**
 * One numbered clause in the quotation's Terms & Conditions block.
 *
 * Each clause carries a heading in both languages plus the body text in both
 * languages — the printed document shows both regardless of the app's
 * language toggle.
 */
export interface QuotationTermClause {
  /** Clause heading — English. */
  titleEn: string;
  /** Clause heading — Arabic. */
  titleAr: string;
  /** Clause body — English. */
  bodyEn: string;
  /** Clause body — Arabic. */
  bodyAr: string;
}

/**
 * The five standing clauses printed under Terms & Conditions.
 *
 * These are contractual boilerplate, not per-quotation data, so they live here
 * beside the other terms constants rather than in the mock data or the
 * component.
 */
export const QUOTATION_TERM_CLAUSES: readonly QuotationTermClause[] = [
  {
    titleEn: "Transportation",
    titleAr: "النقل",
    bodyEn:
      "The client is responsible for delivering the sample(s) to the Green Lab site.",
    bodyAr:
      "العميل مسؤول عن تسليم العينة / العينات إلى موقع جرين لاب.",
  },
  {
    titleEn: "Sampling",
    titleAr: "أخذ العينات",
    bodyEn:
      "The Green Lab is not responsible for the source of the sample(s) and the procedure of sampling and transportation.",
    bodyAr:
      "جرين لاب ليست مسؤولة عن مصدر العينة / العينات وإجراءات أخذ العينات والنقل.",
  },
  {
    titleEn: "Disposing",
    titleAr: "الاتلاف",
    bodyEn:
      "Samples will be disposed of immediately after the completion of analysis.",
    bodyAr:
      "سيتم التخلص من العينات مباشرة بعد الانتهاء من التحليل.",
  },
  {
    titleEn: "OOS",
    titleAr: "الحيود",
    bodyEn:
      "The client will be informed of any OOS results that appear during analysis.",
    bodyAr:
      "سيتم إبلاغ العميل بأي ظهور حيود في النتائج أثناء التحليل.",
  },
  {
    titleEn: "Outsource",
    titleAr: "إسناد خارجي",
    bodyEn:
      "Any Test marked with (*) means that the test was performed outside The Green Lab facilities.",
    bodyAr:
      "أي اختبار يحمل علامة (*) يعني أنه تم إجراء الاختبار خارج مرافق جرين لاب.",
  },
] as const;

/**
 * Look up a specification's defaultPrice by case-insensitive name match.
 * Returns 0 if no match. Used when seeding a quotation from a TE's
 * testRequired list (which carries a name but no price).
 */
export function lookupSpecPrice(name: string): number {
  const n = name.trim().toLowerCase();
  if (!n) return 0;
  const hit = mockSpecifications.find((s) => s.name.toLowerCase() === n);
  return hit?.defaultPrice ?? 0;
}
