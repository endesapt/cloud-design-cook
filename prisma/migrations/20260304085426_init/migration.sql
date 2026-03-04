-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('global_admin', 'tenant_admin', 'tenant_user');

-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('CREATING', 'RUNNING', 'STOPPED', 'ERROR', 'DELETED');

-- CreateEnum
CREATE TYPE "RuleDirection" AS ENUM ('ingress', 'egress');

-- CreateEnum
CREATE TYPE "OperationAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE_INSTANCE', 'INSTANCE_ACTION', 'CREATE_NETWORK', 'CREATE_SECURITY_GROUP', 'UPDATE_TENANT_QUOTA');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "maxVms" INTEGER NOT NULL DEFAULT 3,
    "maxVcpus" INTEGER NOT NULL DEFAULT 6,
    "maxRamMb" INTEGER NOT NULL DEFAULT 12288,
    "maxDiskGb" INTEGER NOT NULL DEFAULT 120,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "tenantId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flavors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "vcpus" INTEGER NOT NULL,
    "ramMb" INTEGER NOT NULL,
    "diskGb" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flavors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "networks" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cidr" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_groups" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_group_rules" (
    "id" UUID NOT NULL,
    "securityGroupId" UUID NOT NULL,
    "direction" "RuleDirection" NOT NULL,
    "protocol" TEXT NOT NULL,
    "portFrom" INTEGER,
    "portTo" INTEGER,
    "cidr" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_group_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instances" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "flavorId" UUID NOT NULL,
    "networkId" UUID NOT NULL,
    "status" "InstanceStatus" NOT NULL,
    "ipv4" TEXT,
    "mockRef" TEXT,
    "readyAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_security_groups" (
    "instanceId" UUID NOT NULL,
    "securityGroupId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instance_security_groups_pkey" PRIMARY KEY ("instanceId","securityGroupId")
);

-- CreateTable
CREATE TABLE "operations_log" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "userId" UUID,
    "action" "OperationAction" NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "flavors_name_key" ON "flavors"("name");

-- CreateIndex
CREATE INDEX "networks_tenantId_idx" ON "networks"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "networks_tenantId_name_key" ON "networks"("tenantId", "name");

-- CreateIndex
CREATE INDEX "security_groups_tenantId_idx" ON "security_groups"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "security_groups_tenantId_name_key" ON "security_groups"("tenantId", "name");

-- CreateIndex
CREATE INDEX "security_group_rules_securityGroupId_idx" ON "security_group_rules"("securityGroupId");

-- CreateIndex
CREATE INDEX "instances_tenantId_status_idx" ON "instances"("tenantId", "status");

-- CreateIndex
CREATE INDEX "instances_flavorId_idx" ON "instances"("flavorId");

-- CreateIndex
CREATE INDEX "instances_networkId_idx" ON "instances"("networkId");

-- CreateIndex
CREATE INDEX "instance_security_groups_securityGroupId_idx" ON "instance_security_groups"("securityGroupId");

-- CreateIndex
CREATE INDEX "operations_log_tenantId_createdAt_idx" ON "operations_log"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "operations_log_userId_createdAt_idx" ON "operations_log"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networks" ADD CONSTRAINT "networks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_groups" ADD CONSTRAINT "security_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_group_rules" ADD CONSTRAINT "security_group_rules_securityGroupId_fkey" FOREIGN KEY ("securityGroupId") REFERENCES "security_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "flavors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "networks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_security_groups" ADD CONSTRAINT "instance_security_groups_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_security_groups" ADD CONSTRAINT "instance_security_groups_securityGroupId_fkey" FOREIGN KEY ("securityGroupId") REFERENCES "security_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_log" ADD CONSTRAINT "operations_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_log" ADD CONSTRAINT "operations_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
