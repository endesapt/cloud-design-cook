import { InstanceStatus, RuleDirection, SecurityAlertSeverity, SecurityAlertType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type SecurityAlertCandidate = {
  type: SecurityAlertType;
  severity: SecurityAlertSeverity;
  title: string;
  description: string;
  targetType: string;
  targetId: string;
  ruleKey: string;
  details: Record<string, unknown>;
};

type AlertSignalInput = {
  tenantId: string;
  failedLogins: number;
  quotaPressurePct: number;
  errorInstances: Array<{ id: string; name: string; failReason: string | null }>;
  failureBursts: Array<{ resourceId: string; count: number }>;
  securityGroupSignals: Array<{
    id: string;
    name: string;
    exposedRulesCount: number;
    attachedInstanceCount: number;
    hasSensitivePort: boolean;
  }>;
};

const ACTIVE_INSTANCE_STATUSES: InstanceStatus[] = [
  InstanceStatus.CREATING,
  InstanceStatus.STARTING,
  InstanceStatus.RUNNING,
  InstanceStatus.STOPPING,
  InstanceStatus.STOPPED,
  InstanceStatus.TERMINATING,
];

function buildSensitiveOpenRule(rule: {
  direction: RuleDirection;
  cidr: string;
  protocol: string;
  portFrom: number | null;
  portTo: number | null;
}) {
  if (rule.direction !== RuleDirection.ingress) return false;
  if (rule.cidr !== "0.0.0.0/0") return false;

  const protocol = rule.protocol.toLowerCase();
  if (["all", "any"].includes(protocol)) return true;

  if (rule.portFrom === null || rule.portTo === null) return true;

  const includes22 = rule.portFrom <= 22 && rule.portTo >= 22;
  const includes3389 = rule.portFrom <= 3389 && rule.portTo >= 3389;
  return includes22 || includes3389;
}

export function buildAlertFingerprint(tenantId: string, candidate: SecurityAlertCandidate) {
  return `${tenantId}:${candidate.type}:${candidate.targetType}:${candidate.targetId}:${candidate.ruleKey}`;
}

export function buildSecurityAlertCandidates(input: AlertSignalInput) {
  const candidates: SecurityAlertCandidate[] = [];

  if (input.failedLogins >= 5) {
    candidates.push({
      type: SecurityAlertType.AUTH_ANOMALY,
      severity: input.failedLogins >= 10 ? SecurityAlertSeverity.CRITICAL : SecurityAlertSeverity.HIGH,
      title: "Authentication anomaly detected",
      description: `Failed login burst detected in the last 10 minutes (${input.failedLogins} failures).`,
      targetType: "tenant",
      targetId: input.tenantId,
      ruleKey: "auth-failed-burst-10m",
      details: {
        failedLogins: input.failedLogins,
        windowMinutes: 10,
      },
    });
  }

  if (input.quotaPressurePct >= 85) {
    candidates.push({
      type: SecurityAlertType.QUOTA_PRESSURE,
      severity: input.quotaPressurePct >= 95 ? SecurityAlertSeverity.HIGH : SecurityAlertSeverity.MEDIUM,
      title: "Quota pressure is rising",
      description: `Tenant quota utilization reached ${input.quotaPressurePct}% on at least one resource dimension.`,
      targetType: "tenant",
      targetId: input.tenantId,
      ruleKey: "quota-pressure-max-ratio",
      details: {
        quotaPressurePct: input.quotaPressurePct,
      },
    });
  }

  for (const instance of input.errorInstances) {
    candidates.push({
      type: SecurityAlertType.INSTANCE_FAILURE,
      severity: SecurityAlertSeverity.HIGH,
      title: `Instance ${instance.name} is in ERROR state`,
      description: instance.failReason
        ? `Instance entered ERROR state. Last failure reason: ${instance.failReason}`
        : "Instance entered ERROR state without a detailed failure reason.",
      targetType: "instance",
      targetId: instance.id,
      ruleKey: "instance-error-state",
      details: {
        instanceId: instance.id,
        instanceName: instance.name,
        failReason: instance.failReason,
      },
    });
  }

  for (const failureGroup of input.failureBursts) {
    if (failureGroup.count < 2) continue;

    candidates.push({
      type: SecurityAlertType.INSTANCE_FAILURE,
      severity: failureGroup.count >= 4 ? SecurityAlertSeverity.CRITICAL : SecurityAlertSeverity.HIGH,
      title: "Repeated instance failures detected",
      description: `Instance has ${failureGroup.count} failed actions in the last 30 minutes.`,
      targetType: "instance",
      targetId: failureGroup.resourceId,
      ruleKey: "instance-failure-burst-30m",
      details: {
        instanceId: failureGroup.resourceId,
        failedActions30m: failureGroup.count,
      },
    });
  }

  for (const securityGroup of input.securityGroupSignals) {
    if (!securityGroup.exposedRulesCount) continue;

    candidates.push({
      type: SecurityAlertType.SG_EXPOSURE,
      severity: securityGroup.hasSensitivePort ? SecurityAlertSeverity.HIGH : SecurityAlertSeverity.MEDIUM,
      title: `Security group ${securityGroup.name} is over-exposed`,
      description: "Open ingress from 0.0.0.0/0 detected on attached workloads.",
      targetType: "security_group",
      targetId: securityGroup.id,
      ruleKey: "sg-open-ingress-sensitive",
      details: {
        securityGroupId: securityGroup.id,
        securityGroupName: securityGroup.name,
        exposedRulesCount: securityGroup.exposedRulesCount,
        attachedInstanceCount: securityGroup.attachedInstanceCount,
      },
    });
  }

  return candidates;
}

export async function evaluateSecurityAlerts(params: {
  tenantId: string;
  now?: Date;
  quotaPressurePct: number;
}) {
  const now = params.now ?? new Date();
  const authWindowStart = new Date(now.getTime() - 10 * 60 * 1000);
  const failureWindowStart = new Date(now.getTime() - 30 * 60 * 1000);

  const [failedLogins, errorInstances, failureGroups, groups] = await Promise.all([
    prisma.operationLog.count({
      where: {
        tenantId: params.tenantId,
        action: "LOGIN_FAILED",
        createdAt: {
          gte: authWindowStart,
        },
      },
    }),
    prisma.instance.findMany({
      where: {
        tenantId: params.tenantId,
        status: InstanceStatus.ERROR,
      },
      select: {
        id: true,
        name: true,
        failReason: true,
      },
    }),
    prisma.operationLog.groupBy({
      by: ["resourceId"],
      where: {
        tenantId: params.tenantId,
        resourceType: "instance",
        resourceId: { not: null },
        outcome: "FAILURE",
        createdAt: {
          gte: failureWindowStart,
        },
      },
      _count: {
        resourceId: true,
      },
    }),
    prisma.securityGroup.findMany({
      where: {
        tenantId: params.tenantId,
        instances: {
          some: {
            instance: {
              status: { in: ACTIVE_INSTANCE_STATUSES },
            },
          },
        },
      },
      include: {
        rules: true,
        instances: {
          include: {
            instance: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return buildSecurityAlertCandidates({
    tenantId: params.tenantId,
    failedLogins,
    quotaPressurePct: params.quotaPressurePct,
    errorInstances,
    failureBursts: failureGroups
      .filter((item) => item.resourceId)
      .map((item) => ({
        resourceId: item.resourceId as string,
        count: item._count.resourceId,
      })),
    securityGroupSignals: groups
      .map((securityGroup) => {
        const exposedRules = securityGroup.rules.filter((rule) =>
          buildSensitiveOpenRule({
            direction: rule.direction,
            cidr: rule.cidr,
            protocol: rule.protocol,
            portFrom: rule.portFrom,
            portTo: rule.portTo,
          }),
        );

        const hasSensitivePort = exposedRules.some((rule) => {
          if (rule.portFrom === null || rule.portTo === null) return true;
          return (rule.portFrom <= 22 && rule.portTo >= 22) || (rule.portFrom <= 3389 && rule.portTo >= 3389);
        });

        return {
          id: securityGroup.id,
          name: securityGroup.name,
          exposedRulesCount: exposedRules.length,
          attachedInstanceCount: securityGroup.instances.length,
          hasSensitivePort,
        };
      })
      .filter((item) => item.exposedRulesCount > 0),
  });
}
