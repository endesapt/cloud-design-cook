import { describe, expect, it } from "vitest";
import { exceedsQuota, projectUsage } from "@/lib/quota/logic";

describe("quota logic", () => {
  it("projects usage correctly", () => {
    const usage = { usedVms: 1, usedVcpus: 2, usedRamMb: 4096, usedDiskGb: 40 };
    const projected = projectUsage(usage, { vms: 1, vcpus: 2, ramMb: 2048, diskGb: 20 });

    expect(projected).toEqual({ usedVms: 2, usedVcpus: 4, usedRamMb: 6144, usedDiskGb: 60 });
  });

  it("detects quota overflow", () => {
    const limits = { maxVms: 2, maxVcpus: 4, maxRamMb: 8192, maxDiskGb: 80 };
    const usage = { usedVms: 3, usedVcpus: 4, usedRamMb: 4096, usedDiskGb: 40 };

    expect(exceedsQuota(limits, usage)).toBe(true);
  });

  it("allows usage within limits", () => {
    const limits = { maxVms: 2, maxVcpus: 4, maxRamMb: 8192, maxDiskGb: 80 };
    const usage = { usedVms: 2, usedVcpus: 4, usedRamMb: 4096, usedDiskGb: 40 };

    expect(exceedsQuota(limits, usage)).toBe(false);
  });
});
