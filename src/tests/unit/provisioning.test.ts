import { describe, expect, it } from "vitest";
import { InstanceStatus } from "@prisma/client";
import { nextStatusForAction } from "@/lib/provisioning/reconcile";

describe("instance lifecycle transitions", () => {
  it("allows stop from RUNNING", () => {
    expect(nextStatusForAction(InstanceStatus.RUNNING, "stop")).toBe(InstanceStatus.STOPPED);
  });

  it("allows start from STOPPED", () => {
    expect(nextStatusForAction(InstanceStatus.STOPPED, "start")).toBe(InstanceStatus.CREATING);
  });

  it("allows reboot from RUNNING", () => {
    expect(nextStatusForAction(InstanceStatus.RUNNING, "reboot")).toBe(InstanceStatus.CREATING);
  });

  it("always maps delete to DELETED", () => {
    expect(nextStatusForAction(InstanceStatus.ERROR, "delete")).toBe(InstanceStatus.DELETED);
  });

  it("rejects invalid transition", () => {
    expect(() => nextStatusForAction(InstanceStatus.STOPPED, "reboot")).toThrowError(/allowed only/);
  });
});
