# Invariants

- Status: active
- Owner: platform-team
- Last Verified: 2026-03-04

## Security Invariants
1. A non-admin user cannot read or mutate data outside `session.tenantId`.
2. `support_viewer` is strictly read-only across all tenants.
3. `tenant_user` is read-only inside own tenant.
4. Tenant write operations are allowed only for `tenant_admin` or `global_admin`.
5. Any `networkId` / `securityGroupId` used in instance operations must belong to the same tenant.
6. API handlers must validate payloads through Zod.
7. Server-side quota checks are mandatory before create/start/resize actions.
8. Tenant force-delete must move tenant to `DELETING` and complete via reconcile.
9. Docker mode must apply minimal runtime limits to each containerized VM.

## Architecture Invariants
1. Route handlers coordinate transport and delegate domain logic.
2. Business rules remain in `src/lib/*` modules.
3. Prisma is the only DB access layer.
4. UI must consume contracts; no hidden business logic in presentation components.

## Demo Reliability Invariants
1. Mock provisioning delay remains in range 5–15 seconds.
2. Reconcile runs in read/action paths so lifecycle advances without workers.
3. Mock fail rate stays low and configurable via env.
4. Docker container resources remain capped (`DOCKER_MIN_CPUS`, `DOCKER_MIN_MEMORY_MB`, `DOCKER_PIDS_LIMIT`).
