import { describe, expect, it } from "vitest";
import {
  extractValidationIssues,
  getApiErrorCode,
  getApiErrorRequestId,
  isErrorEnvelope,
  isSuccessEnvelope,
  unwrapData,
  unwrapPage,
  type SuccessEnvelope,
} from "@/infrastructure/api/response";

/**
 * Regression tests for the envelope vocabulary.
 *
 * The backend's `enveloped` contract is:
 *   success → { data, meta: { request_id, pagination? } }
 *   error   → { error: { code, message, details? }, meta: { request_id } }
 *
 * The backend passes through **raw** any route with no declared
 * `response_model` (`app/main.py:236-243`), so `unwrapData` must fail loudly
 * rather than silently return `undefined`.
 */

const OK_ENVELOPE: SuccessEnvelope<{ id: string }> = {
  data: { id: "1" },
  meta: { request_id: "req-1" },
};

describe("isSuccessEnvelope", () => {
  it("matches a well-formed envelope", () => {
    expect(isSuccessEnvelope(OK_ENVELOPE)).toBe(true);
  });

  it("rejects a body with no meta", () => {
    expect(isSuccessEnvelope({ data: { id: "1" } })).toBe(false);
  });

  it("rejects a body with no data", () => {
    expect(isSuccessEnvelope({ meta: {} })).toBe(false);
  });

  it("rejects a raw (non-enveloped) body", () => {
    expect(isSuccessEnvelope({ id: "1", full_name: "A" })).toBe(false);
  });

  it("rejects null and non-objects", () => {
    expect(isSuccessEnvelope(null)).toBe(false);
    expect(isSuccessEnvelope("nope")).toBe(false);
    expect(isSuccessEnvelope(undefined)).toBe(false);
  });
});

describe("isErrorEnvelope", () => {
  it("matches a well-formed error envelope", () => {
    expect(
      isErrorEnvelope({ error: { code: "not_found", message: "Gone" }, meta: {} }),
    ).toBe(true);
  });

  it("rejects a body with no error object", () => {
    expect(isErrorEnvelope({ meta: {} })).toBe(false);
  });

  it("rejects a null error", () => {
    expect(isErrorEnvelope({ error: null })).toBe(false);
  });
});

describe("unwrapData", () => {
  it("returns the payload", () => {
    expect(unwrapData(OK_ENVELOPE)).toEqual({ id: "1" });
  });

  it("returns a typed null as-is (a delete returning { data: null })", () => {
    expect(unwrapData<null>({ data: null, meta: {} })).toBeNull();
  });

  it("throws for a raw, non-enveloped body instead of returning undefined", () => {
    // This is the case the backend produces for a route with no declared
    // `response_model` — e.g. a file download.
    const raw = { id: "1", full_name: "A" } as unknown as SuccessEnvelope<unknown>;
    expect(() => unwrapData(raw)).toThrow(/not enveloped|Expected a success envelope/i);
  });
});

describe("unwrapPage", () => {
  it("returns items and the pagination window", () => {
    const env: SuccessEnvelope<number[]> = {
      data: [1, 2, 3],
      meta: { pagination: { limit: 50, offset: 0, total: 3 } },
    };
    expect(unwrapPage(env)).toEqual({
      items: [1, 2, 3],
      pagination: { limit: 50, offset: 0, total: 3 },
    });
  });

  it("throws when meta.pagination is missing", () => {
    const env: SuccessEnvelope<number[]> = { data: [1], meta: {} };
    expect(() => unwrapPage(env)).toThrow(/paginated envelope/i);
  });
});

describe("extractValidationIssues", () => {
  it("reads the canonical error.details.errors shape", () => {
    const body = {
      error: {
        code: "validation_error",
        message: "Invalid",
        details: {
          errors: [{ loc: ["body", "email"], msg: "invalid", type: "value_error" }],
        },
      },
      meta: {},
    };
    expect(extractValidationIssues(body)).toHaveLength(1);
    expect(extractValidationIssues(body)[0].msg).toBe("invalid");
  });

  it("falls back to the legacy detail list", () => {
    const body = { detail: [{ loc: ["body"], msg: "bad", type: "value_error" }] };
    expect(extractValidationIssues(body)).toHaveLength(1);
  });

  it("returns an empty array for an unrelated body", () => {
    expect(extractValidationIssues({ foo: 1 })).toEqual([]);
  });
});

describe("getApiErrorCode", () => {
  it("reads the canonical error.code", () => {
    const err = { body: { error: { code: "stale_write", message: "x" }, meta: {} } };
    expect(getApiErrorCode(err)).toBe("stale_write");
  });

  it("returns null for a legacy detail body (no code exists)", () => {
    expect(getApiErrorCode({ body: { detail: "nope" } })).toBeNull();
  });
});

describe("getApiErrorRequestId", () => {
  it("reads meta.request_id under the enveloped contract", () => {
    const err = { body: { error: { code: "x", message: "y" }, meta: { request_id: "r1" } } };
    expect(getApiErrorRequestId(err)).toBe("r1");
  });

  it("reads error.request_id under the modern contract", () => {
    const err = { body: { error: { code: "x", message: "y", request_id: "r2" } } };
    expect(getApiErrorRequestId(err)).toBe("r2");
  });

  it("prefers meta.request_id when both are present", () => {
    const err = {
      body: {
        error: { code: "x", message: "y", request_id: "from-error" },
        meta: { request_id: "from-meta" },
      },
    };
    expect(getApiErrorRequestId(err)).toBe("from-meta");
  });

  it("returns null when no id is present", () => {
    expect(getApiErrorRequestId({ body: { error: { code: "x", message: "y" } } })).toBeNull();
  });
});
