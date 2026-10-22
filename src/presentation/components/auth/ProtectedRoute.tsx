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
  roles?: Role[];
  children: ReactNode;
}

/** Where an authenticated-but-wrong-role user lands. */
const ROLE_DENIED_REDIRECT = "/dashboard";
const ANONYMOUS_REDIRECT = "/login";

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // 1. Bootstrap in flight — render nothing rather than flash /login at a
  //    user who is, in fact, still logged in.
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