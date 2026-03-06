# Plan Log: Dark Theme Refresh + Yellow State Tuning

- Status: completed
- Owner: ai-agent + team
- Last Verified: 2026-03-06

## Goal
Switch the UI to a coherent dark theme and improve the yellow warning/readiness color clarity.

## Scope
1. Update global design tokens (`ink`, `surface`, `line`, state colors).
2. Replace light hardcoded backgrounds (`bg-white`) in shared/layout/form controls.
3. Tune chart legibility for dark surfaces (axes, grid, tooltips).
4. Keep existing information architecture and role boundaries unchanged.

## Implemented
1. Switched global theme tokens to dark surfaces and light ink in `src/app/globals.css`.
2. Tuned state palette with a clearer yellow `watch` tone and adjusted warning/critical contrast.
3. Updated shared UI primitives and layouts for dark rendering:
   - `Progress`, `Input`, `Card`,
   - `NavShell`, `PageHeader`,
   - login visual overlay.
4. Updated chart readability on dark background (`overview-charts`, `resource-consumption-panel`):
   - grid/ticks/tooltip colors.
5. Replaced remaining `bg-white` form/select surfaces with dark tokenized backgrounds across app pages.
6. Updated severity/status badges and freeze/danger alert surfaces to dark-compatible variants.

## Risks
1. Native `<select>` rendering varies by browser in dark themes.
2. Some isolated hardcoded light colors may remain in non-critical blocks.

## Validation
1. `npm run lint` passed.
2. `npm run typecheck` passed.
3. `npm run test` passed.
4. `npm run test:e2e` passed.
5. `npm run docs:check` passed.
