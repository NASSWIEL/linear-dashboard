import type { Issue, StateColumn } from "@/lib/types";
import { IssueCard } from "./IssueCard";

export function KanbanBoard({
  issues,
  columns,
}: {
  issues: Issue[];
  columns: StateColumn[];
}) {
  if (columns.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">
        No issues to display for this selection.
      </div>
    );
  }

  const byState = new Map<string, Issue[]>();
  for (const issue of issues) {
    const list = byState.get(issue.state.name);
    if (list) list.push(issue);
    else byState.set(issue.state.name, [issue]);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => {
        const colIssues = byState.get(col.name) ?? [];
        return (
          <section
            key={col.name}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/40"
          >
            <header className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-sm font-semibold text-zinc-200">
                  {col.name}
                </span>
              </div>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {col.count}
              </span>
            </header>
            <div className="flex flex-col gap-2 p-2.5">
              {colIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
