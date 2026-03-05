import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createUserSchema, userRoleSchema } from "@/lib/api/schemas";
import { requireAdminRead, requireAdminWrite } from "@/lib/auth/guards";
import { writeOperationLog } from "@/lib/audit";
import { AppError } from "@/lib/errors/app-error";
import { assertRoleTenantRequirement } from "@/lib/users/policies";

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
    requireAdminRead(request);
    const tenantId = request.nextUrl.searchParams.get("tenantId");
    const roleParam = request.nextUrl.searchParams.get("role");
    const query = request.nextUrl.searchParams.get("q");
    const parsedRole = roleParam ? userRoleSchema.safeParse(roleParam) : null;

    if (parsedRole && !parsedRole.success) {
      throw new AppError("Invalid role filter", 422, "VALIDATION_ERROR");
    }

    const users = await prisma.user.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(parsedRole ? { role: parsedRole.data } : {}),
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: "insensitive" } },
                { fullName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
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
      orderBy: { createdAt: "desc" },
    });

    return apiOk(users.map(toUserDto));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireAdminWrite(request);
    const body = await parseJson(request, createUserSchema);
    const normalizedEmail = body.email.toLowerCase();

    assertRoleTenantRequirement(body.role, body.tenantId ?? null);

    if (body.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: body.tenantId },
        select: { id: true, status: true },
      });

      if (!tenant) {
        throw new AppError("Tenant not found", 404, "NOT_FOUND");
      }

      if (tenant.status === "DELETING") {
        throw new AppError("Tenant is currently being deleted", 409, "TENANT_DELETING", { tenantId: tenant.id });
      }
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      throw new AppError("User with this email already exists", 409, "VALIDATION_ERROR");
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: body.fullName,
        role: body.role,
        tenantId: body.tenantId ?? null,
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
      tenantId: user.tenantId,
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
