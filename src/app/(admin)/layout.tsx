import { redirect } from "next/navigation";
import { NavShell } from "@/components/layout/nav-shell";
import { getSessionUserFromCookies } from "@/lib/auth/session";

const items = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/tenants", label: "Tenants" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "global_admin") {
    redirect("/dashboard");
  }

  return (
    <NavShell title="Admin Console" subtitle={session.fullName} items={items}>
      {children}
    </NavShell>
  );
}
