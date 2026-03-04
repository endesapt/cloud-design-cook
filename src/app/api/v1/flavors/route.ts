import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  try {
    requireSession(request);

    const flavors = await prisma.flavor.findMany({
      where: { isActive: true },
      orderBy: { vcpus: "asc" },
    });

    return apiOk(flavors);
  } catch (error) {
    return apiError(error);
  }
}
