# Cloud Console Concept (Next.js)

Conceptual multi-tenant IaaS platform MVP with:
- tenant portal,
- admin control panel,
- logical network isolation model,
- quota management,
- Docker-backed VM emulation with mock fallback.

## Stack
- Next.js (App Router) + TypeScript
- Prisma + PostgreSQL
- Tailwind + reusable UI primitives
- Recharts for admin analytics
- Docker Engine (optional but recommended for VM emulation)

## Quick Start
1. Install dependencies:
```bash
npm install
```
2. Create env file:
```bash
cp .env.example .env
```
3. Ensure Docker daemon is running if `PROVISION_MODE=docker`.
4. Generate Prisma client:
```bash
npm run db:generate
```
5. Run migrations and seed:
```bash
npm run db:migrate
npm run db:seed
```
6. Start app:
```bash
npm run dev
```

## Provisioning Modes
- `PROVISION_MODE=docker`: instance create/action controls a real Docker container.
- `PROVISION_MODE=mock`: pure mock lifecycle.

Default `.env.example` is Docker mode with low per-instance runtime limits:
- `DOCKER_MIN_CPUS=0.10`
- `DOCKER_MIN_MEMORY_MB=64`
- `DOCKER_PIDS_LIMIT=64`

This keeps host usage low so multiple demo VMs can run simultaneously.

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
