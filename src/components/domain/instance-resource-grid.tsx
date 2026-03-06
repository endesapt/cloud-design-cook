"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { quotaMeta } from "@/lib/ui/resource-telemetry";
import { statusColorForInstanceStatus } from "@/lib/ui/instance-status-colors";

type InstanceResourceItem = {
  id: string;
  name: string;
  status: string;
  cpuPct: number;
  ramPct: number;
  diskPct: number;
  cpuTrend: number[];
};

type InstanceResourceGridProps = {
  title: string;
  description: string;
  items: InstanceResourceItem[];
  isMockTelemetry?: boolean;
};

export function InstanceResourceGrid({
  title,
  description,
  items,
  isMockTelemetry = false,
}: InstanceResourceGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-[--line-strong]">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[--ink-1]">{item.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-[--ink-3]">status: {item.status}</p>
                </div>
                <span
                  className="mt-1 inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: statusColorForInstanceStatus(item.status) }}
                />
              </div>

              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={item.cpuTrend.map((cpu, index) => ({ index, cpu }))}>
                    <Area type="monotone" dataKey="cpu" stroke="#f59e0b" fill="#f59e0b33" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {[
                { label: "CPU", value: item.cpuPct },
                { label: "RAM", value: item.ramPct },
                { label: "Disk", value: item.diskPct },
              ].map((resource) => {
                const meta = quotaMeta(resource.value);
                return (
                  <div key={resource.label} className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-[--ink-2]">{resource.label}</span>
                      <span className="font-semibold text-[--ink-1]">
                        {resource.value}% {meta.label}
                      </span>
                    </div>
                    <Progress value={resource.value} tone={meta.tone} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {isMockTelemetry ? (
          <p className="mt-3 rounded-lg border border-dashed border-[--line] bg-[--surface-1] px-2.5 py-2 text-xs text-[--ink-3]">
            Resource telemetry is deterministic demo mock.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
