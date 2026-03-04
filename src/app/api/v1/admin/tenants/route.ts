import { InstanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createTenantSchema } from "@/lib/api/schemas";
import { requireRole } from "@/lib/auth/guards";

const usageStatuses: InstanceStatus[] = [
  InstanceStatus.CREATING,
  InstanceStatus.STARTING,
  InstanceStatus.RUNNING,
  InstanceStatus.STOPPING,
  InstanceStatus.STOPPED,
  InstanceStatus.TERMINATING,
];

function summarizeUsage(
  instances: Array<{
    status: InstanceStatus;
    flavor: { vcpus: number; ramMb: number; diskGb: number };
  }>,
) {
  const active = instances.filter((instance) => usageStatuses.includes(instance.status));

  return active.reduce(
    (acc, instance) => {
      acc.usedVms += 1;
      acc.usedVcpus += instance.flavor.vcpus;
      acc.usedRamMb += instance.flavor.ramMb;
      acc.usedDiskGb += instance.flavor.diskGb;
      return acc;
    },
    { usedVms: 0, usedVcpus: 0, usedRamMb: 0, usedDiskGb: 0 },
  );
}

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["global_admin"]);

    const tenants = await prisma.tenant.findMany({
      include: {
        instances: {
          select: {
            status: true,
            flavor: {
              select: {
                vcpus: true,
                ramMb: true,
                diskGb: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description,
      quotas: {
        maxVms: tenant.maxVms,
        maxVcpus: tenant.maxVcpus,
        maxRamMb: tenant.maxRamMb,
        maxDiskGb: tenant.maxDiskGb,
      },
      usage: summarizeUsage(tenant.instances),
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    }));

    return apiOk(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["global_admin"]);
    const body = await parseJson(request, createTenantSchema);

    const tenant = await prisma.tenant.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        maxVms: body.maxVms,
        maxVcpus: body.maxVcpus,
        maxRamMb: body.maxRamMb,
        maxDiskGb: body.maxDiskGb,
      },
    });

    return apiOk(tenant, 201);
  } catch (error) {
    return apiError(error);
  }
}
