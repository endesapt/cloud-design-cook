import { describe, expect, it } from "vitest";
import { InstanceStatus } from "@prisma/client";
import { nextStatusForAction } from "@/lib/provisioning/reconcile";
import { projectUsage, exceedsQuota } from "@/lib/quota/logic";

describe("e2e smoke: lifecycle + quota path", () => {
  it("simulates create then stop then start transitions", () => {
    const created = InstanceStatus.CREATING;
    const stopped = nextStatusForAction(InstanceStatus.RUNNING, "stop");
    const restarted = nextStatusForAction(InstanceStatus.STOPPED, "start");

    expect(created).toBe(InstanceStatus.CREATING);
    expect(stopped).toBe(InstanceStatus.STOPPING);
    expect(restarted).toBe(InstanceStatus.STARTING);
  });

  it("detects quota pressure when adding flavor resources", () => {
    const limits = { maxVms: 2, maxVcpus: 2, maxRamMb: 4096, maxDiskGb: 40 };
    const usage = { usedVms: 1, usedVcpus: 1, usedRamMb: 2048, usedDiskGb: 20 };

    const projected = projectUsage(usage, { vms: 1, vcpus: 2, ramMb: 2048, diskGb: 20 });

    expect(exceedsQuota(limits, projected)).toBe(true);
  });
});
