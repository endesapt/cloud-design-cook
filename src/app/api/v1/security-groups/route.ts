import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createSecurityGroupSchema } from "@/lib/api/schemas";
import { requireTenantContext } from "@/lib/auth/guards";
import { resolveTenantScope } from "@/lib/tenant/scope";
import { writeOperationLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantContext(request);
    const tenantIdFromQuery = request.nextUrl.searchParams.get("tenantId");
    const tenantId = resolveTenantScope(session, tenantIdFromQuery);

    const groups = await prisma.securityGroup.findMany({
      where: { tenantId },
      include: {
        rules: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiOk(groups);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireTenantContext(request);
    const tenantIdFromQuery = request.nextUrl.searchParams.get("tenantId");
    const tenantId = resolveTenantScope(session, tenantIdFromQuery);
    const body = await parseJson(request, createSecurityGroupSchema);

    const securityGroup = await prisma.securityGroup.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
      },
    });

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "CREATE_SECURITY_GROUP",
      details: {
        securityGroupId: securityGroup.id,
        name: securityGroup.name,
      },
    });

    return apiOk(securityGroup, 201);
  } catch (error) {
    return apiError(error);
  }
}
