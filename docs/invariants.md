# Invariants

- Status: active
- Owner: platform-team
- Last Verified: 2026-03-04

## Security Invariants
1. A non-admin user cannot read or mutate data outside `session.tenantId`.
2. Any `networkId` / `securityGroupId` used in instance operations must belong to the same tenant.
3. API handlers must validate payloads through Zod.
4. Server-side quota checks are mandatory before create/start actions.
5. Deleted instances are preserved in audit-friendly state (`DELETED`) instead of hard delete.

## Architecture Invariants
1. Route handlers coordinate transport and delegate domain logic.
2. Business rules remain in `src/lib/*` modules.
3. Prisma is the only DB access layer.
4. UI must consume contracts; no hidden business logic in presentation components.

## Demo Reliability Invariants
1. Mock provisioning delay remains in range 5–15 seconds.
2. Reconcile runs in read/action paths so lifecycle advances without workers.
3. Mock fail rate stays low and configurable via env.
