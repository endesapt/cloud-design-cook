"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { AuthMe } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@alpha.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const data = await apiFetch<{ user: AuthMe }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (data.user.role === "global_admin") {
        router.replace("/admin/overview");
      } else {
        router.replace("/dashboard");
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,#fff1f2,#ffffff,#fff7ed,#fff1f2)] opacity-60" />
      <Card className="relative z-10 w-full max-w-md border-none shadow-2xl shadow-red-100/70">
        <CardHeader>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[--brand-red]">Cloud Console</p>
          <CardTitle className="text-3xl">Sign In</CardTitle>
          <CardDescription>Use seeded users to enter tenant or admin portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-[--ink-2]">
                Email
              </label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-[--ink-2]">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Login"}
            </Button>
          </form>
          <div className="mt-5 rounded-xl border border-dashed border-[--line] bg-[--surface-2] p-3 text-xs text-[--ink-2]">
            Seed creds:
            <div className="mt-1 font-mono">owner@alpha.local / ChangeMe123!</div>
            <div className="font-mono">admin@cloud.local / ChangeMe123!</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
