"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SecuritySeverityBadge } from "@/components/domain/security-severity-badge";
import { SecurityStatusBadge } from "@/components/domain/security-status-badge";
import type { SecurityAlertDto } from "@/lib/types";

type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
type Playbook = "STOP_INSTANCE" | "QUARANTINE_INSTANCE" | "RESTORE_INSTANCE_SG" | "SUGGEST_PASSWORD_RESET";

const INSTANCE_PLAYBOOKS: Playbook[] = ["STOP_INSTANCE", "QUARANTINE_INSTANCE", "RESTORE_INSTANCE_SG", "SUGGEST_PASSWORD_RESET"];
const GENERIC_PLAYBOOKS: Playbook[] = ["SUGGEST_PASSWORD_RESET"];

function playbookLabel(playbook: Playbook) {
  if (playbook === "STOP_INSTANCE") return "Stop Instance";
  if (playbook === "QUARANTINE_INSTANCE") return "Quarantine";
  if (playbook === "RESTORE_INSTANCE_SG") return "Restore SG";
  return "Suggest Password Reset";
}

export function SecurityAlertsTable({
  alerts,
  canMutate,
  busyKey,
  onStatusChange,
  onPlaybook,
}: {
  alerts: SecurityAlertDto[];
  canMutate: boolean;
  busyKey: string | null;
  onStatusChange: (alertId: string, status: AlertStatus) => Promise<void>;
  onPlaybook: (alertId: string, playbook: Playbook) => Promise<void>;
}) {
  const [playbookByAlert, setPlaybookByAlert] = useState<Record<string, Playbook>>({});

  const rows = useMemo(() => alerts.slice(0, 100), [alerts]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[--line] text-left text-xs font-semibold uppercase tracking-[0.12em] text-[--ink-3]">
            <th className="px-3 py-3.5">Alert</th>
            <th className="px-3 py-3.5">Severity</th>
            <th className="px-3 py-3.5">Status</th>
            <th className="px-3 py-3.5">Target</th>
            <th className="px-3 py-3.5">Last Seen</th>
            <th className="px-3 py-3.5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((alert) => {
            const availablePlaybooks = alert.targetType === "instance" ? INSTANCE_PLAYBOOKS : GENERIC_PLAYBOOKS;
            const selectedPlaybook = playbookByAlert[alert.id] ?? availablePlaybooks[0];
            const locked = busyKey === alert.id;

            return (
              <tr key={alert.id} className="border-b border-[--line] align-top last:border-none">
                <td className="px-3 py-4">
                  <p className="font-semibold text-[--ink-1]">{alert.title}</p>
                  <p className="mt-1 max-w-xl text-xs text-[--ink-2]">{alert.description}</p>
                  <p className="mt-1 font-mono text-[11px] text-[--ink-3]">{alert.type}</p>
                </td>
                <td className="px-3 py-4">
                  <SecuritySeverityBadge severity={alert.severity} />
                </td>
                <td className="px-3 py-4">
                  <SecurityStatusBadge status={alert.status} />
                </td>
                <td className="px-3 py-4 text-xs text-[--ink-2]">
                  <p className="font-medium text-[--ink-1]">{alert.targetType}</p>
                  <p className="font-mono">{alert.targetId.slice(0, 12)}...</p>
                </td>
                <td className="px-3 py-4 text-xs text-[--ink-2]">{new Date(alert.lastSeenAt).toLocaleString()}</td>
                <td className="px-3 py-4">
                  {!canMutate ? (
                    <p className="text-xs font-medium text-[--ink-3]">Read-only</p>
                  ) : (
                    <div className="flex min-w-[21rem] flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={locked || alert.status === "ACKNOWLEDGED"}
                        onClick={() => void onStatusChange(alert.id, "ACKNOWLEDGED")}
                      >
                        Ack
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={locked || alert.status === "RESOLVED"}
                        onClick={() => void onStatusChange(alert.id, "RESOLVED")}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={locked || alert.status === "OPEN"}
                        onClick={() => void onStatusChange(alert.id, "OPEN")}
                      >
                        Reopen
                      </Button>
                      <select
                        className="h-9 rounded-lg border border-[--line] bg-white px-2 text-xs text-[--ink-1]"
                        value={selectedPlaybook}
                        onChange={(event) =>
                          setPlaybookByAlert((prev) => ({
                            ...prev,
                            [alert.id]: event.target.value as Playbook,
                          }))
                        }
                      >
                        {availablePlaybooks.map((playbook) => (
                          <option key={playbook} value={playbook}>
                            {playbookLabel(playbook)}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" disabled={locked} onClick={() => void onPlaybook(alert.id, selectedPlaybook)}>
                        Run
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
