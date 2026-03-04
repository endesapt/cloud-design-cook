# AGENTS.md

## Mission
Build and evolve a demo-ready multi-tenant IaaS concept on Next.js with mock provisioning.
Priorities: correctness of tenant isolation, quota enforcement, and strong demo UI.

## Quick Start
1. Read this file first.
2. Open `docs/index.md` for task-based navigation.
3. Open only the smallest relevant doc for the current task.
4. Keep plans and decisions inside repo (`docs/plans/*`), not in chat memory.

## Hard Invariants (must always hold)
1. Any tenant resource must include `tenant_id`.
2. Tenant users can only access resources from their own `tenant_id`.
3. Cross-tenant foreign keys are forbidden.
4. Quotas are enforced server-side before create/start actions.
5. Mock provisioning must be deterministic enough for demo reliability.
6. Docker-backed VM emulation is supported with strict minimal runtime limits.

## Architecture Boundaries
1. `src/app/api/*` handles transport only (validation/authz/delegation).
2. Domain logic lives in `src/lib/*` (`tenant`, `quota`, `provisioning`).
3. DB access goes through Prisma layer only.
4. UI pages do not implement authorization logic; they consume API contracts.

## Task-to-Context Map (progressive disclosure)
1. UI polish task -> read `docs/ui-guidelines.md` then relevant `src/app/(tenant|admin)` page.
2. API contract task -> read `docs/api.md` then `src/app/api/v1/*`.
3. Data model task -> read `docs/data-model.md` then `prisma/schema.prisma`.
4. Isolation/security task -> read `docs/invariants.md` then `src/lib/tenant/*`.
5. Quota/resource task -> read `docs/architecture.md` (Quota section) then `src/lib/quota/*`.
6. Planning task -> read latest file in `docs/plans/`.

## Agent-First Workflow
1. Create/update a short plan file in `docs/plans/`.
2. Implement smallest vertical slice.
3. Run local checks.
4. Self-review diff for invariant violations.
5. Update docs affected by the change.
6. Record decisions and residual risks in plan/PR notes.

## Required Local Checks before merge
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run test:e2e` (or smoke subset)
5. `npm run docs:check`

## Documentation Rules
1. `docs/index.md` is the source navigation map.
2. Each major doc has `Status`, `Owner`, `Last Verified`.
3. Keep docs concise and link outward instead of duplicating details.
4. If code changes behavior, update docs in the same change.

## CI Rules (minimum)
1. Fail on lint/type/test failures.
2. Fail when `docs:check` finds broken links or stale doc metadata.
3. Fail if architectural boundary checks detect forbidden imports.

## If Unsure
1. Prefer invariants over local convenience.
2. Prefer simpler implementation that is easy to explain in demo.
3. Log assumption in `docs/plans/*` and continue.
