import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { requireAdminRead } from "@/lib/auth/guards";
import {
  getGlobalSecurityOverview,
  getTenantSecurityOverview,
  refreshDueTenantSecuritySignals,
  refreshTenantSecuritySignals,
} from "@/lib/security/store";
import { assertTenantIsAccessible } from "@/lib/tenant/scope";

export async function GET(request: NextRequest) {
  try {
    const session = requireAdminRead(request);
    const tenantId = request.nextUrl.searchParams.get("tenantId");

    if (tenantId) {
      await assertTenantIsAccessible(session, tenantId);
      await refreshTenantSecuritySignals(tenantId);

      const [tenant, overview] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        }),
        getTenantSecurityOverview(tenantId),
      ]);

      return apiOk({
        scope: "tenant",
        tenant,
        ...overview,
      });
    }

    await refreshDueTenantSecuritySignals();
    const globalOverview = await getGlobalSecurityOverview();

    return apiOk({
      scope: "global",
      ...globalOverview,
    });
  } catch (error) {
    return apiError(error);
  }
}
