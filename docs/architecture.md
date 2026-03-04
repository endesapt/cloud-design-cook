# Architecture: Multi-Tenant IaaS Concept (Next.js)

- Status: active
- Owner: platform-team
- Last Verified: 2026-03-04

## 1. Purpose and Scope
This project demonstrates a conceptual IaaS provider with:
- tenant web portal;
- global admin panel;
- strict multi-tenancy controls;
- quota enforcement;
- mock lifecycle for virtual instances.

In scope:
- Next.js fullstack app (App Router + Route Handlers);
- PostgreSQL persistence through Prisma;
- tenant network and security group logical model;
- audit logs and demo-friendly UI.

Out of scope:
- real hypervisor integration;
- Docker/Celery/Redis;
- production-grade SSO.

## 2. High-Level Architecture
```text
Browser (Tenant/Admin UI)
        |
        v
Next.js App Router
  - React pages
  - API route handlers (/api/v1/*)
        |
        v
Domain Modules (src/lib/*)
  - auth / tenant / quota / provisioning
        |
        v
Prisma Client
        |
        v
PostgreSQL
```

## 3. Multi-Tenancy and RBAC
Roles:
- `global_admin` – access to all tenants, quotas, global overview.
- `tenant_admin` – full access inside own tenant.
- `tenant_user` – limited tenant access (reserved for extension).

Isolation model:
- tenant-owned entities always include `tenantId`.
- tenant endpoints resolve scope from JWT session.
- cross-tenant foreign keys are rejected.
- ownership checks are centralized in `src/lib/tenant/*`.

## 4. Data Model and Ownership
Core entities:
- `tenants`, `users`, `flavors`.
- `networks`, `security_groups`, `security_group_rules`.
- `instances`, `instance_security_groups`.
- `operations_log`.

Ownership:
- tenant resources reference `tenantId`.
- global resources (`flavors`) are shared read-only.
- `operations_log` can store tenant-scoped and global actions.

## 5. Logical Network Isolation
The platform models VPC-like isolation:
- tenant creates networks (`cidr`);
- instance is attached to one tenant network;
- security groups and rules define ingress/egress intent.

This is a logical model for UI/API demonstration and does not configure real packet routing.

## 6. Quota Model and Enforcement
Tenant quotas:
- `maxVms`, `maxVcpus`, `maxRamMb`, `maxDiskGb`.

Usage is computed from instances in statuses:
- `CREATING`, `RUNNING`, `STOPPED`.

Enforcement points:
- before `POST /api/v1/instances`;
- before `start` action.

API response for violations:
- HTTP 409 with code `QUOTA_EXCEEDED`.

## 7. Mock Provisioning Lifecycle
No background worker is required.

Flow:
1. create/start/reboot transitions instance to `CREATING`;
2. `readyAt` is assigned to `now + 5..15s`;
3. reconcile is triggered by read/action APIs;
4. when `readyAt <= now`, instance becomes `RUNNING` or `ERROR` (small fail rate);
5. delete transitions to `DELETED` for audit continuity.

## 8. API Boundary and Error Model
Transport layer:
- route handlers perform auth, validation, and delegation.

Domain layer:
- tenant scope checks, quota checks, lifecycle transitions.

Error schema:
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Quota exceeded for tenant",
    "details": {}
  }
}
```

## 9. Observability and Audit
- every key action writes to `operations_log`;
- tenant dashboard shows recent tenant operations;
- admin overview shows global recent operations.

## 10. Known Limitations and Post-MVP
Known limitations:
- mock provisioning only;
- no billing engine;
- no object storage and no block volume API;
- no production SSO.

Post-MVP roadmap:
1. add OIDC/SAML login module;
2. add billing and cost analytics;
3. split services if needed (control plane decomposition).

## 11. Demo Flow (5–7 minutes)
1. Login as tenant admin.
2. Create network and security group.
3. Create instance and observe `CREATING -> RUNNING`.
4. Trigger quota error by exceeding limits.
5. Login as global admin.
6. Increase tenant quota.
7. Return to tenant flow and create another instance.

## 12. Acceptance Mapping
- tenant portal + admin panel available.
- tenant isolation enforced on API and FK relations.
- quota checks are server-side and visible in UI.
- mock lifecycle is visible during demo.
- docs are in-repo and mapped via `AGENTS.md` + `docs/index.md`.
