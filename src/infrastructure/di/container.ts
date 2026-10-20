/**
 * Composition root — the ONE place adapters are selected.
 *
 * This file is the payoff of the ports-and-adapters work. Every other module
 * depends on a port declared in `domain/<entity>/ports.ts`; only this file
 * knows that `samples` and `clients` are currently served by in-memory mock
 * implementations. When the HTTP adapters land, this file gains a conditional
 * and nothing else in the codebase changes.
 *
 * WHY IT LIVES UNDER `infrastructure/` AND NOT `application/di/`: the plan
 * originally specified `application/di/container.ts`, but the layering guard
 * (`npm run lint:layers`) rejected that immediately —
 *
 *     ✖ src/application/di/container.ts: application/ must not depend on
 *       infrastructure/ (@/infrastructure/mock/repositories/…)
 *
 * and the guard is correct. A composition root's entire job is to import
 * concrete adapters and hand back interfaces, so by definition it sits
 * OUTSIDE both layers it joins: `application/` may only depend on
 * `shared/` + `domain/`, and `infrastructure/` may only depend on the same.
 * Putting the container inside either would make that layer depend on the
 * other, which is precisely the cycle the port indirection exists to break.
 * `infrastructure/di/` is the outermost placement that keeps the one-way rule
 * intact; presentation may import both layers and resolves adapters from here.
 *
 * WHY NOT SWAP ON `isApiEnabled()` HERE YET: today `isApiEnabled()` is read in
 * 20+ places with two incompatible patterns — an `enabled:` flag on TanStack
 * Query hooks, and an `if (apiOn)` branch inside `AuthContext`. Both are
 * deleted in Phases 4–5 once the auth and test-parameter ports exist. Wiring a
 * branch here for the two mock-only repositories today would create a third
 * pattern for no gain, because there is no HTTP alternative to select yet.
 *
 * The `Container` interface is load-bearing: it makes the container fail at
 * compile time if an adapter stops satisfying its port, rather than at some
 * call site far away.
 */

import type { SampleRepository } from "@/domain/sample/ports";
import type { ClientRepository } from "@/domain/client/ports";
import type { AuthSession } from "@/domain/identity/ports";

import { isApiEnabled } from "@/infrastructure/api/api";
import { mockSampleRepository } from "@/infrastructure/mock/repositories/sampleRepository";
import { mockClientRepository } from "@/infrastructure/mock/repositories/clientRepository";
import { mockAuthSession } from "@/infrastructure/mock/repositories/authSession";
import { httpAuthSession } from "@/infrastructure/api/repositories/authSession";

export interface Container {
  readonly samples: SampleRepository;
  readonly clients: ClientRepository;
  readonly auth: AuthSession;
}

/**
 * Adapter selection happens HERE and nowhere else.
 *
 * `isApiEnabled()` is evaluated exactly once, at module load, and its result
 * chooses the auth adapter. That is the whole point of Phase 4: before this,
 * the flag was consulted in 20+ places using two incompatible idioms — an
 * `enabled:` property on TanStack Query hooks, and an `if (apiOn)` branch
 * inside `AuthContext`. Both are gone.
 *
 * `samples` and `clients` have no HTTP alternative yet, so they stay mock-only
 * unconditionally. When those adapters land (and when the test-parameter
 * repository is ported in Phase 5), they join `auth` in the conditional below
 * rather than growing their own scattered checks.
 *
 * Reading the flag at module scope is deliberate: a Vite dev-server reload of
 * `.env.local` should be a full page reload, not a mid-session adapter swap
 * that would strand the user in a half-HTTP session.
 */
const API_ENABLED = isApiEnabled();

export const container: Container = {
  samples: mockSampleRepository,
  clients: mockClientRepository,
  auth: API_ENABLED ? httpAuthSession : mockAuthSession,
};