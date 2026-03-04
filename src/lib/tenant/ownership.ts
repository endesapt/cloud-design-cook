import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";

export async function ensureNetworkBelongsToTenant(networkId: string, tenantId: string) {
  const network = await prisma.network.findFirst({
    where: { id: networkId, tenantId },
    select: { id: true },
  });

  if (!network) {
    throw new NotFoundError("Network not found in tenant scope");
  }

  return network;
}

export async function ensureSecurityGroupsBelongToTenant(securityGroupIds: string[], tenantId: string) {
  if (securityGroupIds.length === 0) {
    return;
  }

  const count = await prisma.securityGroup.count({
    where: { id: { in: securityGroupIds }, tenantId },
  });

  if (count !== securityGroupIds.length) {
    throw new ValidationError("One or more security groups do not belong to tenant");
  }
}
