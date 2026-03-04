import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createSecurityGroupRuleSchema } from "@/lib/api/schemas";
import { requireTenantContext } from "@/lib/auth/guards";
import { resolveTenantScope } from "@/lib/tenant/scope";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { hasDuplicateRule, validateRulePortRange } from "@/lib/security-groups/rules";

type Params = {
  params: Promise<{ id: string; ruleId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, ruleId } = await params;
    const session = requireTenantContext(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    const body = await parseJson(request, createSecurityGroupRuleSchema);

    validateRulePortRange({
      portFrom: body.portFrom ?? null,
      portTo: body.portTo ?? null,
    });

    const sg = await prisma.securityGroup.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        rules: {
          select: {
            id: true,
            direction: true,
            protocol: true,
            portFrom: true,
            portTo: true,
            cidr: true,
          },
        },
      },
    });

    if (!sg) {
      throw new NotFoundError("Security group not found");
    }

    const existingRule = sg.rules.find((rule) => rule.id === ruleId);
    if (!existingRule) {
      throw new NotFoundError("Security group rule not found");
    }

    const candidate = {
      id: ruleId,
      direction: body.direction,
      protocol: body.protocol,
      portFrom: body.portFrom ?? null,
      portTo: body.portTo ?? null,
      cidr: body.cidr,
    };

    if (hasDuplicateRule(sg.rules, candidate, ruleId)) {
      throw new AppError("Duplicate security group rule", 409, "DUPLICATE_SECURITY_GROUP_RULE");
    }

    const updated = await prisma.securityGroupRule.update({
      where: { id: ruleId },
      data: {
        direction: body.direction,
        protocol: body.protocol,
        portFrom: body.portFrom ?? null,
        portTo: body.portTo ?? null,
        cidr: body.cidr,
      },
    });

    return apiOk(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id, ruleId } = await params;
    const session = requireTenantContext(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));

    const sg = await prisma.securityGroup.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!sg) {
      throw new NotFoundError("Security group not found");
    }

    const deleted = await prisma.securityGroupRule.deleteMany({
      where: {
        id: ruleId,
        securityGroupId: sg.id,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundError("Security group rule not found");
    }

    return apiOk({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
