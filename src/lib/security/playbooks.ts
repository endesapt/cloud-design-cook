import { InstanceStatus, Prisma, SecurityPlaybook } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeOperationLog } from "@/lib/audit";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { ensureSecurityGroupsBelongToTenant } from "@/lib/tenant/ownership";
import { assertTenantOwnership } from "@/lib/tenant/scope";
import { nextStatusForAction, nextTransitionReadyAt } from "@/lib/provisioning/reconcile";
import type { SessionUser } from "@/lib/auth/types";

const QUARANTINE_SG_NAME = "quarantine-default";
const QUARANTINE_SG_DESCRIPTION = "Auto-managed quarantine profile for high-risk instances";

function playbookRisk(playbook: SecurityPlaybook) {
  if (playbook === SecurityPlaybook.STOP_INSTANCE) return "MEDIUM" as const;
  if (playbook === SecurityPlaybook.QUARANTINE_INSTANCE) return "HIGH" as const;
  if (playbook === SecurityPlaybook.RESTORE_INSTANCE_SG) return "MEDIUM" as const;
  if (playbook === SecurityPlaybook.SUGGEST_SG_HARDENING) return "MEDIUM" as const;
  if (playbook === SecurityPlaybook.SUGGEST_ACCESS_LOCKDOWN) return "MEDIUM" as const;
  return "LOW" as const;
}

async function ensureQuarantineSecurityGroup(tenantId: string) {
  const existing = await prisma.securityGroup.findFirst({
    where: {
      tenantId,
      name: QUARANTINE_SG_NAME,
    },
    include: {
      rules: true,
    },
  });

  if (existing) {
    return existing;
  }

  const created = await prisma.securityGroup.create({
    data: {
      tenantId,
      name: QUARANTINE_SG_NAME,
      description: QUARANTINE_SG_DESCRIPTION,
    },
  });

  await prisma.securityGroupRule.createMany({
    data: [
      {
        securityGroupId: created.id,
        direction: "egress",
        protocol: "tcp",
        portFrom: 443,
        portTo: 443,
        cidr: "0.0.0.0/0",
      },
      {
        securityGroupId: created.id,
        direction: "egress",
        protocol: "udp",
        portFrom: 53,
        portTo: 53,
        cidr: "0.0.0.0/0",
      },
    ],
  });

  return prisma.securityGroup.findUniqueOrThrow({
    where: { id: created.id },
    include: { rules: true },
  });
}

async function replaceInstanceSecurityGroups(instanceId: string, securityGroupIds: string[]) {
  await prisma.$transaction(async (tx) => {
    await tx.instanceSecurityGroup.deleteMany({
      where: {
        instanceId,
      },
    });

    await tx.instanceSecurityGroup.createMany({
      data: securityGroupIds.map((securityGroupId) => ({
        instanceId,
        securityGroupId,
      })),
    });
  });
}

