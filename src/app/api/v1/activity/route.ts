import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/http";
import { requireTenantRead } from "@/lib/auth/guards";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantRead(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);

    const operations = await prisma.operationLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { email: true } },
      },
    });

    return apiOk(
      operations.map((item) => ({
        id: item.id,
        action: item.action,
        outcome: item.outcome,
        riskLevel: item.riskLevel,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        sourceIpMasked: item.sourceIpMasked,
        userAgent: item.userAgent,
        details: item.details,
        createdAt: item.createdAt,
        user: item.user?.email ?? null,
      })),
    );
  } catch (error) {
    return apiError(error);
  }
}
