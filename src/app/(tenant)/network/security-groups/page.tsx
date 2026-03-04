"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { SecurityGroupDto } from "@/lib/types";

export default function SecurityGroupsPage() {
  const [groups, setGroups] = useState<SecurityGroupDto[]>([]);
  const [name, setName] = useState("app-sg");
  const [description, setDescription] = useState("Application tier access rules");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void loadGroups();
  }, []);

  async function loadGroups(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      const data = await apiFetch<SecurityGroupDto[]>("/api/v1/security-groups");
      setGroups(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load security groups");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      setCreating(true);
      await apiFetch("/api/v1/security-groups", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description.trim() || undefined,
        }),
      });
      toast.success("Security group created");
      setName("");
      setDescription("");
      await loadGroups(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create security group");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Security Groups"
        description="Manage group metadata and rule sets"
        right={
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/network">Back to Networks</Link>
            </Button>
            <LogoutButton />
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Create Security Group</CardTitle>
          <CardDescription>Use dedicated detail pages to maintain group rules without duplicates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={onCreate}>
            <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button disabled={creating} type="submit">
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Creating..." : "Create Group"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-4">
          <CardTitle>Existing Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              No security groups yet.
            </p>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-xl border border-[--line] bg-[--surface-2] p-3.5"
                >
                  <div>
                    <p className="font-medium text-[--ink-1]">{group.name}</p>
                    <p className="text-xs text-[--ink-2]">{group.description ?? "No description"}</p>
                    <p className="text-xs text-[--ink-3]">{group.rules.length} rules</p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/network/security-groups/${group.id}`}>Manage</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
