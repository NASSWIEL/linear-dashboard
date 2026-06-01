"use client";

import type { MetricFilter, Metrics } from "@/lib/types";

interface Kpi {
  label: string;
  value: number | string;
  hint?: string;
  accent: string;
  ring: string;
  filter: MetricFilter;
}

export function KpiCards({
  metrics,
  activeFilter,
  onSelect,
}: {
  metrics: Metrics;
  activeFilter: MetricFilter;
  onSelect: (filter: MetricFilter) => void;
}) {
  const kpis: Kpi[] = [
    {
      label: "Total issues",
      value: metrics.total,
      hint: `${metrics.backlog} backlog · ${metrics.todo} todo`,
      accent: "text-zinc-100",
      ring: "ring-zinc-700/40",
      filter: "all",
    },
    {
      label: "In progress",
      value: metrics.inProgress,
      hint: "actively being worked",
      accent: "text-sky-300",
      ring: "ring-sky-500/30",
      filter: "in-progress",
    },
    {
      label: "Overdue",
      value: metrics.overdueCount,
      hint: metrics.overdueCount > 0 ? "needs attention" : "all on track",
      accent: metrics.overdueCount > 0 ? "text-red-400" : "text-emerald-400",
      ring: metrics.overdueCount > 0 ? "ring-red-500/30" : "ring-emerald-500/30",
      filter: "overdue",
    },
    {
      label: "Done",
      value: metrics.completed,
      hint: `${metrics.completionRate}% completion`,
      accent: "text-emerald-300",
      ring: "ring-emerald-500/30",
      filter: "done",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const active = activeFilter === kpi.filter && kpi.filter !== "all";
        return (
          <button
            key={kpi.label}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? "all" : kpi.filter)}
            className={`rounded-xl border bg-zinc-900/60 p-4 text-left ring-1 transition-colors ${
              active
                ? "border-sky-500/60 ring-sky-500/50"
                : `border-zinc-800 ${kpi.ring} hover:border-zinc-600`
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {kpi.label}
            </p>
            <p className={`mt-1 text-3xl font-semibold tabular-nums ${kpi.accent}`}>
              {kpi.value}
            </p>
            {kpi.hint && <p className="mt-1 text-xs text-zinc-500">{kpi.hint}</p>}
            {active && (
              <p className="mt-1 text-[10px] font-medium text-sky-400">
                Filtering board · click to clear
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
