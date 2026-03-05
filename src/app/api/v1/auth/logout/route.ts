import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { AUTH_COOKIE } from "@/lib/auth/token";
import { getSessionUserFromRequest } from "@/lib/auth/session";
import { buildAuditRequestContext, maskEmail, writeOperationLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const requestContext = buildAuditRequestContext(request);
    let session = null;
    try {
      session = getSessionUserFromRequest(request);
    } catch {
      session = null;
    }

    if (session) {
      await writeOperationLog({
        tenantId: session.tenantId,
        userId: session.userId,
        action: "LOGOUT",
        resourceType: "auth",
        resourceId: session.userId,
        sourceIpMasked: requestContext.sourceIpMasked,
        userAgent: requestContext.userAgent,
        details: {
          emailMasked: maskEmail(session.email),
        },
      });
    }

    const response = NextResponse.json({ data: { success: true } });
    response.cookies.set({
      name: AUTH_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return apiError(error);
  }
}
