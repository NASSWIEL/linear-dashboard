import type { Metrics } from "@/lib/types";

interface Kpi {
  label: string;
  value: number | string;
  hint?: string;
  accent: string; // tailwind text color for the value
  ring: string; // tailwind ring/border accent
}

export function KpiCards({ metrics }: { metrics: Metrics }) {
  const kpis: Kpi[] = [
    {
      label: "Total issues",
      value: metrics.total,
      hint: `${metrics.backlog} backlog · ${metrics.todo} todo`,
      accent: "text-zinc-100",
      ring: "ring-zinc-700/40",
    },
    {
      label: "In progress",
      value: metrics.inProgress,
      hint: "actively being worked",
      accent: "text-sky-300",
      ring: "ring-sky-500/30",
    },
    {
      label: "Overdue",
      value: metrics.overdueCount,
      hint: metrics.overdueCount > 0 ? "needs attention" : "all on track",
      accent: metrics.overdueCount > 0 ? "text-red-400" : "text-emerald-400",
      ring: metrics.overdueCount > 0 ? "ring-red-500/30" : "ring-emerald-500/30",
    },
    {
      label: "Done",
      value: metrics.completed,
      hint: `${metrics.completionRate}% completion`,
      accent: "text-emerald-300",
      ring: "ring-emerald-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 ring-1 ${kpi.ring}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {kpi.label}
          </p>
          <p className={`mt-1 text-3xl font-semibold tabular-nums ${kpi.accent}`}>
            {kpi.value}
          </p>
          {kpi.hint && (
            <p className="mt-1 text-xs text-zinc-500">{kpi.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
