function ipToInt(ip: string) {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }

  return (((parts[0] << 24) >>> 0) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function intToIp(value: number) {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join(".");
}

function instanceHash(instanceId: string) {
  const normalized = instanceId.replace(/-/g, "").slice(0, 8);
  return Number.parseInt(normalized, 16) >>> 0;
}

export function deriveLogicalIpv4(cidr: string, instanceId: string) {
  const [networkIp, prefixRaw] = cidr.split("/");
  const prefix = Number.parseInt(prefixRaw ?? "", 10);
  if (Number.isNaN(prefix) || prefix < 8 || prefix > 30) {
    return null;
  }

  const networkInt = ipToInt(networkIp);
  if (networkInt === null) {
    return null;
  }

  const hostBits = 32 - prefix;
  const hostSlots = 2 ** hostBits;
  if (hostSlots <= 2) {
    return null;
  }

  const mask = hostBits === 32 ? 0 : ((0xffffffff << hostBits) >>> 0);
  const base = networkInt & mask;
  const usableHosts = hostSlots - 2;
  const hostOffset = (instanceHash(instanceId) % usableHosts) + 1;
  const logicalIp = (base + hostOffset) >>> 0;

  return intToIp(logicalIp);
}
