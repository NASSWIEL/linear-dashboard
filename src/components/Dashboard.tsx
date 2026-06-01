"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

import type { IssuesResponse, ProjectsResponse } from "@/lib/types";
import { deriveMetrics, filterByProject } from "@/lib/metrics";
import { relativeTime } from "@/lib/format";
import { Sidebar } from "./Sidebar";
import { KpiCards } from "./KpiCards";
import { KanbanBoard } from "./KanbanBoard";
import { OverduePanel } from "./OverduePanel";
import { StatusChart } from "./StatusChart";
import { PriorityBreakdown } from "./PriorityBreakdown";

const TEAM_KEY = process.env.NEXT_PUBLIC_LINEAR_TEAM_KEY ?? "REC";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json as T;
}

export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("project") ?? "all";

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

  const allIssues = useMemo(() => issuesData?.issues ?? [], [issuesData]);
  const projects = projectsData?.projects ?? [];

  const filtered = useMemo(
    () => filterByProject(allIssues, selectedId),
    [allIssues, selectedId],
  );
  const metrics = useMemo(() => deriveMetrics(filtered), [filtered]);

  const countFor = (projectId: string) =>
    allIssues.filter((i) => i.project?.id === projectId).length;

  const selectedProjectName =
    selectedId === "all"
      ? "All projects"
      : (projects.find((p) => p.id === selectedId)?.name ?? "Project");

  function onSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("project");
    else params.set("project", id);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="flex min-h-screen w-full bg-zinc-950 text-zinc-100">
      <Sidebar
        projects={projects}
        selectedId={selectedId}
        onSelect={onSelect}
        totalCount={allIssues.length}
        countFor={countFor}
        teamKey={TEAM_KEY}
      />

      <main className="flex-1 overflow-x-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              {selectedProjectName}
            </h1>
            <p className="text-xs text-zinc-500">
              {issuesData
                ? `Updated ${relativeTime(new Date(issuesData.fetchedAt).toISOString())}`
                : "Loading…"}
            </p>
          </div>
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
        </header>

        <div className="space-y-5 p-6">
          {issuesError ? (
            <ErrorState message={issuesError.message} onRetry={() => mutate()} />
          ) : isLoading && !issuesData ? (
            <LoadingState />
          ) : (
            <>
              <KpiCards metrics={metrics} />

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
                <div className="min-w-0">
                  <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                    Board
                  </h2>
                  <KanbanBoard issues={filtered} columns={metrics.columns} />
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
