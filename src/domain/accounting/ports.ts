import type { PageRequest, Page } from "@/domain/shared/pagination";
import type { Result } from "@/domain/shared/result";
import type { Account, Invoice, JournalEntry } from "./model";

export interface InvoiceQuery extends PageRequest {
  readonly search?: string;
  readonly clientId?: string;
  readonly status?: string;
}

export interface JournalQuery extends PageRequest {
  readonly search?: string;
  readonly status?: string;
  readonly from?: string;
  readonly to?: string;
}

export interface InvoiceRepository {
  list(query?: InvoiceQuery): Promise<Result<Page<Invoice>>>;
  get(id: string): Promise<Result<Invoice>>;
  create(input: Omit<Invoice, "id" | "uuid" | "hash" | "qrCode">): Promise<Result<Invoice>>;
  update(id: string, patch: Partial<Invoice>): Promise<Result<Invoice>>;
  remove(id: string): Promise<Result<void>>;
  /** ZATCA reporting — reports to the authority and stamps `isReported`. */
  report(id: string): Promise<Result<Invoice>>;
}

export interface JournalRepository {
  list(query?: JournalQuery): Promise<Result<Page<JournalEntry>>>;
  get(id: string): Promise<Result<JournalEntry>>;
  /** MUST reject an entry that fails the Σdebits === Σcredits invariant. */
  create(input: Omit<JournalEntry, "id">): Promise<Result<JournalEntry>>;
  post(id: string): Promise<Result<JournalEntry>>;
}

export interface AccountRepository {
  list(query?: PageRequest): Promise<Result<Page<Account>>>;
  get(id: string): Promise<Result<Account>>;
}