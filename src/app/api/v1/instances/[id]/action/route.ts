import { InstanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { instanceActionSchema } from "@/lib/api/schemas";
import { requireTenantWrite } from "@/lib/auth/guards";
import { config } from "@/lib/config";
import { assertTenantIsAccessible, assertTenantOwnership } from "@/lib/tenant/scope";
import { checkQuotaBeforeStart } from "@/lib/quota/enforce";
import {
  dockerProvisioningEnabled,
  nextStatusForAction,
  nextTransitionReadyAt,
  reconcileInstancesForTenant,
  runDockerInstanceAction,
  scheduleProvisioning,
} from "@/lib/provisioning/reconcile";
import { writeOperationLog } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors/app-error";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireTenantWrite(request);
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
    await assertTenantIsAccessible(session, instance.tenantId);
    await reconcileInstancesForTenant(instance.tenantId);

    const fresh = await prisma.instance.findUnique({ where: { id } });
    if (!fresh) {
      throw new NotFoundError("Instance not found");
    }

    if (body.action === "start") {
      await checkQuotaBeforeStart(instance.tenantId);
    }

    const fromStatus = fresh.status;
    let nextStatus: InstanceStatus;

    let updated;
    if (body.action === "reboot") {
      // Reboot contract remains unchanged: allowed only for RUNNING.
      nextStatusForAction(fresh.status, body.action);

      if (dockerProvisioningEnabled()) {
        if (!fresh.mockRef) {
          await scheduleProvisioning(fresh.id);
          updated = await prisma.instance.findUnique({ where: { id: fresh.id } });
          nextStatus = updated?.status ?? InstanceStatus.ERROR;
        } else {
          try {
            const dockerResult = await runDockerInstanceAction(fresh.status, body.action, fresh.mockRef);
            nextStatus = dockerResult.status;
            updated = await prisma.instance.update({
              where: { id: fresh.id },
              data: {
                status: dockerResult.status,
                ipv4: dockerResult.ipv4,
                readyAt: null,
                failReason: null,
              },
            });
          } catch (error) {
            if (!config.dockerFallbackToMock) {
              throw error;
            }

            await scheduleProvisioning(fresh.id);
            updated = await prisma.instance.findUnique({ where: { id: fresh.id } });
            nextStatus = updated?.status ?? InstanceStatus.ERROR;
          }
        }
      } else {
        await scheduleProvisioning(fresh.id);
        updated = await prisma.instance.findUnique({ where: { id: fresh.id } });
        nextStatus = updated?.status ?? InstanceStatus.ERROR;
      }
    } else {
      nextStatus = nextStatusForAction(fresh.status, body.action);
      updated = await prisma.instance.update({
        where: { id: fresh.id },
        data: {
          status: nextStatus,
          readyAt: nextTransitionReadyAt(),
          failReason: null,
        },
      });
    }

    if (!updated) {
      throw new NotFoundError("Instance not found after action processing");
    }

    await writeOperationLog({
      tenantId: instance.tenantId,
      userId: session.userId,
      action: "INSTANCE_ACTION",
      riskLevel: body.action === "delete" ? "MEDIUM" : "LOW",
      resourceType: "instance",
      resourceId: instance.id,
      details: {
        instanceId: instance.id,
        action: body.action,
        from: fromStatus,
        to: nextStatus,
        mode: dockerProvisioningEnabled() ? "docker" : "mock",
      },
    });

    return apiOk(updated);
  } catch (error) {
    return apiError(error);
  }
}
