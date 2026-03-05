import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { updateSecurityGroupSchema } from "@/lib/api/schemas";
import { requireTenantRead, requireTenantWrite } from "@/lib/auth/guards";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { writeOperationLog } from "@/lib/audit";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireTenantRead(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);

    const group = await prisma.securityGroup.findFirst({
      where: { id, tenantId },
      include: {
        rules: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!group) {
      throw new NotFoundError("Security group not found");
    }

    return apiOk(group);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireTenantWrite(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);
    const body = await parseJson(request, updateSecurityGroupSchema);

    const existing = await prisma.securityGroup.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true, description: true },
    });

    if (!existing) {
      throw new NotFoundError("Security group not found");
    }

    const updated = await prisma.securityGroup.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
      include: {
        rules: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "UPDATE_SECURITY_GROUP",
      resourceType: "security_group",
      resourceId: updated.id,
      details: {
        securityGroupId: updated.id,
        before: {
          name: existing.name,
          description: existing.description,
        },
        after: {
          name: updated.name,
          description: updated.description,
        },
      },
    });

    return apiOk(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireTenantWrite(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);

    const existing = await prisma.securityGroup.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true, description: true },
    });

    if (!existing) {
      throw new NotFoundError("Security group not found");
    }

    const attachments = await prisma.instanceSecurityGroup.count({
      where: { securityGroupId: existing.id },
    });

    if (attachments > 0) {
      throw new AppError("Security group is attached to instances", 409, "SG_IN_USE");
    }

    await prisma.securityGroup.delete({
      where: { id: existing.id },
    });

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "DELETE_SECURITY_GROUP",
      riskLevel: "MEDIUM",
      resourceType: "security_group",
      resourceId: existing.id,
      details: {
        securityGroupId: existing.id,
        name: existing.name,
        description: existing.description,
      },
    });

    return apiOk({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
