import { SecurityAlertStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { updateSecurityAlertStatusSchema } from "@/lib/api/schemas";
import { requireTenantWrite } from "@/lib/auth/guards";
import { writeOperationLog } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors/app-error";
import { assertTenantIsAccessible, assertTenantOwnership } from "@/lib/tenant/scope";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = requireTenantWrite(request);
    const { id } = await params;
    const body = await parseJson(request, updateSecurityAlertStatusSchema);

    const existing = await prisma.securityAlert.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        status: true,
      },
    });

    if (!existing) {
      throw new NotFoundError("Security alert not found");
    }

    assertTenantOwnership(session, existing.tenantId);
    await assertTenantIsAccessible(session, existing.tenantId);

    const now = new Date();

    const updateData: {
      status: SecurityAlertStatus;
      acknowledgedAt?: Date | null;
      acknowledgedById?: string | null;
      resolvedAt?: Date | null;
      resolvedById?: string | null;
    } = {
      status: body.status,
    };

    if (body.status === "OPEN") {
      updateData.acknowledgedAt = null;
      updateData.acknowledgedById = null;
      updateData.resolvedAt = null;
      updateData.resolvedById = null;
    }

    if (body.status === "ACKNOWLEDGED") {
      updateData.acknowledgedAt = now;
      updateData.acknowledgedById = session.userId;
      updateData.resolvedAt = null;
      updateData.resolvedById = null;
    }

    if (body.status === "RESOLVED") {
      updateData.resolvedAt = now;
      updateData.resolvedById = session.userId;
    }

    const updated = await prisma.securityAlert.update({
      where: {
        id: existing.id,
      },
      data: updateData,
      include: {
        acknowledgedBy: {
          select: { email: true },
        },
        resolvedBy: {
          select: { email: true },
        },
      },
    });

    await writeOperationLog({
      tenantId: existing.tenantId,
      userId: session.userId,
      action: "SECURITY_ALERT_STATUS_UPDATE",
      riskLevel: body.status === "RESOLVED" ? "LOW" : "MEDIUM",
      resourceType: "security_alert",
      resourceId: existing.id,
      details: {
        alertId: existing.id,
        beforeStatus: existing.status,
        afterStatus: body.status,
      },
    });

    return apiOk({
      id: updated.id,
      tenantId: updated.tenantId,
      type: updated.type,
      severity: updated.severity,
      status: updated.status,
      title: updated.title,
      description: updated.description,
      targetType: updated.targetType,
      targetId: updated.targetId,
      ruleKey: updated.ruleKey,
      details: updated.details,
      firstSeenAt: updated.firstSeenAt,
      lastSeenAt: updated.lastSeenAt,
      acknowledgedAt: updated.acknowledgedAt,
      acknowledgedBy: updated.acknowledgedBy?.email ?? null,
      resolvedAt: updated.resolvedAt,
      resolvedBy: updated.resolvedBy?.email ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    return apiError(error);
  }
}
