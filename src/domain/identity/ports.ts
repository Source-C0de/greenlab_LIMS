import type { PageRequest, Page } from "@/domain/shared/pagination";
import type { Result } from "@/domain/shared/result";
import type {
  MenuEntry,
  RoleEntry,
  User,
  UserOverrides,
} from "./model";

/**
 * Auth session port — the pattern that Phase 4 builds the auth refactor around.
 *
 * Today `isApiEnabled()` is read in 20+ places with two incompatible patterns
 * (`enabled:` flag in `queries.ts`; `if (apiOn)` branch in `AuthContext`).
 * Centralising behind one port means the flag is read ONCE, at the composition
 * root, and the two adapters behave identically.
 */
export interface AuthSession {
  /** Either resolve the existing session from storage or return null. */
  restore(): Promise<Session | null>;
  signIn(credentials: Credentials): Promise<Result<Session>>;
  signOut(): Promise<void>;
  /** Bearer token for outgoing HTTP calls (or null when unauthenticated). */
  currentToken(): string | null;
  /** Subscribe to auth-state changes. Returns an unsubscribe fn. */
  subscribe(listener: (session: Session | null) => void): () => void;
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export interface Session {
  readonly user: User;
  readonly token: string;
  readonly expiresAt: string;
}

// ---------------------------------------------------------------------------
// User repository
// ---------------------------------------------------------------------------

export interface UserQuery extends PageRequest {
  readonly search?: string;
  readonly role?: string;
  readonly status?: string;
}

export interface UserRepository {
  list(query?: UserQuery): Promise<Result<Page<User>>>;
  get(id: string): Promise<Result<User>>;
  create(input: Omit<User, "id">): Promise<Result<{ id: string }>>;
  update(id: string, patch: Partial<User>): Promise<Result<User>>;
  remove(id: string): Promise<Result<void>>;
  /** Read-only — used by the /admin/users/:id override matrix. */
  overrides(userId: string): Promise<Result<UserOverrides>>;
  /** Replace the WHOLE override set for a user. */
  replaceOverrides(
    userId: string,
    overrides: UserOverrides,
  ): Promise<Result<void>>;
  clearOverrides(userId: string): Promise<Result<void>>;
}

// ---------------------------------------------------------------------------
// Permission registries
// ---------------------------------------------------------------------------

export interface MenuRegistry {
  list(): Promise<Result<readonly MenuEntry[]>>;
  get(key: string): Promise<Result<MenuEntry>>;
}

export interface RoleRegistry {
  list(): Promise<Result<readonly RoleEntry[]>>;
  get(slug: string): Promise<Result<RoleEntry>>;
  /** Replace the full menu-key set for one role. Spec-mandated full replace. */
  setMenuKeys(
    slug: string,
    enabledKeys: readonly string[],
  ): Promise<Result<void>>;
}