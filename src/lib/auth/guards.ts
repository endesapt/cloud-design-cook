import type { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors/app-error";
import { getSessionUserFromRequest } from "@/lib/auth/session";

export function requireSession(request: NextRequest) {
  const session = getSessionUserFromRequest(request);
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export function requireRole(request: NextRequest, roles: UserRole[]) {
  const session = requireSession(request);
  if (!roles.includes(session.role)) {
    throw new ForbiddenError("You do not have access to this endpoint");
  }
  return session;
}

export function requireTenantContext(request: NextRequest) {
  const session = requireSession(request);
  if (!session.tenantId && !["global_admin", "support_viewer"].includes(session.role)) {
    throw new ForbiddenError("Tenant context is missing");
  }
  return session;
}

export function requireAdminRead(request: NextRequest) {
  return requireRole(request, ["global_admin", "support_viewer"]);
}

export function requireAdminWrite(request: NextRequest) {
  return requireRole(request, ["global_admin"]);
}

export function requireTenantRead(request: NextRequest) {
  return requireRole(request, ["global_admin", "support_viewer", "tenant_admin", "tenant_user"]);
}

export function requireTenantWrite(request: NextRequest) {
  return requireRole(request, ["global_admin", "tenant_admin"]);
}
