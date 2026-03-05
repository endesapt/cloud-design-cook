import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createUserSchema } from "@/lib/api/schemas";
import { requireTenantRead, requireTenantWrite } from "@/lib/auth/guards";
import { writeOperationLog } from "@/lib/audit";
import { AppError } from "@/lib/errors/app-error";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";
import { assertTenantAdminCanAssignRole, assertRoleTenantRequirement } from "@/lib/users/policies";

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

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantRead(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return apiOk(users.map(toUserDto));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireTenantWrite(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);
    const body = await parseJson(request, createUserSchema);

    if (!["tenant_admin", "tenant_user"].includes(body.role)) {
      throw new AppError("Tenant users endpoint supports tenant roles only", 403, "ROLE_SCOPE_VIOLATION");
    }

    if (session.role === "tenant_admin") {
      assertTenantAdminCanAssignRole(body.role);
    }

    if (body.tenantId && body.tenantId !== tenantId) {
      throw new AppError("Cross-tenant assignment is forbidden", 403, "ROLE_SCOPE_VIOLATION");
    }

    assertRoleTenantRequirement(body.role, tenantId);

    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new AppError("User with this email already exists", 409, "VALIDATION_ERROR");
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        fullName: body.fullName,
        role: body.role,
        tenantId,
        passwordHash,
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
      action: "CREATE_USER",
      resourceType: "user",
      resourceId: user.id,
      details: {
        createdUserId: user.id,
        email: user.email,
        role: user.role,
      },
    });

    return apiOk(toUserDto(user), 201);
  } catch (error) {
    return apiError(error);
  }
}
