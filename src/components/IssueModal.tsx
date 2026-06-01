"use client";

import { useState } from "react";
import type {
  CreateIssueInput,
  Issue,
  MetaResponse,
  Project,
  UpdateIssueInput,
} from "@/lib/types";

const PRIORITIES = [
  { value: 0, label: "No priority" },
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
];

export function IssueModal({
  mode,
  issue,
  projects,
  meta,
  defaultProjectId,
  onClose,
  onCreate,
  onUpdate,
}: {
  mode: "create" | "edit";
  issue?: Issue;
  projects: Project[];
  meta: MetaResponse | null;
  defaultProjectId?: string | null;
  onClose: () => void;
  onCreate: (input: CreateIssueInput) => Promise<void>;
  onUpdate: (id: string, input: UpdateIssueInput) => Promise<void>;
}) {
  const states = meta?.states ?? [];
  const users = meta?.users ?? [];

  const currentStateId =
    issue && states.find((s) => s.name === issue.state.name)?.id;

  const [title, setTitle] = useState(issue?.title ?? "");
  const [description, setDescription] = useState(issue?.description ?? "");
  const [projectId, setProjectId] = useState(
    issue?.project?.id ?? defaultProjectId ?? "",
  );
  const [stateId, setStateId] = useState(currentStateId ?? "");
  const [assigneeId, setAssigneeId] = useState(issue?.assignee?.id ?? "");
  const [priority, setPriority] = useState(issue?.priority ?? 0);
  const [dueDate, setDueDate] = useState(issue?.dueDate ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        await onCreate({
          title: title.trim(),
          description: description || undefined,
          projectId: projectId || null,
          stateId: stateId || null,
          assigneeId: assigneeId || null,
          priority,
          dueDate: dueDate || null,
        });
      } else if (issue) {
        await onUpdate(issue.id, {
          title: title.trim(),
          description,
          stateId: stateId || undefined,
          assigneeId: assigneeId || null,
          priority,
          dueDate: dueDate || null,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-bg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">
            {mode === "create" ? "New issue" : `Edit ${issue?.identifier}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add a description…"
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Project">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={selectCls}
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={stateId}
                onChange={(e) => setStateId(e.target.value)}
                className={selectCls}
              >
                <option value="">Default</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assignee">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={selectCls}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className={selectCls}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Due date">
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value)}
                className={selectCls}
              />
            </Field>
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Create issue"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const selectCls =
  "w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-fg outline-none focus:border-sky-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      {children}
    </div>
  );
}
