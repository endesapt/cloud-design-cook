import { InstanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { QuotaUsage } from "@/lib/quota/types";

const QUOTA_RELEVANT_STATUSES: InstanceStatus[] = [
  InstanceStatus.CREATING,
  InstanceStatus.STARTING,
  InstanceStatus.RUNNING,
  InstanceStatus.STOPPING,
  InstanceStatus.STOPPED,
  InstanceStatus.TERMINATING,
];

export async function getTenantUsage(tenantId: string): Promise<QuotaUsage> {
  const instances = await prisma.instance.findMany({
    where: {
      tenantId,
      status: { in: QUOTA_RELEVANT_STATUSES },
    },
    select: {
      flavor: {
        select: {
          vcpus: true,
          ramMb: true,
          diskGb: true,
        },
      },
    },
  });

  return instances.reduce(
    (acc, item) => {
      acc.usedVms += 1;
      acc.usedVcpus += item.flavor.vcpus;
      acc.usedRamMb += item.flavor.ramMb;
      acc.usedDiskGb += item.flavor.diskGb;
      return acc;
    },
    { usedVms: 0, usedVcpus: 0, usedRamMb: 0, usedDiskGb: 0 } satisfies QuotaUsage,
  );
}

export { QUOTA_RELEVANT_STATUSES };
