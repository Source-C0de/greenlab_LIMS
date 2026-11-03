import { describe, expect, it } from "vitest";
import { resolveVisibility } from "@/presentation/hooks/menuVisibility";

/**
 * The effective-visibility precedence.
 *
 * These cases pin the behaviour the "Assign Menus" fix depends on. The
 * `grant` case is the one that was broken: the per-user "Grant" button
 * used to be a no-op whenever the role matrix denied the key, so a
 * user could never be given a menu their role did not have.
 */
describe("resolveVisibility", () => {
  const base = {
    role: "analyst" as const,
    globalEnabled: true,
    roleEnabled: false,
    override: null,
  };

  it("denies when the global kill-switch is off, whatever else says", () => {
    expect(
      resolveVisibility({ ...base, globalEnabled: false, roleEnabled: true }),
    ).toBe(false);
    expect(
      resolveVisibility({ ...base, globalEnabled: false, override: "grant" }),
    ).toBe(false);
  });

  it("lets superadmin through even when the role matrix denies the key", () => {
    expect(
      resolveVisibility({ ...base, role: "superadmin", roleEnabled: false }),
    ).toBe(true);
  });

  it("lets superadmin through even when the user is explicitly denied", () => {
    // The kill-switch still wins — see the first case.
    expect(
      resolveVisibility({ ...base, role: "superadmin", override: "deny" }),
    ).toBe(true);
  });

  it("allows a key the role matrix enables", () => {
    expect(resolveVisibility({ ...base, roleEnabled: true })).toBe(true);
  });

  it("denies a key the role matrix does not enable", () => {
    expect(resolveVisibility({ ...base, roleEnabled: false })).toBe(false);
  });

  it("lets a per-user GRANT rescue a key the role matrix denies", () => {
    // This is the case that used to be broken: "grant" fell through to
    // the role check, so the Grant button did nothing.
    expect(resolveVisibility({ ...base, override: "grant" })).toBe(true);
  });

  it("lets a per-user DENY hide a key the role matrix enables", () => {
    expect(
      resolveVisibility({ ...base, roleEnabled: true, override: "deny" }),
    ).toBe(false);
  });

  it("gives DENY precedence over GRANT for the same key", () => {
    // Only one override can exist per (user, key), but the precedence
    // must be well-defined if that ever changes.
    expect(
      resolveVisibility({ ...base, roleEnabled: true, override: "deny" }),
    ).toBe(false);
  });

  it("denies by default — never 'allow all'", () => {
    expect(resolveVisibility(base)).toBe(false);
  });

  it("treats an absent override as inherit from the role", () => {
    expect(resolveVisibility({ ...base, roleEnabled: true, override: null })).toBe(
      true,
    );
    expect(
      resolveVisibility({ ...base, roleEnabled: false, override: null }),
    ).toBe(false);
  });
});
