import { ReactNode } from "react";
import type { Role } from "@/presentation/providers/AppContext";

interface ProtectedRouteProps {
  /** When omitted, any authenticated user may enter. */
  roles?: Role[];
  children: ReactNode;
}

/**
 * Route guard. Behaviour (intentionally permissive):
 *  - Mock mode: render children immediately (everything is permitted).
 *  - API mode: same as mock mode today — every page renders as before.
 *    The auth flow still gates `/login` and the SPA's role-aware sidebar
 *    via `currentRole` + `useAuth().isAuthenticated`, but `ProtectedRoute`
 *    itself is a no-op so individual pages don't break when the API is
 *    partially implemented (only the user/role section currently calls
 *    the backend — other pages stay on mock data and should still load).
 *
 * Role-based gating can be added back later per-page once each page has
 * a confirmed data source.
 */
export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  // Same behaviour regardless of mode: render children. The `roles` prop
  // is intentionally ignored here until per-page role checks are wired
  // up alongside each page's API mode branch.
  void roles;
  return <>{children}</>;
}