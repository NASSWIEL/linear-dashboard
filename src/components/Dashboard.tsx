"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

import type {
  CreateIssueInput,
  IssuesResponse,
  MetaResponse,
  MetricFilter,
  ProjectsResponse,
  UpdateIssueInput,
} from "@/lib/types";
import {
  deriveMetrics,
  filterByAssignee,
  filterByMetric,
  filterByProject,
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

const FILTER_LABELS: Record<MetricFilter, string> = {
  all: "All",
  overdue: "Overdue",
  "in-progress": "In progress",
  done: "Done",
  todo: "Todo",
  backlog: "Backlog",
  unassigned: "Unassigned",
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

  const { data: projectsData } = useSWR<ProjectsResponse>(
    "/api/projects",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const { data: metaData } = useSWR<MetaResponse>("/api/meta", fetcher, {
    revalidateOnFocus: false,
  });

  const [busyIssueId, setBusyIssueId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [membersOpen, setMembersOpen] = useState(false);

  const allIssues = useMemo(() => issuesData?.issues ?? [], [issuesData]);
  const projects = projectsData?.projects ?? [];

  // Scope = project, then assignee. Overview metrics + charts reflect the scope.
  const projectIssues = useMemo(
    () => filterByProject(allIssues, selectedId),
    [allIssues, selectedId],
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
    allIssues.filter((i) => i.project?.id === projectId).length;

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
        ? "Unassigned"
        : (members.find((m) => m.id === assignee)?.displayName ?? "Member");

  const selectedProjectName =
    selectedId === "all"
      ? "All projects"
      : (projects.find((p) => p.id === selectedId)?.name ?? "Project");

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
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

  // Modal actions: throw so the modal shows the error.
  const modalCreate = async (input: CreateIssueInput) => {
    await apiCreate(input);
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
        busyIssueId,
        updateIssue: ctxUpdate,
        archiveIssue: ctxArchive,
        editIssue: (issueId) => setModal({ mode: "edit", issueId }),
      }}
    >
      <div className="flex min-h-screen w-full bg-zinc-950 text-zinc-100">
        <Sidebar
          projects={projects}
          selectedId={selectedId}
          onSelect={(id) => setParam("project", id)}
          totalCount={allIssues.length}
          countFor={countFor}
          members={members}
          selectedAssignee={assignee}
          onSelectAssignee={(key) => setParam("assignee", key)}
          countByAssignee={countByAssignee}
        />

        <main className="flex-1 overflow-x-hidden">
          <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-zinc-100">
                  {selectedProjectName}
                </h1>
                {assigneeLabel && (
                  <button
                    type="button"
                    onClick={() => setParam("assignee", "all")}
                    className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300 hover:bg-violet-500/20"
                  >
                    👤 {assigneeLabel} ✕
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                {issuesData
                  ? `Updated ${relativeTime(new Date(issuesData.fetchedAt).toISOString())}`
                  : "Loading…"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedId !== "all" && (
                <button
                  type="button"
                  onClick={() => setMembersOpen(true)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                >
                  👥 Membres
                </button>
              )}
              <button
                type="button"
                onClick={() => setModal({ mode: "create" })}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
              >
                + New issue
              </button>
              <button
                type="button"
                onClick={() => mutate()}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isValidating ? "animate-pulse bg-sky-400" : "bg-zinc-600"
                  }`}
                />
                Refresh
              </button>
            </div>
          </header>

          <div className="space-y-5 p-6">
            {actionError && (
              <div className="flex items-center justify-between rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-red-300 hover:text-red-100"
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

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
                  <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-zinc-300">
                        Board
                      </h2>
                      {filter !== "all" && (
                        <button
                          type="button"
                          onClick={() => setParam("filter", "all")}
                          className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-300 hover:bg-sky-500/20"
                        >
                          {FILTER_LABELS[filter]} ✕
                        </button>
                      )}
                    </div>
                    <KanbanBoard issues={boardIssues} columns={boardColumns} />
                  </div>

                  <div className="space-y-5">
                    <StatusChart columns={metrics.columns} total={metrics.total} />
                    <PriorityBreakdown buckets={metrics.byPriority} />
                    <OverduePanel issues={metrics.overdue} />
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
            className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />
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
      <h2 className="text-sm font-semibold text-red-300">
        Couldn’t load Linear data
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-red-200/80">{message}</p>
      <p className="mt-2 text-xs text-red-200/60">
        Check that <code className="font-mono">LINEAR_API_KEY</code> is set in{" "}
        <code className="font-mono">.env.local</code> (Linear → Settings → API →
        Personal API keys).
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-red-800 bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-900/60"
      >
        Retry
      </button>
    </div>
  );
}
