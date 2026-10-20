// =========================================================================
// i18n types — the foundation for the Phase-0 i18n primitive.
//
// GreenLabLIMS is bilingual EN/AR with RTL, but historically every consumer
// declared its own inline `labels = { en: {...}, ar: {...} }` object and a
// local `t()`. Nothing was shared, nothing was checked, and a missing Arabic
// string was a silent runtime hole.
//
// The migration target (deliberately NOT a flat 3k-key registry — see the
// plan): per-vertical modules under `shared/i18n/domains/<vertical>/`, where
// the Arabic table is typed as `typeof` the English table. That makes a
// missing or misspelled Arabic key a COMPILE error rather than a blank
// label in production.
//
// This file only defines the shape. Migrating the ~76 existing label objects
// is a follow-up pass; nothing here changes behaviour today.
// =========================================================================

export type { Language } from "@/shared/lib/types";

/**
 * A value that exists in every supported language.
 * `T` defaults to `string` but may be any shape (e.g. a function, as used by
 * `ApprovalLabels.bulkApprove`).
 */
export type Localised<T = string> = Readonly<Record<"en" | "ar", T>>;