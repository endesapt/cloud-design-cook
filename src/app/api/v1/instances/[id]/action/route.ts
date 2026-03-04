import { InstanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { instanceActionSchema } from "@/lib/api/schemas";
import { requireTenantContext } from "@/lib/auth/guards";
import { config } from "@/lib/config";
import { assertTenantOwnership } from "@/lib/tenant/scope";
import { checkQuotaBeforeStart } from "@/lib/quota/enforce";
import {
  dockerProvisioningEnabled,
  nextStatusForAction,
  reconcileInstancesForTenant,
  runDockerInstanceAction,
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

    let updated;
    const fromStatus = fresh.status;
    let nextStatus: InstanceStatus;

    if (dockerProvisioningEnabled()) {
      if (!fresh.mockRef && (body.action === "start" || body.action === "reboot")) {
        await scheduleProvisioning(fresh.id);
        updated = await prisma.instance.findUnique({ where: { id: fresh.id } });
        nextStatus = updated?.status ?? InstanceStatus.ERROR;
      } else if (!fresh.mockRef && body.action === "stop") {
        nextStatus = InstanceStatus.STOPPED;
        updated = await prisma.instance.update({
          where: { id: fresh.id },
          data: {
            status: InstanceStatus.STOPPED,
            ipv4: null,
            readyAt: null,
            failReason: "Container reference missing, marked as STOPPED",
          },
        });
      } else if (!fresh.mockRef && body.action === "delete") {
        nextStatus = InstanceStatus.DELETED;
        updated = await prisma.instance.update({
          where: { id: fresh.id },
          data: {
            status: InstanceStatus.DELETED,
            ipv4: null,
            mockRef: null,
            readyAt: null,
          },
        });
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
              ...(dockerResult.status === InstanceStatus.DELETED
                ? {
                    mockRef: null,
                  }
                : {}),
            },
          });
        } catch (error) {
          if (!config.dockerFallbackToMock) {
            throw error;
          }

          if (body.action === "delete") {
            nextStatus = InstanceStatus.DELETED;
            updated = await prisma.instance.update({
              where: { id: fresh.id },
              data: {
                status: InstanceStatus.DELETED,
                ipv4: null,
                mockRef: null,
                readyAt: null,
                failReason: "Docker action failed, deleted in fallback mode",
              },
            });
          } else if (body.action === "stop") {
            nextStatus = InstanceStatus.STOPPED;
            updated = await prisma.instance.update({
              where: { id: fresh.id },
              data: {
                status: InstanceStatus.STOPPED,
                ipv4: null,
                readyAt: null,
                failReason: "Docker stop failed, switched to fallback state",
              },
            });
          } else {
            await scheduleProvisioning(fresh.id);
            updated = await prisma.instance.findUnique({ where: { id: fresh.id } });
            nextStatus = updated?.status ?? InstanceStatus.ERROR;
          }
        }
      }
    } else {
      nextStatus = nextStatusForAction(fresh.status, body.action);

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
    }

    if (!updated) {
      throw new NotFoundError("Instance not found after action processing");
    }

    await writeOperationLog({
      tenantId: instance.tenantId,
      userId: session.userId,
      action: "INSTANCE_ACTION",
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
