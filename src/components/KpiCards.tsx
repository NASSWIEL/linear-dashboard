"use client";

import type { MetricFilter, Metrics } from "@/lib/types";

interface Kpi {
  label: string;
  value: number | string;
  accent: string;
  ring: string;
  bg: string;
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
      label: "Total",
      value: metrics.total,
      accent: "text-fg",
      ring: "ring-border/40",
      bg: "bg-zinc-400/10",
      filter: "all",
    },
    {
      label: "Backlog",
      value: metrics.backlog,
      accent: "text-muted",
      ring: "ring-border/40",
      bg: "bg-slate-500/10",
      filter: "backlog",
    },
    {
      label: "À faire",
      value: metrics.todo,
      accent: "text-indigo-700 dark:text-indigo-300",
      ring: "ring-indigo-500/30",
      bg: "bg-indigo-500/10",
      filter: "todo",
    },
    {
      label: "En cours",
      value: metrics.inProgress,
      accent: "text-amber-600 dark:text-amber-300",
      ring: "ring-amber-500/30",
      bg: "bg-amber-400/15",
      filter: "in-progress",
    },
    {
      label: "En retard",
      value: metrics.overdueCount,
      accent: "text-red-700 dark:text-red-400",
      ring: "ring-red-500/30",
      bg: "bg-red-500/10",
      filter: "overdue",
    },
    {
      label: "Terminé",
      value: metrics.completed,
      accent: "text-emerald-700 dark:text-emerald-300",
      ring: "ring-emerald-500/30",
      bg: "bg-emerald-500/10",
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
            className={`rounded-xl border ${kpi.bg} p-4 text-left ring-1 transition-colors ${
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
            {active && (
              <p className="mt-1 text-[10px] font-medium text-sky-700 dark:text-sky-400">
                Filtré · cliquer pour effacer
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
