import { describe, expect, it } from "vitest";
import { InstanceStatus } from "@prisma/client";
import { nextStatusForAction } from "@/lib/provisioning/reconcile";

describe("instance lifecycle transitions", () => {
  it("allows stop from RUNNING", () => {
    expect(nextStatusForAction(InstanceStatus.RUNNING, "stop")).toBe(InstanceStatus.STOPPING);
  });

  it("allows start from STOPPED", () => {
    expect(nextStatusForAction(InstanceStatus.STOPPED, "start")).toBe(InstanceStatus.STARTING);
  });

  it("allows reboot from RUNNING", () => {
    expect(nextStatusForAction(InstanceStatus.RUNNING, "reboot")).toBe(InstanceStatus.CREATING);
  });

  it("maps delete to TERMINATING", () => {
    expect(nextStatusForAction(InstanceStatus.ERROR, "delete")).toBe(InstanceStatus.TERMINATING);
  });

  it("rejects invalid transition", () => {
    expect(() => nextStatusForAction(InstanceStatus.STOPPED, "reboot")).toThrowError(/allowed only/);
  });

  it("rejects actions while transition is in progress", () => {
    expect(() => nextStatusForAction(InstanceStatus.STARTING, "stop")).toThrowError(/transition is in progress/i);
  });
});
