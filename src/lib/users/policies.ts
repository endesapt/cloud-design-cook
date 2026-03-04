import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";

const TENANT_ADMIN_ALLOWED_ROLES = new Set<UserRole>(["tenant_admin", "tenant_user"]);

export function assertTenantAdminCanAssignRole(role: UserRole) {
  if (!TENANT_ADMIN_ALLOWED_ROLES.has(role)) {
    throw new AppError("Tenant admin cannot assign this role", 403, "ROLE_SCOPE_VIOLATION");
  }
}

export function assertRoleTenantRequirement(role: UserRole, tenantId: string | null | undefined) {
  if ((role === "tenant_admin" || role === "tenant_user") && !tenantId) {
    throw new AppError("Tenant role requires tenantId", 422, "VALIDATION_ERROR");
  }

  if ((role === "global_admin" || role === "support_viewer") && tenantId) {
    throw new AppError("Global role must not include tenantId", 422, "VALIDATION_ERROR");
  }
}

export async function assertNotLastTenantAdmin(tenantId: string, userId: string, nextRole: UserRole | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, tenantId: true },
  });

  if (!user || user.role !== "tenant_admin" || user.tenantId !== tenantId) {
    return;
  }

  if (nextRole === "tenant_admin") {
    return;
  }

  const adminsCount = await prisma.user.count({
    where: {
      tenantId,
      role: "tenant_admin",
    },
  });

  if (adminsCount <= 1) {
    throw new AppError("Cannot remove the last tenant admin", 409, "LAST_TENANT_ADMIN");
  }
}
