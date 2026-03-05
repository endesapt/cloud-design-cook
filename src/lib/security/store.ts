import { Prisma, SecurityAlertSeverity, SecurityAlertStatus, SecurityAlertType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { evaluateSecurityAlerts, buildAlertFingerprint, type SecurityAlertCandidate } from "@/lib/security/alerts-engine";
import { getLatestTenantMetrics, refreshInstanceRiskMetrics } from "@/lib/security/metrics";

const REFRESH_TTL_MS = 30_000;
const METRICS_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const ALERT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_TTL_MS = 6 * 60 * 60 * 1000;

export function nextAlertStatusForSync(status: SecurityAlertStatus, candidatePresent: boolean) {
  if (candidatePresent) {
    return status === SecurityAlertStatus.RESOLVED ? SecurityAlertStatus.OPEN : status;
  }

  if (status === SecurityAlertStatus.OPEN || status === SecurityAlertStatus.ACKNOWLEDGED) {
    return SecurityAlertStatus.RESOLVED;
  }

  return SecurityAlertStatus.RESOLVED;
}

function severityRank(severity: SecurityAlertSeverity) {
  if (severity === SecurityAlertSeverity.CRITICAL) return 4;
  if (severity === SecurityAlertSeverity.HIGH) return 3;
  if (severity === SecurityAlertSeverity.MEDIUM) return 2;
  return 1;
}

async function syncTenantAlerts(tenantId: string, candidates: SecurityAlertCandidate[], now: Date) {
  const candidatesByFingerprint = new Map(
    candidates.map((candidate) => [buildAlertFingerprint(tenantId, candidate), candidate]),
  );

  const fingerprints = [...candidatesByFingerprint.keys()];

  const existingForCandidates = fingerprints.length
    ? await prisma.securityAlert.findMany({
        where: {
          tenantId,
          fingerprint: { in: fingerprints },
        },
        select: {
          id: true,
          fingerprint: true,
          status: true,
        },
      })
    : [];

  const existingByFingerprint = new Map(existingForCandidates.map((item) => [item.fingerprint, item]));

  for (const [fingerprint, candidate] of candidatesByFingerprint.entries()) {
    const existing = existingByFingerprint.get(fingerprint);

    if (!existing) {
      await prisma.securityAlert.create({
        data: {
          tenantId,
          type: candidate.type,
          severity: candidate.severity,
          status: SecurityAlertStatus.OPEN,
          title: candidate.title,
          description: candidate.description,
          targetType: candidate.targetType,
          targetId: candidate.targetId,
          ruleKey: candidate.ruleKey,
          fingerprint,
          details: candidate.details as Prisma.InputJsonValue,
          firstSeenAt: now,
          lastSeenAt: now,
          lastEvaluatedAt: now,
        },
      });
      continue;
    }

    await prisma.securityAlert.update({
      where: { id: existing.id },
      data: {
        type: candidate.type,
        severity: candidate.severity,
        title: candidate.title,
        description: candidate.description,
        targetType: candidate.targetType,
        targetId: candidate.targetId,
        ruleKey: candidate.ruleKey,
        details: candidate.details as Prisma.InputJsonValue,
        lastSeenAt: now,
        lastEvaluatedAt: now,
        ...(nextAlertStatusForSync(existing.status, true) === SecurityAlertStatus.OPEN
          ? {
              status: SecurityAlertStatus.OPEN,
              resolvedAt: null,
              resolvedById: null,
              acknowledgedAt: null,
              acknowledgedById: null,
            }
          : {}),
      },
    });
  }

  if (fingerprints.length) {
    await prisma.securityAlert.updateMany({
      where: {
        tenantId,
        status: {
          in: [SecurityAlertStatus.OPEN, SecurityAlertStatus.ACKNOWLEDGED],
        },
        fingerprint: {
          notIn: fingerprints,
        },
      },
      data: {
        status: SecurityAlertStatus.RESOLVED,
        resolvedAt: now,
        resolvedById: null,
        lastEvaluatedAt: now,
      },
    });
  } else {
    await prisma.securityAlert.updateMany({
      where: {
        tenantId,
        status: {
          in: [SecurityAlertStatus.OPEN, SecurityAlertStatus.ACKNOWLEDGED],
        },
      },
      data: {
        status: SecurityAlertStatus.RESOLVED,
        resolvedAt: now,
        resolvedById: null,
        lastEvaluatedAt: now,
      },
    });
  }
}

async function cleanupTenantSecurityData(tenantId: string, now: Date) {
  const metricsCutoff = new Date(now.getTime() - METRICS_RETENTION_MS);
  const alertsCutoff = new Date(now.getTime() - ALERT_RETENTION_MS);

  await prisma.$transaction([
    prisma.instanceMetricSnapshot.deleteMany({
      where: {
        tenantId,
        createdAt: {
          lt: metricsCutoff,
        },
      },
    }),
    prisma.securityAlertRemediation.deleteMany({
      where: {
        tenantId,
        createdAt: {
          lt: alertsCutoff,
        },
      },
    }),
    prisma.securityAlert.deleteMany({
      where: {
        tenantId,
        status: SecurityAlertStatus.RESOLVED,
        createdAt: {
          lt: alertsCutoff,
        },
      },
    }),
  ]);
}

async function ensureTenantState(tenantId: string) {
  return prisma.tenantSecurityState.upsert({
    where: { tenantId },
    create: {
      tenantId,
    },
    update: {},
  });
}

export async function refreshTenantSecuritySignals(tenantId: string, options?: { force?: boolean }) {
  const now = new Date();
  const force = options?.force ?? false;
  const state = await ensureTenantState(tenantId);

  if (!force && state.lastEvaluatedAt && now.getTime() - state.lastEvaluatedAt.getTime() < REFRESH_TTL_MS) {
    return {
      refreshed: false,
      lastEvaluatedAt: state.lastEvaluatedAt,
    };
  }

  try {
    const metricsResult = await refreshInstanceRiskMetrics(tenantId, now);
    const candidates = await evaluateSecurityAlerts({
      tenantId,
      now,
      quotaPressurePct: metricsResult.quotaPressurePct,
    });

    await syncTenantAlerts(tenantId, candidates, now);

    if (!state.lastCleanupAt || now.getTime() - state.lastCleanupAt.getTime() >= CLEANUP_TTL_MS) {
      await cleanupTenantSecurityData(tenantId, now);
    }

    await prisma.tenantSecurityState.update({
      where: { tenantId },
      data: {
        lastEvaluatedAt: now,
        lastCleanupAt: !state.lastCleanupAt || now.getTime() - state.lastCleanupAt.getTime() >= CLEANUP_TTL_MS ? now : state.lastCleanupAt,
        lastEvaluationError: null,
      },
    });

    return {
      refreshed: true,
      lastEvaluatedAt: now,
    };
  } catch (error) {
    await prisma.tenantSecurityState.update({
      where: { tenantId },
      data: {
        lastEvaluationError: error instanceof Error ? error.message : "Unknown evaluation error",
      },
    });
    throw error;
  }
}

export async function getTenantSecurityOverview(tenantId: string) {
  const now = new Date();
  const resolvedFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [state, openAlerts, acknowledgedAlerts, resolvedLast24h, criticalOpenAlerts, recentAlerts, latestMetrics] = await Promise.all([
    prisma.tenantSecurityState.findUnique({
      where: { tenantId },
      select: {
        lastEvaluatedAt: true,
        lastEvaluationError: true,
      },
    }),
    prisma.securityAlert.count({
      where: {
        tenantId,
        status: SecurityAlertStatus.OPEN,
      },
    }),
    prisma.securityAlert.count({
      where: {
        tenantId,
        status: SecurityAlertStatus.ACKNOWLEDGED,
      },
    }),
    prisma.securityAlert.count({
      where: {
        tenantId,
        status: SecurityAlertStatus.RESOLVED,
        resolvedAt: {
          gte: resolvedFrom,
        },
      },
    }),
    prisma.securityAlert.count({
      where: {
        tenantId,
        status: {
          in: [SecurityAlertStatus.OPEN, SecurityAlertStatus.ACKNOWLEDGED],
        },
        severity: {
          in: [SecurityAlertSeverity.HIGH, SecurityAlertSeverity.CRITICAL],
        },
      },
    }),
    prisma.securityAlert.findMany({
      where: { tenantId },
      include: {
        acknowledgedBy: {
          select: { email: true },
        },
        resolvedBy: {
          select: { email: true },
        },
      },
      orderBy: [{ lastSeenAt: "desc" }],
      take: 50,
    }),
    getLatestTenantMetrics(tenantId, 100),
  ]);

  const sortedAlerts = recentAlerts
    .sort((left, right) => {
      const severityDiff = severityRank(right.severity) - severityRank(left.severity);
      if (severityDiff !== 0) return severityDiff;
      return right.lastSeenAt.getTime() - left.lastSeenAt.getTime();
    })
    .map((alert) => ({
      id: alert.id,
      tenantId: alert.tenantId,
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      title: alert.title,
      description: alert.description,
      targetType: alert.targetType,
      targetId: alert.targetId,
      ruleKey: alert.ruleKey,
      details: alert.details,
      firstSeenAt: alert.firstSeenAt,
      lastSeenAt: alert.lastSeenAt,
      acknowledgedAt: alert.acknowledgedAt,
      acknowledgedBy: alert.acknowledgedBy?.email ?? null,
      resolvedAt: alert.resolvedAt,
      resolvedBy: alert.resolvedBy?.email ?? null,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    }));

  const riskyInstances = latestMetrics.filter((metric) => metric.riskScore >= 70).length;
  const quotaPressurePct = latestMetrics.reduce((max, metric) => Math.max(max, metric.quotaPressurePct), 0);

  return {
    summary: {
      openAlerts,
      acknowledgedAlerts,
      resolvedLast24h,
      criticalOpenAlerts,
      riskyInstances,
      quotaPressurePct,
    },
    metrics: latestMetrics.map((metric) => ({
      instanceId: metric.instanceId,
      status: metric.status,
      bucketStart: metric.bucketStart,
      cpuPct: metric.cpuPct,
      memoryPct: metric.memoryPct,
      diskPct: metric.diskPct,
      riskScore: metric.riskScore,
      quotaPressurePct: metric.quotaPressurePct,
      errorEvents30m: metric.errorEvents30m,
      churnEvents30m: metric.churnEvents30m,
      createdAt: metric.createdAt,
    })),
    alerts: sortedAlerts,
    lastEvaluatedAt: state?.lastEvaluatedAt ?? null,
    lastEvaluationError: state?.lastEvaluationError ?? null,
  };
}

export async function listTenantSecurityAlerts(params: {
  tenantId: string;
  status?: SecurityAlertStatus;
  severity?: SecurityAlertSeverity;
  limit?: number;
}) {
  const limit = Math.min(params.limit ?? 50, 200);

  const alerts = await prisma.securityAlert.findMany({
    where: {
      tenantId: params.tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
    },
    include: {
      acknowledgedBy: {
        select: { email: true },
      },
      resolvedBy: {
        select: { email: true },
      },
    },
    orderBy: [{ lastSeenAt: "desc" }],
    take: limit,
  });

  return alerts.map((alert) => ({
    id: alert.id,
    tenantId: alert.tenantId,
    type: alert.type,
    severity: alert.severity,
    status: alert.status,
    title: alert.title,
    description: alert.description,
    targetType: alert.targetType,
    targetId: alert.targetId,
    ruleKey: alert.ruleKey,
    details: alert.details,
    firstSeenAt: alert.firstSeenAt,
    lastSeenAt: alert.lastSeenAt,
    acknowledgedAt: alert.acknowledgedAt,
    acknowledgedBy: alert.acknowledgedBy?.email ?? null,
    resolvedAt: alert.resolvedAt,
    resolvedBy: alert.resolvedBy?.email ?? null,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt,
  }));
}

export async function refreshDueTenantSecuritySignals(limit = 8) {
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      securityState: {
        select: {
          lastEvaluatedAt: true,
        },
      },
    },
    take: limit,
    orderBy: {
      updatedAt: "desc",
    },
  });

  const now = Date.now();
  const dueTenantIds = tenants
    .filter((tenant) => {
      if (!tenant.securityState?.lastEvaluatedAt) return true;
      return now - tenant.securityState.lastEvaluatedAt.getTime() >= REFRESH_TTL_MS;
    })
    .map((tenant) => tenant.id);

  for (const tenantId of dueTenantIds) {
    await refreshTenantSecuritySignals(tenantId);
  }

  return dueTenantIds.length;
}

