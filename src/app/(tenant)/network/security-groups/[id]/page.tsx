"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { SecurityGroupDto, SecurityGroupRuleDto } from "@/lib/types";

type RuleDraft = {
  direction: "ingress" | "egress";
  protocol: string;
  portFrom: string;
  portTo: string;
  cidr: string;
};

const EMPTY_RULE: RuleDraft = {
  direction: "ingress",
  protocol: "tcp",
  portFrom: "22",
  portTo: "22",
  cidr: "0.0.0.0/0",
};

function toRulePayload(draft: RuleDraft) {
  const parsePort = (value: string) => {
    if (value.trim() === "") return null;
    return Number.parseInt(value, 10);
  };

  return {
    direction: draft.direction,
    protocol: draft.protocol,
    portFrom: parsePort(draft.portFrom),
    portTo: parsePort(draft.portTo),
    cidr: draft.cidr,
  };
}

function ruleToDraft(rule: SecurityGroupRuleDto): RuleDraft {
  return {
    direction: rule.direction,
    protocol: rule.protocol,
    portFrom: rule.portFrom === null ? "" : String(rule.portFrom),
    portTo: rule.portTo === null ? "" : String(rule.portTo),
    cidr: rule.cidr,
  };
}

export default function SecurityGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [group, setGroup] = useState<SecurityGroupDto | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newRule, setNewRule] = useState<RuleDraft>(EMPTY_RULE);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRule, setEditRule] = useState<RuleDraft>(EMPTY_RULE);
  const [loading, setLoading] = useState(true);

  const loadGroup = useCallback(
    async (showLoader = true) => {
      if (!groupId) return;
      try {
        if (showLoader) setLoading(true);
        const data = await apiFetch<SecurityGroupDto>(`/api/v1/security-groups/${groupId}`);
        setGroup(data);
        setName(data.name);
        setDescription(data.description ?? "");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load security group");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [groupId],
  );

  useEffect(() => {
    if (!groupId) return;
    void loadGroup();
  }, [groupId, loadGroup]);

  async function updateGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupId) return;

    try {
      await apiFetch<SecurityGroupDto>(`/api/v1/security-groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          description: description.trim() || null,
        }),
      });
      toast.success("Security group updated");
      await loadGroup(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update security group");
    }
  }

  async function deleteGroup() {
    if (!groupId) return;
    const confirmed = window.confirm("Delete this security group?");
    if (!confirmed) return;

    try {
      await apiFetch(`/api/v1/security-groups/${groupId}`, { method: "DELETE" });
      toast.success("Security group deleted");
      router.replace("/network/security-groups");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete security group");
    }
  }

  async function createRule(event: FormEvent) {
    event.preventDefault();
    if (!groupId) return;

    try {
      await apiFetch(`/api/v1/security-groups/${groupId}/rules`, {
        method: "POST",
        body: JSON.stringify(toRulePayload(newRule)),
      });
      toast.success("Rule created");
      setNewRule(EMPTY_RULE);
      await loadGroup(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create rule");
    }
  }

  async function updateRule(event: FormEvent) {
    event.preventDefault();
    if (!groupId || !editingRuleId) return;

    try {
      await apiFetch(`/api/v1/security-groups/${groupId}/rules/${editingRuleId}`, {
        method: "PATCH",
        body: JSON.stringify(toRulePayload(editRule)),
      });
      toast.success("Rule updated");
      setEditingRuleId(null);
      await loadGroup(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update rule");
    }
  }

  async function deleteRule(ruleId: string) {
    if (!groupId) return;
    try {
      await apiFetch(`/api/v1/security-groups/${groupId}/rules/${ruleId}`, {
        method: "DELETE",
      });
      toast.success("Rule deleted");
      await loadGroup(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete rule");
    }
  }

  return (
    <div>
      <PageHeader
        title={group?.name ?? "Security Group"}
        description="Edit group metadata and lifecycle-safe rule set"
        right={
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/network/security-groups">Back to List</Link>
            </Button>
            <LogoutButton />
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
          <div className="h-56 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
        </div>
      ) : !group ? (
        <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
          Security group not found.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Group Settings</CardTitle>
              <CardDescription>Rename, document, or delete this security group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={updateGroup}>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
                <Button type="submit">Save</Button>
              </form>
              <Button variant="destructive" onClick={deleteGroup}>
                Delete Security Group
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="pb-4">
              <CardTitle>Rules</CardTitle>
              <CardDescription>Create, edit, and remove rules with duplicate protection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid gap-2 md:grid-cols-[9rem_8rem_7rem_7rem_1fr_auto]" onSubmit={createRule}>
                <select
                  className="h-10 rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1]"
                  value={newRule.direction}
                  onChange={(e) => setNewRule((prev) => ({ ...prev, direction: e.target.value as RuleDraft["direction"] }))}
                >
                  <option value="ingress">ingress</option>
                  <option value="egress">egress</option>
                </select>
                <Input value={newRule.protocol} onChange={(e) => setNewRule((prev) => ({ ...prev, protocol: e.target.value }))} />
                <Input value={newRule.portFrom} onChange={(e) => setNewRule((prev) => ({ ...prev, portFrom: e.target.value }))} />
                <Input value={newRule.portTo} onChange={(e) => setNewRule((prev) => ({ ...prev, portTo: e.target.value }))} />
                <Input value={newRule.cidr} onChange={(e) => setNewRule((prev) => ({ ...prev, cidr: e.target.value }))} />
                <Button type="submit">Add Rule</Button>
              </form>

              {group.rules.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
                  No rules yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {group.rules.map((rule) => {
                    const editing = editingRuleId === rule.id;
                    return (
                      <div key={rule.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3.5">
                        {editing ? (
                          <form className="grid gap-2 md:grid-cols-[9rem_8rem_7rem_7rem_1fr_auto_auto]" onSubmit={updateRule}>
                            <select
                              className="h-9 rounded-lg border border-[--line] bg-[--surface-2] px-2.5 text-xs text-[--ink-1]"
                              value={editRule.direction}
                              onChange={(e) =>
                                setEditRule((prev) => ({ ...prev, direction: e.target.value as RuleDraft["direction"] }))
                              }
                            >
                              <option value="ingress">ingress</option>
                              <option value="egress">egress</option>
                            </select>
                            <Input value={editRule.protocol} onChange={(e) => setEditRule((prev) => ({ ...prev, protocol: e.target.value }))} />
                            <Input value={editRule.portFrom} onChange={(e) => setEditRule((prev) => ({ ...prev, portFrom: e.target.value }))} />
                            <Input value={editRule.portTo} onChange={(e) => setEditRule((prev) => ({ ...prev, portTo: e.target.value }))} />
                            <Input value={editRule.cidr} onChange={(e) => setEditRule((prev) => ({ ...prev, cidr: e.target.value }))} />
                            <Button size="sm" type="submit">
                              Save
                            </Button>
                            <Button size="sm" type="button" variant="secondary" onClick={() => setEditingRuleId(null)}>
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-xs font-medium text-[--ink-2]">
                              {rule.direction} {rule.protocol} {rule.portFrom ?? "*"}-{rule.portTo ?? "*"} {rule.cidr}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingRuleId(rule.id);
                                  setEditRule(ruleToDraft(rule));
                                }}
                              >
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteRule(rule.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
