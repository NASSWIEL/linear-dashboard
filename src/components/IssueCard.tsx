import type { Issue } from "@/lib/types";
import { dueInfo, initials, priorityStyle } from "@/lib/format";

export function IssueCard({ issue }: { issue: Issue }) {
  const prio = priorityStyle(issue.priorityLabel);
  const due = dueInfo(issue.dueDate);
  const isDone =
    issue.state.type === "completed" || issue.state.type === "canceled";
  const overdue = due !== null && due.daysDiff < 0 && !isDone;

  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-zinc-500">
          {issue.identifier}
        </span>
        {issue.priorityLabel && issue.priorityLabel !== "No priority" && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${prio.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${prio.dot}`} />
            {prio.label}
          </span>
        )}
      </div>

      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-zinc-100 group-hover:text-white">
        {issue.title}
      </p>

      {issue.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label.name}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        {isDone ? (
          // Due date is moot once an issue is completed or canceled.
          <span className="text-[11px] text-zinc-600">
            {issue.state.type === "completed" ? "Completed" : "Canceled"}
          </span>
        ) : due ? (
          <span
            className={`text-[11px] font-medium ${
              overdue ? "text-red-400" : "text-zinc-500"
            }`}
          >
            {due.text}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-600">No due date</span>
        )}

        {issue.assignee ? (
          issue.assignee.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={issue.assignee.avatarUrl}
              alt={issue.assignee.displayName}
              title={issue.assignee.displayName}
              className="h-6 w-6 rounded-full ring-1 ring-zinc-700"
            />
          ) : (
            <span
              title={issue.assignee.displayName}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-zinc-200 ring-1 ring-zinc-600"
            >
              {initials(issue.assignee.displayName)}
            </span>
          )
        ) : (
          <span
            title="Unassigned"
            className="h-6 w-6 rounded-full border border-dashed border-zinc-700"
          />
        )}
      </div>
    </a>
  );
}
