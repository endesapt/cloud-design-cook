import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { executeSecurityPlaybookSchema } from "@/lib/api/schemas";
import { requireTenantWrite } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors/app-error";
import { executeSecurityPlaybookForAlert } from "@/lib/security/playbooks";
import { assertTenantIsAccessible, assertTenantOwnership } from "@/lib/tenant/scope";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = requireTenantWrite(request);
    const { id } = await params;
    const body = await parseJson(request, executeSecurityPlaybookSchema);

    const alert = await prisma.securityAlert.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!alert) {
      throw new NotFoundError("Security alert not found");
    }

    assertTenantOwnership(session, alert.tenantId);
    await assertTenantIsAccessible(session, alert.tenantId);

    const result = await executeSecurityPlaybookForAlert({
      session,
      alertId: alert.id,
      playbook: body.playbook,
    });

    return apiOk(result);
  } catch (error) {
    return apiError(error);
  }
}
