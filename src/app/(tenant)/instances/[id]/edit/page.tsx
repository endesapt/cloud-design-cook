"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InstanceStatus } from "@prisma/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { InstanceStatusBadge } from "@/components/domain/instance-status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { FlavorDto, InstanceDto, SecurityGroupDto } from "@/lib/types";

export default function EditInstancePage() {
  const params = useParams<{ id: string }>();
  const instanceId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [instance, setInstance] = useState<InstanceDto | null>(null);
  const [flavors, setFlavors] = useState<FlavorDto[]>([]);
  const [securityGroups, setSecurityGroups] = useState<SecurityGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [flavorId, setFlavorId] = useState("");
  const [securityGroupIds, setSecurityGroupIds] = useState<string[]>([]);

  const canResize = instance?.status === InstanceStatus.STOPPED;

  const load = useCallback(async () => {
    if (!instanceId) return;
    try {
      setLoading(true);
      const [instanceData, flavorList, groupList] = await Promise.all([
        apiFetch<InstanceDto>(`/api/v1/instances/${instanceId}`),
        apiFetch<FlavorDto[]>("/api/v1/flavors"),
        apiFetch<SecurityGroupDto[]>("/api/v1/security-groups"),
      ]);

      setInstance(instanceData);
      setFlavors(flavorList);
      setSecurityGroups(groupList);
      setName(instanceData.name);
      setFlavorId(instanceData.flavor.id);
      setSecurityGroupIds(instanceData.securityGroups.map((item) => item.securityGroup.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load instance");
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!instance) return;

    if (!securityGroupIds.length) {
      toast.error("Attach at least one security group");
      return;
    }

    const payload: { name?: string; flavorId?: string; securityGroupIds?: string[] } = {};

    if (name !== instance.name) {
      payload.name = name;
    }

    if (canResize && flavorId !== instance.flavor.id) {
      payload.flavorId = flavorId;
    }

    const originalSg = instance.securityGroups.map((item) => item.securityGroup.id).sort().join(",");
    const currentSg = [...securityGroupIds].sort().join(",");
    if (originalSg !== currentSg) {
      payload.securityGroupIds = securityGroupIds;
    }

    if (!payload.name && !payload.flavorId && !payload.securityGroupIds) {
      toast.message("No changes to save");
      return;
    }

    try {
      setSaving(true);
      await apiFetch(`/api/v1/instances/${instance.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast.success("Instance updated");
      router.replace("/instances");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update instance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Edit Instance"
        description="Update name, flavor, and security groups"
        right={
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/instances">Back to Instances</Link>
            </Button>
            <LogoutButton />
          </div>
        }
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
      ) : !instance ? (
        <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
          Instance not found.
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              {instance.name}
              <InstanceStatusBadge status={instance.status} />
            </CardTitle>
            <CardDescription>
              Network is immutable after creation ({instance.network.name} / {instance.network.cidr}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--ink-2]">Instance Name</label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--ink-2]">Flavor</label>
                <select
                  value={flavorId}
                  disabled={!canResize}
                  onChange={(event) => setFlavorId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[--line] bg-white px-3 text-sm text-[--ink-1] disabled:bg-[--surface-2] disabled:text-[--ink-3]"
                >
                  {flavors.map((flavor) => (
                    <option key={flavor.id} value={flavor.id}>
                      {flavor.name} · {flavor.vcpus} vCPU · {flavor.ramMb} MB RAM · {flavor.diskGb} GB
                    </option>
                  ))}
                </select>
                {!canResize ? (
                  <p className="text-xs text-[--ink-3]">
                    Flavor resize is available only in <span className="font-semibold">STOPPED</span> state.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[--ink-2]">Security Groups</p>
                <div className="grid gap-2">
                  {securityGroups.map((group) => {
                    const checked = securityGroupIds.includes(group.id);
                    return (
                      <label
                        key={group.id}
                        className="flex items-center gap-2 rounded-lg border border-[--line] bg-[--surface-2] px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setSecurityGroupIds((current) => {
                              if (event.target.checked) return [...current, group.id];
                              return current.filter((id) => id !== group.id);
                            });
                          }}
                        />
                        <span className="text-sm text-[--ink-1]">{group.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
