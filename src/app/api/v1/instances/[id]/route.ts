import { InstanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { updateInstanceSchema } from "@/lib/api/schemas";
import { requireTenantRead, requireTenantWrite } from "@/lib/auth/guards";
import { writeOperationLog } from "@/lib/audit";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { checkQuotaBeforeResize } from "@/lib/quota/enforce";
import { ensureSecurityGroupsBelongToTenant } from "@/lib/tenant/ownership";
import { assertTenantIsAccessible, assertTenantOwnership } from "@/lib/tenant/scope";

type Params = {
  params: Promise<{ id: string }>;
};

async function getInstanceOrThrow(id: string) {
  const instance = await prisma.instance.findUnique({
    where: { id },
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

  if (!instance) {
    throw new NotFoundError("Instance not found");
  }

  return instance;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireTenantRead(request);
    const instance = await getInstanceOrThrow(id);

    assertTenantOwnership(session, instance.tenantId);
    await assertTenantIsAccessible(session, instance.tenantId);

    return apiOk(instance);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireTenantWrite(request);
    const body = await parseJson(request, updateInstanceSchema);
    const existing = await getInstanceOrThrow(id);

    assertTenantOwnership(session, existing.tenantId);
    await assertTenantIsAccessible(session, existing.tenantId);

    if (body.flavorId && body.flavorId !== existing.flavorId && existing.status !== InstanceStatus.STOPPED) {
      throw new AppError("Instance must be STOPPED for flavor resize", 409, "INSTANCE_MUST_BE_STOPPED_FOR_RESIZE");
    }

    if (body.flavorId && body.flavorId !== existing.flavorId) {
      await checkQuotaBeforeResize(existing.tenantId, existing.flavorId, body.flavorId);
    }

    let normalizedSecurityGroupIds: string[] | undefined;
    if (body.securityGroupIds !== undefined) {
      normalizedSecurityGroupIds = [...new Set(body.securityGroupIds)];
      if (!normalizedSecurityGroupIds.length) {
        throw new AppError("At least one security group is required", 422, "VALIDATION_ERROR");
      }
      await ensureSecurityGroupsBelongToTenant(normalizedSecurityGroupIds, existing.tenantId);
    }

    await prisma.$transaction(async (tx) => {
      await tx.instance.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.flavorId !== undefined ? { flavorId: body.flavorId } : {}),
        },
      });

      if (normalizedSecurityGroupIds) {
        await tx.instanceSecurityGroup.deleteMany({
          where: { instanceId: existing.id },
        });

        await tx.instanceSecurityGroup.createMany({
          data: normalizedSecurityGroupIds.map((securityGroupId) => ({
            instanceId: existing.id,
            securityGroupId,
          })),
        });
      }
    });

    const updated = await getInstanceOrThrow(existing.id);

    await writeOperationLog({
      tenantId: existing.tenantId,
      userId: session.userId,
      action: "UPDATE_INSTANCE",
      details: {
        instanceId: existing.id,
        before: {
          name: existing.name,
          flavorId: existing.flavorId,
          securityGroupIds: existing.securityGroups.map((item) => item.securityGroupId),
        },
        after: {
          name: updated.name,
          flavorId: updated.flavorId,
          securityGroupIds: updated.securityGroups.map((item) => item.securityGroupId),
        },
      },
    });

    return apiOk(updated);
  } catch (error) {
    return apiError(error);
  }
}
