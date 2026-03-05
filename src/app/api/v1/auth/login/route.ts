import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseJson } from "@/lib/api/parse";
import { loginSchema } from "@/lib/api/schemas";
import { apiError } from "@/lib/api/http";
import { UnauthorizedError } from "@/lib/errors/app-error";
import { AUTH_COOKIE, signSessionToken } from "@/lib/auth/token";
import { buildAuditRequestContext, maskEmail, writeOperationLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJson(request, loginSchema);
    const requestContext = buildAuditRequestContext(request);
    const normalizedEmail = body.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        role: true,
        tenantId: true,
      },
    });

    if (!user) {
      await writeOperationLog({
        action: "LOGIN_FAILED",
        outcome: "FAILURE",
        riskLevel: "MEDIUM",
        resourceType: "auth",
        resourceId: maskEmail(normalizedEmail),
        sourceIpMasked: requestContext.sourceIpMasked,
        userAgent: requestContext.userAgent,
        details: {
          emailMasked: maskEmail(normalizedEmail),
          reason: "USER_NOT_FOUND",
        },
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      await writeOperationLog({
        tenantId: user.tenantId,
        userId: user.id,
        action: "LOGIN_FAILED",
        outcome: "FAILURE",
        riskLevel: "HIGH",
        resourceType: "auth",
        resourceId: user.id,
        sourceIpMasked: requestContext.sourceIpMasked,
        userAgent: requestContext.userAgent,
        details: {
          emailMasked: maskEmail(user.email),
          reason: "INVALID_PASSWORD",
        },
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
    });

    const response = NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
        },
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    await writeOperationLog({
      tenantId: user.tenantId,
      userId: user.id,
      action: "LOGIN",
      resourceType: "auth",
      resourceId: user.id,
      sourceIpMasked: requestContext.sourceIpMasked,
      userAgent: requestContext.userAgent,
      details: {
        emailMasked: maskEmail(user.email),
      },
    });

    return response;
  } catch (error) {
    return apiError(error);
  }
}
