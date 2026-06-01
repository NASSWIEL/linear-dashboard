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
      hint: "all statuses",
      accent: "text-fg",
      ring: "ring-border/40",
      filter: "all",
    },
    {
      label: "Backlog",
      value: metrics.backlog,
      hint: "not started",
      accent: "text-muted",
      ring: "ring-border/40",
      filter: "backlog",
    },
    {
      label: "Todo",
      value: metrics.todo,
      hint: "ready to start",
      accent: "text-indigo-700 dark:text-indigo-300",
      ring: "ring-indigo-500/30",
      filter: "todo",
    },
    {
      label: "In progress",
      value: metrics.inProgress,
      hint: "actively being worked",
      accent: "text-sky-700 dark:text-sky-300",
      ring: "ring-sky-500/30",
      filter: "in-progress",
    },
    {
      label: "Overdue",
      value: metrics.overdueCount,
      hint: metrics.overdueCount > 0 ? "needs attention" : "all on track",
      accent: metrics.overdueCount > 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400",
      ring: metrics.overdueCount > 0 ? "ring-red-500/30" : "ring-emerald-500/30",
      filter: "overdue",
    },
    {
      label: "Done",
      value: metrics.completed,
      hint: `${metrics.completionRate}% completion`,
      accent: "text-emerald-700 dark:text-emerald-300",
      ring: "ring-emerald-500/30",
      filter: "done",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const active = activeFilter === kpi.filter && kpi.filter !== "all";
        return (
          <button
            key={kpi.label}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? "all" : kpi.filter)}
            className={`rounded-xl border bg-surface/60 p-4 text-left ring-1 transition-colors ${
              active
                ? "border-sky-500/60 ring-sky-500/50"
                : `border-border ${kpi.ring} hover:border-border`
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {kpi.label}
            </p>
            <p className={`mt-1 text-3xl font-semibold tabular-nums ${kpi.accent}`}>
              {kpi.value}
            </p>
            {kpi.hint && <p className="mt-1 text-xs text-muted">{kpi.hint}</p>}
            {active && (
              <p className="mt-1 text-[10px] font-medium text-sky-700 dark:text-sky-400">
                Filtering · click to clear
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
