"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  href: string;
  label: string;
};

export function NavShell({
  title,
  subtitle,
  items,
  children,
}: {
  title: string;
  subtitle: string;
  items: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeHref =
    items
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#1e293b,transparent_38%),linear-gradient(180deg,#020617,#0b1120)]">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-72 rounded-2xl border border-[--line-strong] bg-[--surface-1]/95 p-5 shadow-[0_14px_40px_rgba(2,6,23,0.45)] backdrop-blur md:block">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[--brand-red]">MTS Cloud Concept</p>
            <h1 className="mt-2 text-2xl font-bold text-[--ink-1]">{title}</h1>
            <p className="mt-1 text-sm text-[--ink-2]">{subtitle}</p>
          </div>
          <nav className="space-y-1.5">
            {items.map((item) => {
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3.5 py-2.5 text-sm font-semibold transition",
                    active
                      ? "bg-[--brand-red] text-[--on-brand] shadow-[0_6px_16px_rgba(186,18,32,0.35)]"
                      : "text-[--ink-2] hover:bg-[--surface-2] hover:text-[--ink-1]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 rounded-xl border border-[--line] bg-[--surface-2] p-3 text-xs text-[--ink-2]">
            Provisioning runs in Docker mode with fallback lifecycle behavior.
          </div>
        </aside>
        <main className="min-w-0 flex-1 pt-1">{children}</main>
      </div>
    </div>
  );
}
