import type { Issue } from "@/lib/types";
import { dueInfo } from "@/lib/format";
import { useDashboard } from "./DashboardContext";

export function OverduePanel({ issues }: { issues: Issue[] }) {
  const { editIssue } = useDashboard();
  const sorted = [...issues].sort((a, b) =>
    (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
  );

  return (
    <div className="rounded-xl border border-border bg-surface/60">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">En retard</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            sorted.length > 0
              ? "bg-red-500/15 text-red-700 dark:text-red-300 ring-1 ring-red-500/30"
              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
          }`}
        >
          {sorted.length}
        </span>
      </header>

      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">
          Aucun retard. 🎉
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sorted.slice(0, 8).map((issue) => {
            const due = dueInfo(issue.dueDate);
            return (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => editIssue(issue.id)}
                  title="Ouvrir la fiche de la tâche"
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface focus:bg-surface focus:outline-none"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">
                      {issue.title}
                    </p>
                    <p className="font-mono text-[11px] text-muted">
                      {issue.identifier}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-red-700 dark:text-red-400">
                    {due?.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
