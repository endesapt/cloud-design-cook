"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { SupportTenantTabs } from "@/components/domain/support-tenant-tabs";
import { LogoutButton } from "@/components/domain/logout-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { AuthMe, UserDto } from "@/lib/types";

type EditableRow = {
  fullName: string;
  role: "tenant_admin" | "tenant_user";
};

export default function SupportTenantUsersPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = Array.isArray(params.tenantId) ? params.tenantId[0] : params.tenantId;

  const [me, setMe] = useState<AuthMe | null>(null);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EditableRow>>({});

  const [email, setEmail] = useState("support-created@tenant.local");
  const [fullName, setFullName] = useState("Support Created User");
  const [role, setRole] = useState<"tenant_admin" | "tenant_user">("tenant_user");
  const [password, setPassword] = useState("ChangeMe123!");

  const canManage = me?.role === "global_admin";

  const load = useCallback(async (showLoader = true) => {
    if (!tenantId) return;
    try {
      if (showLoader) setLoading(true);
      const [meData, usersData] = await Promise.all([
        apiFetch<AuthMe>("/api/v1/auth/me"),
        apiFetch<UserDto[]>(`/api/v1/users?tenantId=${tenantId}`),
      ]);
      setMe(meData);
      setUsers(usersData);
      setDrafts(
        Object.fromEntries(
          usersData.map((user) => [
            user.id,
            {
              fullName: user.fullName,
              role: user.role === "tenant_admin" ? "tenant_admin" : "tenant_user",
            },
          ]),
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tenant users");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    try {
      setCreating(true);
      await apiFetch(`/api/v1/users?tenantId=${tenantId}`, {
        method: "POST",
        body: JSON.stringify({
          email,
          fullName,
          role,
          password,
          tenantId,
        }),
      });
      toast.success("User created");
      await load(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function saveUser(userId: string) {
    if (!canManage) return;
    const draft = drafts[userId];
    if (!draft) return;
    try {
      setBusyUserId(userId);
      await apiFetch(`/api/v1/users/${userId}?tenantId=${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: draft.fullName,
          role: draft.role,
          tenantId,
        }),
      });
      toast.success("User updated");
      await load(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setBusyUserId(null);
    }
  }

  async function resetPassword(userId: string, emailValue: string) {
    if (!canManage) return;
    const nextPassword = window.prompt(`Set new password for ${emailValue}`, "ChangeMe123!");
    if (!nextPassword) return;

    try {
      setBusyUserId(userId);
      await apiFetch(`/api/v1/users/${userId}/reset-password?tenantId=${tenantId}`, {
        method: "POST",
        body: JSON.stringify({ password: nextPassword }),
      });
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setBusyUserId(null);
    }
  }

  async function deleteUser(userId: string, emailValue: string) {
    if (!canManage) return;
    const confirmed = window.confirm(`Delete user ${emailValue}?`);
    if (!confirmed) return;
    try {
      setBusyUserId(userId);
      await apiFetch(`/api/v1/users/${userId}?tenantId=${tenantId}`, {
        method: "DELETE",
      });
      toast.success("User deleted");
      await load(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Support: Tenant Users"
        description={canManage ? "Manage tenant users in support context" : "Read-only tenant user directory"}
        right={<LogoutButton />}
      />
      <SupportTenantTabs tenantId={tenantId} />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Create User</CardTitle>
          <CardDescription>Tenant-scoped user management from support console.</CardDescription>
        </CardHeader>
        <CardContent>
          {!canManage ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              You have read-only access.
            </p>
          ) : (
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_10rem_12rem_auto]" onSubmit={onCreate}>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" />
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as "tenant_admin" | "tenant_user")}
                className="h-10 rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1]"
              >
                <option value="tenant_user">tenant_user</option>
                <option value="tenant_admin">tenant_admin</option>
              </select>
              <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-4">
          <CardTitle>Tenant Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              No users found.
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => {
                const draft = drafts[user.id];
                return (
                  <div key={user.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3">
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr_10rem_auto] md:items-center">
                      <div>
                        <p className="font-medium text-[--ink-1]">{user.email}</p>
                        <p className="text-xs text-[--ink-3]">{new Date(user.createdAt).toLocaleString()}</p>
                      </div>
                      <Input
                        value={draft?.fullName ?? ""}
                        disabled={!canManage}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...current[user.id],
                              fullName: event.target.value,
                            },
                          }))
                        }
                      />
                      <select
                        value={draft?.role ?? "tenant_user"}
                        disabled={!canManage}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...current[user.id],
                              role: event.target.value as EditableRow["role"],
                            },
                          }))
                        }
                        className="h-10 rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1] disabled:bg-[--surface-2]"
                      >
                        <option value="tenant_user">tenant_user</option>
                        <option value="tenant_admin">tenant_admin</option>
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" disabled={!canManage || busyUserId === user.id} onClick={() => saveUser(user.id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!canManage || busyUserId === user.id}
                          onClick={() => resetPassword(user.id, user.email)}
                        >
                          Reset Password
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!canManage || busyUserId === user.id}
                          onClick={() => deleteUser(user.id, user.email)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
