"use client";

import { useEffect, useRef, useState } from "react";
import type { Issue } from "@/lib/types";
import { initials, userColor } from "@/lib/format";
import { useDashboard } from "./DashboardContext";
import { AnchoredMenu } from "./AnchoredMenu";

export function AssigneeSelect({ issue }: { issue: Issue }) {
  const { meta, busyIssueId, updateIssue } = useDashboard();
  const users = meta?.users ?? [];
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

  const pick = (assigneeId: string | null) => {
    setOpen(false);
    updateIssue(issue.id, { assigneeId });
  };

  // Keep the current assignee visible even if they've left the member list.
  const current = issue.assignee;
  const options = [
    ...(current && !users.some((u) => u.id === current.id) ? [current] : []),
    ...users,
  ];

  const Swatch = ({ id, label }: { id: string; label: string }) => (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold text-white"
      style={{ backgroundColor: userColor(id) }}
    >
      {initials(label)}
    </span>
  );

  return (
    <div className="relative inline-flex">
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Assigné de ${issue.identifier}`}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-[9rem] items-center gap-1.5 rounded-md border border-border px-1.5 py-1 text-[11px] text-fg outline-none transition-colors hover:border-border focus:border-sky-500 disabled:opacity-50"
        style={
          current
            ? {
                backgroundColor: `color-mix(in srgb, ${userColor(current.id)} 16%, var(--elevated))`,
              }
            : { backgroundColor: "var(--elevated)" }
        }
      >
        {current ? (
          <Swatch id={current.id} label={current.displayName} />
        ) : (
          <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-border" />
        )}
        <span className="truncate">
          {current ? current.displayName : "Non assigné"}
        </span>
        <span className="ml-auto text-faint">▾</span>
      </button>

      <AnchoredMenu anchorRef={anchorRef} menuRef={menuRef} open={open}>
        <ul role="listbox">
          <li role="option" aria-selected={!current}>
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-fg transition-colors hover:bg-surface"
            >
              <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-border" />
              <span className="truncate">Non assigné</span>
              {!current && <span className="ml-auto text-faint">✓</span>}
            </button>
          </li>
          {options.map((u) => {
            const selected = u.id === current?.id;
            return (
              <li key={u.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => pick(u.id)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-fg transition-colors"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${userColor(u.id)} ${
                      selected ? 30 : 12
                    }%, transparent)`,
                  }}
                >
                  <Swatch id={u.id} label={u.displayName} />
                  <span className="truncate">{u.displayName}</span>
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
