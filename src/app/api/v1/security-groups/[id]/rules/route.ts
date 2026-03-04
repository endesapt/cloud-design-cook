import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createSecurityGroupRuleSchema } from "@/lib/api/schemas";
import { requireTenantRead, requireTenantWrite } from "@/lib/auth/guards";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { hasDuplicateRule, validateRulePortRange } from "@/lib/security-groups/rules";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireTenantRead(request);
    const tenantId = resolveTenantScope(session, request.nextUrl.searchParams.get("tenantId"));
    await assertTenantIsAccessible(session, tenantId);

    const sg = await prisma.securityGroup.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!sg) {
      throw new NotFoundError("Security group not found");
    }

    const rules = await prisma.securityGroupRule.findMany({
      where: { securityGroupId: sg.id },
      orderBy: { createdAt: "asc" },
    });

    return apiOk(rules);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
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

    const candidate = {
      direction: body.direction,
      protocol: body.protocol,
      portFrom: body.portFrom ?? null,
      portTo: body.portTo ?? null,
      cidr: body.cidr,
    };

    if (hasDuplicateRule(sg.rules, candidate)) {
      throw new AppError("Duplicate security group rule", 409, "DUPLICATE_SECURITY_GROUP_RULE");
    }

    const rule = await prisma.securityGroupRule.create({
      data: {
        securityGroupId: sg.id,
        direction: body.direction,
        protocol: body.protocol,
        portFrom: body.portFrom ?? null,
        portTo: body.portTo ?? null,
        cidr: body.cidr,
      },
    });

    return apiOk(rule, 201);
  } catch (error) {
    return apiError(error);
  }
}
