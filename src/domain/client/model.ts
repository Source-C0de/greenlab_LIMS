/**
 * Client domain model.
 *
 * NEW: `infrastructure/mock/data/clients.ts` currently exports a bare array
 * literal with no interface at all, so consumers destructure it untyped.
 * Declaring the shape here — and pointing the mock at it in Phase 3 — is what
 * makes a client repository swappable.
 *
 * Clients are the join anchor for samples, quotations, invoices and client
 * requests, which is why they earn a port despite having no mutating workflow.
 */

/** Industry sector, mirroring the `type` field in the seed data. */
export type ClientSector =
  | "Food & Beverage"
  | "Oil & Gas"
  | "Cosmetics & Perfume"
  | "Drugs"
  | "Water Treatment"
  | "Other";

export interface Client {
  readonly id: string;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly sector: ClientSector;
  /** Saudi VAT registration number (15 digits, starts 3). */
  readonly vatNo: string;
  readonly email: string;
  readonly phone: string;
  readonly contactPhone?: string;
  readonly contactPerson?: string;
  readonly address: string;
  readonly city: string;
}

/**
 * Display name for the active language. Kept as a function rather than a
 * precomputed field so a client can't be cached with the wrong language baked
 * in — a real bug class in a bilingual app.
 */
export function clientDisplayName(client: Client, language: "en" | "ar"): string {
  return language === "ar" ? client.nameAr : client.nameEn;
}