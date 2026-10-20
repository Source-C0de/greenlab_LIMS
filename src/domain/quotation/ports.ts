import type { PageRequest, Page } from "@/domain/shared/pagination";
import type { Result } from "@/domain/shared/result";
import type { Quotation, QuotationStatus } from "./model";

export interface QuotationQuery extends PageRequest {
  readonly search?: string;
  readonly clientId?: string;
  readonly status?: QuotationStatus;
}

export interface QuotationRepository {
  list(query?: QuotationQuery): Promise<Result<Page<Quotation>>>;
  get(id: string): Promise<Result<Quotation>>;
  /** Stored locally (drafts only). Requires implementing adapter to back this. */
  getDraft(draftId: string): Promise<Result<Quotation | null>>;
  saveDraft(draft: Omit<Quotation, "id" | "status">): Promise<Result<Quotation>>;
  issue(input: Quotation): Promise<Result<Quotation>>;
  update(id: string, patch: Partial<Quotation>): Promise<Result<Quotation>>;
  remove(id: string): Promise<Result<void>>;
}