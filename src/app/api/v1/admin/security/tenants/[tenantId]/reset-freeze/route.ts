import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/http";
import { requireAdminWrite } from "@/lib/auth/guards";
import { writeOperationLog } from "@/lib/audit";
import { resetTenantSecurityDemoFreeze } from "@/lib/security/store";
import { assertTenantIsAccessible } from "@/lib/tenant/scope";

type Params = {
  params: Promise<{ tenantId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = requireAdminWrite(request);
    const { tenantId } = await params;
    await assertTenantIsAccessible(session, tenantId);

    const overview = await resetTenantSecurityDemoFreeze(tenantId);

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "RESET_SECURITY_DEMO_FREEZE",
      riskLevel: "MEDIUM",
      resourceType: "tenant_security_state",
      resourceId: tenantId,
      details: {
        tenantId,
        resetMode: "CLEAR_AND_REBUILD",
      },
    });

    return apiOk({
      tenantId,
      resetAt: new Date(),
      overview,
    });
  } catch (error) {
    return apiError(error);
  }
}
