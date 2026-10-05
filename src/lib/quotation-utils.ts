/**
 * Quotation math + formatters + reference numbers.
 *
 * Pure functions, no React imports — mirrors `src/lib/accounting-utils.ts`.
 * The rest of the codebase inlines SAR formatting today; this is the local
 * copy used by the Quotation module only.
 */

import type { Quotation, QuotationLineItem } from "@/mock-data/quotations";

/** ZATCA standard output VAT rate. */
export const VAT_RATE = 0.15;

/** Default days a quotation remains valid from issue. */
export const DEFAULT_VALIDITY_DAYS = 14;

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

/**
 * Compute subtotal → discount → VAT → total. All values are rounded to 2dp
 * to match how the printout / PDF will display them.
 */
export function computeTotals(
  lineItems: QuotationLineItem[],
  discountType: "percent" | "fixed",
  discountValue: number,
  vatRate: number = VAT_RATE,
): QuotationTotals {
  const subtotal = round2(
    lineItems.reduce((sum, li) => sum + (Number.isFinite(li.lineTotal) ? li.lineTotal : 0), 0),
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
