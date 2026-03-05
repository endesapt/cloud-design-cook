import { refreshTenantSecuritySignals } from "@/lib/security/store";

export async function refreshTenantSecuritySignalsBestEffort(tenantId: string) {
  try {
    await refreshTenantSecuritySignals(tenantId, { force: true });
  } catch (error) {
    // Keep business action successful even if security refresh fails.
    console.error("security-refresh-failed", {
      tenantId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
