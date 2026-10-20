/**
 * Mock `AuthSession` adapter — the demo/sandbox login.
 *
 * Reproduces the pre-port mock behaviour exactly, so switching AuthContext
 * onto this adapter is behaviour-preserving:
 *
 *   - Login always succeeds. There is no credential check in mock mode — the
 *     login screen has always been a role picker, not a real authenticator
 *     (see `PUKU.md`: "Login is a demo role picker").
 *   - The active role comes from the `glims_role_override` localStorage key
 *     that `AppContext` reads and writes, so a role chosen in the sandbox
 *     permissions panel survives a refresh. Reading and writing the SAME key
 *     is what keeps the two in sync — introducing a second key here would
 *     silently fork the two systems.
 *   - The token is a synthetic string. Nothing validates it, because nothing
 *     talks to a server in this mode.
 *
 * WHY THE ROLE OVERRIDE IS READ HERE AND NOT PASSED IN: the login form has no
 * role field. The role is ambient, persisted state that both the login screen
 * and `AppContext.setCurrentRole` need to agree on. Duplicating that key in the
 * adapter and the provider would let them drift, so the key lives in exactly
 * one place — this module — and `AppContext` is repointed at it in the
 * AuthContext refactor.
 */

import type { AuthSession, Credentials, Session } from "@/domain/identity/ports";
import type { AuthUser } from "@/domain/identity/model";
import type { Role } from "@/shared/lib/types";

const ROLE_OVERRIDE_KEY = "glims_role_override";

const ROLES: readonly Role[] = [
  "superadmin",
  "admin",
  "lab_manager",
  "analyst",
  "client",
  "accountant",
  "receptionist",
];

function readRoleOverride(): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ROLE_OVERRIDE_KEY);
    if (!raw) return null;
    return (ROLES as readonly string[]).includes(raw) ? (raw as Role) : null;
  } catch {
    return null;
  }
}

export function writeRoleOverride(role: Role | null): void {
  if (typeof window === "undefined") return;
  try {
    if (role === null) window.localStorage.removeItem(ROLE_OVERRIDE_KEY);
    else window.localStorage.setItem(ROLE_OVERRIDE_KEY, role);
  } catch {
    // localStorage unavailable (private mode / quota) — the override simply
    // does not survive a refresh.
  }
}

/** Read the ambient role without touching the network. Exported for AppContext. */
export function currentMockRole(): Role {
  return readRoleOverride() ?? "admin";
}

function mockUserFor(role: Role): AuthUser {
  const now = new Date().toISOString();
  return {
    id: `MOCK-${role}`,
    username: role,
    email: `${role}@greenlablims.sa`,
    fullName: `Mock ${role}`,
    fullNameAr: null,
    role,
    isActive: true,
    clientId: role === "client" ? "C001" : null,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

/** Stable token per session; not validated anywhere in mock mode. */
let mockToken = 0;
function nextToken(): string {
  mockToken += 1;
  return `mock-token-${mockToken}`;
}

/**
 * Monotonic generation, mirroring the HTTP adapter. The mock adapter resolves
 * synchronously so it cannot actually lose a race, but keeping the counter
 * means the two adapters have the same shape and a future async mock (delayed
 * responses, simulated latency) inherits the guard for free.
 */
let authGeneration = 0;
function nextGeneration(): number {
  authGeneration += 1;
  return authGeneration;
}

let currentSession: Session | null = null;
const listeners = new Set<(session: Session | null) => void>();

function publish(): void {
  for (const fn of listeners) fn(currentSession);
}

function sessionFor(role: Role): Session {
  return {
    user: mockUserFor(role),
    token: nextToken(),
    // No real expiry in mock mode; the far-future date simply stops any
    // caller that reads it from treating the session as already-expired.
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export const mockAuthSession: AuthSession = {
  async restore(): Promise<Session | null> {
    // Mock mode has no persisted session across reloads by design — the app
    // boots anonymous and the user picks a role. Returning null (rather than
    // inventing a session) keeps `AuthContext`'s loading → anonymous
    // transition identical to what it does today when the API is off.
    currentSession = null;
    publish();
    return null;
  },

  async signIn(_credentials: Credentials): Promise<Session> {
    // Credentials are ignored on purpose — see the file header.
    currentSession = sessionFor(currentMockRole());
    publish();
    return currentSession;
  },

  adoptSession(session: Session): void {
    // Mock mode has no OTP flow, so nothing produces a session to adopt. If
    // one arrives anyway (e.g. a caller reusing an HTTP-shaped response), take
    // it at face value rather than dropping the user on the floor.
    nextGeneration();
    currentSession = session;
    publish();
  },

  async signOut(): Promise<void> {
    currentSession = null;
    publish();
  },

  currentToken(): string | null {
    return currentSession?.token ?? null;
  },

  subscribe(listener: (session: Session | null) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Set the ambient role and, if a session is live, re-issue it so subscribers
 * observe the change. Called by the sandbox role switcher, which previously
 * mutated the AppContext state directly.
 */
export function setMockRole(role: Role): void {
  writeRoleOverride(role);
  if (!currentSession) return;
  currentSession = {
    ...currentSession,
    user: mockUserFor(role),
  };
  publish();
}