import type { NextRequest } from "next/server";
import { AuditRiskLevel, OperationAction, OperationOutcome, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const MAX_USER_AGENT_LENGTH = 180;

export type AuditRequestContext = {
  sourceIpMasked?: string | null;
  userAgent?: string | null;
};

type LogArgs = {
  tenantId?: string | null;
  userId?: string | null;
  action: OperationAction | keyof typeof OperationAction;
  outcome?: OperationOutcome;
  riskLevel?: AuditRiskLevel;
  resourceType?: string | null;
  resourceId?: string | null;
  sourceIpMasked?: string | null;
  userAgent?: string | null;
  details?: unknown;
};

function normalizeDetails(details: unknown): Prisma.InputJsonValue {
  if (details && typeof details === "object" && !Array.isArray(details)) {
    return details as Prisma.InputJsonValue;
  }

  if (details === undefined) {
    return {} as Prisma.InputJsonObject;
  }

  return { value: details ?? null } as Prisma.InputJsonObject;
}

export function maskEmail(email: string) {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain) return "***";
  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskIpAddress(ip: string | null | undefined) {
  if (!ip) return null;

  const normalized = ip.split(",")[0]?.trim();
  if (!normalized) return null;

  if (normalized.includes(".")) {
    const parts = normalized.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
    }
  }

  if (normalized.includes(":")) {
    const blocks = normalized.split(":").filter(Boolean);
    if (!blocks.length) return "xxxx::";
    return `${blocks.slice(0, 2).join(":")}::`;
  }

  return normalized.slice(0, 6);
}

export function buildAuditRequestContext(request: NextRequest): AuditRequestContext {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded ?? realIp ?? null;
  const userAgentRaw = request.headers.get("user-agent");

  return {
    sourceIpMasked: maskIpAddress(ip),
    userAgent: userAgentRaw ? userAgentRaw.slice(0, MAX_USER_AGENT_LENGTH) : null,
  };
}

export async function writeOperationLog(args: LogArgs) {
  return prisma.operationLog.create({
    data: {
      tenantId: args.tenantId ?? null,
      userId: args.userId ?? null,
      action: args.action as OperationAction,
      outcome: args.outcome ?? OperationOutcome.SUCCESS,
      riskLevel: args.riskLevel ?? AuditRiskLevel.LOW,
      resourceType: args.resourceType ?? null,
      resourceId: args.resourceId ?? null,
      sourceIpMasked: args.sourceIpMasked ?? null,
      userAgent: args.userAgent ?? null,
      details: normalizeDetails(args.details),
    },
  });
}
