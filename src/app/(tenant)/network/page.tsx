"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { NetworkDto, SecurityGroupDto } from "@/lib/types";

export default function NetworkPage() {
  const [networks, setNetworks] = useState<NetworkDto[]>([]);
  const [groups, setGroups] = useState<SecurityGroupDto[]>([]);
  const [networkName, setNetworkName] = useState("tenant-vpc");
  const [networkCidr, setNetworkCidr] = useState("10.20.0.0/24");
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

  return (
    <div>
      <PageHeader title="Networks" description="Manage tenant VPC networks and segment boundaries" right={<LogoutButton />} />

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
            <CardDescription>Manage group metadata and rule sets on dedicated pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[--line] bg-[--surface-2] p-3.5">
              <p className="text-sm font-medium text-[--ink-1]">Total groups: {groups.length}</p>
              <p className="mt-1 text-xs text-[--ink-2]">
                Rules are edited in a focused manager with duplicate protection and validation.
              </p>
            </div>
            <Button asChild className="w-full" size="lg">
              <Link href="/network/security-groups">Open Security Group Manager</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
