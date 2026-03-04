import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { parseJson } from "@/lib/api/parse";
import { updateTenantSchema } from "@/lib/api/schemas";
import { requireRole } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors/app-error";
import { writeOperationLog } from "@/lib/audit";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireRole(request, ["global_admin"]);
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    return apiOk(tenant);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = requireRole(request, ["global_admin"]);
    const body = await parseJson(request, updateTenantSchema);
    const { id } = await params;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Tenant not found");
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        description: body.description,
        maxVms: body.maxVms,
        maxVcpus: body.maxVcpus,
        maxRamMb: body.maxRamMb,
        maxDiskGb: body.maxDiskGb,
      },
    });

    await writeOperationLog({
      tenantId: id,
      userId: session.userId,
      action: "UPDATE_TENANT_QUOTA",
      details: {
        before: {
          maxVms: existing.maxVms,
          maxVcpus: existing.maxVcpus,
          maxRamMb: existing.maxRamMb,
          maxDiskGb: existing.maxDiskGb,
        },
        after: {
          maxVms: updated.maxVms,
          maxVcpus: updated.maxVcpus,
          maxRamMb: updated.maxRamMb,
          maxDiskGb: updated.maxDiskGb,
        },
      },
    });

    return apiOk(updated);
  } catch (error) {
    return apiError(error);
  }
}
