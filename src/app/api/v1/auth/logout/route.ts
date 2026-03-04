import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { AUTH_COOKIE } from "@/lib/auth/token";
import { getSessionUserFromRequest } from "@/lib/auth/session";
import { writeOperationLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
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
        details: { email: session.email },
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
