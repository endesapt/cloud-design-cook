import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/http";
import { requireTenantContext } from "@/lib/auth/guards";
import { resolveTenantScope } from "@/lib/tenant/scope";
import { getTenantQuotaReport } from "@/lib/quota/enforce";
import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantContext(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    const tenantExists = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenantExists) {
      throw new UnauthorizedError("Session tenant is no longer available");
    }

    const report = await getTenantQuotaReport(tenantId);
    return apiOk(report);
  } catch (error) {
    return apiError(error);
  }
}
