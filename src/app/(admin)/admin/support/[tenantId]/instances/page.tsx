"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { InstanceStatus } from "@prisma/client";
import { toast } from "sonner";
import { SupportTenantTabs } from "@/components/domain/support-tenant-tabs";
import { InstanceStatusBadge } from "@/components/domain/instance-status-badge";
import { LogoutButton } from "@/components/domain/logout-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { AuthMe, InstanceDto } from "@/lib/types";

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
  if (TRANSITION_STATUSES.includes(status)) return false;
  if (status === InstanceStatus.RUNNING) return ["stop", "reboot", "delete"].includes(action);
  if (status === InstanceStatus.STOPPED) return ["start", "delete"].includes(action);
  if (status === InstanceStatus.ERROR) return action === "delete";
  return false;
}

export default function SupportTenantInstancesPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = Array.isArray(params.tenantId) ? params.tenantId[0] : params.tenantId;

  const [me, setMe] = useState<AuthMe | null>(null);
  const [instances, setInstances] = useState<InstanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canMutate = me?.role === "global_admin";

  const load = useCallback(async (showLoader = true) => {
    if (!tenantId) return;
    try {
      if (showLoader) setLoading(true);
      const [meData, items] = await Promise.all([
        apiFetch<AuthMe>("/api/v1/auth/me"),
        apiFetch<InstanceDto[]>(`/api/v1/instances?tenantId=${tenantId}`),
      ]);
      setMe(meData);
      setInstances(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tenant instances");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load(false);
    }, 2000);
    return () => clearInterval(timer);
  }, [load]);

  async function runAction(instanceId: string, action: ActionKey) {
    if (!canMutate) return;
    try {
      setBusyId(instanceId);
      await apiFetch(`/api/v1/instances/${instanceId}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      toast.success("Action queued");
      await load(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to execute action");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Support: Tenant Instances"
        description={canMutate ? "Manage lifecycle actions in tenant context" : "Read-only lifecycle visibility"}
        right={<LogoutButton />}
      />
      <SupportTenantTabs tenantId={tenantId} />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Instances</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
              ))}
            </div>
          ) : instances.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              No instances found for tenant.
            </p>
          ) : (
            <div className="space-y-2">
              {instances.map((instance) => (
                <div key={instance.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_10rem_1fr_auto] md:items-center">
                    <div>
                      <p className="font-medium text-[--ink-1]">{instance.name}</p>
                      <p className="text-xs text-[--ink-3]">{instance.network.name}</p>
                    </div>
                    <InstanceStatusBadge status={instance.status} />
                    <p className="font-mono text-xs text-[--ink-2]">{instance.ipv4 ?? "not assigned"}</p>
                    <div className="flex flex-wrap gap-2">
                      {ACTIONS.map((action) => (
                        <Button
                          key={action.key}
                          size="sm"
                          variant={action.key === "delete" ? "destructive" : "secondary"}
                          disabled={!canMutate || busyId === instance.id || !isActionAllowed(instance.status, action.key)}
                          onClick={() => runAction(instance.id, action.key)}
                        >
                          <action.icon className="mr-1 h-3.5 w-3.5" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
