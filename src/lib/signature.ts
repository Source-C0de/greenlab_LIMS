/**
 * Resolve the signature image URL for an analyst by name (EN or AR).
 *
 * Returns `null` when no match is found, so callers can render a static
 * text fallback instead. Lookup is case-insensitive on the EN name and
 * exact on the AR name, and tolerates leading/trailing whitespace.
 *
 * The mapping itself lives on the analyst records in
 * `src/mock-data/analysts.ts` (`signatureUrl`). This helper is a thin
 * lookup so report pages don't have to import the mock-data barrel.
 */

import { mockAnalysts } from "@/mock-data";

export function signatureFor(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const needle = trimmed.toLowerCase();

  const hit = mockAnalysts.find(
    (a) =>
      Boolean(a.signatureUrl) &&
      (a.name.toLowerCase() === needle || (a.nameAr ?? "") === trimmed),
  );
  return hit?.signatureUrl ?? null;
}
