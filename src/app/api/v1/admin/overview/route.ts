import { InstanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/guards";
import { reconcileInstancesGlobal } from "@/lib/provisioning/reconcile";

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["global_admin"]);

    await reconcileInstancesGlobal();

    const [instancesByStatus, flavors, recentOperations, tenantsCount] = await Promise.all([
      prisma.instance.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
      prisma.instance.groupBy({
        by: ["flavorId"],
        where: {
          status: {
            in: [InstanceStatus.CREATING, InstanceStatus.RUNNING, InstanceStatus.STOPPED],
          },
        },
        _count: { flavorId: true },
      }),
      prisma.operationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          tenant: { select: { name: true } },
          user: { select: { email: true } },
        },
      }),
      prisma.tenant.count(),
    ]);

    const flavorMap = new Map(
      (await prisma.flavor.findMany({
        select: { id: true, name: true },
      })).map((flavor) => [flavor.id, flavor.name]),
    );

    const statusSummary = Object.values(InstanceStatus).reduce<Record<string, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {});

    for (const row of instancesByStatus) {
      statusSummary[row.status] = row._count.status;
    }

    const flavorSummary = flavors.map((row) => ({
      flavorId: row.flavorId,
      flavorName: flavorMap.get(row.flavorId) ?? row.flavorId,
      count: row._count.flavorId,
    }));

    return apiOk({
      tenantsCount,
      statusSummary,
      flavorSummary,
      recentOperations: recentOperations.map((item) => ({
        id: item.id,
        action: item.action,
        createdAt: item.createdAt,
        tenant: item.tenant?.name ?? null,
        user: item.user?.email ?? null,
        details: item.details,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
