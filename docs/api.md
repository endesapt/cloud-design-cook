# API v1 Contracts

- Status: active
- Owner: platform-team
- Last Verified: 2026-03-04

## Auth
- `POST /api/v1/auth/login` body `{ email, password }` -> sets httpOnly cookie, returns user profile.
- `POST /api/v1/auth/logout` -> clears cookie.
- `GET /api/v1/auth/me` -> current user context.

Roles:
- `global_admin` -> full admin + support actions.
- `support_viewer` -> read-only support access.
- `tenant_admin` -> full mutate rights inside own tenant.
- `tenant_user` -> read-only inside own tenant.

## Tenant APIs
- `GET /api/v1/flavors`
- `GET /api/v1/quota`
- `GET /api/v1/logs` (preferred)
- `GET /api/v1/activity` (legacy alias)
- `GET /api/v1/networks`
- `POST /api/v1/networks` body `{ name, cidr }`
- `GET /api/v1/security-groups`
- `POST /api/v1/security-groups` body `{ name, description? }`
- `GET /api/v1/security-groups/:id`
- `PATCH /api/v1/security-groups/:id` body `{ name?, description? }`
- `DELETE /api/v1/security-groups/:id`
- `GET /api/v1/security-groups/:id/rules`
- `POST /api/v1/security-groups/:id/rules` body `{ direction, protocol, portFrom?, portTo?, cidr }`
- `PATCH /api/v1/security-groups/:id/rules/:ruleId` body `{ direction, protocol, portFrom?, portTo?, cidr }`
- `DELETE /api/v1/security-groups/:id/rules/:ruleId`
- `GET /api/v1/instances?status=RUNNING`
- `POST /api/v1/instances` body `{ name, flavorId, networkId, securityGroupIds[] }`
- `GET /api/v1/instances/:id`
- `PATCH /api/v1/instances/:id` body `{ name?, flavorId?, securityGroupIds? }`
- `POST /api/v1/instances/:id/action` body `{ action: start|stop|reboot|delete }`
- `GET /api/v1/users`
- `POST /api/v1/users` body `{ email, fullName, role, password, tenantId? }`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id` body `{ fullName?, role?, tenantId? }`
- `DELETE /api/v1/users/:id`
- `POST /api/v1/users/:id/reset-password` body `{ password }`

Instance behavior notes:
- with `PROVISION_MODE=docker`, instance create/action endpoints control a real Docker container;
- runtime resources are capped to minimal host-friendly values (`DOCKER_MIN_CPUS`, `DOCKER_MIN_MEMORY_MB`, `DOCKER_PIDS_LIMIT`);
- if Docker is unavailable and fallback is enabled, the API transparently switches to mock lifecycle.
- `start/stop/delete` actions are async and queue transition statuses before final reconciliation:
  `STARTING`, `STOPPING`, `TERMINATING`.

## Admin APIs
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/tenants`
- `POST /api/v1/admin/tenants`
- `GET /api/v1/admin/tenants/:id`
- `PATCH /api/v1/admin/tenants/:id`
- `DELETE /api/v1/admin/tenants/:id` (precheck delete)
- `DELETE /api/v1/admin/tenants/:id?force=true` (async force delete -> tenant `DELETING`)
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users` body `{ email, fullName, role, password, tenantId? }`
- `GET /api/v1/admin/users/:id`
- `PATCH /api/v1/admin/users/:id`
- `DELETE /api/v1/admin/users/:id`
- `POST /api/v1/admin/users/:id/reset-password` body `{ password }`

## Error Envelope
All non-2xx responses use:
```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Important Error Codes
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (422)
- `QUOTA_EXCEEDED` (409)
- `INVALID_TRANSITION` (409)
- `INSTANCE_MUST_BE_STOPPED_FOR_RESIZE` (409)
- `DUPLICATE_SECURITY_GROUP_RULE` (409)
- `SG_IN_USE` (409)
- `TENANT_NOT_EMPTY` (409)
- `TENANT_DELETING` (409)
- `LAST_TENANT_ADMIN` (409)
- `ROLE_SCOPE_VIOLATION` (403/409)

Tenant session note:
- If the DB was reset/reseeded and the cookie points to a removed tenant, tenant APIs (including `/api/v1/quota`, `/api/v1/logs`, and `/api/v1/activity`) return `UNAUTHORIZED` and the session cookie is cleared.

Client blocking note:
- Some browser extensions can block URLs containing `activity` (`ERR_BLOCKED_BY_CLIENT`). Use `/api/v1/logs`.
