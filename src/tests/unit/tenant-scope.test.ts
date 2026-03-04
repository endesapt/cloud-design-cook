import { describe, expect, it } from "vitest";
import { assertTenantOwnership, resolveTenantScope } from "@/lib/tenant/scope";

const tenantAdmin = {
  userId: "u1",
  email: "owner@alpha.local",
  fullName: "Owner",
  role: "tenant_admin" as const,
  tenantId: "tenant-a",
};

const globalAdmin = {
  userId: "u2",
  email: "admin@cloud.local",
  fullName: "Admin",
  role: "global_admin" as const,
  tenantId: null,
};

describe("tenant scope", () => {
  it("keeps tenant context for tenant user", () => {
    expect(resolveTenantScope(tenantAdmin)).toBe("tenant-a");
  });

  it("requires explicit tenant for global admin", () => {
    expect(() => resolveTenantScope(globalAdmin)).toThrowError(/must provide tenant context/);
  });

  it("accepts explicit tenant for global admin", () => {
    expect(resolveTenantScope(globalAdmin, "tenant-b")).toBe("tenant-b");
  });

  it("rejects cross-tenant access", () => {
    expect(() => assertTenantOwnership(tenantAdmin, "tenant-b")).toThrowError(/Cross-tenant access denied/);
  });

  it("allows access in same tenant", () => {
    expect(() => assertTenantOwnership(tenantAdmin, "tenant-a")).not.toThrow();
  });
});
