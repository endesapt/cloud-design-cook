import type { SessionUser } from "@/lib/auth/types";
import { ForbiddenError } from "@/lib/errors/app-error";

export function resolveTenantScope(session: SessionUser, explicitTenantId?: string | null) {
  if (session.role === "global_admin") {
    if (explicitTenantId) {
      return explicitTenantId;
    }
    throw new ForbiddenError("Global admin must provide tenant context for this action");
  }

  if (!session.tenantId) {
    throw new ForbiddenError("Tenant is required");
  }

  return session.tenantId;
}

export function assertTenantOwnership(session: SessionUser, ownerTenantId: string | null) {
  if (session.role === "global_admin") {
    return;
  }

  if (!session.tenantId || ownerTenantId !== session.tenantId) {
    throw new ForbiddenError("Cross-tenant access denied");
  }
}
