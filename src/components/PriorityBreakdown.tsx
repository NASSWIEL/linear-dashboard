import type { PriorityBucket } from "@/lib/types";
import { priorityStyle } from "@/lib/format";

export function PriorityBreakdown({ buckets }: { buckets: PriorityBucket[] }) {
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0);

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      <h2 className="text-sm font-semibold text-fg">By priority</h2>
      {buckets.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No data</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {buckets.map((bucket) => {
            const style = priorityStyle(bucket.label);
            const pct = max > 0 ? (bucket.count / max) * 100 : 0;
            return (
              <li key={bucket.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    {bucket.label}
                  </span>
                  <span className="tabular-nums text-muted">
                    {bucket.count}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                  <div
                    className={`h-full rounded-full ${style.dot}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
