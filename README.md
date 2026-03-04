# Cloud Console Concept (Next.js)

Conceptual multi-tenant IaaS platform MVP with:
- tenant portal,
- admin control panel,
- logical network isolation model,
- quota management,
- mock instance lifecycle.

## Stack
- Next.js (App Router) + TypeScript
- Prisma + PostgreSQL
- Tailwind + reusable UI primitives
- Recharts for admin analytics

## Quick Start
1. Install dependencies:
```bash
npm install
```
2. Create env file:
```bash
cp .env.example .env
```
3. Generate Prisma client:
```bash
npm run db:generate
```
4. Run migrations and seed:
```bash
npm run db:migrate
npm run db:seed
```
5. Start app:
```bash
npm run dev
```

## Seed Users
- `admin@cloud.local / ChangeMe123!` (global admin)
- `owner@alpha.local / ChangeMe123!` (tenant admin)
- `owner@beta.local / ChangeMe123!` (tenant admin)

## Scripts
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run docs:check`

## Docs
Start from [docs/index.md](./docs/index.md).
