import { InstanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createInstanceSchema } from "@/lib/api/schemas";
import { requireTenantContext } from "@/lib/auth/guards";
import { resolveTenantScope } from "@/lib/tenant/scope";
import { checkQuotaBeforeCreate } from "@/lib/quota/enforce";
import { ensureNetworkBelongsToTenant, ensureSecurityGroupsBelongToTenant } from "@/lib/tenant/ownership";
import {
  dockerProvisioningEnabled,
  reconcileInstancesForTenant,
  scheduleProvisioning,
} from "@/lib/provisioning/reconcile";
import { writeOperationLog } from "@/lib/audit";

type StatusQuery = InstanceStatus | undefined;

function parseStatus(raw: string | null): StatusQuery {
  if (!raw) return undefined;
  if (Object.values(InstanceStatus).includes(raw as InstanceStatus)) {
    return raw as InstanceStatus;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantContext(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    const status = parseStatus(request.nextUrl.searchParams.get("status"));

    await reconcileInstancesForTenant(tenantId);

    const instances = await prisma.instance.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        flavor: true,
        network: true,
        securityGroups: {
          include: {
            securityGroup: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiOk(instances);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireTenantContext(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    const body = await parseJson(request, createInstanceSchema);

    await ensureNetworkBelongsToTenant(body.networkId, tenantId);
    await ensureSecurityGroupsBelongToTenant(body.securityGroupIds, tenantId);
    await checkQuotaBeforeCreate(tenantId, body.flavorId);

    const instance = await prisma.$transaction(async (tx) => {
      const created = await tx.instance.create({
        data: {
          tenantId,
          name: body.name,
          flavorId: body.flavorId,
          networkId: body.networkId,
          status: InstanceStatus.CREATING,
          mockRef: `queued-${Date.now()}`,
        },
      });

      await tx.instanceSecurityGroup.createMany({
        data: body.securityGroupIds.map((securityGroupId) => ({
          instanceId: created.id,
          securityGroupId,
        })),
      });

      return created;
    });

    await scheduleProvisioning(instance.id);

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "CREATE_INSTANCE",
      details: {
        instanceId: instance.id,
        name: instance.name,
        mode: dockerProvisioningEnabled() ? "docker" : "mock",
      },
    });

    const fullInstance = await prisma.instance.findUnique({
      where: { id: instance.id },
      include: {
        flavor: true,
        network: true,
        securityGroups: {
          include: {
            securityGroup: true,
          },
        },
      },
    });

    return apiOk(fullInstance, 201);
  } catch (error) {
    return apiError(error);
  }
}
