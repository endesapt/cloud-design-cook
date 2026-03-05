import { NextRequest } from "next/server";
import { InstanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { updateTenantSchema } from "@/lib/api/schemas";
import { requireAdminRead, requireAdminWrite } from "@/lib/auth/guards";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { writeOperationLog } from "@/lib/audit";
import { nextTransitionReadyAt, reconcileDeletingTenants } from "@/lib/provisioning/reconcile";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAdminRead(request);
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    return apiOk(tenant);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = requireAdminWrite(request);
    const body = await parseJson(request, updateTenantSchema);
    const { id } = await params;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Tenant not found");
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        description: body.description,
        maxVms: body.maxVms,
        maxVcpus: body.maxVcpus,
        maxRamMb: body.maxRamMb,
        maxDiskGb: body.maxDiskGb,
      },
    });

    await writeOperationLog({
      tenantId: id,
      userId: session.userId,
      action: "UPDATE_TENANT_QUOTA",
      resourceType: "tenant",
      resourceId: id,
      details: {
        before: {
          maxVms: existing.maxVms,
          maxVcpus: existing.maxVcpus,
          maxRamMb: existing.maxRamMb,
          maxDiskGb: existing.maxDiskGb,
        },
        after: {
          maxVms: updated.maxVms,
          maxVcpus: updated.maxVcpus,
          maxRamMb: updated.maxRamMb,
          maxDiskGb: updated.maxDiskGb,
        },
      },
    });

    return apiOk(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = requireAdminWrite(request);
    const { id } = await params;
    const forceDelete = request.nextUrl.searchParams.get("force") === "true";

    const existing = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundError("Tenant not found");
    }

    const [usersCount, networksCount, securityGroupsCount, instancesCount] = await Promise.all([
      prisma.user.count({ where: { tenantId: id } }),
      prisma.network.count({ where: { tenantId: id } }),
      prisma.securityGroup.count({ where: { tenantId: id } }),
      prisma.instance.count({ where: { tenantId: id } }),
    ]);

    const summary = {
      users: usersCount,
      networks: networksCount,
      securityGroups: securityGroupsCount,
      instances: instancesCount,
    };

    if (!forceDelete) {
      if (usersCount + networksCount + securityGroupsCount + instancesCount > 0) {
        throw new AppError("Tenant is not empty", 409, "TENANT_NOT_EMPTY", summary);
      }

      await prisma.tenant.delete({
        where: { id },
      });

      await writeOperationLog({
        tenantId: id,
        userId: session.userId,
        action: "DELETE_TENANT",
        riskLevel: "HIGH",
        resourceType: "tenant",
        resourceId: id,
        details: {
          mode: "safe-delete",
        },
      });

      return apiOk({ deleted: true });
    }

    if (existing.status !== "DELETING") {
      await prisma.$transaction(async (tx) => {
        await tx.tenant.update({
          where: { id },
          data: { status: "DELETING" },
        });

        await tx.instance.updateMany({
          where: {
            tenantId: id,
            status: {
              notIn: [InstanceStatus.TERMINATING, InstanceStatus.DELETED],
            },
          },
          data: {
            status: InstanceStatus.TERMINATING,
            readyAt: nextTransitionReadyAt(),
            failReason: null,
          },
        });
      });

      await writeOperationLog({
        tenantId: id,
        userId: session.userId,
        action: "FORCE_DELETE_TENANT",
        riskLevel: "CRITICAL",
        resourceType: "tenant",
        resourceId: id,
        details: {
          mode: "force-delete",
          summary,
        },
      });
    }

    await reconcileDeletingTenants();

    return apiOk(
      {
        queued: true,
        status: "DELETING",
      },
      202,
    );
  } catch (error) {
    return apiError(error);
  }
}
