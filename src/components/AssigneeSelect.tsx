"use client";

import type { Issue } from "@/lib/types";
import { useDashboard } from "./DashboardContext";

export function AssigneeSelect({ issue }: { issue: Issue }) {
  const { meta, busyIssueId, updateIssue } = useDashboard();
  const users = meta?.users ?? [];
  const busy = busyIssueId === issue.id;

  return (
    <select
      aria-label={`Assignee of ${issue.identifier}`}
      title="Reassign"
      disabled={busy}
      value={issue.assignee?.id ?? ""}
      onChange={(e) =>
        updateIssue(issue.id, { assigneeId: e.target.value || null })
      }
      className="max-w-[8rem] cursor-pointer rounded-md border border-border bg-elevated px-1.5 py-1 text-[11px] text-fg outline-none hover:border-border focus:border-sky-500 disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {/* If the current assignee isn't in the member list (e.g. the bot), keep it visible. */}
      {issue.assignee && !users.some((u) => u.id === issue.assignee?.id) && (
        <option value={issue.assignee.id}>{issue.assignee.displayName}</option>
      )}
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.displayName}
        </option>
      ))}
    </select>
  );
}