export async function getGlobalSecurityOverview() {
  const [tenantsCount, activeAlerts, alertsBySeverity, topAlerts] = await Promise.all([
    prisma.tenant.count(),
    prisma.securityAlert.count({
      where: {
        status: {
          in: [SecurityAlertStatus.OPEN, SecurityAlertStatus.ACKNOWLEDGED],
        },
      },
    }),
    prisma.securityAlert.groupBy({
      by: ["severity"],
      where: {
        status: {
          in: [SecurityAlertStatus.OPEN, SecurityAlertStatus.ACKNOWLEDGED],
        },
      },
      _count: {
        severity: true,
      },
    }),
    prisma.securityAlert.findMany({
      where: {
        status: {
          in: [SecurityAlertStatus.OPEN, SecurityAlertStatus.ACKNOWLEDGED],
        },
      },
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ lastSeenAt: "desc" }],
      take: 20,
    }),
  ]);

  const severitySummary = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const row of alertsBySeverity) {
    severitySummary[row.severity] = row._count.severity;
  }

  const topAlertsMapped = topAlerts
    .sort((left, right) => {
      const severityDiff = severityRank(right.severity) - severityRank(left.severity);
      if (severityDiff !== 0) return severityDiff;
      return right.lastSeenAt.getTime() - left.lastSeenAt.getTime();
    })
    .map((alert) => ({
      id: alert.id,
      tenantId: alert.tenantId,
      tenantName: alert.tenant.name,
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      title: alert.title,
      description: alert.description,
      targetType: alert.targetType,
      targetId: alert.targetId,
      lastSeenAt: alert.lastSeenAt,
      createdAt: alert.createdAt,
    }));

  return {
    tenantsCount,
    activeAlerts,
    severitySummary,
    topAlerts: topAlertsMapped,
  };
}

