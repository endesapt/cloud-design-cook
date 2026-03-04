function asNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function provisionMode() {
  return process.env.PROVISION_MODE === "docker" ? "docker" : "mock";
}

export const config = {
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-not-for-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  mockFailRate: asNumber(process.env.MOCK_FAIL_RATE, 0.05),
  provisionMode: provisionMode(),
  dockerImage: process.env.DOCKER_VM_IMAGE ?? "alpine:3.20",
  dockerMinCpus: asNumber(process.env.DOCKER_MIN_CPUS, 0.1),
  dockerMinMemoryMb: asNumber(process.env.DOCKER_MIN_MEMORY_MB, 64),
  dockerPidsLimit: asNumber(process.env.DOCKER_PIDS_LIMIT, 64),
  dockerCommandTimeoutMs: asNumber(process.env.DOCKER_COMMAND_TIMEOUT_MS, 120000),
  dockerFallbackToMock: asBoolean(process.env.DOCKER_FALLBACK_TO_MOCK, true),
};
