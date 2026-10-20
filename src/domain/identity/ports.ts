import type { PageRequest, Page } from "@/domain/shared/pagination";
import type { Result } from "@/domain/shared/result";
import type {
  AuthUser,
  MenuEntry,
  RoleEntry,
  User,
  UserOverrides,
} from "./model";

/**
 * Auth session port — the pattern that Phase 4 builds the auth refactor around.
 *
 * `isApiEnabled()` was read in 20+ places with two incompatible patterns
 * (`enabled:` flag in `queries.ts`; `if (apiOn)` branch in `AuthContext`).
 * Centralising behind one port means the flag is read ONCE, at the composition
 * root, and the two adapters behave identically.
 *
 * NOTE ON `signIn` NOT USING `Result`: every other port here returns
 * `Result<…, RepositoryError>`, and it would be more consistent if this one did
 * too. It deliberately does not — see the method's own doc comment below. The
 * login screen already branches on `instanceof ApiError` vs `instanceof
 * TypeError` to decide between "wrong password" and "backend unreachable", and
 * that distinction is destroyed the moment a 401 and a DNS failure both become
 * a `RepositoryError` with a `code` field.
 *
 * RACE-SEMANTICS CONTRACT (load-bearing — read before changing):
 * `restore()` and `signIn()` may run concurrently. A user who submits the login
 * form while a bootstrap `restore()` is still awaiting must end up
 * AUTHENTICATED. The HTTP adapter is responsible for ensuring a slow
 * `restore()` cannot overwrite a newer `signIn()` — `AuthContext` no longer
 * papers over this with a timestamp heuristic, because the heuristic had to be
 * duplicated in three places and was easy to get wrong.
 */
export interface AuthSession {
  /** Either resolve the existing session from storage or return null. */
  restore(): Promise<Session | null>;
  /**
   * Sign in. THROWS on bad credentials or transport failure rather than
   * returning a `Result` — the existing login page distinguishes
   * `err instanceof ApiError` from `err instanceof TypeError`, and that
   * distinction is lossy when collapsed into a single `Result` error code.
   * Transport failures and credential failures are different UX paths and
   * must remain Throwable.
   *
   * The mock adapter never throws — mock-mode login always succeeds.
   */
  signIn(credentials: Credentials): Promise<Session>;
  /**
   * Adopt a session obtained WITHOUT a round-trip through this adapter.
   *
   * This exists for the OTP flow: `/auth/otp/verify` returns the same token
   * pair as `/auth/login`, and the SPA already holds that response by the time
   * it reaches the provider. Making the provider reach back into the HTTP
   * client to re-apply it would re-introduce the very HTTP coupling this port
   * exists to remove.
   */
  adoptSession(session: Session): void;
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
  readonly user: AuthUser;
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