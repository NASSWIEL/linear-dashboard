"use client";

import { useEffect, useRef, useState } from "react";
import type { Issue } from "@/lib/types";
import { statusColor } from "@/lib/format";
import { useDashboard } from "./DashboardContext";

export function StatusSelect({ issue }: { issue: Issue }) {
  const { meta, busyIssueId, updateIssue } = useDashboard();
  const busy = busyIssueId === issue.id;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Scope options to the issue's team: the workspace merges every team's
  // workflow states, so without this filter the same names (Backlog, Todo…)
  // appear once per team. Scoping also guarantees the stateId belongs to the
  // issue's team (Linear rejects a cross-team stateId). Fall back to all.
  const states = (meta?.states ?? []).filter(
    (s) => !issue.team || s.teamKey === issue.team.key,
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (stateId: string) => {
    setOpen(false);
    updateIssue(issue.id, { stateId });
  };

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Statut de ${issue.identifier}`}
        disabled={busy || states.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-[9rem] items-center gap-1.5 rounded-md border border-border px-1.5 py-1 text-[11px] text-fg outline-none transition-colors hover:border-border focus:border-sky-500 disabled:opacity-50"
        style={{
          backgroundColor: `color-mix(in srgb, ${statusColor(issue.state.name)} 16%, var(--elevated))`,
        }}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: statusColor(issue.state.name) }}
        />
        <span className="truncate">{issue.state.name}</span>
        <span className="ml-auto text-faint">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-md border border-border bg-elevated py-1 shadow-lg"
        >
          {states.map((s) => {
            const selected = s.name === issue.state.name;
            return (
              <li key={s.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => pick(s.id)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-fg transition-colors"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${statusColor(s.name)} ${
                      selected ? 32 : 14
                    }%, transparent)`,
                  }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: statusColor(s.name) }}
                  />
                  <span className="truncate">{s.name}</span>
                  {selected && <span className="ml-auto text-faint">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
