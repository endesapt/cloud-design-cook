# Data Model

- Status: active
- Owner: platform-team
- Last Verified: 2026-03-05

## Primary Tables
1. `tenants`: quota limits and organization metadata.
2. `users`: role-based identities (`global_admin`, `support_viewer`, `tenant_admin`, `tenant_user`), optional tenant for global roles.
3. `flavors`: shared VM shapes.
4. `networks`: tenant-scoped virtual networks.
5. `security_groups`: tenant-scoped access policies.
6. `security_group_rules`: ingress/egress rules.
7. `instances`: mock VM lifecycle records.
8. `instance_security_groups`: many-to-many mapping.
9. `operations_log`: audit trail.
10. `security_alerts`: tenant-scoped detections with lifecycle.
11. `instance_metric_snapshots`: deterministic instance risk snapshots.
12. `security_alert_remediations`: execution log for playbooks.
13. `tenant_security_state`: per-tenant refresh/cleanup checkpoints.

## Ownership Rules
- Every tenant object has `tenantId`.
- Cross-tenant links are blocked by API checks.
- `flavors` are global and read-only in tenant flows.
- security analytics entities are tenant-scoped and indexed by `tenantId`.

## Lifecycle Columns
`instances` stores:
- `status` (`CREATING|STARTING|RUNNING|STOPPING|STOPPED|TERMINATING|ERROR|DELETED`)
- `readyAt` (mock async transition trigger)
- `ipv4` (mock assigned IP)
- `mockRef` (reference token)
- `failReason` (debug cause for `ERROR`)

`tenants` stores:
- `status` (`ACTIVE|DELETING`) for async force-delete lifecycle.

`security_alerts` stores:
- `type` (`AUTH_ANOMALY|INSTANCE_FAILURE|QUOTA_PRESSURE|SG_EXPOSURE`);
- `severity` (`LOW|MEDIUM|HIGH|CRITICAL`);
- `status` (`OPEN|ACKNOWLEDGED|RESOLVED`);
- `fingerprint` for dedupe and safe auto-resolve.

`tenant_security_state` stores:
- refresh checkpoints (`lastEvaluatedAt`, `lastCleanupAt`, `lastEvaluationError`);
- demo freeze marker `demoFrozenAt` for one-shot snapshot mode.

`security_alert_remediations` stores:
- playbook execution history including suggestion-only playbooks
  (`SUGGEST_ACCESS_LOCKDOWN`, `SUGGEST_SG_HARDENING`, `SUGGEST_CAPACITY_RIGHTSIZING`, `SUGGEST_INSTANCE_DIAGNOSTICS`).

`operations_log` stores:
- structured `outcome`, `riskLevel`, `resourceType`, `resourceId`;
- masked source context (`sourceIpMasked`, `userAgent`).

## Quota Inputs
Resource usage derives from instance flavor dimensions:
- vCPU
- RAM MB
- Disk GB
