import { InstanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { config } from "@/lib/config";
import { AppError } from "@/lib/errors/app-error";
import {
  createDockerBackedInstance,
  ensureDockerAvailable,
  removeDockerContainer,
  restartDockerContainer,
  runtimeResources,
  startDockerContainer,
  stopDockerContainer,
} from "@/lib/provisioning/docker";

function randomDelayMs() {
  const min = 5_000;
  const max = 15_000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shouldFailProvision() {
  return Math.random() < config.mockFailRate;
}

function buildMockRef(instanceId: string) {
  return `mock-${instanceId.slice(0, 8)}-${Date.now()}`;
}

function pseudoIpForTenant(tenantId: string, instanceId: string) {
  const tenantByte = (Number.parseInt(tenantId.replace(/-/g, "").slice(0, 2), 16) % 200) + 10;
  const hostByte = (Number.parseInt(instanceId.replace(/-/g, "").slice(0, 2), 16) % 200) + 10;
  return `10.${tenantByte}.0.${hostByte}`;
}

function shouldUseDockerProvisioning() {
  return config.provisionMode === "docker";
}

function fallbackToMockIsEnabled() {
  return config.dockerFallbackToMock;
}

function dockerResourcesMeta() {
  const resources = runtimeResources();
  return `${resources.cpus} CPU / ${resources.memoryMb}MB RAM / pids ${resources.pidsLimit}`;
}

export async function scheduleProvisioning(instanceId: string) {
  if (shouldUseDockerProvisioning()) {
    try {
      await ensureDockerAvailable();
      const launched = await createDockerBackedInstance(instanceId);
      return prisma.instance.update({
        where: { id: instanceId },
        data: {
          status: InstanceStatus.RUNNING,
          readyAt: null,
          failReason: null,
          ipv4: launched.ipv4,
          mockRef: launched.containerId,
        },
      });
    } catch (error) {
      if (!fallbackToMockIsEnabled()) {
        const failReason = error instanceof Error ? error.message : "Docker provisioning failed";
        return prisma.instance.update({
          where: { id: instanceId },
          data: {
            status: InstanceStatus.ERROR,
            readyAt: null,
            failReason,
          },
        });
      }
    }
  }

  const delay = randomDelayMs();
  const readyAt = new Date(Date.now() + delay);

  return prisma.instance.update({
    where: { id: instanceId },
    data: {
      status: InstanceStatus.CREATING,
      readyAt,
      failReason: shouldUseDockerProvisioning()
        ? `Docker unavailable, fallback to mock provisioning (${dockerResourcesMeta()})`
        : null,
    },
  });
}

export async function reconcileInstancesForTenant(tenantId: string) {
  const now = new Date();

  const dueInstances = await prisma.instance.findMany({
    where: {
      tenantId,
      status: InstanceStatus.CREATING,
      readyAt: { lte: now },
    },
    select: { id: true, tenantId: true },
  });

  if (!dueInstances.length) {
    return 0;
  }

  await prisma.$transaction(
    dueInstances.map((instance) =>
      prisma.instance.update({
        where: { id: instance.id },
        data: shouldFailProvision()
          ? {
              status: InstanceStatus.ERROR,
              failReason: "Mock hypervisor transient failure",
              readyAt: null,
            }
          : {
              status: InstanceStatus.RUNNING,
              ipv4: pseudoIpForTenant(instance.tenantId, instance.id),
              mockRef: buildMockRef(instance.id),
              failReason: null,
              readyAt: null,
            },
      }),
    ),
  );

  return dueInstances.length;
}

export async function reconcileInstancesGlobal() {
  const tenants = await prisma.instance.findMany({
    where: {
      status: InstanceStatus.CREATING,
      readyAt: { lte: new Date() },
    },
    select: { tenantId: true },
    distinct: ["tenantId"],
  });

  let total = 0;
  for (const tenant of tenants) {
    total += await reconcileInstancesForTenant(tenant.tenantId);
  }

  return total;
}

export function nextStatusForAction(currentStatus: InstanceStatus, action: "start" | "stop" | "reboot" | "delete") {
  if (action === "delete") {
    return InstanceStatus.DELETED;
  }

  if (action === "stop") {
    if (currentStatus !== InstanceStatus.RUNNING) {
      throw new AppError("Stop action allowed only for RUNNING instance", 409, "INVALID_TRANSITION");
    }
    return InstanceStatus.STOPPED;
  }

  if (action === "start") {
    if (currentStatus !== InstanceStatus.STOPPED) {
      throw new AppError("Start action allowed only for STOPPED instance", 409, "INVALID_TRANSITION");
    }
    return InstanceStatus.CREATING;
  }

  if (action === "reboot") {
    if (currentStatus !== InstanceStatus.RUNNING) {
      throw new AppError("Reboot action allowed only for RUNNING instance", 409, "INVALID_TRANSITION");
    }
    return InstanceStatus.CREATING;
  }

  throw new AppError("Unknown action", 422, "UNKNOWN_ACTION");
}

export async function runDockerInstanceAction(
  currentStatus: InstanceStatus,
  action: "start" | "stop" | "reboot" | "delete",
  containerId: string | null,
) {
  if (!containerId) {
    throw new AppError("Docker container reference is missing", 409, "DOCKER_REF_MISSING");
  }

  if (action === "stop") {
    if (currentStatus !== InstanceStatus.RUNNING) {
      throw new AppError("Stop action allowed only for RUNNING instance", 409, "INVALID_TRANSITION");
    }
    await stopDockerContainer(containerId);
    return { status: InstanceStatus.STOPPED, ipv4: null };
  }

  if (action === "start") {
    if (currentStatus !== InstanceStatus.STOPPED) {
      throw new AppError("Start action allowed only for STOPPED instance", 409, "INVALID_TRANSITION");
    }
    const ipv4 = await startDockerContainer(containerId);
    return { status: InstanceStatus.RUNNING, ipv4 };
  }

  if (action === "reboot") {
    if (currentStatus !== InstanceStatus.RUNNING) {
      throw new AppError("Reboot action allowed only for RUNNING instance", 409, "INVALID_TRANSITION");
    }
    const ipv4 = await restartDockerContainer(containerId);
    return { status: InstanceStatus.RUNNING, ipv4 };
  }

  if (action === "delete") {
    await removeDockerContainer(containerId);
    return { status: InstanceStatus.DELETED, ipv4: null };
  }

  throw new AppError("Unknown action", 422, "UNKNOWN_ACTION");
}

export function dockerProvisioningEnabled() {
  return shouldUseDockerProvisioning();
}
