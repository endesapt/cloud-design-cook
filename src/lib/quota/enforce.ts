import { prisma } from "@/lib/db/prisma";
import { NotFoundError, QuotaExceededError } from "@/lib/errors/app-error";
import { exceedsQuota, projectUsage } from "@/lib/quota/logic";
import type { QuotaLimits } from "@/lib/quota/types";
import { getTenantUsage } from "@/lib/quota/usage";

export async function getTenantLimits(tenantId: string): Promise<QuotaLimits> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      maxVms: true,
      maxVcpus: true,
      maxRamMb: true,
      maxDiskGb: true,
    },
  });

  if (!tenant) {
    throw new NotFoundError("Tenant not found");
  }

  return tenant;
}

export async function checkQuotaBeforeCreate(tenantId: string, flavorId: string) {
  const [limits, usage, flavor] = await Promise.all([
    getTenantLimits(tenantId),
    getTenantUsage(tenantId),
    prisma.flavor.findUnique({
      where: { id: flavorId },
      select: { id: true, name: true, vcpus: true, ramMb: true, diskGb: true },
    }),
  ]);

  if (!flavor) {
    throw new NotFoundError("Flavor not found");
  }

  const projected = projectUsage(usage, {
    vms: 1,
    vcpus: flavor.vcpus,
    ramMb: flavor.ramMb,
    diskGb: flavor.diskGb,
  });

  if (exceedsQuota(limits, projected)) {
    throw new QuotaExceededError("Quota exceeded for tenant", {
      limits,
      usage,
      projected,
      flavor: { id: flavor.id, name: flavor.name },
    });
  }

  return { limits, usage, flavor };
}

export async function checkQuotaBeforeResize(tenantId: string, currentFlavorId: string, nextFlavorId: string) {
  if (currentFlavorId === nextFlavorId) {
    return null;
  }

  const [limits, usage, currentFlavor, nextFlavor] = await Promise.all([
    getTenantLimits(tenantId),
    getTenantUsage(tenantId),
    prisma.flavor.findUnique({
      where: { id: currentFlavorId },
      select: { id: true, name: true, vcpus: true, ramMb: true, diskGb: true },
    }),
    prisma.flavor.findUnique({
      where: { id: nextFlavorId },
      select: { id: true, name: true, vcpus: true, ramMb: true, diskGb: true },
    }),
  ]);

  if (!currentFlavor) {
    throw new NotFoundError("Current flavor not found");
  }

  if (!nextFlavor) {
    throw new NotFoundError("Target flavor not found");
  }

  const projected = projectUsage(usage, {
    vms: 0,
    vcpus: nextFlavor.vcpus - currentFlavor.vcpus,
    ramMb: nextFlavor.ramMb - currentFlavor.ramMb,
    diskGb: nextFlavor.diskGb - currentFlavor.diskGb,
  });

  if (exceedsQuota(limits, projected)) {
    throw new QuotaExceededError("Quota exceeded for tenant", {
      limits,
      usage,
      projected,
      currentFlavor: { id: currentFlavor.id, name: currentFlavor.name },
      nextFlavor: { id: nextFlavor.id, name: nextFlavor.name },
    });
  }

  return { limits, usage, projected, currentFlavor, nextFlavor };
}

export async function checkQuotaBeforeStart(tenantId: string) {
  const [limits, usage] = await Promise.all([getTenantLimits(tenantId), getTenantUsage(tenantId)]);

  if (exceedsQuota(limits, usage)) {
    throw new QuotaExceededError("Quota exceeded for tenant", {
      limits,
      usage,
    });
  }

  return { limits, usage };
}

export async function getTenantQuotaReport(tenantId: string) {
  const [limits, usage] = await Promise.all([getTenantLimits(tenantId), getTenantUsage(tenantId)]);
  return { limits, usage };
}
