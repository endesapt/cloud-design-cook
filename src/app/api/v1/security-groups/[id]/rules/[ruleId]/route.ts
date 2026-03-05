import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createSecurityGroupRuleSchema } from "@/lib/api/schemas";
import { requireTenantWrite } from "@/lib/auth/guards";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { hasDuplicateRule, validateRulePortRange } from "@/lib/security-groups/rules";
import { writeOperationLog } from "@/lib/audit";

type Params = {
  params: Promise<{ id: string; ruleId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, ruleId } = await params;
    const session = requireTenantWrite(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);
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

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "UPDATE_SECURITY_GROUP_RULE",
      resourceType: "security_group_rule",
      resourceId: updated.id,
      details: {
        securityGroupId: sg.id,
        ruleId: updated.id,
        before: {
          direction: existingRule.direction,
          protocol: existingRule.protocol,
          portFrom: existingRule.portFrom,
          portTo: existingRule.portTo,
          cidr: existingRule.cidr,
        },
        after: {
          direction: updated.direction,
          protocol: updated.protocol,
          portFrom: updated.portFrom,
          portTo: updated.portTo,
          cidr: updated.cidr,
        },
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
    const session = requireTenantWrite(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);

    const sg = await prisma.securityGroup.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!sg) {
      throw new NotFoundError("Security group not found");
    }

    const existingRule = await prisma.securityGroupRule.findFirst({
      where: {
        id: ruleId,
        securityGroupId: sg.id,
      },
    });

    if (!existingRule) {
      throw new NotFoundError("Security group rule not found");
    }

    await prisma.securityGroupRule.delete({
      where: { id: existingRule.id },
    });

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "DELETE_SECURITY_GROUP_RULE",
      riskLevel: "MEDIUM",
      resourceType: "security_group_rule",
      resourceId: existingRule.id,
      details: {
        securityGroupId: sg.id,
        ruleId: existingRule.id,
        direction: existingRule.direction,
        protocol: existingRule.protocol,
        portFrom: existingRule.portFrom,
        portTo: existingRule.portTo,
        cidr: existingRule.cidr,
      },
    });

    return apiOk({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
