"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { NetworkDto, SecurityGroupDto, SecurityGroupRuleDto } from "@/lib/types";

export default function NetworkPage() {
  const [networks, setNetworks] = useState<NetworkDto[]>([]);
  const [groups, setGroups] = useState<SecurityGroupDto[]>([]);
  const [networkName, setNetworkName] = useState("tenant-vpc");
  const [networkCidr, setNetworkCidr] = useState("10.20.0.0/24");
  const [groupName, setGroupName] = useState("web-access");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const [n, g] = await Promise.all([
        apiFetch<NetworkDto[]>("/api/v1/networks"),
        apiFetch<SecurityGroupDto[]>("/api/v1/security-groups"),
      ]);
      setNetworks(n);
      setGroups(g);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load network resources");
    } finally {
      setLoading(false);
    }
  }

  async function createNetwork(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch("/api/v1/networks", {
        method: "POST",
        body: JSON.stringify({ name: networkName, cidr: networkCidr }),
      });
      toast.success("Network created");
      setNetworkName("");
      setNetworkCidr("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create network");
    }
  }

  async function createSecurityGroup(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch("/api/v1/security-groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName, description: "Tenant managed SG" }),
      });
      toast.success("Security group created");
      setGroupName("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create security group");
    }
  }

  async function addQuickRule(groupId: string, rule: SecurityGroupRuleDto) {
    try {
      await apiFetch(`/api/v1/security-groups/${groupId}/rules`, {
        method: "POST",
        body: JSON.stringify(rule),
      });
      toast.success("Rule added");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add rule");
    }
  }

  return (
    <div>
      <PageHeader title="Networks & Security Groups" description="Logical VPC isolation and policy rules" right={<LogoutButton />} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Networks</CardTitle>
            <CardDescription>Create tenant-isolated virtual networks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-2 md:grid-cols-[1fr_1fr_auto]" onSubmit={createNetwork}>
              <Input placeholder="Name" value={networkName} onChange={(e) => setNetworkName(e.target.value)} />
              <Input placeholder="CIDR" value={networkCidr} onChange={(e) => setNetworkCidr(e.target.value)} />
              <Button type="submit">Create Network</Button>
            </form>

            <div className="space-y-2">
              {loading ? (
                <div className="h-20 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
              ) : networks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
                  No networks yet.
                </p>
              ) : (
                networks.map((network) => (
                  <div key={network.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3.5">
                    <p className="font-medium text-[--ink-1]">{network.name}</p>
                    <p className="font-mono text-xs text-[--ink-2]">{network.cidr}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Security Groups</CardTitle>
            <CardDescription>Attach inbound/outbound policy to instances.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={createSecurityGroup}>
              <Input placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              <Button type="submit">Create Group</Button>
            </form>

            <div className="space-y-3">
              {loading ? (
                <div className="h-20 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
              ) : groups.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
                  No security groups yet.
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.id} className="space-y-2 rounded-xl border border-[--line] bg-[--surface-2] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[--ink-1]">{group.name}</p>
                        <p className="text-xs text-[--ink-2]">{group.description ?? "No description"}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          addQuickRule(group.id, {
                            id: "",
                            direction: "ingress",
                            protocol: "tcp",
                            portFrom: 22,
                            portTo: 22,
                            cidr: "0.0.0.0/0",
                          })
                        }
                      >
                        Add SSH Rule
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {group.rules.length === 0 ? (
                        <p className="text-xs text-[--ink-2]">No rules.</p>
                      ) : (
                        group.rules.map((rule) => (
                          <p key={rule.id} className="font-mono text-xs font-medium text-[--ink-2]">
                            {rule.direction} {rule.protocol} {rule.portFrom ?? "*"}-{rule.portTo ?? "*"} {rule.cidr}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
