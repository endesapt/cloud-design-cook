import { InstanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { instanceActionSchema } from "@/lib/api/schemas";
import { requireTenantContext } from "@/lib/auth/guards";
import { assertTenantOwnership } from "@/lib/tenant/scope";
import { checkQuotaBeforeStart } from "@/lib/quota/enforce";
import {
  nextStatusForAction,
  reconcileInstancesForTenant,
  scheduleProvisioning,
} from "@/lib/provisioning/reconcile";
import { writeOperationLog } from "@/lib/audit";
import { AppError, NotFoundError } from "@/lib/errors/app-error";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireTenantContext(request);
    const body = await parseJson(request, instanceActionSchema);

    const instance = await prisma.instance.findUnique({
      where: { id },
      include: {
        flavor: true,
      },
    });

    if (!instance) {
      throw new NotFoundError("Instance not found");
    }

    assertTenantOwnership(session, instance.tenantId);
    await reconcileInstancesForTenant(instance.tenantId);

    const fresh = await prisma.instance.findUnique({ where: { id } });
    if (!fresh) {
      throw new NotFoundError("Instance not found");
    }

    if (fresh.status === InstanceStatus.DELETED) {
      throw new AppError("Instance is already deleted", 409, "INVALID_TRANSITION");
    }

    if (body.action === "start") {
      await checkQuotaBeforeStart(instance.tenantId);
    }

    const nextStatus = nextStatusForAction(fresh.status, body.action);

    let updated;
    if (nextStatus === InstanceStatus.CREATING) {
      await scheduleProvisioning(fresh.id);
      updated = await prisma.instance.findUnique({ where: { id: fresh.id } });
    } else {
      updated = await prisma.instance.update({
        where: { id: fresh.id },
        data: {
          status: nextStatus,
          readyAt: null,
          ...(nextStatus === InstanceStatus.DELETED
            ? {
                ipv4: null,
                failReason: null,
              }
            : {}),
        },
      });
    }

    await writeOperationLog({
      tenantId: instance.tenantId,
      userId: session.userId,
      action: "INSTANCE_ACTION",
      details: {
        instanceId: instance.id,
        action: body.action,
        from: fresh.status,
        to: nextStatus,
      },
    });

    return apiOk(updated);
  } catch (error) {
    return apiError(error);
  }
}
