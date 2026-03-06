"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { apiFetch } from "@/lib/client/api";
import type { FlavorDto, NetworkDto, SecurityGroupDto } from "@/lib/types";

export default function NewInstancePage() {
  const router = useRouter();
  const [name, setName] = useState("vm-core-1");
  const [flavorId, setFlavorId] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [securityGroupIds, setSecurityGroupIds] = useState<string[]>([]);
  const [flavors, setFlavors] = useState<FlavorDto[]>([]);
  const [networks, setNetworks] = useState<NetworkDto[]>([]);
  const [groups, setGroups] = useState<SecurityGroupDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const selectClassName =
    "h-10 w-full rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1] shadow-sm outline-none transition focus:border-[--brand-red] focus:ring-2 focus:ring-[--brand-red-soft]";

  useEffect(() => {
    void loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const [flavorList, networkList, groupList] = await Promise.all([
        apiFetch<FlavorDto[]>("/api/v1/flavors"),
        apiFetch<NetworkDto[]>("/api/v1/networks"),
        apiFetch<SecurityGroupDto[]>("/api/v1/security-groups"),
      ]);

      setFlavors(flavorList);
      setNetworks(networkList);
      setGroups(groupList);

      if (flavorList[0]) setFlavorId(flavorList[0].id);
      if (networkList[0]) setNetworkId(networkList[0].id);
      if (groupList[0]) setSecurityGroupIds([groupList[0].id]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load options");
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!flavorId || !networkId || securityGroupIds.length === 0) {
      toast.error("Please select flavor, network and at least one security group");
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch("/api/v1/instances", {
        method: "POST",
        body: JSON.stringify({ name, flavorId, networkId, securityGroupIds }),
      });
      toast.success("Instance creation queued");
      router.replace("/instances");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create instance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Create Instance" description="Provision a new mock VM with tenant network policy" right={<LogoutButton />} />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Provision VM</CardTitle>
          <CardDescription>Quota and ownership checks are enforced server-side.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--ink-2]" htmlFor="name">
                Instance Name
              </label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[--ink-2]" htmlFor="flavor">
                  Flavor
                </label>
                <select
                  id="flavor"
                  className={selectClassName}
                  value={flavorId}
                  onChange={(e) => setFlavorId(e.target.value)}
                >
                  {flavors.map((flavor) => (
                    <option key={flavor.id} value={flavor.id}>
                      {flavor.name} · {flavor.vcpus} vCPU · {flavor.ramMb} MB RAM · {flavor.diskGb} GB
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[--ink-2]" htmlFor="network">
                  Network
                </label>
                <select
                  id="network"
                  className={selectClassName}
                  value={networkId}
                  onChange={(e) => setNetworkId(e.target.value)}
                >
                  {networks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name} ({network.cidr})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[--ink-2]">Security Groups</p>
              <div className="grid gap-2">
                {groups.map((group) => {
                  const checked = securityGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 rounded-lg border border-[--line] bg-[--surface-2] px-3 py-2 transition-colors hover:border-[--line-strong]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSecurityGroupIds((current) => {
                            if (e.target.checked) return [...current, group.id];
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

            <Button className="min-w-48" disabled={submitting} type="submit">
              {submitting ? "Creating..." : "Create Instance"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
