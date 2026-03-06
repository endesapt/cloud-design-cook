"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { quotaMeta } from "@/lib/ui/resource-telemetry";

type ResourceItem = {
  key: "cpuPct" | "ramPct" | "diskPct";
  label: string;
  valuePct: number;
  detail: string;
};

type ResourceTrendPoint = {
  label: string;
  cpuPct: number;
  ramPct: number;
  diskPct: number;
};

type ResourceConsumptionPanelProps = {
  title: string;
  description: string;
  trendData: ResourceTrendPoint[];
  resources: ResourceItem[];
  isMockHistory?: boolean;
};

const lineConfig: Record<ResourceItem["key"], { label: string; color: string }> = {
  cpuPct: { label: "CPU", color: "#f59e0b" },
  ramPct: { label: "RAM", color: "#06b6d4" },
  diskPct: { label: "Disk", color: "#16a34a" },
};

export function ResourceConsumptionPanel({
  title,
  description,
  trendData,
  resources,
  isMockHistory = false,
}: ResourceConsumptionPanelProps) {
  return (
    <Card className="border-[--line-strong]">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="h-72 rounded-xl border border-[--line] bg-[--surface-2] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8dfe8" />
                <XAxis dataKey="label" tick={{ fill: "#4b5563", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: "#4b5563", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#d8dfe8", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {Object.entries(lineConfig).map(([key, config]) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={config.label}
                    stroke={config.color}
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {resources.map((resource) => {
              const meta = quotaMeta(resource.valuePct);
              return (
                <div key={resource.label} className="rounded-xl border border-[--line] bg-[--surface-2] px-3 py-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[--ink-1]">{resource.label}</p>
                    <p className="text-xs font-semibold text-[--ink-2]">{resource.valuePct}%</p>
                  </div>
                  <Progress value={resource.valuePct} tone={meta.tone} />
                  <p className="mt-1.5 text-xs text-[--ink-2]">{resource.detail}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[--ink-3]">State: {meta.label}</p>
                </div>
              );
            })}

            {isMockHistory ? (
              <p className="rounded-lg border border-dashed border-[--line] bg-[--surface-1] px-2.5 py-2 text-xs text-[--ink-3]">
                Trend history is deterministic demo mock shaped by current usage.
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
