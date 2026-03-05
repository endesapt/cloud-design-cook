# UI Guidelines

- Status: active
- Owner: design-engineering
- Last Verified: 2026-03-04

## Visual Direction
- Inspired by telecom cloud consoles: assertive red accents, neutral surfaces.
- Keep layout clean, enterprise-oriented, and demo-friendly.
- Do not copy exact third-party brand assets.

## Typography
- Headings: `Space Grotesk`.
- Body: `IBM Plex Sans`.
- Technical labels: `JetBrains Mono`.

## Tokens
- Primary accent: `--brand-red`.
- Surface hierarchy: `--surface-1..3`.
- Text hierarchy: `--ink-1..3`.
- Borders: `--line`.
- Quota status colors: `--state-safe`, `--state-watch`, `--state-warning`, `--state-critical`.

## Metric Semantics
1. Use `counter` cards for unconstrained counts (alerts, tenants, instances).
2. Use `quota` cards only where real limits exist.
3. Quota thresholds are fixed for visual signaling:
   - `<70`: safe
   - `70-84`: watch
   - `85-94`: warning
   - `>=95`: critical

## UX Standards
1. Show loading skeletons for data-heavy blocks.
2. Show explicit empty states.
3. Use toast notifications for async success/failure.
4. Keep key actions in predictable positions.
5. Preserve mobile readability for forms and tables.
6. In demo freeze mode, show an explicit frozen-state banner on security pages.
