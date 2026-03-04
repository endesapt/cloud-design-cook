import { describe, expect, it } from "vitest";
import { assertTenantOwnership } from "@/lib/tenant/scope";

const session = {
  userId: "user-1",
  email: "tenant@alpha.local",
  fullName: "Tenant User",
  role: "tenant_admin" as const,
  tenantId: "tenant-alpha",
};

describe("cross-tenant denial", () => {
  it("blocks access when resource tenant differs", () => {
    expect(() => assertTenantOwnership(session, "tenant-beta")).toThrowError(/Cross-tenant access denied/);
  });

  it("allows access when resource belongs to same tenant", () => {
    expect(() => assertTenantOwnership(session, "tenant-alpha")).not.toThrow();
  });
});
