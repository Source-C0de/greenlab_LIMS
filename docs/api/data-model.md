# Data Model — GreenLabLIMS KSA

> Single-tenant PostgreSQL model. Every field listed here is either
> required by today's frontend SPA, or implied by the screens the SPA
> renders. When in doubt, mirror the **TypeScript type exactly** — the
> TypeScript types in `src/mock-data/*.ts` are the contract.

The shape of this document is one section per domain, each with a table
of `Field | Type | Notes / Source`. At the end, an entity-relationship
diagram in prose.

## 0. Conventions

- **Primary keys:** server-minted strings (ULID preferred — sortable
  by creation time, opaque to users).
- **Sample IDs are the one exception** — see [§9 Samples](#9-samples).
- **Timestamps:** ISO-8601 UTC strings (`"2026-09-19T10:30:00Z"`).
- **Money:** numbers in SAR (Saudi Riyals), 2 decimal places.
- **Language:** all user-visible bilingual fields are paired
  `nameEn` / `nameAr` (or `labelEn` / `labelAr`, `titleEn` / `titleAr`,
  `descriptionEn` / `descriptionAr`). Status codes and enum values are
  **never** localized.
- **Soft-delete:** every domain table has `deletedAt` (nullable).
  List endpoints exclude soft-deleted rows by default; the
  `?includeDeleted=true` flag re-includes them.

## 1. Roles

The role enum is fixed. There are exactly **seven** roles. The set
matches `src/context/AppContext.tsx:3` exactly.

```ts
type Role = "superadmin" | "admin" | "lab_manager" | "analyst"
          | "client" | "accountant" | "receptionist";
```

`superadmin` is **just a role** — there is no separate path scope
(`/api/superadmin/...` is intentionally not used; see the lineage note
in [`README.md`](./README.md)).

## 2. Users (`users`)

Mirrors the SPA's auth surface (`login.tsx`, `superadmin-login.tsx`).
Passwords are stored as bcrypt hashes — never plaintext, never
returned in responses.

| Field           | Type          | Notes |
|-----------------|---------------|-------|
| `id`            | string (ULID) | PK |
| `username`      | string        | Unique. Used for login. |
| `email`         | string        | Unique. Optional for some roles. |
| `fullName`      | string        | Display name. |
| `fullNameAr`    | string?       | Bilingual display name. |
| `role`          | Role          | See §1. |
| `passwordHash`  | string        | bcrypt. Never returned. |
| `isActive`      | bool          | Default true. Disabled users can't log in. |
| `clientId`      | string?       | FK → `clients.id`. Set when `role === "client"` (client portal users). |
| `lastLoginAt`   | string?       | ISO datetime. |
| `createdAt`     | string        | ISO datetime. |
| `updatedAt`     | string        | ISO datetime. |
| `deletedAt`     | string?       | Soft-delete tombstone. |

## 3. Clients (`clients`)

Mirrors `src/mock-data/clients.ts`. ZATCA-relevant: VAT number is
exactly 15 digits (enforced at `clients.tsx:34`).

| Field            | Type          | Notes |
|------------------|---------------|-------|
| `id`             | string        | PK. Format `C001`-style (today's mock IDs). |
| `nameEn`         | string        | |
| `nameAr`         | string        | |
| `type`           | string        | Free-form industry category (today: "Food & Beverage", "Oil & Gas", etc.). |
| `vatNo`          | string        | 15 digits. ZATCA VAT number. |
| `email`          | string        | |
| `phone`          | string        | |
| `contactPerson`  | string?       | |
| `contactPhone`   | string?       | |
| `address`        | string?       | |
| `city`           | string?       | |
| `crNumber`       | string?       | Saudi Commercial Registration number. |
| `isActive`       | bool          | Default true. "Deactivate" action flips this (not delete). |
| `createdAt`      | string        | |
| `updatedAt`      | string        | |
| `deletedAt`      | string?       | |

## 4. Sample types (`sample_types`)

Mirrors `src/lib/sample-id.ts:13` (`SAMPLE_TYPE_PREFIXES`).

| Field        | Type   | Notes |
|--------------|--------|-------|
| `code`       | string | PK. Two-letter prefix: `FD`, `WT`, `CN`, `PH`, `SO`, `EN`, `MISC`. |
| `nameEn`     | string | "Food" / "Water" / etc. |
| `nameAr`     | string | |
| `description`| string?| |
| `isActive`   | bool   | |

## 5. Analysts (`analysts`)

Distinct from `users` — analysts are the *lab staff who perform tests*.
The SPA references them by name today (`samples.ts:21-30`) and by id in
some places. Server should resolve both for backward compatibility.

| Field        | Type          | Notes |
|--------------|---------------|-------|
| `id`         | string (ULID) | PK |
| `userId`     | string?       | FK → `users.id`. Set when the analyst also has a login. |
| `fullName`   | string        | |
| `fullNameAr` | string?       | |
| `email`      | string        | |
| `signatureUrl` | string?    | Public URL to PNG signature image (used on reports). NULL until uploaded. |
| `isActive`   | bool          | |
| `createdAt`  | string        | |
| `updatedAt`  | string        | |

## 6. Specifications (`specifications`)

Mirrors `src/mock-data/specifications.ts`. A specification is a
reusable test bundle (parameters + acceptable ranges) linked to a
sample type.

| Field            | Type          | Notes |
|------------------|---------------|-------|
| `id`             | string (ULID) | PK |
| `code`           | string        | Human-readable code (e.g. `SPEC-WT-001`). |
| `nameEn`         | string        | |
| `nameAr`         | string        | |
| `category`       | string        | Links loosely to `sample_types.code`. |
| `version`        | integer       | Starts at 1. Bumps on every approval. |
| `status`         | string        | `"Draft" \| "Pending Approval" \| "Approved" \| "Rejected" \| "Superseded"`. |
| `parameters`     | object[]      | See §7. |
| `tests`          | object[]      | See §8. |
| `issuanceDate`   | string        | ISO date. |
| `createdById`    | string        | FK → `users.id`. |
| `approvedById`   | string?       | FK → `users.id`. |
| `approvedAt`     | string?       | ISO datetime. |
| `createdAt`      | string        | |
| `updatedAt`      | string        | |
| `deletedAt`      | string?       | |

## 7. Spec parameters (`spec_parameters`)

Mirrors `SpecParameter` in `specifications.ts`. Per-parameter
acceptable range and method reference.

| Field           | Type           | Notes |
|-----------------|----------------|-------|
| `id`            | string (ULID)  | PK |
| `specificationId` | string       | FK → §6. |
| `name`          | string         | "pH", "Lead", etc. |
| `method`        | string?        | Free text. |
| `unit`          | string         | "%", "mg/L", "CFU/ml". |
| `min`           | number?        | |
| `max`           | number?        | |
| `target`        | number?        | |
| `limitType`     | string         | `"Range" \| "Max Only" \| "Min Only" \| "Exact Value" \| "Pass / Fail" \| "Text" \| "Not Detected"`. Mirrors `TestLimitType` in `specifications.ts:32-39`. |
| `reference`     | string?        | "ISO 10523", "AOAC 989.05". |
| `mu`            | string?        | Measurement uncertainty, e.g. "±0.05". |

## 8. Spec tests (`spec_tests`)

Per-spec test definitions — copied into a Sample as a `Test` when
the sample is received (`samples/receiving.tsx:128-133`).

| Field            | Type          | Notes |
|------------------|---------------|-------|
| `id`             | string (ULID) | PK |
| `specificationId`| string        | FK → §6. |
| `testCode`       | string        | |
| `testName`       | string        | |
| `testParameter`  | string        | |
| `methodType`     | string        | |
| `methodReference`| string        | |
| `sampleType`     | string        | `sample_types.code`. |
| `referenceNo`    | string        | |
| `sopCode`        | string        | |
| `warehouseItems` | string        | Comma-separated reagent IDs (legacy field). |
| `parameterDetails` | string?     | JSON-encoded `TestParameterRow[]`. |

## 9. Samples (`samples`)

Mirrors `src/mock-data/samples.ts` and `MockSample` (line 103+).

**ID format is locked:** `<PREFIX>/<YYYY>/<NNNN>` where
`<PREFIX>` is the sample type code and `<NNNN>` is a rolling 4-digit
serial per prefix per year. See `src/lib/sample-id.ts:18-43`. The
`MISC` prefix is the fallback (`samples.ts:5-9`). The **backend must
mint these IDs** — the SPA generates them today
(`samples/receiving.tsx:88-100`) and that logic moves server-side.

| Field          | Type          | Notes |
|----------------|---------------|-------|
| `id`           | string        | PK. `<PREFIX>/<YYYY>/<NNNN>`. |
| `clientId`     | string        | FK → §3. |
| `clientName`   | string        | Denormalized for display (kept in sync with `clients.nameEn`). |
| `sampleType`   | string        | `sample_types.code`. |
| `description`  | string        | |
| `status`       | string        | `"Received" \| "In Progress" \| "Awaiting Approval" \| "Approved" \| "Rejected" \| "On Hold" \| "Completed"`. |
| `assignedAnalyst` | string?    | FK → `users.id` or `analysts.id` (server tolerates both). |
| `receivedDate` | string        | ISO date. |
| `completedDate`| string?       | ISO date. |
| `priority`     | string        | `"Normal" \| "High" \| "Urgent"`. |
| `tests`        | Test[]        | See §10. |
| `sampleName`   | string?       | Commercial/generic product name (COA display). |
| `batchNumber`  | string?       | Manufacturer batch/lot. |
| `mfgDate`      | string?       | ISO date. |
| `expiryDate`   | string?       | ISO date. |
| `environmentalConditions` | string? | |
| `storageCondition` | string?    | |
| `createdAt`    | string        | |
| `updatedAt`    | string        | |
| `deletedAt`    | string?       | |

## 10. Tests (`tests`)

Mirrors `Test` interface in `samples.ts:80-101`. The lifecycle and
approval state machine is non-trivial — see the SPA's `currentStage()`
helper at `samples.ts:139-147` for the canonical flow.

### 10.1 Lifecycle

```
pending
  ↓ (analyst starts work)
in_progress
  ↓ (analyst submits; all parameters must be filled)
awaiting_lab_supervisor
  ↓ approved
awaiting_tech_manager
  ↓ approved
awaiting_qa
  ↓ approved
qa_approved     (terminal)
```

Any reject → `changes_requested` → loops back to `in_progress`.

### 10.2 Fields

| Field         | Type          | Notes |
|---------------|---------------|-------|
| `id`          | string (ULID) | PK. |
| `sampleId`    | string        | FK → §9. |
| `name`        | string        | "Chemical Analysis". |
| `category`    | string        | "Chemical", "Microbiological", etc. |
| `method`      | string        | "AOAC 989.05". |
| `assignedTo`  | string?       | FK → `users.id` (the analyst). |
| `reviewStatus`| string        | See §10.1 enum. |
| `parameters`  | ParameterValue[] | See §11. |
| `reviewHistory` | TestReviewEntry[] | Append-only audit trail. See §12. |
| `approvals`   | object        | `{ lab_supervisor: StageApproval \| null, tech_manager: StageApproval \| null, qa: StageApproval \| null }`. See §13. |
| `submittedAt` | string?       | ISO datetime. |
| `qaApprovedAt`| string?       | ISO datetime. |
| `createdAt`   | string        | |
| `updatedAt`   | string        | |
| `deletedAt`   | string?       | |

## 11. Parameter values (`test_parameters` or `tests.parameters`)

Embedded in `Test.parameters` (`ParameterValue[]` in
`samples.ts:45-60`). The backend should store them as a JSONB column
on `tests` *or* as a related table — either works as long as the
shape matches the wire format.

| Field       | Type     | Notes |
|-------------|----------|-------|
| `id`        | string   | Mirrors `SpecParameter.id`. |
| `name`      | string   | |
| `value`     | string?  | Raw entry from the analyst. NULL until filled. |
| `unit`      | string   | |
| `min`       | number?  | |
| `max`       | number?  | |
| `target`    | number?  | |
| `limitType` | string?  | Mirrors `TestLimitType`. |
| `mu`        | string?  | Measurement uncertainty. |
| `reference` | string?  | |
| `status`    | string   | `"pending" \| "pass" \| "fail"`. **Computed server-side** against `min`/`max` when `value` is set. |
| `note`      | string?  | |

## 12. Test review entries (`test_review_entries` or `tests.reviewHistory`)

Append-only audit trail. Same storage choice as §11.

| Field               | Type    | Notes |
|---------------------|---------|-------|
| `id`                | string  | |
| `testId`            | string  | FK → §10. |
| `reviewerId`        | string  | FK → `users.id`. |
| `reviewerEmail`     | string  | Denormalized for display. |
| `reviewerName`      | string? | |
| `reviewerRole`      | string? | `Role`. |
| `decision`          | string  | `"approved" \| "changes_requested"`. |
| `stage`             | string? | `"lab_supervisor" \| "tech_manager" \| "qa"`. |
| `reason`            | string? | Required when `decision === "changes_requested"`. |
| `comment`           | string? | |
| `previousReviewStatus` | string | |
| `newReviewStatus`   | string  | |
| `createdAt`         | string  | |

## 13. Stage approvals (`tests.approvals`)

Embedded in `Test.approvals` (`samples.ts:91-95`). One row per stage
when signed off.

| Field          | Type    | Notes |
|----------------|---------|-------|
| `stage`        | string  | `"lab_supervisor" \| "tech_manager" \| "qa"`. |
| `approverRole` | string  | The role that owns this stage (today `lab_manager` for the first two, `qa` for the last; configurable). |
| `approverName` | string  | |
| `approverId`   | string  | FK → `users.id`. |
| `approverEmail`| string  | |
| `approvedAt`   | string  | ISO datetime. |
| `comment`      | string? | |

## 14. Reports (`reports`)

Mirrors `src/mock-data/reports.ts`. Generated when all tests on a
sample reach `qa_approved`.

| Field            | Type          | Notes |
|------------------|---------------|-------|
| `id`             | string (ULID) | PK. |
| `sampleId`       | string        | FK → §9. |
| `reportNumber`   | string        | Human-readable, e.g. `RPT-2024-0001`. |
| `status`         | string        | `"Draft" \| "Final" \| "Re-issued" \| "Supplement"`. |
| `analystId`      | string?       | FK → `users.id` (assigned analyst). |
| `reviewerId`     | string?       | FK → `users.id` (QA approver). |
| `analystSignatureUrl` | string? | PNG. From `analysts.signatureUrl`. |
| `reviewerSignatureUrl` | string? | PNG. |
| `issuedAt`       | string?       | ISO date when status became `Final`. |
| `pdfUrl`         | string?       | Optional: server-generated PDF (the SPA generates PDFs client-side today via `src/lib/pdf-report.ts`). |
| `parametersSnapshot` | object[]  | Frozen copy of `tests.parameters` at publish time. |
| `createdAt`      | string        | |
| `updatedAt`      | string        | |
| `deletedAt`      | string?       | |

## 15. Invoices (`invoices`)

Mirrors `src/mock-data/invoices.ts` (and `Invoice` interface). The
ZATCA fields are non-negotiable: the **backend** signs the invoice and
generates the UUID/hash/QR.

| Field          | Type          | Notes |
|----------------|---------------|-------|
| `id`           | string        | PK. `INV-YYYY-NNNN`. |
| `clientId`     | string        | FK → §3. |
| `clientName`   | string        | Denormalized. |
| `sampleId`     | string?       | FK → §9. May be null for non-sample invoices. |
| `issueDate`    | string        | ISO date. |
| `dueDate`      | string        | ISO date. |
| `subtotal`     | number        | SAR. |
| `vat`          | number        | SAR. 15%. |
| `total`        | number        | SAR. |
| `status`       | string        | `"Draft" \| "Pending" \| "Paid" \| "Overdue" \| "Cancelled"`. |
| `vatNo`        | string        | 15 digits. ZATCA. |
| `uuid`         | string        | ZATCA UUID. Server-generated. |
| `hash`         | string        | ZATCA SHA-256 hash. Server-generated. |
| `qrCode`       | string        | Base64 TLV-encoded QR (ZATCA spec). Server-generated. |
| `invoiceType`  | string        | `"Tax Invoice" \| "Simplified Tax Invoice"`. |
| `isReported`   | bool          | True once cleared with ZATCA. |
| `reportedAt`   | string?       | ISO datetime. |
| `irn`          | string?       | ZATCA Invoice Reference Number (returned after reporting). |
| `createdAt`    | string        | |
| `updatedAt`    | string        | |
| `deletedAt`    | string?       | |

## 16. Chart of accounts (`accounts`)

Mirrors `src/mock-data/accounts.ts`. The 5 standard account types.

| Field      | Type          | Notes |
|------------|---------------|-------|
| `id`       | string        | PK. Account code, e.g. `1100`. |
| `nameEn`   | string        | "Cash". |
| `nameAr`   | string        | "النقدية". |
| `type`     | string        | `"Asset" \| "Liability" \| "Equity" \| "Revenue" \| "Expense"`. |
| `parentId` | string?       | Self-FK for hierarchical display (`accounts.ts` builds a tree). |
| `isActive` | bool          | |
| `createdAt`| string        | |
| `updatedAt`| string        | |

## 17. Journal entries (`journal_entries`)

Mirrors `JournalEntry` in `journals.ts`. Posting an invoice creates a
row here (auto-generated by `AccountingEngine.postInvoice` in
`src/lib/accounting-utils.ts:43`).

| Field        | Type          | Notes |
|--------------|---------------|-------|
| `id`         | string (ULID) | PK. |
| `date`       | string        | ISO date. |
| `description`| string        | |
| `memo`       | string?       | |
| `status`     | string        | `"Draft" \| "Posted" \| "Reversed"`. |
| `sourceType` | string        | `"invoice" \| "payment" \| "expense" \| "manual"`. |
| `sourceId`   | string?       | FK to source row. |
| `postedById` | string?       | FK → `users.id`. |
| `postedAt`   | string?       | ISO datetime. |
| `lines`      | JournalLine[] | See §18. |
| `createdAt`  | string        | |
| `updatedAt`  | string        | |

## 18. Journal lines (`journal_lines`)

Embedded in `JournalEntry.lines`. Always balanced (sum debits ==
sum credits).

| Field        | Type    | Notes |
|--------------|---------|-------|
| `id`         | string  | |
| `entryId`    | string  | FK → §17. |
| `accountId`  | string  | FK → §16. |
| `debit`      | number  | SAR. 0 when credit is set. |
| `credit`     | number  | SAR. 0 when debit is set. |
| `description`| string? | |
| `costCenter` | string? | Optional segment. |

## 19. Expenses (`expenses`)

Mirrors `src/mock-data/expenses.ts`. Posted against the Input VAT +
Cash accounts when recorded.

| Field        | Type          | Notes |
|--------------|---------------|-------|
| `id`         | string (ULID) | PK. |
| `date`       | string        | ISO date. |
| `category`   | string        | "Reagents", "Utilities", "Rent", etc. |
| `description`| string        | |
| `amount`     | number        | SAR, pre-VAT. |
| `vatAmount`  | number        | SAR. |
| `total`      | number        | SAR. |
| `vendor`     | string?       | |
| `receiptUrl` | string?       | Optional attachment. |
| `status`     | string        | `"Draft" \| "Posted" \| "Reimbursed"`. |
| `createdById`| string        | FK → `users.id`. |
| `journalEntryId` | string?   | FK → §17. Set when posted. |
| `createdAt`  | string        | |
| `updatedAt`  | string        | |
| `deletedAt`  | string?       | |

## 20. Reagents / inventory (`reagents`)

Mirrors `src/mock-data/reagents.ts`. Status is **derived**
(`inventory.tsx:53`) from `quantity` and `expiryDate`. The backend
should compute it the same way and expose it on read; it is
**not** a stored column.

| Field          | Type          | Notes |
|----------------|---------------|-------|
| `id`           | string (ULID) | PK. |
| `nameEn`       | string        | |
| `nameAr`       | string        | |
| `catalogNo`    | string        | |
| `supplier`     | string?       | |
| `quantity`     | number        | |
| `unit`         | string        | "bottle", "kg", etc. |
| `minQuantity`  | number        | Below this → `status === "Low Stock"`. |
| `expiryDate`   | string        | ISO date. Past → `status === "Expired"`. |
| `location`     | string?       | |
| `costPerUnit`  | number?       | SAR. |
| `status`       | string        | **Computed on read.** `"OK" \| "Low Stock" \| "Expired"`. |
| `createdAt`    | string        | |
| `updatedAt`    | string        | |
| `deletedAt`    | string?       | |

## 21. Notifications (`notifications`)

Mirrors `AppNotification` (read in `NotificationContext`, not inventoried
in detail but referenced).

| Field        | Type          | Notes |
|--------------|---------------|-------|
| `id`         | string (ULID) | PK. |
| `userId`     | string        | FK → `users.id`. NULL → broadcast to all. |
| `role`       | string?       | Broadcast to all users of a role when `userId` is null. |
| `type`       | string        | `"sample.received" \| "test.approved" \| "test.rejected" \| "report.published" \| "invoice.paid" \| ...`. |
| `title`      | string        | |
| `body`       | string?       | |
| `link`       | string?       | Internal route, e.g. `/samples/FD/2024/0001`. |
| `readAt`     | string?       | ISO datetime. NULL = unread. |
| `createdAt`  | string        | |

## 22. Tenants (`tenants`)

Even though we're single-tenant, the SPA has a `tenants.ts` mock and an
`admin.tsx` page that displays it. The v1 spec keeps the surface for
forward compatibility but treats the table as a **single-row** singleton.

| Field        | Type          | Notes |
|--------------|---------------|-------|
| `id`         | string        | PK. The literal `"default"` in v1. |
| `name`       | string        | Lab name. |
| `nameAr`     | string        | |
| `slug`       | string        | `^[a-z0-9-]+$`. |
| `planCode`   | string        | `"starter" \| "professional" \| "enterprise"`. |
| `status`     | string        | `"active" \| "trial" \| "suspended" \| "cancelled"`. |
| `contactEmail` | string      | |
| `contactPhone` | string?     | |
| `crNumber`   | string?       | Saudi CR. |
| `vatNumber`  | string?       | ZATCA VAT. |
| `city`       | string?       | |
| `region`     | string?       | One of the 13 Saudi regions. |
| `billingCycle` | string      | `"monthly" \| "yearly"`. |
| `trialEndsAt`| string?       | ISO datetime. |
| `suspensionReason` | string? | |
| `createdAt`  | string        | |
| `updatedAt`  | string        | |
| `deletedAt`  | string?       | |

## 23. Plans (`plans`)

Static reference table, read-only at runtime.

| Field        | Type    | Notes |
|--------------|---------|-------|
| `code`       | string  | PK. `"starter" \| "professional" \| "enterprise"`. |
| `nameEn`     | string  | |
| `nameAr`     | string  | |
| `priceMonthly` | number | SAR. |
| `priceYearly`  | number | SAR. |
| `features`   | string[] | Bullet list. |
| `isActive`   | bool    | |

## 24. Feature flags (`saas_feature_flags`)

Mirrors the three switches in `admin.tsx:283-312`.

| Field        | Type    | Notes |
|--------------|---------|-------|
| `key`        | string  | PK. e.g. `"multi_tenant"`, `"api_v2_enabled"`. |
| `enabled`    | bool    | |
| `description`| string? | |
| `updatedAt`  | string  | |
| `updatedById`| string? | FK → `users.id`. |

## 25. Menu items (`menu_items`) and role permissions (`role_permissions`)

Today these live in `src/mock-data/menuPermissions.ts` and
`src/mock-data/rolePermissions.ts`, persisted to `localStorage` via
`useMenuPermissions.ts:65` and `useRolePermissions.ts:66`. The SPA
admin toggles them and the changes affect which sidebar entries show
for which role. The backend must own these tables so changes
propagate to all admin sessions.

| Table | Fields |
|-------|--------|
| `menu_items` | `id`, `key` (e.g. `"samples"`), `href`, `parentKey?`, `icon?`, `labelEn`, `labelAr`, `section` (`"main" \| "accounting" \| "specifications" \| "client_portal" \| "settings"`), `sortOrder`, `isEnabled`, `isSystem`. |
| `role_permissions` | `id`, `menuItemId` (FK), `roleCode` (Role), `enabled`. Sparse — absent rows mean "implicitly denied". |

The "matrix" view joins both and is exposed via
`GET /api/v1/admin/permissions/matrix` (see [`endpoints.md`](./endpoints.md)).

## 26. Entity-relationship summary (prose)

```
users ──┬── role=client ──► clients
        └── role=analyst ─► analysts ─┐
                                     │ assignedAnalyst
samples ──── clientId ──────────────► clients
        └─── assignedAnalyst ───────► analysts / users
        └─── sampleType ────────────► sample_types.code
        └─── tests[]
              └─── assignedTo ──────► users
              └─── parameters[]
              └─── reviewHistory[] (append-only)
              └─── approvals{ lab_supervisor, tech_manager, qa }

specifications ─┬─► sample_types.code (loose, via category)
                ├─► spec_parameters[]
                └─► spec_tests[] ──► copied into samples.tests[] on receive

invoices ──┬── clientId ─► clients
           ├── sampleId ─► samples
           └── uuid/hash/qrCode (ZATCA, server-signed)

journal_entries ──► journal_lines[] ──► accounts (chart of accounts)
     │
     └─── sourceType/sourceId (invoice, payment, expense, manual)

expenses ──► (on post) ──► journal_entries
reagents (status computed from quantity + expiryDate)
notifications ──► users (or role-broadcast)
tenants (single row in v1)
plans (read-only ref)
saas_feature_flags (key/value)
menu_items ──► role_permissions (sparse matrix)
```

## 27. Field-type cheatsheet

| TypeScript             | JSON / Postgres   | Notes |
|------------------------|-------------------|-------|
| `string`               | `string`          | Default. |
| `string` (ISO date)    | `string`          | `"YYYY-MM-DD"`. |
| `string` (ISO datetime)| `string` (timestamptz) | `"YYYY-MM-DDTHH:MM:SSZ"`. |
| `number`               | `number` / `numeric` | SAR amounts use `numeric(12,2)`. |
| `boolean`              | `bool`            | |
| `string \| null`       | `string?`         | Optional. |
| `T[]`                  | `T[]` (JSONB for embedded) | Embedded arrays are JSONB; cross-row collections are real tables. |
| discriminated union    | `string` + field  | Status enums are validated strings. |

## 28. Indexes (minimum set)

- `users.email` UNIQUE, `users.username` UNIQUE.
- `samples.clientId`, `samples.status`, `samples.receivedDate`,
  `samples.sampleType`.
- `tests.sampleId`, `tests.reviewStatus`, `tests.assignedTo`.
- `reports.sampleId`, `reports.status`.
- `invoices.clientId`, `invoices.status`, `invoices.issueDate`,
  `invoices.uuid` UNIQUE.
- `journal_entries.date`, `journal_entries.sourceType+sourceId`.
- `journal_lines.accountId+entryId`.
- `reagents.expiryDate`, `reagents.quantity`.
- `notifications.userId+readAt`.
- `role_permissions(menuItemId, roleCode)` UNIQUE.

## 29. What the SPA does NOT model

These appear in the SPA only as **read-mostly references**; the backend
does not need to expose CRUD for them in v1 unless product asks:

- **Audit log** (out of scope per `backend.md`'s v1 plan; add later).
- **Notifications list UI**: the SPA has the `NotificationContext` but
  reads `mockNotifications` keyed by current role — wire to
  `GET /api/v1/notifications` in integration phase 7.
- **Sample type registry UI**: there is no admin screen to manage
  `sample_types`; the table is seed-only in v1.
- **Parameter library** (`parameterLibrary`) and **test master data**
  (`testMasterData`) are mock collections in `specifications.ts` that
  feed the spec creation UI. They become `parameters` and `test_master`
  tables only when product asks for an admin screen; for v1 they can
  remain static seed data loaded by Alembic.
