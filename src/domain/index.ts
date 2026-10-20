// =========================================================================
// Domain barrel.
// =========================================================================
// Each entity (sample, client, identity, accounting, testParameter, quotation)
// lives in its own subdirectory. Importing from `@/domain` is a convenience
// re-export, but **`/index.ts` is only meant for cross-cutting use cases** —
// app code should import from the entity it needs, so the dependency graph
// stays obvious (`grep "@/domain/sample"` tells you what depends on samples).
// =========================================================================

export * as ResultHelpers from "@/domain/shared/result";
export * as Pagination from "@/domain/shared/pagination";

export * as Sample from "@/domain/sample/model";
export * as SampleRules from "@/domain/sample/rules";
export * as SamplePort from "@/domain/sample/ports";

export * as Client from "@/domain/client/model";
export * as ClientPort from "@/domain/client/ports";

export * as Accounting from "@/domain/accounting/model";
export * as AccountingRules from "@/domain/accounting/rules";
export * as AccountingPort from "@/domain/accounting/ports";

export * as TestParameter from "@/domain/testParameter/model";
export * as TestParameterPort from "@/domain/testParameter/ports";

export * as Identity from "@/domain/identity/model";
export * as IdentityPort from "@/domain/identity/ports";

export * as Quotation from "@/domain/quotation/model";
export * as QuotationRules from "@/domain/quotation/rules";
export * as QuotationPort from "@/domain/quotation/ports";