-- AlterEnum
-- Adds demo-freeze operation action and expanded suggestion playbooks.
ALTER TYPE "OperationAction" ADD VALUE 'RESET_SECURITY_DEMO_FREEZE';
ALTER TYPE "SecurityPlaybook" ADD VALUE 'SUGGEST_ACCESS_LOCKDOWN';
ALTER TYPE "SecurityPlaybook" ADD VALUE 'SUGGEST_SG_HARDENING';
ALTER TYPE "SecurityPlaybook" ADD VALUE 'SUGGEST_CAPACITY_RIGHTSIZING';
ALTER TYPE "SecurityPlaybook" ADD VALUE 'SUGGEST_INSTANCE_DIAGNOSTICS';

-- AlterTable
ALTER TABLE "tenant_security_state" ADD COLUMN "demoFrozenAt" TIMESTAMP(3);
