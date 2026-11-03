/**
 * `GET /auth/me/menus` — the signed-in user's RESOLVED effective menu set.
 *
 * ── Why this client exists ────────────────────────────────────────────────
 * The bug this fixes: an admin assigns menus to a role, but the assignment
 * never reaches the affected user's sidebar.
 *
 * The sidebar's only server read path used to be
 * `GET /admin/roles/{role}/menu-permissions`, which is guarded by
 * `require_superadmin_role` (`backend/app/domains/roles/router.py:230-234`).
 * A tenant user holds only a tenant `access` token, so the call answered 401
 * "Wrong token type", the query data stayed `undefined`, and the sidebar
 * silently fell back to its `localStorage` seed. The user's browser therefore
 * always showed the seeded defaults, on every device.
 *
 * This endpoint is the tenant-facing replacement. The server resolves the
 * whole precedence chain — role matrix, per-user overrides, the
 * unconfigured-role default — and returns a flat, already-decided list.
 *
 * ── Token family ──────────────────────────────────────────────────────────
 * This route is guarded by `get_current_user`, which accepts **only** the
 * tenant `access` token (`backend/app/core/deps.py:196-222`). It must
 * therefore NOT use the superadmin-first `authToken()` helper from
 * `rolesApi.ts` — that helper prefers the superadmin token, and presenting
 * it here would trade one "Wrong token type" 401 for another.
 *
 * `apiFetch` already defaults to the tenant token (`getToken()`) when no
 * explicit token is supplied, so this client deliberately passes none. That
 * also means the token is read per-request, so a logout takes effect
 * immediately.
 */

import { apiFetch } from "@/infrastructure/api/api";
import { unwrapData, type SuccessEnvelope } from "@/infrastructure/api/response";

/**
 * One resolved menu decision.
 *
 * `source` records WHICH layer decided — `role` for the role × menu matrix,
 * `override` for a per-user override. The frontend does not re-implement the
 * precedence; it only reports which layer won, for the UI.
 */
export interface EffectiveMenu {
  menuKey: string;
  enabled: boolean;
  source: "role" | "override";
}

/** The shape the backend actually sends (snake_case). */
interface RawEffectiveMenu {
  menu_key: string;
  enabled: boolean;
  source: "role" | "override";
}

/** The shape the backend actually sends (snake_case). */
interface RawEffectiveMenus {
  role: string;
  menus: RawEffectiveMenu[];
  version: string;
}

export interface EffectiveMenus {
  /** The role the resolution was made for. */
  role: string;
  /** The resolved menu set, sorted by key. */
  menus: EffectiveMenu[];
  /**
   * A change token over the resolved set (`sha256:…`).
   *
   * It changes exactly when the resolved set changes and is identical for
   * two identical reads, so the client can detect staleness without diffing
   * the payload.
   */
  version: string;
}

/**
 * Bridge the backend's snake_case payload to this module's camelCase type.
 *
 * The backend emits `{"menu_key": "samples", "enabled": true,
 * "source": "role"}` (`backend/app/domains/roles/schemas.py`), but the
 * presentation layer works in camelCase. Normalising at the boundary keeps
 * the rest of the app free of the wire format.
 */
function normalizeEffectiveMenu(raw: RawEffectiveMenu): EffectiveMenu {
  return {
    menuKey: raw.menu_key,
    enabled: raw.enabled,
    source: raw.source,
  };
}

/** GET /auth/me/menus — the current user's resolved effective menu set. */
export async function getMyMenus(): Promise<EffectiveMenus> {
  const env = await apiFetch<SuccessEnvelope<RawEffectiveMenus>>("/auth/me/menus");
  const raw = unwrapData(env);
  return {
    role: raw.role,
    menus: raw.menus.map(normalizeEffectiveMenu),
    version: raw.version,
  };
}
