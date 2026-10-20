/**
 * Accounting domain model — double-entry + ZATCA invoicing.
 *
 * This is the highest-value domain to extract, because its logic is pure,
 * currently UNTYPED AT THE INVARIANT LEVEL, and completely untested (Phase 0
 * found the project had no test runner at all). Declaring the model here gives
 * Phase 7 somewhere concrete to write `totals` / `posting` / `zatca` tests
 * against.
 *
 * Shapes mirror `infrastructure/mock/data/{accounts,journals,invoices}.ts`.
 */

export type AccountType =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Revenue"
  | "Expense";

export interface Account {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly nameAr: string;
  readonly type: AccountType;
  readonly category: string;
  readonly balance: number;
}

export interface JournalLine {
  readonly accountId: string;
  readonly accountCode: string;
  readonly accountName: string;
  readonly debit: number;
  readonly credit: number;
}

export type JournalStatus = "Draft" | "Posted" | "Cancelled";

export interface JournalEntry {
  readonly id: string;
  readonly date: string;
  readonly reference: string;
  readonly description: string;
  readonly lines: readonly JournalLine[];
  readonly status: JournalStatus;
}

// ---------------------------------------------------------------------------
// ZATCA / FATOORA invoicing
// ---------------------------------------------------------------------------

export type InvoiceStatus = "Draft" | "Pending" | "Paid" | "Overdue" | "Cancelled";

export type InvoiceType = "Tax Invoice" | "Simplified Tax Invoice";

export interface Invoice {
  readonly id: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly sampleId: string;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly subtotal: number;
  readonly vat: number;
  readonly total: number;
  readonly status: InvoiceStatus;
  readonly vatNo: string;
  readonly qrCode: string;
  // ZATCA fields
  readonly uuid: string;
  readonly invoiceType: InvoiceType;
  readonly hash: string;
  readonly isReported: boolean;
}

/** Saudi standard VAT rate. */
export const VAT_RATE = 0.15;