# Data Model

- Status: active
- Owner: platform-team
- Last Verified: 2026-03-04

## Primary Tables
1. `tenants`: quota limits and organization metadata.
2. `users`: role-based identities, optional tenant for global admin.
3. `flavors`: shared VM shapes.
4. `networks`: tenant-scoped virtual networks.
5. `security_groups`: tenant-scoped access policies.
6. `security_group_rules`: ingress/egress rules.
7. `instances`: mock VM lifecycle records.
8. `instance_security_groups`: many-to-many mapping.
9. `operations_log`: audit trail.

## Ownership Rules
- Every tenant object has `tenantId`.
- Cross-tenant links are blocked by API checks.
- `flavors` are global and read-only in tenant flows.

## Lifecycle Columns
`instances` stores:
- `status` (`CREATING|RUNNING|STOPPED|ERROR|DELETED`)
- `readyAt` (mock async transition trigger)
- `ipv4` (mock assigned IP)
- `mockRef` (reference token)
- `failReason` (debug cause for `ERROR`)

## Quota Inputs
Resource usage derives from instance flavor dimensions:
- vCPU
- RAM MB
- Disk GB
