/**
 * Accounting domain rules — pure, synchronous, testable.
 *
 * Phase 0 recorded two findings that this module exists to make testable:
 *
 *  - `ZatcaService.generateHash` returns `Math.random()` despite being labelled
 *    "SHA-256 simulation". It is NOT compliant.
 *  - `ZatcaService.generateQR` is `btoa(pipe-delimited string)`, which is not
 *    the ZATCA TLV encoding.
 *
 * These are RECORDED, NOT FIXED — real FATOORA compliance needs a real backend
 * and the actual ZATCA spec, not a frontend patch. The functions below are the
 * honest arithmetic that CAN be correct, kept separate from the crypto/encoding
 * that cannot be faked.
 *
 * IMPORTANT CAVEAT: the current `AccountingEngine.postInvoice` in
 * `shared/lib/accounting-utils.ts` debits `invoice.total` and credits
 * `subtotal + vat`. Whether that balances has never been verified — these
 * helpers make it verifiable in Phase 7.
 */
import type { Invoice, JournalEntry, JournalLine } from "./model";
import { VAT_RATE } from "./model";

/** Round to 2dp, the precision invoices and ledger entries are stored at. */
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// VAT
// ---------------------------------------------------------------------------

export function vatFor(netAmount: number, rate: number = VAT_RATE): number {
  return money(netAmount * rate);
}

/** Gross = net + VAT. */
export function grossFor(netAmount: number, rate: number = VAT_RATE): number {
  return money(netAmount + netAmount * rate);
}

/**
 * Extract the net amount from a VAT-inclusive total.
 * Needed on receipts and on simplified invoices where only `total` is known.
 */
export function netFromGross(grossAmount: number, rate: number = VAT_RATE): number {
  return money(grossAmount / (1 + rate));
}

// ---------------------------------------------------------------------------
// Double-entry invariants
// ---------------------------------------------------------------------------

/** Sum of debits across a journal entry's lines. */
export function totalDebit(lines: readonly JournalLine[]): number {
  return money(lines.reduce((sum, l) => sum + l.debit, 0));
}

/** Sum of credits across a journal entry's lines. */
export function totalCredit(lines: readonly JournalLine[]): number {
  return money(lines.reduce((sum, l) => sum + l.credit, 0));
}

/**
 * The core double-entry invariant: a balanced entry has Σdebits === Σcredits.
 *
 * A journal entry whose lines put value in from nowhere (or destroy it) is
 * corrupt, so every posting path should call this before committing.
 */
export function isBalanced(entry: Pick<JournalEntry, "lines">): boolean {
  return totalDebit(entry.lines) === totalCredit(entry.lines);
}

/** Absolute difference between debits and credits. Non-zero ⇒ unbalanced. */
export function imbalance(entry: Pick<JournalEntry, "lines">): number {
  return money(totalDebit(entry.lines) - totalCredit(entry.lines));
}

/**
 * Build the journal entry that posts an invoice: debit receivable for the
 * gross total, credit revenue for the net, credit output-VAT for the VAT.
 *
 * This is the shape `AccountingEngine.postInvoice` currently hand-rolls. It is
 * extracted here so Phase 7 can assert it balances rather than assuming.
 */
export function invoicePosting(
  invoice: Pick<Invoice, "id" | "subtotal" | "vat" | "total" | "issueDate">,
  receivableAccount: Omit<JournalLine, "debit" | "credit">,
  revenueAccount: Omit<JournalLine, "debit" | "credit">,
  vatAccount: Omit<JournalLine, "debit" | "credit">,
): JournalEntry {
  return {
    id: `POST-${invoice.id}`,
    date: invoice.issueDate,
    reference: invoice.id,
    description: `Invoice ${invoice.id}`,
    status: "Posted",
    lines: [
      { ...receivableAccount, debit: money(invoice.total), credit: 0 },
      { ...revenueAccount, debit: 0, credit: money(invoice.subtotal) },
      { ...vatAccount, debit: 0, credit: money(invoice.vat) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Invoice status derivation
// ---------------------------------------------------------------------------

/** True when the invoice is past its due date and still not settled. */
export function isOverdue(
  invoice: Pick<Invoice, "dueDate" | "status">,
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  return (
    (invoice.status === "Pending" || invoice.status === "Overdue") &&
    invoice.dueDate < today
  );
}