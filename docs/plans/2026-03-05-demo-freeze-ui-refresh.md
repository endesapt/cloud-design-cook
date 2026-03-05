# Plan Log: Demo Freeze + UI Refresh

- Status: completed
- Owner: ai-agent + team
- Last Verified: 2026-03-05

## Goal
Stabilize the security demo experience and remove misleading UI signals by:
1. freezing alerts after first detection per tenant in demo mode;
2. adding richer one-click suggestion playbooks;
3. replacing forced quota formatting with counter/quota metric card modes;
4. introducing quota threshold colors;
5. fixing admin instance status chart semantics and readability.

## Implemented Scope
1. Prisma and contracts: added demo freeze state, new operation action, and new suggestion playbooks.
2. Security domain: demo-freeze gating, reset flow (`clear + rebuild`), and recommended playbooks per alert type.
3. API: new admin reset endpoint, overview `demo` block, enriched alert DTO with `recommendedPlaybooks`.
4. UI: removed polling from security center pages, added freeze banner + manual refresh, contextual action buttons, metric card redesign, and status legend/colors.
5. Tests: freeze helper, recommendation mapping, quota threshold boundaries, status color mapping, and reset RBAC coverage.

## Defaults Locked
1. `SECURITY_DEMO_FREEZE=true` by default.
2. Freeze trigger: first detection (`candidateCount > 0`) per tenant.
3. Reset policy: clear alerts/remediations/metrics then force rebuild.
4. UI language: English.

## Residual Risks
1. In demo freeze mode, fresh incidents are intentionally hidden until reset.
2. Action button density in alert table may require pagination/tight layout tuning for very large datasets.
