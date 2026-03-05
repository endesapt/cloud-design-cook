"use client";

import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, BarChart, XAxis, YAxis, Bar, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { statusColorForInstanceStatus } from "@/lib/ui/instance-status-colors";

export function StatusPie({ data }: { data: Array<{ name: string; value: number }> }) {
  const nonZeroData = data.filter((item) => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instance Status Distribution</CardTitle>
        <CardDescription>Live mix of lifecycle states across all tenants.</CardDescription>
      </CardHeader>
      <CardContent>
        {nonZeroData.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
            No instances to visualize yet.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={nonZeroData} dataKey="value" nameKey="name" outerRadius={95} innerRadius={50}>
                    {nonZeroData.map((entry) => (
                      <Cell key={entry.name} fill={statusColorForInstanceStatus(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#d8dfe8", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg border border-[--line] bg-[--surface-2] px-2.5 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 text-[--ink-2]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColorForInstanceStatus(item.name) }} />
                    {item.name}
                  </span>
                  <span className="font-semibold text-[--ink-1]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FlavorBar({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flavor Usage</CardTitle>
        <CardDescription>Most requested VM profiles by current instances.</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8dfe8" />
            <XAxis dataKey="name" tick={{ fill: "#374151", fontSize: 12 }} />
            <YAxis tick={{ fill: "#374151", fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#d8dfe8", fontSize: 12 }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
