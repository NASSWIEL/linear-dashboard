"use client";

import type { Issue } from "@/lib/types";
import { useDashboard } from "./DashboardContext";

export function StatusSelect({ issue }: { issue: Issue }) {
  const { meta, busyIssueId, updateIssue } = useDashboard();
  const states = meta?.states ?? [];
  const busy = busyIssueId === issue.id;

  // Match the current state by name (the issue carries name+type, not id).
  const current = states.find((s) => s.name === issue.state.name);

  return (
    <label className="inline-flex items-center gap-1.5" title="Change status">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: issue.state.color }}
      />
      <select
        aria-label={`Status of ${issue.identifier}`}
        disabled={busy || states.length === 0}
        value={current?.id ?? ""}
        onChange={(e) => updateIssue(issue.id, { stateId: e.target.value })}
        className="max-w-[7.5rem] cursor-pointer rounded-md border border-border bg-elevated px-1.5 py-1 text-[11px] text-fg outline-none hover:border-border focus:border-sky-500 disabled:opacity-50"
      >
        {!current && <option value="">{issue.state.name}</option>}
        {states.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
