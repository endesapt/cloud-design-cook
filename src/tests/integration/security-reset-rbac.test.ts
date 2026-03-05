import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { requireAdminWrite } from "@/lib/auth/guards";
import { signSessionToken } from "@/lib/auth/token";

function buildRequest(role: "global_admin" | "support_viewer" | "tenant_admin" | "tenant_user") {
  const token = signSessionToken({
    userId: "user-1",
    email: "user@test.local",
    fullName: "User",
    role,
    tenantId: role === "global_admin" || role === "support_viewer" ? null : "tenant-1",
  });

  return new NextRequest("http://localhost:3000/api/v1/admin/security/tenants/tenant-1/reset-freeze", {
    method: "POST",
    headers: {
      cookie: `iaas_session=${token}`,
    },
  });
}

describe("security reset-freeze RBAC", () => {
  it("allows global_admin", () => {
    expect(() => requireAdminWrite(buildRequest("global_admin"))).not.toThrow();
  });

  it("denies support_viewer and tenant roles", () => {
    expect(() => requireAdminWrite(buildRequest("support_viewer"))).toThrowError(/access/i);
    expect(() => requireAdminWrite(buildRequest("tenant_admin"))).toThrowError(/access/i);
    expect(() => requireAdminWrite(buildRequest("tenant_user"))).toThrowError(/access/i);
  });
});
