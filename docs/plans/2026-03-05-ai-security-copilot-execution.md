# Plan Log: AI Security Copilot Execution

- Status: completed
- Owner: ai-agent + team
- Last Verified: 2026-03-05

## Goal
Implement an AI-driven (mocked backend intelligence) security capability across tenant and admin consoles:
- expanded audit trail,
- deterministic instance risk metrics,
- rule-based security alerts with lifecycle,
- one-click remediation playbooks,
- dedicated Security Center UI for tenant and admin.

## Scope
1. Prisma schema + migration for security entities.
2. Security domain modules in `src/lib/security/*`.
3. New security API routes for tenant/admin.
4. Security Center pages + dashboard/overview widgets.
5. Test coverage for metrics/rules/lifecycle and RBAC-sensitive endpoints.
6. Documentation updates in `docs/*` and API contract map.

## Milestones
1. M1 Backend Foundation
- schema and migration
- audit extensions
- security engine + playbooks
- tenant/admin APIs
- backend tests

2. M2 UI + UX + Docs
- tenant/admin Security Center pages
- reusable alert UI blocks
- dashboard/overview security widgets
- navigation updates
- docs + full required checks

## Decisions Locked
1. Scope: tenant + admin.
2. Storage: persisted tables.
3. Metrics: deterministic synthetic + current state.
4. Detection trigger: on-read with 30s TTL per tenant.
5. Retention: alerts 30 days, metrics 7 days.
6. Alerts pack: auth anomaly, instance failure, quota pressure, SG exposure.
7. Alert lifecycle: OPEN / ACKNOWLEDGED / RESOLVED.
8. Playbooks: STOP_INSTANCE, QUARANTINE_INSTANCE, RESTORE_INSTANCE_SG, SUGGEST_PASSWORD_RESET.
9. Quarantine strategy: tenant-local SG.
10. UI language: English.

## Residual Risks
1. Rule tuning may require threshold adjustment after demo rehearsals.
2. On-read refresh can add DB load in very high-cardinality tenant lists.
3. Security playbooks rely on existing lifecycle semantics; edge transitions need regression checks.

## Execution Update (2026-03-05)
1. Added Prisma models/enums for security alerts, metric snapshots, remediations, and tenant refresh state.
2. Extended `operations_log` with structured outcome/risk/resource context and added failed login audit tracking.
3. Implemented `src/lib/security/*` modules for deterministic metrics, rule-based alert detection, lifecycle sync, and playbook execution.
4. Added tenant/admin security APIs and integrated on-read signal refresh with TTL and retention cleanup.
5. Added UI pages `/security-center` and `/admin/security-center`, navigation links, and dashboard/overview security widgets.
6. Added tests for metrics determinism, alert rule thresholds, lifecycle sync, RBAC write denial for read-only roles, and security smoke.
7. Updated core docs (`api`, `architecture`, `data-model`, `invariants`, `README`) and validated docs links/metadata.
