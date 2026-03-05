-- CreateEnum
CREATE TYPE "OperationOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'WARNING');

-- CreateEnum
CREATE TYPE "AuditRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SecurityAlertType" AS ENUM ('AUTH_ANOMALY', 'INSTANCE_FAILURE', 'QUOTA_PRESSURE', 'SG_EXPOSURE');

-- CreateEnum
CREATE TYPE "SecurityAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SecurityAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SecurityPlaybook" AS ENUM ('STOP_INSTANCE', 'QUARANTINE_INSTANCE', 'RESTORE_INSTANCE_SG', 'SUGGEST_PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "RemediationStatus" AS ENUM ('PENDING', 'EXECUTED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OperationAction" ADD VALUE 'LOGIN_FAILED';
ALTER TYPE "OperationAction" ADD VALUE 'SECURITY_ALERT_STATUS_UPDATE';
ALTER TYPE "OperationAction" ADD VALUE 'SECURITY_PLAYBOOK_EXECUTION';

-- AlterTable
ALTER TABLE "operations_log" ADD COLUMN     "outcome" "OperationOutcome" NOT NULL DEFAULT 'SUCCESS',
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "resourceType" TEXT,
ADD COLUMN     "riskLevel" "AuditRiskLevel" NOT NULL DEFAULT 'LOW',
ADD COLUMN     "sourceIpMasked" TEXT,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "details" SET DEFAULT '{}';

-- CreateTable
CREATE TABLE "security_alerts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "type" "SecurityAlertType" NOT NULL,
    "severity" "SecurityAlertSeverity" NOT NULL,
    "status" "SecurityAlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_metric_snapshots" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "status" "InstanceStatus" NOT NULL,
    "cpuPct" INTEGER NOT NULL,
    "memoryPct" INTEGER NOT NULL,
    "diskPct" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "quotaPressurePct" INTEGER NOT NULL,
    "errorEvents30m" INTEGER NOT NULL,
    "churnEvents30m" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instance_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_alert_remediations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "alertId" UUID NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "playbook" "SecurityPlaybook" NOT NULL,
    "status" "RemediationStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "requestedById" UUID,
    "executedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_alert_remediations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_security_state" (
    "tenantId" UUID NOT NULL,
    "lastEvaluatedAt" TIMESTAMP(3),
    "lastCleanupAt" TIMESTAMP(3),
    "lastEvaluationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_security_state_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_alerts_fingerprint_key" ON "security_alerts"("fingerprint");

-- CreateIndex
CREATE INDEX "security_alerts_tenantId_createdAt_idx" ON "security_alerts"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "security_alerts_tenantId_status_severity_idx" ON "security_alerts"("tenantId", "status", "severity");

-- CreateIndex
CREATE INDEX "security_alerts_tenantId_type_status_idx" ON "security_alerts"("tenantId", "type", "status");

-- CreateIndex
CREATE INDEX "security_alerts_tenantId_targetType_targetId_idx" ON "security_alerts"("tenantId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "security_alerts_tenantId_lastSeenAt_idx" ON "security_alerts"("tenantId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "instance_metric_snapshots_tenantId_createdAt_idx" ON "instance_metric_snapshots"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "instance_metric_snapshots_tenantId_instanceId_createdAt_idx" ON "instance_metric_snapshots"("tenantId", "instanceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "instance_metric_snapshots_instanceId_bucketStart_key" ON "instance_metric_snapshots"("instanceId", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "security_alert_remediations_idempotencyKey_key" ON "security_alert_remediations"("idempotencyKey");

-- CreateIndex
CREATE INDEX "security_alert_remediations_tenantId_createdAt_idx" ON "security_alert_remediations"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "security_alert_remediations_alertId_createdAt_idx" ON "security_alert_remediations"("alertId", "createdAt");

-- CreateIndex
CREATE INDEX "security_alert_remediations_tenantId_targetType_targetId_idx" ON "security_alert_remediations"("tenantId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "operations_log_tenantId_action_createdAt_idx" ON "operations_log"("tenantId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "operations_log_tenantId_outcome_createdAt_idx" ON "operations_log"("tenantId", "outcome", "createdAt");

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_metric_snapshots" ADD CONSTRAINT "instance_metric_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_metric_snapshots" ADD CONSTRAINT "instance_metric_snapshots_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alert_remediations" ADD CONSTRAINT "security_alert_remediations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alert_remediations" ADD CONSTRAINT "security_alert_remediations_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "security_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alert_remediations" ADD CONSTRAINT "security_alert_remediations_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_security_state" ADD CONSTRAINT "tenant_security_state_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
