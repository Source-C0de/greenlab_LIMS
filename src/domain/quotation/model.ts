/**
 * Quotation domain model.
 *
 * Mirrors `infrastructure/mock/data/quotations.ts`. The money arithmetic
 * (`computeTotals`) is EXTRACTED to `rules.ts` rather than reinvented — Phase 7
 * will test the rounding behaviour, which is a classic defect surface.
 *
 * NOTE: this is an *unwired* mirror. The live Quotation model today is the one
 * in `infrastructure/mock/data/quotations.ts`; nothing imports this file yet.
 * Keep it in sync when that model changes.
 */

export type QuotationStatus = "draft" | "issued" | "expired" | "superseded";

export interface QuotationLineItem {
  /** Local uid. */
  readonly id: string;
  readonly source: "catalog" | "custom";
  /** Specification id when `source === "catalog"`; null for custom lines. */
  readonly specificationId: string | null;
  /** Display name — copied from the spec at add time, typed for custom. */
  readonly name: string;
  /** Catalog code of the source specification. Catalog only. */
  readonly specCode?: string;
  /** Human-readable product name from the source specification. Catalog only. */
  readonly productName?: string;
  readonly description?: string;
  /** Always >= 1. */
  readonly quantity: number;
  /** Unit price in SAR. */
  readonly unitPrice: number;
  /** quantity * unitPrice. Stored so the list view can sort/filter. */
  readonly lineTotal: number;
}

export interface QuotationClientSnapshot {
  readonly nameEn: string;
  readonly nameAr?: string;
  readonly vatNo?: string;
  readonly address?: string;
  readonly city?: string;
  readonly mobile?: string;
  readonly building?: string;
  readonly area?: string;
  readonly postalCode?: string;
  readonly country?: string;
  readonly contactPerson?: string;
  readonly email?: string;
  readonly phone?: string;
}

export interface Quotation {
  /** "QUO-YYYY-NNNN" once issued. Absent (or a uuid) for drafts. */
  readonly id?: string;
  /** Local draft id — the localStorage key. Drafts only. */
  readonly draftId?: string;

  /** Live client id (may differ from the snapshot if the client was edited). */
  readonly clientId: string;
  /** Frozen at issue time so the printout stays stable. */
  readonly clientSnapshot: QuotationClientSnapshot;

  /** Source Technical Evaluation id, when created from an approved TE. */
  readonly workOrderId?: string;

  readonly lineItems: readonly QuotationLineItem[];

  readonly subtotal: number;
  readonly discountType: "percent" | "fixed";
  /** 0..100 for percent; >= 0 for fixed (SAR). */
  readonly discountValue: number;
  readonly discountAmount: number;
  /** 0.15 per ZATCA. */
  readonly vatRate: number;
  readonly vatAmount: number;
  readonly total: number;

  readonly notes?: string;
  readonly terms?: string;
  readonly paymentTerms?: string;
  readonly subject?: string;

  readonly status: QuotationStatus;
  /** YYYY-MM-DD */
  readonly issueDate: string;
  /** YYYY-MM-DD */
  readonly validUntil: string;

  readonly createdAt: string;
  readonly updatedAt: string;
  /** Username of the BDM who created/issued it. */
  readonly createdBy: string;
}