"use client";

import { useState } from "react";
import useSWR from "swr";
import type { User } from "@/lib/types";
import { initials } from "@/lib/format";

async function fetcher(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as { members: User[]; leadId: string | null };
}

export function MembersModal({
  projectId,
  projectName,
  workspaceUsers,
  onClose,
}: {
  projectId: string;
  projectName: string;
  workspaceUsers: User[];
  onClose: () => void;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/projects/${projectId}/members`,
    fetcher,
  );
  const members = data?.members ?? [];
  const leadId = data?.leadId ?? null;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toAdd, setToAdd] = useState("");

  const addable = workspaceUsers.filter(
    (u) => !members.some((m) => m.id === u.id),
  );

  async function addMember() {
    if (!toAdd) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: toAdd }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Add failed");
      setToAdd("");
      await mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: string) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Remove failed");
      await mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-bg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">Membres</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 truncate text-xs text-muted">{projectName}</p>

        {/* Add member */}
        <div className="mb-4 flex gap-2">
          <select
            aria-label="Choisir un membre à ajouter"
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
            disabled={busy || addable.length === 0}
            className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-fg outline-none focus:border-sky-500 disabled:opacity-50"
          >
            <option value="">
              {addable.length === 0
                ? "Tous les membres sont déjà ajoutés"
                : "Ajouter un membre…"}
            </option>
            {addable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addMember}
            disabled={busy || !toAdd}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>

        {actionError && (
          <p className="mb-3 rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {actionError}
          </p>
        )}

        {/* Current members */}
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Membres du projet ({members.length})
        </p>
        {error ? (
          <p className="py-4 text-sm text-red-700 dark:text-red-300">
            {(error as Error).message}
          </p>
        ) : isLoading ? (
          <p className="py-4 text-sm text-muted">Chargement…</p>
        ) : members.length === 0 ? (
          <p className="py-4 text-sm text-muted">Aucun membre.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {members.map((m) => {
              const isLead = m.id === leadId;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-semibold text-fg">
                      {initials(m.displayName)}
                    </span>
                    <span className="truncate text-sm text-fg">
                      {m.displayName}
                    </span>
                    {isLead && (
                      <span className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/30">
                        responsable
                      </span>
                    )}
                  </span>
                  {isLead ? (
                    <span
                      title="Le responsable du projet ne peut pas être retiré"
                      className="shrink-0 text-[11px] text-faint"
                    >
                      —
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Retirer ${m.displayName}`}
                      onClick={() => removeMember(m.id)}
                      disabled={busy}
                      className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:border-red-700 hover:text-red-300 disabled:opacity-50"
                    >
                      Retirer
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
