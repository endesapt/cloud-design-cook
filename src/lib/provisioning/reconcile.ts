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

function randomProvisionDelayMs() {
  const min = 5_000;
  const max = 15_000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTransitionDelayMs() {
  const min = 4_000;
  const max = 6_000;
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

function canUseDockerReference(reference: string | null): reference is string {
  if (!reference) return false;
  return !reference.startsWith("mock-") && !reference.startsWith("queued-");
}

export function nextTransitionReadyAt() {
  return new Date(Date.now() + randomTransitionDelayMs());
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

  const delay = randomProvisionDelayMs();
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

async function finalizeCreating(instance: { id: string; tenantId: string }) {
  if (shouldFailProvision()) {
    await prisma.instance.update({
      where: { id: instance.id },
      data: {
        status: InstanceStatus.ERROR,
        failReason: "Mock hypervisor transient failure",
        readyAt: null,
      },
    });
    return;
  }

  await prisma.instance.update({
    where: { id: instance.id },
    data: {
      status: InstanceStatus.RUNNING,
      ipv4: pseudoIpForTenant(instance.tenantId, instance.id),
      mockRef: buildMockRef(instance.id),
      failReason: null,
      readyAt: null,
    },
  });
}

async function finalizeStarting(instance: { id: string; tenantId: string; mockRef: string | null }) {
  if (shouldUseDockerProvisioning() && canUseDockerReference(instance.mockRef)) {
    try {
      const ipv4 = await startDockerContainer(instance.mockRef);
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          status: InstanceStatus.RUNNING,
          ipv4,
          failReason: null,
          readyAt: null,
        },
      });
      return;
    } catch (error) {
      if (!fallbackToMockIsEnabled()) {
        const failReason = error instanceof Error ? error.message : "Docker start failed";
        await prisma.instance.update({
          where: { id: instance.id },
          data: {
            status: InstanceStatus.ERROR,
            failReason,
            readyAt: null,
          },
        });
        return;
      }
    }
  }

  if (shouldUseDockerProvisioning() && !instance.mockRef) {
    await scheduleProvisioning(instance.id);
    return;
  }

  await prisma.instance.update({
    where: { id: instance.id },
    data: {
      status: InstanceStatus.RUNNING,
      ipv4: pseudoIpForTenant(instance.tenantId, instance.id),
      mockRef: instance.mockRef ?? buildMockRef(instance.id),
      failReason: null,
      readyAt: null,
    },
  });
}

async function finalizeStopping(instance: { id: string; mockRef: string | null }) {
  if (shouldUseDockerProvisioning() && canUseDockerReference(instance.mockRef)) {
    try {
      await stopDockerContainer(instance.mockRef);
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          status: InstanceStatus.STOPPED,
          ipv4: null,
          failReason: null,
          readyAt: null,
        },
      });
      return;
    } catch (error) {
      if (!fallbackToMockIsEnabled()) {
        const failReason = error instanceof Error ? error.message : "Docker stop failed";
        await prisma.instance.update({
          where: { id: instance.id },
          data: {
            status: InstanceStatus.ERROR,
            failReason,
            readyAt: null,
          },
        });
        return;
      }
    }
  }

  await prisma.instance.update({
    where: { id: instance.id },
    data: {
      status: InstanceStatus.STOPPED,
      ipv4: null,
      failReason: instance.mockRef
        ? "Docker stop failed, switched to fallback state"
        : "Container reference missing, marked as STOPPED",
      readyAt: null,
    },
  });
}

async function finalizeTerminating(instance: { id: string; mockRef: string | null }) {
  if (shouldUseDockerProvisioning() && canUseDockerReference(instance.mockRef)) {
    try {
      await removeDockerContainer(instance.mockRef);
    } catch (error) {
      if (!fallbackToMockIsEnabled()) {
        const failReason = error instanceof Error ? error.message : "Docker delete failed";
        await prisma.instance.update({
          where: { id: instance.id },
          data: {
            status: InstanceStatus.ERROR,
            failReason,
            readyAt: null,
          },
        });
        return;
      }
    }
  }

  await prisma.instance.delete({ where: { id: instance.id } });
}

export async function reconcileInstancesForTenant(tenantId: string) {
  const now = new Date();

  const dueInstances = await prisma.instance.findMany({
    where: {
      tenantId,
      status: {
        in: [InstanceStatus.CREATING, InstanceStatus.STARTING, InstanceStatus.STOPPING, InstanceStatus.TERMINATING],
      },
      readyAt: { lte: now },
    },
    select: { id: true, tenantId: true, status: true, mockRef: true },
  });

  if (!dueInstances.length) {
    return 0;
  }

  let processed = 0;
  for (const instance of dueInstances) {
    try {
      if (instance.status === InstanceStatus.CREATING) {
        await finalizeCreating(instance);
      } else if (instance.status === InstanceStatus.STARTING) {
        await finalizeStarting(instance);
      } else if (instance.status === InstanceStatus.STOPPING) {
        await finalizeStopping(instance);
      } else if (instance.status === InstanceStatus.TERMINATING) {
        await finalizeTerminating(instance);
      }
      processed += 1;
    } catch (error) {
      const failReason = error instanceof Error ? error.message : "Lifecycle reconciliation failed";
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          status: InstanceStatus.ERROR,
          failReason,
          readyAt: null,
        },
      });
      processed += 1;
    }
  }

  return processed;
}

export async function reconcileInstancesGlobal() {
  const tenants = await prisma.instance.findMany({
    where: {
      status: {
        in: [InstanceStatus.CREATING, InstanceStatus.STARTING, InstanceStatus.STOPPING, InstanceStatus.TERMINATING],
      },
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
  const transitionStatuses: InstanceStatus[] = [
    InstanceStatus.CREATING,
    InstanceStatus.STARTING,
    InstanceStatus.STOPPING,
    InstanceStatus.TERMINATING,
  ];

  if (transitionStatuses.includes(currentStatus)) {
    throw new AppError("Action is not allowed while instance transition is in progress", 409, "INVALID_TRANSITION");
  }

  if (action === "delete") {
    if (currentStatus === InstanceStatus.DELETED) {
      throw new AppError("Instance is already deleted", 409, "INVALID_TRANSITION");
    }
    return InstanceStatus.TERMINATING;
  }

  if (action === "stop") {
    if (currentStatus !== InstanceStatus.RUNNING) {
      throw new AppError("Stop action allowed only for RUNNING instance", 409, "INVALID_TRANSITION");
    }
    return InstanceStatus.STOPPING;
  }

  if (action === "start") {
    if (currentStatus !== InstanceStatus.STOPPED) {
      throw new AppError("Start action allowed only for STOPPED instance", 409, "INVALID_TRANSITION");
    }
    return InstanceStatus.STARTING;
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
