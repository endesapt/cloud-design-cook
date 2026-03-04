import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/http";
import { requireTenantContext } from "@/lib/auth/guards";
import { resolveTenantScope } from "@/lib/tenant/scope";
import { getTenantQuotaReport } from "@/lib/quota/enforce";

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantContext(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    const report = await getTenantQuotaReport(tenantId);
    return apiOk(report);
  } catch (error) {
    return apiError(error);
  }
}
