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
1. Use Node.js `24.14.0` via nvm:
```bash
source ~/.nvm/nvm.sh
nvm use
```
2. Install dependencies:
```bash
npm install
```
3. Create env file:
```bash
cp .env.example .env
```
4. Start PostgreSQL container:
```bash
npm run db:up
```
5. Ensure Docker daemon is running if `PROVISION_MODE=docker`.
6. Generate Prisma client:
```bash
npm run db:generate
```
7. Run migrations and seed:
```bash
npm run db:migrate
npm run db:seed
```
8. Start app:
```bash
npm run dev
```

## Database Commands
- `npm run db:up` - start local PostgreSQL (`docker compose up -d postgres`)
- `npm run db:down` - stop compose stack
- `npm run db:logs` - stream PostgreSQL logs

## Provisioning Modes
- `PROVISION_MODE=docker`: instance create/action controls a real Docker container.
- `PROVISION_MODE=mock`: pure mock lifecycle.

Default `.env.example` is Docker mode with low per-instance runtime limits:
- `DOCKER_MIN_CPUS=0.10`
- `DOCKER_MIN_MEMORY_MB=64`
- `DOCKER_PIDS_LIMIT=64`

This keeps host usage low so multiple VMs can run simultaneously.

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

## Troubleshooting
- `node: command not found`:
```bash
source ~/.nvm/nvm.sh
nvm use 24
```
- `npm run dev` exits immediately with no error:
```bash
source ~/.nvm/nvm.sh
nvm use 24
rm -rf node_modules
npm ci
npm run dev
```
- UI shows `Failed to fetch` on API calls:
```bash
npm run db:up
npm run db:migrate
npm run db:seed
```
Then restart `npm run dev` and log in again.
- `GET /api/v1/quota` or `GET /api/v1/activity` fails after DB reset/seed:
the session cookie may reference an old tenant id. Refresh the page and sign in again (or clear `iaas_session` for `localhost`).
- `net::ERR_BLOCKED_BY_CLIENT` on activity requests:
privacy/ad-block extensions may block URLs with `activity`; the app uses `/api/v1/logs` as the primary endpoint.

## Docs
Start from [docs/index.md](./docs/index.md).
