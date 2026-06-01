import type { Issue } from "@/lib/types";
import { dueInfo } from "@/lib/format";

export function OverduePanel({ issues }: { issues: Issue[] }) {
  const sorted = [...issues].sort((a, b) =>
    (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Overdue</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            sorted.length > 0
              ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
              : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
          }`}
        >
          {sorted.length}
        </span>
      </header>

      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">
          Nothing overdue. 🎉
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {sorted.slice(0, 8).map((issue) => {
            const due = dueInfo(issue.dueDate);
            return (
              <li key={issue.id}>
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">
                      {issue.title}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-500">
                      {issue.identifier}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-red-400">
                    {due?.text}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
