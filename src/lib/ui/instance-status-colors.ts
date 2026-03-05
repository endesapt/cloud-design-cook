export const INSTANCE_STATUS_COLORS: Record<string, string> = {
  CREATING: "#0ea5e9",
  STARTING: "#22c55e",
  RUNNING: "#16a34a",
  STOPPING: "#f59e0b",
  STOPPED: "#64748b",
  TERMINATING: "#f97316",
  ERROR: "#dc2626",
  DELETED: "#94a3b8",
};

export function statusColorForInstanceStatus(status: string) {
  return INSTANCE_STATUS_COLORS[status] ?? "#6b7280";
}
