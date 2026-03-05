import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { resetUserPasswordSchema } from "@/lib/api/schemas";
import { requireTenantWrite } from "@/lib/auth/guards";
import { writeOperationLog } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors/app-error";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = requireTenantWrite(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);
    const { id } = await params;
    const body = await parseJson(request, resetUserPasswordSchema);

    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, email: true },
    });

    if (!existing) {
      throw new NotFoundError("User not found");
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash },
    });

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "RESET_USER_PASSWORD",
      riskLevel: "HIGH",
      resourceType: "user",
      resourceId: existing.id,
      details: {
        targetUserId: existing.id,
        email: existing.email,
      },
    });

    return apiOk({ updated: true });
  } catch (error) {
    return apiError(error);
  }
}
