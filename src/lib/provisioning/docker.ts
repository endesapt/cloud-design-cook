import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AppError } from "@/lib/errors/app-error";
import { config } from "@/lib/config";

const execFileAsync = promisify(execFile);

export type DockerRuntimeResources = {
  cpus: number;
  memoryMb: number;
  pidsLimit: number;
};

export function runtimeResources(): DockerRuntimeResources {
  return {
    cpus: config.dockerMinCpus,
    memoryMb: config.dockerMinMemoryMb,
    pidsLimit: config.dockerPidsLimit,
  };
}

async function runDocker(args: string[]) {
  try {
    const { stdout, stderr } = await execFileAsync("docker", args, {
      timeout: config.dockerCommandTimeoutMs,
      maxBuffer: 1024 * 1024,
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Docker command failed";
    throw new AppError(`Docker execution error: ${message}`, 500, "DOCKER_UNAVAILABLE");
  }
}

export async function ensureDockerAvailable() {
  await runDocker(["version", "--format", "{{.Server.Version}}"]);
}

function buildContainerName(instanceId: string) {
  return `iaas-vm-${instanceId.slice(0, 8)}-${Date.now().toString(36)}`;
}

export async function createDockerBackedInstance(instanceId: string) {
  const resources = runtimeResources();
  const name = buildContainerName(instanceId);

  const { stdout } = await runDocker([
    "run",
    "-d",
    "--name",
    name,
    "--cpus",
    resources.cpus.toString(),
    "--memory",
    `${resources.memoryMb}m`,
    "--memory-swap",
    `${resources.memoryMb}m`,
    "--pids-limit",
    resources.pidsLimit.toString(),
    "--restart",
    "no",
    config.dockerImage,
    "sh",
    "-c",
    "while true; do sleep 3600; done",
  ]);

  const containerId = stdout.split("\n")[0]?.trim();
  if (!containerId) {
    throw new AppError("Failed to create docker-backed instance", 500, "DOCKER_RUN_FAILED");
  }

  const { stdout: ipStdout } = await runDocker([
    "inspect",
    "-f",
    "{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
    containerId,
  ]);

  return {
    containerId,
    ipv4: ipStdout || null,
    resources,
  };
}

export async function startDockerContainer(containerId: string) {
  await runDocker(["start", containerId]);

  const { stdout: ipStdout } = await runDocker([
    "inspect",
    "-f",
    "{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
    containerId,
  ]);

  return ipStdout || null;
}

export async function stopDockerContainer(containerId: string) {
  await runDocker(["stop", containerId]);
}

export async function restartDockerContainer(containerId: string) {
  await runDocker(["restart", containerId]);

  const { stdout: ipStdout } = await runDocker([
    "inspect",
    "-f",
    "{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
    containerId,
  ]);

  return ipStdout || null;
}

export async function removeDockerContainer(containerId: string) {
  await runDocker(["rm", "-f", containerId]);
}
