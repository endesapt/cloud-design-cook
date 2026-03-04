import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createSecurityGroupRuleSchema } from "@/lib/api/schemas";
import { requireTenantContext } from "@/lib/auth/guards";
import { resolveTenantScope } from "@/lib/tenant/scope";
import { NotFoundError } from "@/lib/errors/app-error";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = requireTenantContext(request);
    const tenantIdFromQuery = request.nextUrl.searchParams.get("tenantId");
    const tenantId = resolveTenantScope(session, tenantIdFromQuery);
    const body = await parseJson(request, createSecurityGroupRuleSchema);

    const sg = await prisma.securityGroup.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!sg) {
      throw new NotFoundError("Security group not found");
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
