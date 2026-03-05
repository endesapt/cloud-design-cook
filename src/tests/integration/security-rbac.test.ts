import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { requireTenantWrite } from "@/lib/auth/guards";
import { signSessionToken } from "@/lib/auth/token";

function buildRequest(role: "global_admin" | "support_viewer" | "tenant_admin" | "tenant_user") {
  const token = signSessionToken({
    userId: "user-1",
    email: "user@test.local",
    fullName: "User",
    role,
    tenantId: role === "global_admin" || role === "support_viewer" ? null : "tenant-1",
  });

  return new NextRequest("http://localhost:3000/api/v1/security/alerts/any", {
    headers: {
      cookie: `iaas_session=${token}`,
    },
  });
}

describe("security RBAC", () => {
  it("allows tenant_admin write access", () => {
    const request = buildRequest("tenant_admin");
    expect(() => requireTenantWrite(request)).not.toThrow();
  });

  it("allows global_admin write access", () => {
    const request = buildRequest("global_admin");
    expect(() => requireTenantWrite(request)).not.toThrow();
  });

  it("denies support_viewer write access", () => {
    const request = buildRequest("support_viewer");
    expect(() => requireTenantWrite(request)).toThrowError(/access/i);
  });

  it("denies tenant_user write access", () => {
    const request = buildRequest("tenant_user");
    expect(() => requireTenantWrite(request)).toThrowError(/access/i);
  });
});
