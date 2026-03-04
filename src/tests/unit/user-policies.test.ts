import { describe, expect, it } from "vitest";
import { assertRoleTenantRequirement, assertTenantAdminCanAssignRole } from "@/lib/users/policies";

describe("user policies", () => {
  it("allows tenant admin to assign tenant roles", () => {
    expect(() => assertTenantAdminCanAssignRole("tenant_admin")).not.toThrow();
    expect(() => assertTenantAdminCanAssignRole("tenant_user")).not.toThrow();
  });

  it("blocks tenant admin from assigning global roles", () => {
    expect(() => assertTenantAdminCanAssignRole("global_admin")).toThrowError(/cannot assign/i);
    expect(() => assertTenantAdminCanAssignRole("support_viewer")).toThrowError(/cannot assign/i);
  });

  it("requires tenantId for tenant roles", () => {
    expect(() => assertRoleTenantRequirement("tenant_user", null)).toThrowError(/requires tenantId/i);
  });

  it("rejects tenantId for global roles", () => {
    expect(() => assertRoleTenantRequirement("global_admin", "tenant-id")).toThrowError(/must not include tenantId/i);
  });
});
