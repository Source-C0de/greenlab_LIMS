import type { PageRequest, Page } from "@/domain/shared/pagination";
import type { Result } from "@/domain/shared/result";
import type { Client } from "./model";

export interface ClientQuery extends PageRequest {
  readonly search?: string;
  readonly city?: string;
  readonly sector?: string;
}

export interface ClientRepository {
  list(query?: ClientQuery): Promise<Result<Page<Client>>>;
  get(id: string): Promise<Result<Client>>;
}