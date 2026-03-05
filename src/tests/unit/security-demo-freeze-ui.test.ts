import { SecurityAlertType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { recommendedPlaybooksForAlert } from "@/lib/security/recommendations";
import { shouldFreezeTenantAfterEvaluation } from "@/lib/security/store";
import { statusColorForInstanceStatus } from "@/lib/ui/instance-status-colors";
import { quotaTone } from "@/lib/ui/quota";

describe("security demo freeze", () => {
  it("freezes after first detection when enabled", () => {
    expect(shouldFreezeTenantAfterEvaluation(true, null, 1)).toBe(true);
  });

  it("does not freeze when already frozen or no candidates", () => {
    expect(shouldFreezeTenantAfterEvaluation(true, new Date("2026-03-05T10:00:00.000Z"), 5)).toBe(false);
    expect(shouldFreezeTenantAfterEvaluation(true, null, 0)).toBe(false);
    expect(shouldFreezeTenantAfterEvaluation(false, null, 4)).toBe(false);
  });
});

describe("security recommended playbooks", () => {
  it("maps alert types to playbook bundles", () => {
    expect(recommendedPlaybooksForAlert(SecurityAlertType.AUTH_ANOMALY, "tenant")).toEqual([
      "SUGGEST_ACCESS_LOCKDOWN",
      "SUGGEST_PASSWORD_RESET",
    ]);
    expect(recommendedPlaybooksForAlert(SecurityAlertType.QUOTA_PRESSURE, "tenant")).toEqual([
      "SUGGEST_CAPACITY_RIGHTSIZING",
    ]);
    expect(recommendedPlaybooksForAlert(SecurityAlertType.SG_EXPOSURE, "security_group")).toEqual([
      "SUGGEST_SG_HARDENING",
    ]);
    expect(recommendedPlaybooksForAlert(SecurityAlertType.INSTANCE_FAILURE, "instance")).toEqual([
      "QUARANTINE_INSTANCE",
      "STOP_INSTANCE",
      "SUGGEST_INSTANCE_DIAGNOSTICS",
    ]);
  });
});

describe("quota tone thresholds", () => {
  it("resolves boundaries correctly", () => {
    expect(quotaTone(69)).toBe("safe");
    expect(quotaTone(70)).toBe("watch");
    expect(quotaTone(84)).toBe("watch");
    expect(quotaTone(85)).toBe("warning");
    expect(quotaTone(94)).toBe("warning");
    expect(quotaTone(95)).toBe("critical");
  });
});

describe("instance status color mapping", () => {
  it("uses deterministic palette for all key statuses", () => {
    expect(statusColorForInstanceStatus("RUNNING")).toBe("#16a34a");
    expect(statusColorForInstanceStatus("ERROR")).toBe("#dc2626");
    expect(statusColorForInstanceStatus("STOPPED")).toBe("#64748b");
    expect(statusColorForInstanceStatus("UNKNOWN")).toBe("#6b7280");
  });
});
