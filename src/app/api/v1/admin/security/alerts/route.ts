import { SecurityAlertSeverity, SecurityAlertStatus, SecurityAlertType } from "@prisma/client";
import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/http";
import { requireAdminRead } from "@/lib/auth/guards";
import { listAdminSecurityAlerts, refreshTenantSecuritySignals } from "@/lib/security/store";
import { assertTenantIsAccessible } from "@/lib/tenant/scope";

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

function parseType(value: string | null) {
  if (!value) return undefined;
  if ((Object.values(SecurityAlertType) as string[]).includes(value)) {
    return value as SecurityAlertType;
  }
  return undefined;
}

function parseLimit(value: string | null) {
  if (!value) return 150;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 150;
  return Math.max(1, Math.min(300, Math.round(parsed)));
}

export async function GET(request: NextRequest) {
  try {
    const session = requireAdminRead(request);
    const tenantId = request.nextUrl.searchParams.get("tenantId");

    if (tenantId) {
      await assertTenantIsAccessible(session, tenantId);
      await refreshTenantSecuritySignals(tenantId, { force: true });
    }

    const alerts = await listAdminSecurityAlerts({
      tenantId: tenantId ?? undefined,
      status: parseStatus(request.nextUrl.searchParams.get("status")),
      severity: parseSeverity(request.nextUrl.searchParams.get("severity")),
      type: parseType(request.nextUrl.searchParams.get("type")),
      limit: parseLimit(request.nextUrl.searchParams.get("limit")),
    });

    return apiOk(alerts);
  } catch (error) {
    return apiError(error);
  }
}
