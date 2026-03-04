import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/lib/auth/types";
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors/app-error";

export function resolveTenantScope(session: SessionUser, explicitTenantId?: string | null) {
  if (session.role === "global_admin" || session.role === "support_viewer") {
    if (explicitTenantId) {
      return explicitTenantId;
    }
    throw new ForbiddenError("Explicit tenant context is required for admin/support access");
  }

  if (!session.tenantId) {
    throw new ForbiddenError("Tenant is required");
  }

  return session.tenantId;
}

export function assertTenantOwnership(session: SessionUser, ownerTenantId: string | null) {
  if (session.role === "global_admin" || session.role === "support_viewer") {
    return;
  }

  if (!session.tenantId || ownerTenantId !== session.tenantId) {
    throw new ForbiddenError("Cross-tenant access denied");
  }
}

export async function assertTenantIsAccessible(session: SessionUser, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true },
  });

  if (!tenant) {
    if (session.role === "tenant_admin" || session.role === "tenant_user") {
      throw new UnauthorizedError("Session tenant is no longer available");
    }
    throw new NotFoundError("Tenant not found");
  }

  if (tenant.status === "DELETING") {
    throw new AppError("Tenant is currently being deleted", 409, "TENANT_DELETING", { tenantId });
  }

  return tenant;
}
