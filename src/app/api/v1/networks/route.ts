import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { createNetworkSchema } from "@/lib/api/schemas";
import { requireTenantContext } from "@/lib/auth/guards";
import { resolveTenantScope } from "@/lib/tenant/scope";
import { writeOperationLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = requireTenantContext(request);
    const tenantIdFromQuery = request.nextUrl.searchParams.get("tenantId");
    const tenantId = resolveTenantScope(session, tenantIdFromQuery);

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
    const session = requireTenantContext(request);
    const tenantIdFromQuery = request.nextUrl.searchParams.get("tenantId");
    const tenantId = resolveTenantScope(session, tenantIdFromQuery);
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
