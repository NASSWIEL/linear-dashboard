"use client";

import { useEffect, useState } from "react";
import type { Project, User } from "@/lib/types";
import { initials } from "@/lib/format";

interface ProjectMembership {
  memberIds: Set<string>;
  leadId: string | null;
}

async function fetchMembership(projectId: string): Promise<{ projectId: string; memberIds: Set<string>; leadId: string | null }> {
  const res = await fetch(`/api/projects/${projectId}/members`);
  const json = await res.json();
  const members: { id: string }[] = json.members ?? [];
  return {
    projectId,
    memberIds: new Set(members.map((m) => m.id)),
    leadId: json.leadId ?? null,
  };
}

export function AssignProjectModal({
  projects,
  workspaceUsers,
  onClose,
}: {
  projects: Project[];
  workspaceUsers: User[];
  onClose: () => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    workspaceUsers[0]?.id ?? null,
  );
  const [memberships, setMemberships] = useState<Map<string, ProjectMembership>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch membership for all projects on open
  useEffect(() => {
    if (projects.length === 0) { setLoading(false); return; }
    setLoading(true);
    Promise.all(projects.map((p) => fetchMembership(p.id)))
      .then((results) => {
        const map = new Map<string, ProjectMembership>();
        for (const r of results) {
          map.set(r.projectId, { memberIds: r.memberIds, leadId: r.leadId });
        }
        setMemberships(map);
      })
      .catch(() => setError("Impossible de charger les appartenances aux projets."))
      .finally(() => setLoading(false));
  }, [projects]);

  async function toggle(projectId: string, currentlyMember: boolean) {
    if (!selectedUserId) return;
    setBusyProjectId(projectId);
    setError(null);

    // Optimistic update
    setMemberships((prev) => {
      const next = new Map(prev);
      const m = next.get(projectId);
      if (!m) return prev;
      const ids = new Set(m.memberIds);
      if (currentlyMember) ids.delete(selectedUserId);
      else ids.add(selectedUserId);
      next.set(projectId, { ...m, memberIds: ids });
      return next;
    });

    try {
      if (currentlyMember) {
        const res = await fetch(
          `/api/projects/${projectId}/members?userId=${encodeURIComponent(selectedUserId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error((await res.json())?.error || "Erreur");
      } else {
        const res = await fetch(`/api/projects/${projectId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selectedUserId }),
        });
        if (!res.ok) throw new Error((await res.json())?.error || "Erreur");
      }
    } catch (e) {
      // Revert optimistic update
      setMemberships((prev) => {
        const next = new Map(prev);
        const m = next.get(projectId);
        if (!m) return prev;
        const ids = new Set(m.memberIds);
        if (currentlyMember) ids.add(selectedUserId);
        else ids.delete(selectedUserId);
        next.set(projectId, { ...m, memberIds: ids });
        return next;
      });
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyProjectId(null);
    }
  }

  const selectedUser = workspaceUsers.find((u) => u.id === selectedUserId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-bg shadow-2xl"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-fg">Assigner aux projets</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-fg">
            ✕
          </button>
        </div>

        {/* Body — two panels */}
        <div className="flex min-h-0 flex-1 divide-x divide-border overflow-hidden">
          {/* Left — members */}
          <div className="flex w-52 shrink-0 flex-col overflow-y-auto">
            <p className="px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
              Membres
            </p>
            {workspaceUsers.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted">Aucun membre.</p>
            ) : (
              <ul>
                {workspaceUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${
                        selectedUserId === u.id
                          ? "bg-elevated text-fg"
                          : "text-muted hover:bg-surface hover:text-fg"
                      }`}
                    >
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="h-6 w-6 shrink-0 rounded-full ring-1 ring-border"
                        />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-semibold text-fg">
                          {initials(u.displayName)}
                        </span>
                      )}
                      <span className="truncate">{u.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right — projects */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            <p className="px-5 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
              Projets
              {selectedUser && (
                <span className="ml-1.5 font-normal normal-case text-muted">
                  — {selectedUser.displayName}
                </span>
              )}
            </p>

            {!selectedUserId ? (
              <p className="px-5 py-6 text-sm text-muted">
                Sélectionner un membre pour voir ses projets.
              </p>
            ) : loading ? (
              <p className="px-5 py-6 text-sm text-muted">Chargement…</p>
            ) : projects.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Aucun projet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {projects.map((p) => {
                  const m = memberships.get(p.id);
                  const isMember = m?.memberIds.has(selectedUserId) ?? false;
                  const isLead = m?.leadId === selectedUserId;
                  const busy = busyProjectId === p.id;

                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <input
                        type="checkbox"
                        id={`proj-${p.id}`}
                        checked={isMember}
                        disabled={isLead || busy}
                        onChange={() => toggle(p.id, isMember)}
                        className="h-4 w-4 cursor-pointer rounded accent-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                      <label
                        htmlFor={`proj-${p.id}`}
                        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 ${
                          isLead || busy ? "cursor-not-allowed opacity-60" : ""
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: p.color ?? "#71717a" }}
                        />
                        <span className="truncate text-sm text-fg">{p.name}</span>
                      </label>
                      {isLead && (
                        <span
                          title="Responsable du projet — ne peut pas être retiré"
                          className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/30"
                        >
                          responsable
                        </span>
                      )}
                      {busy && (
                        <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border border-t-sky-500" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {error && (
              <p className="mx-5 mb-3 rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
