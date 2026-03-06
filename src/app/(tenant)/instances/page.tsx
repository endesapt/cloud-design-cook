"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { InstanceStatus } from "@prisma/client";
import { Play, Square, RotateCcw, Trash2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InstanceStatusBadge } from "@/components/domain/instance-status-badge";
import { InstanceResourceGrid } from "@/components/domain/instance-resource-grid";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { apiFetch } from "@/lib/client/api";
import { deriveLogicalIpv4 } from "@/lib/network/logical-ip";
import { buildInstanceTelemetry } from "@/lib/ui/resource-telemetry";
import type { InstanceDto } from "@/lib/types";

const ACTIONS = [
  { key: "start", label: "Start", icon: Play },
  { key: "stop", label: "Stop", icon: Square },
  { key: "reboot", label: "Reboot", icon: RotateCcw },
  { key: "delete", label: "Delete", icon: Trash2 },
] as const;

type ActionKey = (typeof ACTIONS)[number]["key"];
const TRANSITION_STATUSES: InstanceStatus[] = [
  InstanceStatus.CREATING,
  InstanceStatus.STARTING,
  InstanceStatus.STOPPING,
  InstanceStatus.TERMINATING,
];

function isActionAllowed(status: InstanceStatus, action: ActionKey) {
  if (TRANSITION_STATUSES.includes(status)) {
    return false;
  }

  if (status === InstanceStatus.RUNNING) {
    return ["stop", "reboot", "delete"].includes(action);
  }

  if (status === InstanceStatus.STOPPED) {
    return ["start", "delete"].includes(action);
  }

  if (status === InstanceStatus.ERROR) {
    return action === "delete";
  }

  return false;
}

function isEditAllowed(status: InstanceStatus) {
  return !TRANSITION_STATUSES.includes(status);
}

export default function InstancesPage() {
  const [instances, setInstances] = useState<InstanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load(false);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  async function load(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      const data = await apiFetch<InstanceDto[]>("/api/v1/instances");

      const pendingDeletes = pendingDeleteIdsRef.current;
      if (pendingDeletes.size) {
        for (const pendingId of [...pendingDeletes]) {
          if (!data.some((instance) => instance.id === pendingId)) {
            pendingDeletes.delete(pendingId);
            toast.success("Instance deleted");
          }
        }
      }

      setInstances(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load instances");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function runAction(instanceId: string, action: ActionKey) {
    try {
      setBusyId(instanceId);
      await apiFetch(`/api/v1/instances/${instanceId}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });

      if (action === "delete") {
        pendingDeleteIdsRef.current.add(instanceId);
      }

      await load(false);
      toast.success("Action queued");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const telemetryRows = useMemo(
    () =>
      instances.map((instance) => ({
        id: instance.id,
        name: instance.name,
        status: instance.status,
        ...buildInstanceTelemetry(instance.id, instance.status),
      })),
    [instances],
  );

  return (
    <div>
      <PageHeader
        title="Instances"
        description="Manage VM lifecycle and transition states"
        right={
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/instances/new">
                <Plus className="mr-2 h-4 w-4" />
                New Instance
              </Link>
            </Button>
            <LogoutButton />
          </div>
        }
      />

      {!loading && telemetryRows.length > 0 ? (
        <div className="mb-6">
          <InstanceResourceGrid
            title="Instance Resource Monitor"
            description="CPU/RAM/Disk context per VM for faster lifecycle decisions."
            items={telemetryRows}
            isMockTelemetry
          />
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Tenant Instances</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
              ))}
            </div>
          ) : instances.length === 0 ? (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-4 py-3">
              <p className="text-sm text-[--ink-2]">No instances yet. Create your first VM.</p>
              <Button asChild size="sm">
                <Link href="/instances/new">Create VM</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[--line] text-left text-xs font-semibold uppercase tracking-[0.12em] text-[--ink-3]">
                    <th className="px-3 py-3.5">Name</th>
                    <th className="px-3 py-3.5">Status</th>
                    <th className="px-3 py-3.5">Flavor</th>
                    <th className="px-3 py-3.5">IP Addresses</th>
                    <th className="px-3 py-3.5">Network</th>
                    <th className="px-3 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => {
                    const logicalIp = deriveLogicalIpv4(instance.network.cidr, instance.id) ?? "n/a";
                    return (
                      <tr
                        key={instance.id}
                        className="border-b border-[--line] transition-colors hover:bg-[--surface-2]/60 last:border-none"
                      >
                        <td className="px-3 py-4 font-medium text-[--ink-1]">{instance.name}</td>
                        <td className="px-3 py-4">
                          <InstanceStatusBadge status={instance.status} />
                        </td>
                        <td className="px-3 py-4 text-[--ink-2]">{instance.flavor.name}</td>
                        <td className="px-3 py-4">
                          <div className="space-y-0.5">
                            <p className="font-mono text-xs text-[--ink-2]">Logical: {logicalIp}</p>
                            <p className="font-mono text-xs text-[--ink-3]">Runtime: {instance.ipv4 ?? "not assigned yet"}</p>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-[--ink-2]">{instance.network.name}</td>
                        <td className="px-3 py-4">
                          <div className="flex min-w-[17rem] flex-wrap gap-2">
                            {isEditAllowed(instance.status) ? (
                              <Button asChild size="sm" variant="secondary">
                                <Link href={`/instances/${instance.id}/edit`}>
                                  <Pencil className="mr-1 h-3.5 w-3.5" />
                                  Edit
                                </Link>
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" disabled>
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit
                              </Button>
                            )}
                            {ACTIONS.map((action) => (
                              <Button
                                key={action.key}
                                variant={action.key === "delete" ? "destructive" : "secondary"}
                                size="sm"
                                disabled={busyId === instance.id || !isActionAllowed(instance.status, action.key)}
                                onClick={() => runAction(instance.id, action.key)}
                              >
                                <action.icon className="mr-1 h-3.5 w-3.5" />
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
