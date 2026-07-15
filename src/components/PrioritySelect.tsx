"use client";

import { useEffect, useRef, useState } from "react";
import type { Issue } from "@/lib/types";
import { priorityStyle } from "@/lib/format";
import { useDashboard } from "./DashboardContext";
import { AnchoredMenu } from "./AnchoredMenu";

// Linear priority scale: 0 No priority, 1 Urgent, 2 High, 3 Medium, 4 Low.
const PRIORITIES: { value: number; key: string }[] = [
  { value: 0, key: "No priority" },
  { value: 1, key: "Urgent" },
  { value: 2, key: "High" },
  { value: 3, key: "Medium" },
  { value: 4, key: "Low" },
];

// Tailwind text-color class per priority dot, mirroring priorityStyle's hue.
const DOT: Record<string, string> = {
  Urgent: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-amber-400",
  Low: "bg-sky-500",
  "No priority": "bg-faint",
};

export function PrioritySelect({ issue }: { issue: Issue }) {
  const { busyIssueId, updateIssue } = useDashboard();
  const busy = busyIssueId === issue.id;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!anchorRef.current?.contains(t) && !menuRef.current?.contains(t))
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

  const pick = (value: number) => {
    setOpen(false);
    if (value !== issue.priority) updateIssue(issue.id, { priority: value });
  };

  const current = priorityStyle(issue.priorityLabel);

  return (
    <div className="relative inline-flex">
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Priorité de ${issue.identifier}`}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-[9rem] items-center gap-1.5 rounded-md border border-border bg-elevated px-1.5 py-1 text-[11px] text-fg outline-none transition-colors hover:border-border focus:border-sky-500 disabled:opacity-50"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${DOT[issue.priorityLabel] ?? "bg-faint"}`}
        />
        <span className="truncate">{current.label}</span>
        <span className="ml-auto text-faint">▾</span>
      </button>

      <AnchoredMenu anchorRef={anchorRef} menuRef={menuRef} open={open}>
        <ul role="listbox">
          {PRIORITIES.map((p) => {
            const selected = p.value === issue.priority;
            const style = priorityStyle(p.key);
            return (
              <li key={p.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => pick(p.value)}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-fg transition-colors hover:bg-surface ${
                    selected ? "bg-surface" : ""
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${DOT[p.key] ?? "bg-faint"}`}
                  />
                  <span className="truncate">{style.label}</span>
                  {selected && <span className="ml-auto text-faint">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </AnchoredMenu>
    </div>
  );
}
