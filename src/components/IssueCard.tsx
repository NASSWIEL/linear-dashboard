"use client";

import { useState } from "react";
import type { Issue } from "@/lib/types";
import { dueInfo, priorityStyle } from "@/lib/format";
import { useDashboard } from "./DashboardContext";
import { StatusSelect } from "./StatusSelect";
import { AssigneeSelect } from "./AssigneeSelect";

export function IssueCard({ issue }: { issue: Issue }) {
  const { busyIssueId, archiveIssue, editIssue } = useDashboard();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prio = priorityStyle(issue.priorityLabel);
  const due = dueInfo(issue.dueDate);
  const isDone =
    issue.state.type === "completed" || issue.state.type === "canceled";
  const overdue = due !== null && due.daysDiff < 0 && !isDone;
  const busy = busyIssueId === issue.id;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
      className={`cursor-pointer rounded-lg border border-border bg-surface/60 p-3 transition-colors hover:border-border ${
        busy ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted">{issue.identifier}</span>
        {issue.priorityLabel && issue.priorityLabel !== "No priority" && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${prio.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${prio.dot}`} />
            {prio.label}
          </span>
        )}
      </div>

      <p
        className={`mt-1.5 text-sm font-medium text-fg ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {issue.title}
      </p>

      {expanded && (
        <div className="mt-2 border-t border-border pt-2">
          {issue.description?.trim() ? (
            <p className="whitespace-pre-wrap text-xs text-muted">
              {issue.description}
            </p>
          ) : (
            <p className="text-xs italic text-faint">Aucune description</p>
          )}
        </div>
      )}

      {issue.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label.name}
              className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted"
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

      {/* Inline controls: status + reassign */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-2.5 flex flex-wrap items-center gap-1.5"
      >
        <StatusSelect issue={issue} />
        <AssigneeSelect issue={issue} />
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-2.5 flex items-center justify-between"
      >
        <span
          className={`text-[11px] font-medium ${
            isDone
              ? "text-faint"
              : overdue
                ? "text-red-700 dark:text-red-400"
                : due
                  ? "text-muted"
                  : "text-faint"
          }`}
        >
          {isDone
            ? issue.state.type === "completed"
              ? "Terminé"
              : "Annulé"
            : due
              ? due.text
              : "Sans échéance"}
        </span>

        {confirmArchive ? (
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="text-muted">Archiver ?</span>
            <button
              type="button"
              disabled={busy}
              aria-label={`Confirmer l'archivage de ${issue.identifier}`}
              onClick={() => archiveIssue(issue.id)}
              className="rounded bg-red-600/80 px-1.5 py-0.5 font-medium text-white hover:bg-red-600"
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setConfirmArchive(false)}
              className="rounded bg-elevated px-1.5 py-0.5 text-fg hover:bg-faint"
            >
              Non
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              aria-label={`Modifier ${issue.identifier}`}
              onClick={() => editIssue(issue.id)}
              className="text-muted hover:text-sky-300"
            >
              Modifier
            </button>
            <button
              type="button"
              aria-label={`Archiver ${issue.identifier}`}
              onClick={() => setConfirmArchive(true)}
              className="text-muted hover:text-red-400"
            >
              Archiver
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
