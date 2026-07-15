"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";

import type {
  CreateIssueInput,
  IssuesResponse,
  MetaResponse,
  MetricFilter,
  ProjectsResponse,
  TeamsResponse,
  UpdateIssueInput,
} from "@/lib/types";
import {
  deriveMetrics,
  filterByAssignee,
  filterByMetric,
  filterByProject,
  filterByTeam,
} from "@/lib/metrics";
import { relativeTime } from "@/lib/format";
import { DashboardProvider } from "./DashboardContext";
import { Sidebar } from "./Sidebar";
import { KpiCards } from "./KpiCards";
import { KanbanBoard } from "./KanbanBoard";
import { OverduePanel } from "./OverduePanel";
import { StatusChart } from "./StatusChart";
import { PriorityBreakdown } from "./PriorityBreakdown";
import { IssueModal } from "./IssueModal";
import { MembersModal } from "./MembersModal";
import { AddProjectModal } from "./AddProjectModal";
import { AssignProjectModal } from "./AssignProjectModal";
import { ThemeToggle } from "./ThemeToggle";

const FILTER_LABELS: Record<MetricFilter, string> = {
  all: "Tout",
  overdue: "En retard",
  "in-progress": "En cours",
  done: "Terminé",
  todo: "À faire",
  backlog: "Backlog",
  unassigned: "Non assigné",
};

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; issueId: string }
  | null;

