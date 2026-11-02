/**
 * Route guard — enforces authentication and role-based access.
 *
 * ── The bug this fixes ───────────────────────────────────────────────────
 * This component used to be an intentional no-op: it accepted a `roles` prop,
 * discarded it (`void roles`), and rendered `children` unconditionally. Every
 * route in `App.tsx` already wraps itself in `<ProtectedRoute roles={[...]}>`,
 * so the correct role lists were declared all along — they were simply never
 * enforced. The result: after logging out, pasting any app URL (e.g.
 * `/admin/users`) rendered the full page, and pages backed by mock data
 * happily displayed their records to an anonymous visitor.
 *
 * ── The guard ────────────────────────────────────────────────────────────
 * Three states, in order:
 *   1. `isLoading`  → render nothing. The bootstrap `restore()` call is a
 *      network round-trip; redirecting during it would bounce a legitimately
 *      logged-in user to `/login` on every page load (and reintroduce the
 *      flicker the root route already avoids — see `App.tsx`).
 *   2. not authenticated → redirect to `/login`.
 *   3. authenticated but role not permitted → redirect to `/dashboard`
 *      (their own landing page) rather than showing a dead end.
 *
 * The role is read from `useAuth().user.role`, NOT from
 * `AppContext.currentRole`. `currentRole` is a *view* concern — the sidebar
 * and role-switcher mutate it — and it deliberately survives logout (see the
 * comment in `AuthContext.logout`), so gating on it would let a stale role
 * grant access to an anonymous user. The authenticated identity is the only
 * trustworthy source for an access decision.
 *
 * NOTE: this is a UX/access-control boundary for the SPA's own routes, not a
 * security boundary. Real enforcement is server-side: the FastAPI backend
 * returns 401 for unauthenticated data requests regardless of what the SPA
 * renders. Mock-backed pages hold no sensitive real data, but they should still
 * not render for a signed-out visitor.
 */

import type { ReactNode } from "react";
import { Redirect } from "wouter";

import { useAuth } from "@/presentation/providers/AuthContext";
import type { Role } from "@/presentation/providers/AppContext";

interface ProtectedRouteProps {
  /** When omitted, any authenticated user may enter. */
  roles?: readonly Role[];
  /**
   * Require a **superadmin** session rather than a tenant one.
   *
   * The platform admin console (`/admin/*`) is guarded by the superadmin
   * token family, not the tenant one — the backend issues separate tokens
   * and resolves them against separate tables
   * (`app/core/deps.py:49-83,109-183`). A tenant `admin` must NOT be able
   * into the platform console on the strength of a tenant token.
   *
   * When this is set, the guard consults the superadmin session and ignores
   * the tenant session entirely.
   */
  platformOnly?: boolean;
  children: ReactNode;
}

/** Where an authenticated-but-wrong-role user lands. */
const ROLE_DENIED_REDIRECT = "/dashboard";
const ANONYMOUS_REDIRECT = "/login";
/** Where an unauthenticated platform visitor lands. */
const ANONYMOUS_PLATFORM_REDIRECT = "/superadmin";

export function ProtectedRoute({
  roles,
  platformOnly = false,
  children,
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    user,
    isSuperadminAuthenticated,
    isSuperadminLoading,
    superadminUser,
  } = useAuth();

  // ── Platform guard ────────────────────────────────────────────────────
  // A separate branch because the superadmin session is a separate identity:
  // it has its own token family, its own storage, and its own restore path.
  if (platformOnly) {
    // Bootstrap in flight — render NOTHING. See the `pending` note in
    // `AuthContext` for why a navigation issued right after the login
    // resolves can land before the provider has re-rendered, and why
    // rendering nothing (rather than redirecting on a stale value) is the
    // fix.
    if (isSuperadminLoading) return null;

    if (!isSuperadminAuthenticated || !superadminUser) {
      return <Redirect to={ANONYMOUS_PLATFORM_REDIRECT} />;
    }
    if (roles && !roles.includes(superadminUser.role)) {
      return <Redirect to={ROLE_DENIED_REDIRECT} />;
    }
    return <>{children}</>;
  }

  // 1. Bootstrap in flight — render nothing rather than flash /login at a
  //    user who is, in fact, still logged in.
  //
  // `isLoading` covers BOTH the initial bootstrap and an in-flight sign-in.
  // The sign-in case matters just as much — see the `pending` note in
  // `AuthContext` for why a navigation issued right after the login resolves
  // can render this guard with a stale `isAuthenticated: false` and bounce
  // the user straight back to /login.
  if (isLoading) return null;

  // 2. No authenticated identity — send them to the login page.
  if (!isAuthenticated || !user) {
    return <Redirect to={ANONYMOUS_REDIRECT} />;
  }

  // 3. Authenticated, but this route is restricted and their role isn't listed.
  if (roles && !roles.includes(user.role)) {
    return <Redirect to={ROLE_DENIED_REDIRECT} />;
  }

  return <>{children}</>;
}