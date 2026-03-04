import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createNetworkSchema } from "@/lib/api/schemas";
import { requireTenantRead, requireTenantWrite } from "@/lib/auth/guards";
import { assertTenantIsAccessible, resolveTenantScope } from "@/lib/tenant/scope";
import { writeOperationLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantRead(request);
    const tenantIdFromQuery = request.nextUrl.searchParams.get("tenantId");
    const tenantId = resolveTenantScope(session, tenantIdFromQuery);
    await assertTenantIsAccessible(session, tenantId);

    const networks = await prisma.network.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return apiOk(networks);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireTenantWrite(request);
    const tenantIdFromQuery = request.nextUrl.searchParams.get("tenantId");
    const tenantId = resolveTenantScope(session, tenantIdFromQuery);
    await assertTenantIsAccessible(session, tenantId);
    const body = await parseJson(request, createNetworkSchema);

    const network = await prisma.network.create({
      data: {
        tenantId,
        name: body.name,
        cidr: body.cidr,
      },
    });

    await writeOperationLog({
      tenantId,
      userId: session.userId,
      action: "CREATE_NETWORK",
      details: {
        networkId: network.id,
        name: network.name,
      },
    });

    return apiOk(network, 201);
  } catch (error) {
    return apiError(error);
  }
}