export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("project") ?? "all";
  const filter = (searchParams.get("filter") as MetricFilter) ?? "all";
  const assignee = searchParams.get("assignee") ?? "all";
  const team = searchParams.get("team") ?? "all";

  const {
    data: issuesData,
    error: issuesError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<IssuesResponse>("/api/issues", fetcher, {
    refreshInterval: 12_000,
    keepPreviousData: true,
  });

  const { data: projectsData, mutate: mutateProjects } = useSWR<ProjectsResponse>(
    "/api/projects",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const { data: metaData } = useSWR<MetaResponse>("/api/meta", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: teamsData } = useSWR<TeamsResponse>("/api/teams", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: session } = useSession();

  const [busyIssueId, setBusyIssueId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [assignProjectOpen, setAssignProjectOpen] = useState(false);

  const allIssues = useMemo(() => issuesData?.issues ?? [], [issuesData]);
  const allProjects = projectsData?.projects ?? [];
  const teams = teamsData?.teams ?? [];

  // Scope = team, then project, then assignee. Metrics + charts reflect the scope.
  const teamIssues = useMemo(
    () => filterByTeam(allIssues, team),
    [allIssues, team],
  );
  // Project list is scoped to the selected team so it never shows other teams'
  // projects (which would read as empty when clicked).
  const projects = useMemo(
    () =>
      team === "all"
        ? allProjects
        : allProjects.filter((p) => p.teamKey === team),
    [allProjects, team],
  );
  const projectIssues = useMemo(
    () => filterByProject(teamIssues, selectedId),
    [teamIssues, selectedId],
  );
  const scopedIssues = useMemo(
    () => filterByAssignee(projectIssues, assignee),
    [projectIssues, assignee],
  );
  const metrics = useMemo(() => deriveMetrics(scopedIssues), [scopedIssues]);

  // The board narrows further to the active KPI filter.
  const boardIssues = useMemo(
    () => filterByMetric(scopedIssues, filter),
    [scopedIssues, filter],
  );
  const boardColumns = useMemo(
    () => deriveMetrics(boardIssues).columns,
    [boardIssues],
  );

  const countFor = (projectId: string) =>
    teamIssues.filter((i) => i.project?.id === projectId).length;

  const countByTeam = (key: string) =>
    key === "all"
      ? allIssues.length
      : allIssues.filter((i) => i.team?.key === key).length;

  // Issues with no Linear project (e.g. created from a GitHub repo, never
  // attached to a project). Surfaced as a "Sans projet" bucket so they remain
  // findable instead of vanishing into "Tous les projets". Scoped to the active
  // person filter, so the bucket disappears when the selected assignee has no
  // orphan issues (Sidebar hides the row when this is 0).
  const noProjectCount = filterByAssignee(teamIssues, assignee).filter(
    (i) => !i.project,
  ).length;

  // People counts reflect the current project scope.
  const members = metaData?.users ?? [];
  const countByAssignee = (key: string) => {
    if (key === "all") return projectIssues.length;
    if (key === "unassigned")
      return projectIssues.filter((i) => !i.assignee).length;
    return projectIssues.filter((i) => i.assignee?.id === key).length;
  };
  const assigneeLabel =
    assignee === "all"
      ? null
      : assignee === "unassigned"
        ? "Non assigné"
        : (members.find((m) => m.id === assignee)?.displayName ?? "Membre");

  const selectedProjectName =
    selectedId === "all"
      ? "Tous les projets"
      : selectedId === "none"
        ? "Sans projet"
        : (projects.find((p) => p.id === selectedId)?.name ?? "Projet");

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // Switching team resets the narrower scopes (project/assignee/filter), since
  // those ids belong to the previous team and would otherwise show nothing.
  function selectTeam(key: string) {
    const params = new URLSearchParams();
    if (key && key !== "all") params.set("team", key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // --- mutations ---------------------------------------------------------
  async function apiUpdate(id: string, patch: UpdateIssueInput) {
    const res = await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Update failed");
    return json.issue;
  }

  async function apiCreate(input: CreateIssueInput) {
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Create failed");
    return json.issue;
  }

  async function apiArchive(id: string) {
    const res = await fetch(`/api/issues/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Archive failed");
  }

  // Inline (card) actions: non-throwing, surface errors in a banner.
  const ctxUpdate = async (id: string, patch: UpdateIssueInput) => {
    setBusyIssueId(id);
    setActionError(null);
    try {
      await apiUpdate(id, patch);
      await mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyIssueId(null);
    }
  };

  const ctxArchive = async (id: string) => {
    setBusyIssueId(id);
    setActionError(null);
    try {
      await apiArchive(id);
      await mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setBusyIssueId(null);
    }
  };

  const ctxArchiveProject = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur archivage projet");
      await mutateProjects();
      if (selectedId === id) setParam("project", "all");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erreur archivage projet");
    }
  };

  // Modal actions: throw so the modal shows the error.
  const modalCreate = async (input: CreateIssueInput) => {
    // Route the new issue to the currently selected team (defaults to backend's
    // first team when "Toutes les équipes" is active).
    await apiCreate(team !== "all" ? { ...input, teamKey: team } : input);
    await mutate();
  };
  const modalUpdate = async (id: string, input: UpdateIssueInput) => {
    await apiUpdate(id, input);
    await mutate();
  };

  const editingIssue =
    modal?.mode === "edit"
      ? allIssues.find((i) => i.id === modal.issueId)
      : undefined;

  return (
    <DashboardProvider
      value={{
        meta: metaData ?? null,
        projects,
        busyIssueId,
        updateIssue: ctxUpdate,
        archiveIssue: ctxArchive,
        editIssue: (issueId) => setModal({ mode: "edit", issueId }),
      }}
    >
      <div className="flex min-h-screen w-full bg-bg text-fg">
        <Sidebar
          teams={teams}
          selectedTeam={team}
          onSelectTeam={selectTeam}
          countByTeam={countByTeam}
          projects={projects}
          selectedId={selectedId}
          onSelect={(id) => setParam("project", id)}
          onAddProject={() => setAddProjectOpen(true)}
          onArchiveProject={ctxArchiveProject}
          totalCount={teamIssues.length}
          countFor={countFor}
          noProjectCount={noProjectCount}
          members={members}
          selectedAssignee={assignee}
          onSelectAssignee={(key) => setParam("assignee", key)}
          countByAssignee={countByAssignee}
        />

        <main className="flex-1 overflow-x-hidden">
          <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-fg">
                  {selectedProjectName}
                </h1>
                {assigneeLabel && (
                  <button
                    type="button"
                    onClick={() => setParam("assignee", "all")}
                    className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-500/20"
                  >
                    👤 {assigneeLabel} ✕
                  </button>
                )}
              </div>
              <p className="text-xs text-muted">
                {issuesData
                  ? `Mis à jour ${relativeTime(new Date(issuesData.fetchedAt).toISOString())}`
                  : "Chargement…"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {session?.user && (
                <div className="flex items-center gap-1.5">
                  {session.user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? ""}
                      className="h-6 w-6 rounded-full ring-1 ring-border"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="text-xs text-muted hover:text-fg"
                    title="Se déconnecter"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAssignProjectOpen(true)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border hover:text-fg"
              >
                Assigner aux projets
              </button>
              {selectedId !== "all" && (
                <button
                  type="button"
                  onClick={() => setMembersOpen(true)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border hover:text-fg"
                >
                  👥 Membres
                </button>
              )}
              <button
                type="button"
                onClick={() => setModal({ mode: "create" })}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
              >
                + Nouvelle tâche
              </button>
              <button
                type="button"
                onClick={() => mutate()}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border hover:text-fg"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isValidating ? "animate-pulse bg-sky-400" : "bg-faint"
                  }`}
                />
                Actualiser
              </button>
            </div>
          </header>

          <div className="space-y-5 p-6">
            {actionError && (
              <div className="flex items-center justify-between rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-700 dark:text-red-200">
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-red-700 dark:text-red-300 hover:text-red-100"
                >
                  ✕
                </button>
              </div>
            )}

            {issuesError ? (
              <ErrorState message={issuesError.message} onRetry={() => mutate()} />
            ) : isLoading && !issuesData ? (
              <LoadingState />
            ) : (
              <>
                <KpiCards
                  metrics={metrics}
                  activeFilter={filter}
                  onSelect={(f) => setParam("filter", f)}
                />

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <StatusChart columns={metrics.columns} total={metrics.total} />
                    <PriorityBreakdown buckets={metrics.byPriority} />
                    <OverduePanel issues={metrics.overdue} />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-muted">
                        Tableau
                      </h2>
                      {filter !== "all" && (
                        <button
                          type="button"
                          onClick={() => setParam("filter", "all")}
                          className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
                        >
                          {FILTER_LABELS[filter]} ✕
                        </button>
                      )}
                    </div>
                    <KanbanBoard issues={boardIssues} columns={boardColumns} />
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {modal && (
        <IssueModal
          mode={modal.mode}
          issue={editingIssue}
          projects={projects}
          meta={metaData ?? null}
          defaultProjectId={selectedId !== "all" ? selectedId : null}
          onClose={() => setModal(null)}
          onCreate={modalCreate}
          onUpdate={modalUpdate}
        />
      )}

      {membersOpen && selectedId !== "all" && (
        <MembersModal
          projectId={selectedId}
          projectName={selectedProjectName}
          workspaceUsers={members}
          onClose={() => setMembersOpen(false)}
        />
      )}

      {addProjectOpen && (
        <AddProjectModal
          onClose={() => setAddProjectOpen(false)}
          onCreated={async () => {
            await mutateProjects();
          }}
        />
      )}

      {assignProjectOpen && (
        <AssignProjectModal
          projects={projects}
          workspaceUsers={members}
          onClose={() => setAssignProjectOpen(false)}
        />
      )}
    </DashboardProvider>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-surface/60"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-border bg-surface/40" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-6">
      <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">
        Impossible de charger les données Linear
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-red-700 dark:text-red-200/80">{message}</p>
      <p className="mt-2 text-xs text-red-700 dark:text-red-200/60">
        Vérifiez que <code className="font-mono">LINEAR_API_KEY</code> est défini dans{" "}
        <code className="font-mono">.env.local</code> (Linear → Paramètres → API →
        Clés API personnelles).
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-red-800 bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-900/60"
      >
        Réessayer
      </button>
    </div>
  );
}
