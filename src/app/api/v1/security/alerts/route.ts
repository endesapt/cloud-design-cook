import { SecurityAlertSeverity, SecurityAlertStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/http";
import { requireTenantRead } from "@/lib/auth/guards";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";
import { listTenantSecurityAlerts, refreshTenantSecuritySignals } from "@/lib/security/store";

function parseStatus(value: string | null) {
  if (!value) return undefined;
  if ((Object.values(SecurityAlertStatus) as string[]).includes(value)) {
    return value as SecurityAlertStatus;
  }
  return undefined;
}

function parseSeverity(value: string | null) {
  if (!value) return undefined;
  if ((Object.values(SecurityAlertSeverity) as string[]).includes(value)) {
    return value as SecurityAlertSeverity;
  }
  return undefined;
}

function parseLimit(value: string | null) {
  if (!value) return 100;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(1, Math.min(200, Math.round(parsed)));
}

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantRead(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);

    await refreshTenantSecuritySignals(tenantId, { force: true });

    const alerts = await listTenantSecurityAlerts({
      tenantId,
      status: parseStatus(request.nextUrl.searchParams.get("status")),
      severity: parseSeverity(request.nextUrl.searchParams.get("severity")),
      limit: parseLimit(request.nextUrl.searchParams.get("limit")),
    });

    return apiOk(alerts);
  } catch (error) {
    return apiError(error);
  }
}
