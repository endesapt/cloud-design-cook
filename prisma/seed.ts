import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, InstanceStatus, RuleDirection, OperationAction } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("ChangeMe123!", 10);
  const seedInstanceId = "00000000-0000-0000-0000-0000000000b1";
  const seedOperationId = "00000000-0000-0000-0000-0000000000c1";

  const [alpha, beta] = await Promise.all([
    prisma.tenant.upsert({
      where: { slug: "alpha-corp" },
      update: {},
      create: {
        name: "Alpha Corp",
        slug: "alpha-corp",
        description: "Primary tenant environment",
        maxVms: 3,
        maxVcpus: 8,
        maxRamMb: 16384,
        maxDiskGb: 180,
      },
    }),
    prisma.tenant.upsert({
      where: { slug: "beta-labs" },
      update: {},
      create: {
        name: "Beta Labs",
        slug: "beta-labs",
        description: "Secondary tenant for isolation checks",
        maxVms: 2,
        maxVcpus: 4,
        maxRamMb: 8192,
        maxDiskGb: 120,
      },
    }),
  ]);

  const [globalAdmin, supportViewer, alphaAdmin, alphaViewer, betaAdmin] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@cloud.local" },
      update: {
        passwordHash: password,
      },
      create: {
        email: "admin@cloud.local",
        passwordHash: password,
        fullName: "Global Admin",
        role: UserRole.global_admin,
      },
    }),
    prisma.user.upsert({
      where: { email: "support@cloud.local" },
      update: {
        passwordHash: password,
      },
      create: {
        email: "support@cloud.local",
        passwordHash: password,
        fullName: "Support Viewer",
        role: UserRole.support_viewer,
      },
    }),
    prisma.user.upsert({
      where: { email: "owner@alpha.local" },
      update: {
        passwordHash: password,
      },
      create: {
        email: "owner@alpha.local",
        passwordHash: password,
        fullName: "Alpha Owner",
        role: UserRole.tenant_admin,
        tenantId: alpha.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "viewer@alpha.local" },
      update: {
        passwordHash: password,
      },
      create: {
        email: "viewer@alpha.local",
        passwordHash: password,
        fullName: "Alpha Viewer",
        role: UserRole.tenant_user,
        tenantId: alpha.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "owner@beta.local" },
      update: {
        passwordHash: password,
      },
      create: {
        email: "owner@beta.local",
        passwordHash: password,
        fullName: "Beta Owner",
        role: UserRole.tenant_admin,
        tenantId: beta.id,
      },
    }),
  ]);

  const [small, medium, large] = await Promise.all([
    prisma.flavor.upsert({
      where: { name: "s1.small" },
      update: {},
      create: { name: "s1.small", vcpus: 1, ramMb: 2048, diskGb: 20 },
    }),
    prisma.flavor.upsert({
      where: { name: "m1.medium" },
      update: {},
      create: { name: "m1.medium", vcpus: 2, ramMb: 4096, diskGb: 40 },
    }),
    prisma.flavor.upsert({
      where: { name: "l1.large" },
      update: {},
      create: { name: "l1.large", vcpus: 4, ramMb: 8192, diskGb: 80 },
    }),
  ]);

  const alphaNetwork = await prisma.network.upsert({
    where: { id: "00000000-0000-0000-0000-0000000000a1" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-0000000000a1",
      tenantId: alpha.id,
      name: "alpha-vpc",
      cidr: "10.10.0.0/24",
    },
  });

  const alphaDefaultSg = await prisma.securityGroup.upsert({
    where: {
      tenantId_name: {
        tenantId: alpha.id,
        name: "default",
      },
    },
    update: {
      description: "Default SG for seed",
    },
    create: {
      tenantId: alpha.id,
      name: "default",
      description: "Default SG for seed",
    },
  });

  await prisma.securityGroupRule.deleteMany({
    where: { securityGroupId: alphaDefaultSg.id },
  });

  await prisma.securityGroupRule.createMany({
    data: [
      {
        securityGroupId: alphaDefaultSg.id,
        direction: RuleDirection.ingress,
        protocol: "tcp",
        portFrom: 22,
        portTo: 22,
        cidr: "0.0.0.0/0",
      },
      {
        securityGroupId: alphaDefaultSg.id,
        direction: RuleDirection.ingress,
        protocol: "tcp",
        portFrom: 443,
        portTo: 443,
        cidr: "0.0.0.0/0",
      },
    ],
  });

  const seedInstance = await prisma.instance.upsert({
    where: { id: seedInstanceId },
    update: {
      tenantId: alpha.id,
      name: "alpha-web-1",
      flavorId: medium.id,
      networkId: alphaNetwork.id,
      status: InstanceStatus.RUNNING,
      ipv4: "10.10.0.11",
      mockRef: "mock-seed-1",
      readyAt: null,
      failReason: null,
    },
    create: {
      id: seedInstanceId,
      tenantId: alpha.id,
      name: "alpha-web-1",
      flavorId: medium.id,
      networkId: alphaNetwork.id,
      status: InstanceStatus.RUNNING,
      ipv4: "10.10.0.11",
      mockRef: "mock-seed-1",
    },
  });

  await prisma.instanceSecurityGroup.upsert({
    where: {
      instanceId_securityGroupId: {
        instanceId: seedInstance.id,
        securityGroupId: alphaDefaultSg.id,
      },
    },
    update: {},
    create: {
      instanceId: seedInstance.id,
      securityGroupId: alphaDefaultSg.id,
    },
  });

  await prisma.operationLog.upsert({
    where: { id: seedOperationId },
    update: {
      details: {
        message: "Seeded instance",
        instanceId: seedInstance.id,
      },
    },
    create: {
      id: seedOperationId,
      tenantId: alpha.id,
      userId: alphaAdmin.id,
      action: OperationAction.CREATE_INSTANCE,
      details: {
        message: "Seeded instance",
        instanceId: seedInstance.id,
      },
    },
  });

  console.log("Seed completed", {
    users: [globalAdmin.email, supportViewer.email, alphaAdmin.email, alphaViewer.email, betaAdmin.email],
    flavors: [small.name, medium.name, large.name],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
