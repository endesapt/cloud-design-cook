import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/http";
import { requireTenantRead } from "@/lib/auth/guards";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";
import { getTenantSecurityOverview, refreshTenantSecuritySignals } from "@/lib/security/store";

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantRead(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);

    await refreshTenantSecuritySignals(tenantId);
    const overview = await getTenantSecurityOverview(tenantId);

    return apiOk(overview);
  } catch (error) {
    return apiError(error);
  }
}
