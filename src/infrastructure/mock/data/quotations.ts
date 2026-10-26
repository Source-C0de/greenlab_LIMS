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
  /** Catalog code of the source specification (e.g. "SPEC-001"). Catalog only. */
  specCode?: string;
  /** Human-readable product name from the source specification. Catalog only. */
  productName?: string;
  /** Optional free-text note from the BDM — method, reference, extra detail. */
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
  /** Client's own 15-digit ZATCA VAT registration number. */
  vatNo?: string;
  /** Full postal address line, shown in the quotation's client-info block. */
  address?: string;
  /** City, shown alongside the address. */
  city?: string;
  /** Mobile / contact number. Copied from the client's `contactPhone`. */
  mobile?: string;
  /** Building name or number (e.g. "Exit 7", "Savola Tower"). */
  building?: string;
  /** District / area / street (e.g. "Al Kharj Road", "Second Industrial City"). */
  area?: string;
  /** Postal code (Saudi: 5 digits, e.g. "11432"). */
  postalCode?: string;
  /** Country name. Saudi clients: "Kingdom of Saudi Arabia". */
  country?: string;
  contactPerson?: string;
  email?: string;
  /** Office landline. Distinct from `mobile`. */
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

  /**
   * Source work order (Technical Evaluation) id, when the quotation was
   * created from an approved TE via the "New from TE" entry point.
   * Optional — quotations created blank don't have one.
   */
  workOrderId?: string;

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
  /** Payment terms, e.g. "Net 30 days from invoice date". */
  paymentTerms?: string;
  /**
   * Quotation-level subject line ("Subject of quotation"). Deliberately NOT
   * called `description` — `QuotationLineItem.description` already exists and
   * means the per-line-item note, and the printed items table already labels
   * its name column "Description".
   */
  subject?: string;

  status: QuotationStatus;
  issueDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD

  /** ISO datetime. */
  createdAt: string;
  updatedAt: string;
  /** Username of the BDM who created/issued the quotation. */
  createdBy: string;
  /**
   * Id of the BDM responsible for approving this quotation.
   *
   * A reference into `mockBdms` rather than a free-text name: the printed
   * document resolves it to the person's name in both languages, so a name
   * corrected later still prints correctly on quotations issued before.
   */
  approvedBy?: string;
}

/** Mutable module-level array. New issued quotations are pushed at runtime. */
export const mockQuotations: Quotation[] = [];
