/**
 * Sample ID generation utility.
 *
 * Format: <PREFIX>/<YYYY>/<NNNN>
 *   PREFIX is the 2-4 letter code for the sample type (see SAMPLE_TYPE_PREFIXES).
 *   YYYY  is the 4-digit year the sample was received.
 *   NNNN  is the 4-digit serial, scoped per-category per-year.
 *
 * Keep SAMPLE_TYPE_PREFIXES in sync with the type list in src/mock-data/sampleTypes.ts.
 */

/** Maps human-readable sample type names to their ID prefixes. */
export const SAMPLE_TYPE_PREFIXES: Record<string, string> = {
  Food: "FD",
  Water: "WT",
  Cosmetics: "CO",
  Drugs: "DR",
  Environmental: "EN",
  Miscellaneous: "MISC",
  "Proficiency test": "PT",
};

/** Default prefix when the sample type isn't recognized. */
export const UNKNOWN_PREFIX = "MISC";

/** Minimal shape required to count existing samples. */
export interface SampleForId {
  id: string;
  sampleType: string;
  /** ISO yyyy-mm-dd — only the year portion is read. */
  receivedDate: string;
}

export interface GenerateSampleIdOptions {
  /** Override the year (defaults to current). Useful for tests. */
  year?: number;
  /** Override the prefix (defaults to lookup from SAMPLE_TYPE_PREFIXES). */
  prefix?: string;
}

/**
 * Mints the next sample ID for a given type.
 *
 * Counter is per-category per-year: scans `existingSamples` for IDs matching
 * `<prefix>/<year>/…`, takes the max serial, returns `max + 1`.
 *
 * Year rollover resets the counter automatically. Unknown types fall back to
 * the MISC prefix so a sample can still be created.
 */
export function generateSampleId(
  sampleType: string,
  existingSamples: ReadonlyArray<SampleForId>,
  options: GenerateSampleIdOptions = {},
): string {
  const year = options.year ?? new Date().getFullYear();
  const prefix = resolvePrefix(sampleType, options.prefix);
  const serial = nextSerial(prefix, year, existingSamples);
  return `${prefix}/${year}/${String(serial).padStart(4, "0")}`;
}

/** Case-insensitive prefix lookup with MISC fallback. */
function resolvePrefix(sampleType: string, override?: string): string {
  if (override) return override;
  const normalized = sampleType.trim().toLowerCase();
  for (const [key, prefix] of Object.entries(SAMPLE_TYPE_PREFIXES)) {
    if (key.toLowerCase() === normalized) return prefix;
  }
  return UNKNOWN_PREFIX;
}

/** Returns max+1 serial for `prefix/year`; returns 1 when none exist. */
function nextSerial(
  prefix: string,
  year: number,
  existingSamples: ReadonlyArray<SampleForId>,
): number {
  const yearStr = String(year);
  const prefixWithSep = `${prefix}/`;
  let max = 0;
  for (const s of existingSamples) {
    if (!s.id.startsWith(prefixWithSep)) continue;
    const parts = s.id.split("/");
    if (parts.length !== 3) continue;
    if (parts[1] !== yearStr) continue;
    const n = Number.parseInt(parts[2], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}
