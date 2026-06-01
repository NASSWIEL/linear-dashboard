"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import type { StateColumn } from "@/lib/types";

export function StatusChart({
  columns,
  total,
}: {
  columns: StateColumn[];
  total: number;
}) {
  const data = columns.filter((c) => c.count > 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Status breakdown</h2>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">No data</p>
      ) : (
        <div className="mt-2 flex items-center gap-4">
          <div className="relative h-36 w-36 shrink-0">
            <PieChart width={144} height={144}>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={68}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e4e4e7",
                }}
                itemStyle={{ color: "#e4e4e7" }}
              />
            </PieChart>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums text-zinc-100">
                {total}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                issues
              </span>
            </div>
          </div>

          <ul className="flex-1 space-y-1.5">
            {data.map((entry) => (
              <li
                key={entry.name}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex items-center gap-2 text-zinc-300">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}
                </span>
                <span className="tabular-nums text-zinc-500">{entry.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
