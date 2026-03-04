import { describe, expect, it } from "vitest";
import { hasDuplicateRule, normalizeRuleKey, validateRulePortRange } from "@/lib/security-groups/rules";

describe("security group rule helpers", () => {
  it("normalizes protocol and cidr when building duplicate keys", () => {
    const first = normalizeRuleKey({
      direction: "ingress",
      protocol: "TCP",
      portFrom: 22,
      portTo: 22,
      cidr: "0.0.0.0/0",
    });

    const second = normalizeRuleKey({
      direction: "ingress",
      protocol: "tcp",
      portFrom: 22,
      portTo: 22,
      cidr: "0.0.0.0/0 ",
    });

    expect(first).toBe(second);
  });

  it("detects duplicate rules", () => {
    const duplicate = hasDuplicateRule(
      [
        {
          id: "rule-1",
          direction: "ingress",
          protocol: "tcp",
          portFrom: 443,
          portTo: 443,
          cidr: "0.0.0.0/0",
        },
      ],
      {
        direction: "ingress",
        protocol: "TCP",
        portFrom: 443,
        portTo: 443,
        cidr: "0.0.0.0/0",
      },
    );

    expect(duplicate).toBe(true);
  });

  it("validates port range order", () => {
    expect(() => validateRulePortRange({ portFrom: 2000, portTo: 1000 })).toThrowError(/portFrom/i);
  });
});
