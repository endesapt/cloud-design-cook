import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { updateUserSchema } from "@/lib/api/schemas";
import { requireTenantRead, requireTenantWrite } from "@/lib/auth/guards";
import { writeOperationLog } from "@/lib/audit";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";
import { assertNotLastTenantAdmin, assertTenantAdminCanAssignRole } from "@/lib/users/policies";

type Params = {
  params: Promise<{ id: string }>;
};

function toUserDto(user: {
  id: string;
  email: string;
  fullName: string;
  role: "global_admin" | "support_viewer" | "tenant_admin" | "tenant_user";
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    tenantId: user.tenantId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = requireTenantRead(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return apiOk(toUserDto(user));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = requireTenantWrite(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);
    const { id } = await params;
    const body = await parseJson(request, updateUserSchema);

    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!existing) {
      throw new NotFoundError("User not found");
    }

    if (body.role && !["tenant_admin", "tenant_user"].includes(body.role)) {
      throw new AppError("Tenant users endpoint supports tenant roles only", 403, "ROLE_SCOPE_VIOLATION");
    }

    if (session.role === "tenant_admin" && body.role) {
      assertTenantAdminCanAssignRole(body.role);
    }

    if (body.tenantId !== undefined && body.tenantId !== tenantId) {
      throw new AppError("Cross-tenant assignment is forbidden", 403, "ROLE_SCOPE_VIOLATION");
    }

    const nextRole = body.role ?? existing.role;
    await assertNotLastTenantAdmin(tenantId, existing.id, nextRole);

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "UPDATE_USER",
      details: {
        targetUserId: updated.id,
        before: {
          fullName: existing.fullName,
          role: existing.role,
        },
        after: {
          fullName: updated.fullName,
          role: updated.role,
        },
      },
    });

    return apiOk(toUserDto(updated));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = requireTenantWrite(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);
    const { id } = await params;

    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!existing) {
      throw new NotFoundError("User not found");
    }

    await assertNotLastTenantAdmin(tenantId, existing.id, null);

    await prisma.user.delete({
      where: { id: existing.id },
    });

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "DELETE_USER",
      details: {
        targetUserId: existing.id,
        email: existing.email,
        role: existing.role,
      },
    });

    return apiOk({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
