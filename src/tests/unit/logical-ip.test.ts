import { describe, expect, it } from "vitest";
import { deriveLogicalIpv4 } from "@/lib/network/logical-ip";

describe("deriveLogicalIpv4", () => {
  it("returns stable logical ip in network range", () => {
    const ip = deriveLogicalIpv4("10.20.0.0/24", "00000000-0000-0000-0000-0000000000b1");
    expect(ip).toMatch(/^10\.20\.0\./);
  });

  it("returns null for invalid cidr", () => {
    expect(deriveLogicalIpv4("invalid", "00000000-0000-0000-0000-0000000000b1")).toBeNull();
  });
});