export async function listAdminSecurityAlerts(params: {
  tenantId?: string;
  status?: SecurityAlertStatus;
  severity?: SecurityAlertSeverity;
  type?: SecurityAlertType;
  limit?: number;
}) {
  const limit = Math.min(params.limit ?? 100, 300);

  const alerts = await prisma.securityAlert.findMany({
    where: {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
      ...(params.type ? { type: params.type } : {}),
    },
    include: {
      tenant: {
        select: { name: true, slug: true },
      },
      acknowledgedBy: {
        select: { email: true },
      },
      resolvedBy: {
        select: { email: true },
      },
    },
    orderBy: [{ lastSeenAt: "desc" }],
    take: limit,
  });

  return alerts.map((alert) => ({
    id: alert.id,
    tenantId: alert.tenantId,
    tenantName: alert.tenant.name,
    tenantSlug: alert.tenant.slug,
    type: alert.type,
    severity: alert.severity,
    status: alert.status,
    title: alert.title,
    description: alert.description,
    targetType: alert.targetType,
    targetId: alert.targetId,
    ruleKey: alert.ruleKey,
    details: alert.details,
    firstSeenAt: alert.firstSeenAt,
    lastSeenAt: alert.lastSeenAt,
    acknowledgedAt: alert.acknowledgedAt,
    acknowledgedBy: alert.acknowledgedBy?.email ?? null,
    resolvedAt: alert.resolvedAt,
    resolvedBy: alert.resolvedBy?.email ?? null,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt,
  }));
}
