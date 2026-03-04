import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    return apiOk({
      id: session.userId,
      email: session.email,
      fullName: session.fullName,
      role: session.role,
      tenantId: session.tenantId,
    });
  } catch (error) {
    return apiError(error);
  }
}
