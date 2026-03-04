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
  if (!session.tenantId && session.role !== "global_admin") {
    throw new ForbiddenError("Tenant context is missing");
  }
  return session;
}
