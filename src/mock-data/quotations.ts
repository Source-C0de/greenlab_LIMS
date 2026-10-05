/**
 * Quotation module — pre-sale price quotes.
 *
 * A quotation carries a snapshot of the client (so future edits to the
 * client table don't rewrite issued quotations), one or more line items
 * drawn either from the specification catalog or typed ad-hoc, and the
 * standard ZATCA 15% VAT math.
 *
 * Lifecycle:
 *   draft (in localStorage) → issued (in mockQuotations) → expired
 *
 * The "draft" state is intentionally kept in browser localStorage so a BDM
 * can walk away mid-edit and resume. The moment they click "Issue", the
 * draft is pushed into `mockQuotations` and the localStorage key removed.
 */

export type QuotationStatus = "draft" | "issued" | "expired" | "superseded";

export interface QuotationLineItem {
  /** Local uid. */
  id: string;
  source: "catalog" | "custom";
  /** Specification id when source === "catalog"; null for custom. */
  specificationId: string | null;
  /** Display name. Copied from spec at add time, typed for custom. */
  name: string;
  /** Optional secondary line, e.g. method or note. */
  description?: string;
  /** Always >= 1. */
  quantity: number;
  /** Unit price in SAR. */
  unitPrice: number;
  /** quantity * unitPrice. Stored so list view can sort/filter. */
  lineTotal: number;
}

export interface QuotationClientSnapshot {
  nameEn: string;
  nameAr?: string;
  vatNo?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export interface Quotation {
  /**
   * "QUO-YYYY-NNNN" once issued. Undefined (or a uuid) for drafts.
   * For drafts the draftId field below is the canonical key.
   */
  id?: string;
  /** Local draft id; used as the localStorage key. Present on drafts only. */
  draftId?: string;

  /** Live client id (may differ from snapshot if client was later edited). */
  clientId: string;
  /** Frozen at issue time so the printout is stable. */
  clientSnapshot: QuotationClientSnapshot;

  lineItems: QuotationLineItem[];

  /** Sum of all lineTotals. */
  subtotal: number;
  discountType: "percent" | "fixed";
  /** 0..100 for percent; >= 0 for fixed (SAR). */
  discountValue: number;
  discountAmount: number;
  /** 0.15 per ZATCA. */
  vatRate: number;
  vatAmount: number;
  total: number;

  notes?: string;
  /** Free-text terms, shown on the printout. */
  terms?: string;

  status: QuotationStatus;
  issueDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD

  /** ISO datetime. */
  createdAt: string;
  updatedAt: string;
  /** Username of the BDM who created/issued the quotation. */
  createdBy: string;
}

/** Mutable module-level array. New issued quotations are pushed at runtime. */
export const mockQuotations: Quotation[] = [];
