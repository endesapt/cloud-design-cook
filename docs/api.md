# API v1 Contracts

- Status: active
- Owner: platform-team
- Last Verified: 2026-03-04

## Auth
- `POST /api/v1/auth/login` body `{ email, password }` -> sets httpOnly cookie, returns user profile.
- `POST /api/v1/auth/logout` -> clears cookie.
- `GET /api/v1/auth/me` -> current user context.

## Tenant APIs
- `GET /api/v1/flavors`
- `GET /api/v1/quota`
- `GET /api/v1/activity`
- `GET /api/v1/networks`
- `POST /api/v1/networks` body `{ name, cidr }`
- `GET /api/v1/security-groups`
- `POST /api/v1/security-groups` body `{ name, description? }`
- `POST /api/v1/security-groups/:id/rules` body `{ direction, protocol, portFrom?, portTo?, cidr }`
- `GET /api/v1/instances?status=RUNNING`
- `POST /api/v1/instances` body `{ name, flavorId, networkId, securityGroupIds[] }`
- `POST /api/v1/instances/:id/action` body `{ action: start|stop|reboot|delete }`

## Admin APIs
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/tenants`
- `POST /api/v1/admin/tenants`
- `GET /api/v1/admin/tenants/:id`
- `PATCH /api/v1/admin/tenants/:id`

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