async function executeStopInstance(tenantId: string, targetId: string) {
  const instance = await prisma.instance.findFirst({
    where: {
      id: targetId,
      tenantId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!instance) {
    throw new NotFoundError("Target instance not found");
  }

  const nextStatus = nextStatusForAction(instance.status, "stop");

  const updated = await prisma.instance.update({
    where: { id: instance.id },
    data: {
      status: nextStatus,
      readyAt: nextTransitionReadyAt(),
      failReason: null,
    },
    select: {
      id: true,
      status: true,
      readyAt: true,
    },
  });

  return {
    instanceId: updated.id,
    status: updated.status,
    readyAt: updated.readyAt,
  };
}

async function executeQuarantineInstance(tenantId: string, targetId: string) {
  const instance = await prisma.instance.findFirst({
    where: {
      id: targetId,
      tenantId,
    },
    include: {
      securityGroups: {
        select: {
          securityGroupId: true,
        },
      },
    },
  });

  if (!instance) {
    throw new NotFoundError("Target instance not found");
  }

  const previousSecurityGroupIds = [...new Set(instance.securityGroups.map((item) => item.securityGroupId))];

  const quarantineGroup = await ensureQuarantineSecurityGroup(tenantId);

  await replaceInstanceSecurityGroups(instance.id, [quarantineGroup.id]);

  return {
    instanceId: instance.id,
    previousSecurityGroupIds,
    quarantineSecurityGroupId: quarantineGroup.id,
  };
}

async function executeRestoreInstanceSecurityGroups(tenantId: string, targetId: string) {
  const instance = await prisma.instance.findFirst({
    where: {
      id: targetId,
      tenantId,
    },
    select: {
      id: true,
    },
  });

  if (!instance) {
    throw new NotFoundError("Target instance not found");
  }

  const remediation = await prisma.securityAlertRemediation.findFirst({
    where: {
      tenantId,
      targetType: "instance",
      targetId,
      playbook: SecurityPlaybook.QUARANTINE_INSTANCE,
      status: "EXECUTED",
    },
    orderBy: [{ executedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      snapshot: true,
    },
  });

  if (!remediation) {
    throw new AppError("No quarantine remediation snapshot found for restore", 409, "INVALID_TRANSITION");
  }

  const snapshot = remediation.snapshot as { previousSecurityGroupIds?: unknown };
  const previousSecurityGroupIds = Array.isArray(snapshot.previousSecurityGroupIds)
    ? snapshot.previousSecurityGroupIds.filter((item): item is string => typeof item === "string")
    : [];

  if (!previousSecurityGroupIds.length) {
    throw new AppError("Quarantine snapshot does not contain previous security groups", 409, "INVALID_TRANSITION");
  }

  await ensureSecurityGroupsBelongToTenant(previousSecurityGroupIds, tenantId);
  await replaceInstanceSecurityGroups(instance.id, previousSecurityGroupIds);

  return {
    instanceId: instance.id,
    restoredSecurityGroupIds: previousSecurityGroupIds,
    sourceRemediationId: remediation.id,
  };
}

async function executeSuggestPasswordReset(targetType: string, targetId: string) {
  return {
    targetType,
    targetId,
    recommendation: "Trigger manual password reset flow for the affected identity.",
    checklist: [
      "Reset password for all potentially impacted users.",
      "Invalidate active sessions for affected identities.",
      "Monitor login failures for at least 15 minutes after reset.",
    ],
  };
}

async function executeSuggestAccessLockdown(targetType: string, targetId: string) {
  return {
    targetType,
    targetId,
    recommendation: "Apply temporary access lockdown and verify identity trust chain.",
    checklist: [
      "Temporarily block suspicious IP/user-agent patterns.",
      "Invalidate active sessions on impacted accounts.",
      "Require manual re-authentication for privileged users.",
    ],
  };
}

async function executeSuggestSecurityGroupHardening(targetType: string, targetId: string) {
  return {
    targetType,
    targetId,
    recommendation: "Review ingress exposure and reduce public attack surface.",
    checklist: [
      "Remove 0.0.0.0/0 ingress from sensitive ports first.",
      "Restrict remaining ingress CIDRs to trusted ranges.",
      "Validate security group attachments on production instances.",
    ],
  };
}

async function executeSuggestCapacityRightsizing(targetType: string, targetId: string) {
  return {
    targetType,
    targetId,
    recommendation: "Reduce quota pressure via cleanup and rightsizing before failures begin.",
    checklist: [
      "Stop or delete idle instances and unattached resources.",
      "Resize over-provisioned instances where possible.",
      "Request quota review if sustained utilization stays above 85%.",
    ],
  };
}

async function executeSuggestInstanceDiagnostics(targetType: string, targetId: string) {
  return {
    targetType,
    targetId,
    recommendation: "Run structured diagnostics on failing instance lifecycle.",
    checklist: [
      "Inspect recent operation log failures for the instance.",
      "Validate network and security group bindings.",
      "If instability persists, quarantine or stop the instance.",
    ],
  };
}

export async function executeSecurityPlaybookForAlert(args: {
  session: SessionUser;
  alertId: string;
  playbook: SecurityPlaybook;
}) {
  const alert = await prisma.securityAlert.findUnique({
    where: {
      id: args.alertId,
    },
    select: {
      id: true,
      tenantId: true,
      targetType: true,
      targetId: true,
      status: true,
      updatedAt: true,
    },
  });

  if (!alert) {
    throw new NotFoundError("Security alert not found");
  }

  assertTenantOwnership(args.session, alert.tenantId);

  const idempotencyKey = `${alert.id}:${args.playbook}:${Math.floor(alert.updatedAt.getTime() / 30_000)}`;

  let remediation = null;
  try {
    remediation = await prisma.securityAlertRemediation.create({
      data: {
        tenantId: alert.tenantId,
        alertId: alert.id,
        targetType: alert.targetType,
        targetId: alert.targetId,
        playbook: args.playbook,
        status: "PENDING",
        idempotencyKey,
        requestedById: args.session.userId,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.securityAlertRemediation.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        return {
          remediation: existing,
          alreadyProcessed: true,
        };
      }
    }

    throw error;
  }

  if (!remediation) {
    throw new AppError("Remediation creation failed", 500, "INTERNAL_ERROR");
  }

  try {
    let snapshot: Prisma.InputJsonValue;

    if (args.playbook === SecurityPlaybook.STOP_INSTANCE) {
      if (alert.targetType !== "instance") {
        throw new AppError("STOP_INSTANCE playbook supports instance alerts only", 409, "INVALID_TRANSITION");
      }
      snapshot = await executeStopInstance(alert.tenantId, alert.targetId);
    } else if (args.playbook === SecurityPlaybook.QUARANTINE_INSTANCE) {
      if (alert.targetType !== "instance") {
        throw new AppError("QUARANTINE_INSTANCE playbook supports instance alerts only", 409, "INVALID_TRANSITION");
      }
      snapshot = await executeQuarantineInstance(alert.tenantId, alert.targetId);
    } else if (args.playbook === SecurityPlaybook.RESTORE_INSTANCE_SG) {
      if (alert.targetType !== "instance") {
        throw new AppError("RESTORE_INSTANCE_SG playbook supports instance alerts only", 409, "INVALID_TRANSITION");
      }
      snapshot = await executeRestoreInstanceSecurityGroups(alert.tenantId, alert.targetId);
    } else if (args.playbook === SecurityPlaybook.SUGGEST_PASSWORD_RESET) {
      snapshot = await executeSuggestPasswordReset(alert.targetType, alert.targetId);
    } else if (args.playbook === SecurityPlaybook.SUGGEST_ACCESS_LOCKDOWN) {
      snapshot = await executeSuggestAccessLockdown(alert.targetType, alert.targetId);
    } else if (args.playbook === SecurityPlaybook.SUGGEST_SG_HARDENING) {
      snapshot = await executeSuggestSecurityGroupHardening(alert.targetType, alert.targetId);
    } else if (args.playbook === SecurityPlaybook.SUGGEST_CAPACITY_RIGHTSIZING) {
      snapshot = await executeSuggestCapacityRightsizing(alert.targetType, alert.targetId);
    } else {
      snapshot = await executeSuggestInstanceDiagnostics(alert.targetType, alert.targetId);
    }

    const [updatedRemediation, updatedAlert] = await prisma.$transaction([
      prisma.securityAlertRemediation.update({
        where: { id: remediation.id },
        data: {
          status: "EXECUTED",
          executedAt: new Date(),
          snapshot,
          errorMessage: null,
        },
      }),
      prisma.securityAlert.update({
        where: { id: alert.id },
        data:
          alert.status === "OPEN"
            ? {
                status: "ACKNOWLEDGED",
                acknowledgedAt: new Date(),
                acknowledgedById: args.session.userId,
              }
            : {},
      }),
    ]);

    await writeOperationLog({
      tenantId: alert.tenantId,
      userId: args.session.userId,
      action: "SECURITY_PLAYBOOK_EXECUTION",
      riskLevel: playbookRisk(args.playbook),
      resourceType: "security_alert",
      resourceId: alert.id,
      details: {
        alertId: alert.id,
        playbook: args.playbook,
        remediationId: updatedRemediation.id,
        targetType: alert.targetType,
        targetId: alert.targetId,
      },
    });

    return {
      remediation: updatedRemediation,
      alert: updatedAlert,
      alreadyProcessed: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playbook execution failed";

    await prisma.securityAlertRemediation.update({
      where: { id: remediation.id },
      data: {
        status: "FAILED",
        errorMessage: message,
      },
    });

    throw error;
  }
}

export function parsePlaybook(value: string | null | undefined) {
  if (!value) return null;
  if ((Object.values(SecurityPlaybook) as string[]).includes(value)) {
    return value as SecurityPlaybook;
  }
  return null;
}

export function requiresInstanceTarget(playbook: SecurityPlaybook) {
  return (
    playbook === SecurityPlaybook.STOP_INSTANCE ||
    playbook === SecurityPlaybook.QUARANTINE_INSTANCE ||
    playbook === SecurityPlaybook.RESTORE_INSTANCE_SG
  );
}

export function isTransitionStatus(status: InstanceStatus) {
  return (
    status === InstanceStatus.CREATING ||
    status === InstanceStatus.STARTING ||
    status === InstanceStatus.STOPPING ||
    status === InstanceStatus.TERMINATING
  );
}
