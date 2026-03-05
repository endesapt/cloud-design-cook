# Architecture: Multi-Tenant IaaS Concept (Next.js)

- Status: active
- Owner: platform-team
- Last Verified: 2026-03-05

## 1. Purpose and Scope
This project demonstrates a conceptual IaaS provider with:
- tenant web portal;
- global admin panel;
- strict multi-tenancy controls;
- quota enforcement;
- container-backed virtual instance emulation.

In scope:
- Next.js fullstack app (App Router + Route Handlers);
- PostgreSQL persistence through Prisma;
- tenant network and security group logical model;
- Docker-based VM emulation with low resource profile;
- audit logs and demo-friendly UI.

Out of scope:
- real hypervisor integration;
- distributed worker orchestration;
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
        +--> Docker Engine (container emulation)
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
- `support_viewer` – read-only support access across tenants.
- `tenant_admin` – full access inside own tenant.
- `tenant_user` – read-only access inside own tenant.

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
- `CREATING`, `STARTING`, `RUNNING`, `STOPPING`, `STOPPED`, `TERMINATING`.

Enforcement points:
- before `POST /api/v1/instances`;
- before `start` action.

API response for violations:
- HTTP 409 with code `QUOTA_EXCEEDED`.

## 7. Provisioning Lifecycle (Docker + Mock Fallback)
Primary mode:
1. `PROVISION_MODE=docker` makes create/start/stop/reboot/delete call Docker Engine.
2. Instance is backed by a real container (`mockRef` stores container ID).
3. Runtime resources are intentionally minimal to allow multiple VMs per host:
   - CPU: `0.10`
   - Memory: `64MB`
   - PIDs limit: `64`
4. Requested resources are still represented by flavor/quota model for IaaS semantics.

Fallback mode:
1. if Docker is unavailable and `DOCKER_FALLBACK_TO_MOCK=true`, provisioning falls back to mock lifecycle;
2. mock transitions are handled via `readyAt` + reconcile on read/action APIs;
3. delete transitions through `TERMINATING` and then hard-deletes row.

Tenant deletion mode:
1. admin can request safe delete (`DELETE` with precheck);
2. force delete sets tenant status `DELETING`;
3. reconcile finalizes instance termination and then removes tenant + tenant users.

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

Security analytics extension:
- audit entries include structured outcome/risk/resource metadata;
- failed login attempts are tracked with masked identity and source hints;
- alerts and remediation actions are persisted for deterministic UI replay.

## 10. AI Security Copilot (Rule-Based Backend)
The security center is presented as AI-driven UX, with deterministic backend logic:
1. on-read refresh computes instance risk metrics and evaluates alert rules;
2. alert pack includes auth anomaly, instance failure, quota pressure, and SG exposure;
3. dedupe uses fingerprint (`tenantId + type + target + ruleKey`);
4. stale signals auto-resolve from `OPEN/ACKNOWLEDGED` to `RESOLVED`;
5. playbooks provide one-click actions (`STOP_INSTANCE`, `QUARANTINE_INSTANCE`, `RESTORE_INSTANCE_SG`, `SUGGEST_PASSWORD_RESET`).

Tenant scope model:
- tenant users view own tenant alerts only;
- tenant admins and global admins can mutate alert status and execute playbooks;
- support viewer remains read-only.

## 11. Known Limitations and Post-MVP
Known limitations:
- Docker emulation runs on single host (no scheduler);
- no billing engine;
- no object storage and no block volume API;
- no production SSO.

Post-MVP roadmap:
1. add OIDC/SAML login module;
2. add billing and cost analytics;
3. split services if needed (control plane decomposition).

## 12. Demo Flow (5–7 minutes)
1. Login as tenant admin.
2. Create network and security group.
3. Create instance and observe `CREATING -> RUNNING`.
4. Trigger quota error by exceeding limits.
5. Login as global admin.
6. Increase tenant quota.
7. Return to tenant flow and create another instance.

## 13. Acceptance Mapping
- tenant portal + admin panel available.
- tenant isolation enforced on API and FK relations.
- quota checks are server-side and visible in UI.
- mock lifecycle is visible during demo.
- docs are in-repo and mapped via `AGENTS.md` + `docs/index.md`.
