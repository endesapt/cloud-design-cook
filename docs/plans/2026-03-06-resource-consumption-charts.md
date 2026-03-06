# Plan Log: Resource Consumption Charts for Tenant and Admin UI

- Status: completed
- Owner: ai-agent + team
- Last Verified: 2026-03-06

## Goal
Add meaningful CPU/RAM/Disk visualization in places where users make operational decisions, aligned with the UI lecture principles:
1. contextualize abstract metrics with progress and trends;
2. keep role-specific views (`tenant` vs `admin support`);
3. avoid decorative charts that do not drive actions.

## Scope
1. `Tenant Dashboard`: add resource trend chart + contextual utilization bars.
2. `Tenant Instances`: add per-instance resource visualization with mini trends.
3. `Admin Support -> Tenant Instances`: mirror per-instance resource visibility for support operators.

## Implemented
1. Added reusable chart components:
   - `ResourceConsumptionPanel` for multi-resource trend + contextual progress.
   - `InstanceResourceGrid` for per-instance CPU/RAM/Disk cards with mini CPU trend.
2. Added deterministic telemetry helpers in `src/lib/ui/resource-telemetry.ts`:
   - percentage normalization and quota state labels;
   - deterministic trend generation for demo-safe history.
3. Wired charts into:
   - `/dashboard` (tenant resource trend panel),
   - `/instances` (tenant instance monitor),
   - `/admin/support/[tenantId]/instances` (support monitor).
4. Updated `docs/ui-guidelines.md` with explicit resource visualization rules.

## Decisions
1. Use existing API data where available (`quota`, instance list) and add deterministic mock trend shaping on the client for history that the current API does not provide.
2. Label demo trend data explicitly to avoid misleading “real-time history” claims.
3. Keep quota enforcement and tenant isolation untouched; UI consumes already scoped APIs only.

## Risks
1. Trend history is synthetic until a historical telemetry endpoint exists.
2. Additional visual blocks can increase page density; maintain compact cards and responsive layout.

## Validation
1. `npm run lint` passed.
2. `npm run typecheck` passed.
3. `npm run test` passed.
4. `npm run test:e2e` passed.
5. `npm run docs:check` passed.
