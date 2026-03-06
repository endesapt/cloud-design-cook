"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { AuthMe, TenantSummaryDto, UserDto } from "@/lib/types";

type Role = "global_admin" | "support_viewer" | "tenant_admin" | "tenant_user";
type RowDraft = { fullName: string; role: Role; tenantId: string | null };

function roleNeedsTenant(role: Role) {
  return role === "tenant_admin" || role === "tenant_user";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [tenants, setTenants] = useState<TenantSummaryDto[]>([]);
  const [me, setMe] = useState<AuthMe | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [filterTenantId, setFilterTenantId] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  const [email, setEmail] = useState("new.user@cloud.local");
  const [fullName, setFullName] = useState("New User");
  const [role, setRole] = useState<Role>("tenant_user");
  const [tenantId, setTenantId] = useState("");
  const [password, setPassword] = useState("ChangeMe123!");

  const canManage = me?.role === "global_admin";

  const tenantOptions = useMemo(
    () => tenants.filter((tenant) => tenant.status !== "DELETING"),
    [tenants],
  );

  const load = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const params = new URLSearchParams();
      if (filterTenantId) params.set("tenantId", filterTenantId);
      if (filterRole) params.set("role", filterRole);
      if (filterQuery) params.set("q", filterQuery);
      const suffix = params.toString() ? `?${params.toString()}` : "";

      const [usersData, tenantsData, meData] = await Promise.all([
        apiFetch<UserDto[]>(`/api/v1/admin/users${suffix}`),
        apiFetch<TenantSummaryDto[]>("/api/v1/admin/tenants"),
        apiFetch<AuthMe>("/api/v1/auth/me"),
      ]);
      setUsers(usersData);
      setTenants(tenantsData);
      setMe(meData);
      setDrafts(
        Object.fromEntries(
          usersData.map((user) => [
            user.id,
            {
              fullName: user.fullName,
              role: user.role as Role,
              tenantId: user.tenantId,
            },
          ]),
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load users");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [filterQuery, filterRole, filterTenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;

    try {
      setCreating(true);
      await apiFetch("/api/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          fullName,
          role,
          password,
          tenantId: roleNeedsTenant(role) ? tenantId || null : null,
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
      await apiFetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: draft.fullName,
          role: draft.role,
          tenantId: roleNeedsTenant(draft.role) ? draft.tenantId : null,
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
      await apiFetch(`/api/v1/admin/users/${userId}/reset-password`, {
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
      await apiFetch(`/api/v1/admin/users/${userId}`, { method: "DELETE" });
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
      <PageHeader title="Users" description="Global identity and role management" right={<LogoutButton />} />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_12rem_12rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void load();
            }}
          >
            <Input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder="Search by email/name" />
            <select
              value={filterTenantId}
              onChange={(event) => setFilterTenantId(event.target.value)}
              className="h-10 rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1]"
            >
              <option value="">All tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <select
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
              className="h-10 rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1]"
            >
              <option value="">All roles</option>
              <option value="global_admin">global_admin</option>
              <option value="support_viewer">support_viewer</option>
              <option value="tenant_admin">tenant_admin</option>
              <option value="tenant_user">tenant_user</option>
            </select>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-4">
          <CardTitle>Create User</CardTitle>
          <CardDescription>Create cloud or tenant users with direct password setup.</CardDescription>
        </CardHeader>
        <CardContent>
          {!canManage ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              You have read-only access.
            </p>
          ) : (
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_12rem_12rem_12rem_auto]" onSubmit={onCreate}>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" />
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="h-10 rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1]"
              >
                <option value="global_admin">global_admin</option>
                <option value="support_viewer">support_viewer</option>
                <option value="tenant_admin">tenant_admin</option>
                <option value="tenant_user">tenant_user</option>
              </select>
              <select
                value={tenantId}
                disabled={!roleNeedsTenant(role)}
                onChange={(event) => setTenantId(event.target.value)}
                className="h-10 rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1] disabled:bg-[--surface-2]"
              >
                <option value="">No tenant</option>
                {tenantOptions.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
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
          <CardTitle>Users</CardTitle>
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
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr_12rem_12rem_auto] md:items-center">
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
                        value={draft?.role ?? user.role}
                        disabled={!canManage}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...current[user.id],
                              role: event.target.value as Role,
                              tenantId: roleNeedsTenant(event.target.value as Role) ? current[user.id]?.tenantId ?? null : null,
                            },
                          }))
                        }
                        className="h-10 rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1] disabled:bg-[--surface-2]"
                      >
                        <option value="global_admin">global_admin</option>
                        <option value="support_viewer">support_viewer</option>
                        <option value="tenant_admin">tenant_admin</option>
                        <option value="tenant_user">tenant_user</option>
                      </select>
                      <select
                        value={draft?.tenantId ?? ""}
                        disabled={!canManage || !roleNeedsTenant((draft?.role ?? user.role) as Role)}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...current[user.id],
                              tenantId: event.target.value || null,
                            },
                          }))
                        }
                        className="h-10 rounded-xl border border-[--line] bg-[--surface-2] px-3 text-sm text-[--ink-1] disabled:bg-[--surface-2]"
                      >
                        <option value="">No tenant</option>
                        {tenantOptions.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
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
