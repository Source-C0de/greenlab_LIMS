/**
 * In-memory `ClientRepository` adapter.
 *
 * Implements `domain/client/ports.ts` over the `mockClients` fixture.
 *
 * THE ONE INTERESTING BIT: the seed data and the domain model disagree on a
 * field name. `infrastructure/mock/data/clients.ts` has been an untyped array
 * literal since before the ports existed, and it calls the industry sector
 * `type`. `domain/client/model.ts` calls it `sector`, and types it as a closed
 * `ClientSector` union rather than free text.
 *
 * Renaming the fixture in place would touch every consumer (10 files import
 * `mockClients` for dropdowns and joins), and the default-case problem would
 * remain: `type` is a string, so TypeScript cannot prove any given row's value
 * is a legal `ClientSector`. Mapping here solves both — the fixture stays put,
 * and the cast is confined to one function that is *validated* rather than
 * asserted. If a future fixture row carries a sector outside the union,
 * `toClient` falls back to "Other" instead of poisoning the type.
 *
 * Clients are read-only today (nothing mutates them), so this adapter needs no
 * copy-on-write store the way `sampleRepository.ts` does.
 */

import type { ClientRepository, ClientQuery } from "@/domain/client/ports";
import type { Result } from "@/domain/shared/result";
import { Ok, Err, notFound } from "@/domain/shared/result";
import { paginate } from "@/domain/shared/pagination";
import type { Page } from "@/domain/shared/pagination";
import type { Client, ClientSector } from "@/domain/client/model";

import { mockClients } from "@/infrastructure/mock/data/clients";

const KNOWN_SECTORS: readonly ClientSector[] = [
  "Food & Beverage",
  "Oil & Gas",
  "Cosmetics & Perfume",
  "Drugs",
  "Water Treatment",
  "Other",
];

function toSector(value: string): ClientSector {
  return (KNOWN_SECTORS as readonly string[]).includes(value)
    ? (value as ClientSector)
    : "Other";
}

/**
 * Shape of one row in the untyped `mockClients` fixture. Declared locally
 * rather than exported so the fixture stays free to change shape without
 * ripple — this is the adapter's translation boundary.
 */
interface ClientFixture {
  id: string;
  nameEn: string;
  nameAr: string;
  type: string;
  vatNo: string;
  email: string;
  phone: string;
  contactPhone?: string;
  contactPerson?: string;
  address: string;
  city: string;
}

function toClient(row: ClientFixture): Client {
  return {
    id: row.id,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    sector: toSector(row.type),
    vatNo: row.vatNo,
    email: row.email,
    phone: row.phone,
    contactPhone: row.contactPhone,
    contactPerson: row.contactPerson,
    address: row.address,
    city: row.city,
  };
}

/** The whole fixture, normalised to the domain model once at module load. */
const clients: Client[] = (mockClients as unknown as ClientFixture[]).map(toClient);

/**
 * Free-text search across the fields a client picker would match on: id, both
 * name spellings, VAT number, and city. Both languages are searched because the
 * search box is the same control in EN and AR mode.
 */
function matchesSearch(client: Client, needle: string): boolean {
  const hay = [
    client.id,
    client.nameEn,
    client.nameAr,
    client.vatNo,
    client.city,
    client.sector,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function filterClients(
  query: ClientQuery,
  source: readonly Client[] = clients,
): Client[] {
  const needle = query.search?.trim().toLowerCase() ?? "";

  return source.filter((c) => {
    if (needle && !matchesSearch(c, needle)) return false;
    if (query.city && c.city !== query.city) return false;
    if (query.sector && c.sector !== query.sector) return false;
    return true;
  });
}

export const mockClientRepository: ClientRepository = {
  async list(query: ClientQuery = {}): Promise<Result<Page<Client>>> {
    return Ok(paginate(filterClients(query), query));
  },

  async get(id: string): Promise<Result<Client>> {
    const client = clients.find((c) => c.id === id);
    if (!client) {
      return Err(notFound(`Client ${id} not found`));
    }
    return Ok(client);
  },
};