# Plan Log: VM Edit + User Management + Cloud Support Access

- Status: active
- Owner: ai-agent + team
- Last Verified: 2026-03-04

## Summary
1. Add safe VM edit (`name`, `flavor` only in `STOPPED`, `securityGroupIds`).
2. Add full user management for tenant/admin scopes.
3. Add `support_viewer` role with read-only support console.
4. Add two-step tenant deletion with async `DELETING` force flow.

## Decisions
1. `support_viewer` is read-only; all mutate endpoints return `403`.
2. Tenant delete flow:
   - `DELETE /admin/tenants/:id` -> precheck, blocks if tenant not empty.
   - `DELETE /admin/tenants/:id?force=true` -> set tenant `DELETING`, terminate instances asynchronously, then hard delete tenant and tenant users.
3. VM edit scope is intentionally limited:
   - rename VM;
   - resize flavor only in `STOPPED`;
   - attach/detach security groups;
   - network is immutable after create.
4. Password management uses explicit admin-set/reset password (no invite/email flow).

## Delivered in Iteration
1. Data model:
   - `UserRole.support_viewer`;
   - `TenantStatus` with `status` field on tenant;
   - expanded `OperationAction` for users/instance-edit/tenant-delete flows.
2. RBAC:
   - explicit read/write guards for tenant/admin;
   - tenant scope supports explicit context for `global_admin` and `support_viewer`;
   - tenant APIs reject work on `DELETING` tenant (`TENANT_DELETING`).
3. VM edit:
   - `GET/PATCH /api/v1/instances/:id`;
   - quota-aware resize check;
   - UI page `/instances/[id]/edit` + edit action from instances list.
4. User management APIs:
   - tenant: `/api/v1/users*`;
   - admin: `/api/v1/admin/users*`;
   - reset password endpoints in both scopes;
   - guard for removing last tenant admin (`LAST_TENANT_ADMIN`).
5. Support UI:
   - `/admin/support` entrypoint with tenant context switching;
   - `/admin/support/[tenantId]/instances|network|security-groups|users`.
6. Tenant delete:
   - safe precheck + force delete (`DELETING`) in admin tenant API;
   - reconcile flow finalizes deleting tenants and removes tenant-scoped users/resources.

## Residual Risks / Follow-ups
1. No dedicated background worker yet; deletion/lifecycle reconciliation is still request-driven.
2. Support pages for network/security groups are intentionally read-focused in this iteration.
3. Invite-based password onboarding and SSO remain out of scope.
