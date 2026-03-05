import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { updateUserSchema } from "@/lib/api/schemas";
import { requireAdminRead, requireAdminWrite } from "@/lib/auth/guards";
import { writeOperationLog } from "@/lib/audit";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { assertNotLastTenantAdmin, assertRoleTenantRequirement } from "@/lib/users/policies";

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

async function findUserByIdOrThrow(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
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

  return user;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAdminRead(request);
    const { id } = await params;
    const user = await findUserByIdOrThrow(id);
    return apiOk(toUserDto(user));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = requireAdminWrite(request);
    const { id } = await params;
    const body = await parseJson(request, updateUserSchema);
    const existing = await findUserByIdOrThrow(id);

    const nextRole = body.role ?? existing.role;
    const nextTenantId = body.tenantId !== undefined ? body.tenantId : existing.tenantId;

    assertRoleTenantRequirement(nextRole, nextTenantId);

    if (existing.tenantId) {
      await assertNotLastTenantAdmin(existing.tenantId, existing.id, nextRole);
    }

    if (nextTenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: nextTenantId },
        select: { id: true, status: true },
      });

      if (!tenant) {
        throw new AppError("Tenant not found", 404, "NOT_FOUND");
      }

      if (tenant.status === "DELETING") {
        throw new AppError("Tenant is currently being deleted", 409, "TENANT_DELETING", { tenantId: tenant.id });
      }
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.tenantId !== undefined ? { tenantId: body.tenantId } : {}),
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
      tenantId: updated.tenantId,
      userId: session.userId,
      action: "UPDATE_USER",
      resourceType: "user",
      resourceId: updated.id,
      details: {
        targetUserId: updated.id,
        before: {
          fullName: existing.fullName,
          role: existing.role,
          tenantId: existing.tenantId,
        },
        after: {
          fullName: updated.fullName,
          role: updated.role,
          tenantId: updated.tenantId,
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
    const session = requireAdminWrite(request);
    const { id } = await params;
    const existing = await findUserByIdOrThrow(id);

    if (existing.tenantId) {
      await assertNotLastTenantAdmin(existing.tenantId, existing.id, null);
    }

    await prisma.user.delete({
      where: { id: existing.id },
    });

    await writeOperationLog({
      tenantId: existing.tenantId,
      userId: session.userId,
      action: "DELETE_USER",
      riskLevel: "MEDIUM",
      resourceType: "user",
      resourceId: existing.id,
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
