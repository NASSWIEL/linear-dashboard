"use client";

import { useState } from "react";
import useSWR from "swr";
import type { Project } from "@/lib/types";

type Tab = "github" | "manual";

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
}

async function repoFetcher(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Erreur GitHub");
  return json as { repos: GitHubRepo[] };
}

const PRESET_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#64748b",
];

export function AddProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [tab, setTab] = useState<Tab>("github");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: reposData,
    isLoading: reposLoading,
    error: reposError,
  } = useSWR(tab === "github" ? "/api/github/repos" : null, repoFetcher, {
    revalidateOnFocus: false,
  });

  function selectRepo(repo: GitHubRepo) {
    setSelectedRepo(repo);
    setName(repo.name);
    setDescription(repo.description ?? "");
  }

  function switchTab(t: Tab) {
    setTab(t);
    setSelectedRepo(null);
    setName("");
    setDescription("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description, color }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur");
      onCreated(json.project as Project);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
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
          <h2 className="text-base font-semibold text-fg">Nouveau projet</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-elevated p-1">
          {(
            [
              ["github", "Depuis GitHub"],
              ["manual", "Manuellement"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-surface text-fg shadow-sm"
                  : "text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === "github" && (
            <div>
              <label className="mb-1 block text-xs text-muted">
                Sélectionner un repo
              </label>
              {reposLoading ? (
                <p className="py-4 text-center text-sm text-muted">
                  Chargement des repos…
                </p>
              ) : reposError ? (
                <p className="py-4 text-center text-sm text-red-600 dark:text-red-400">
                  {reposError.message}
                </p>
              ) : (
                <select
                  value={selectedRepo?.id ?? ""}
                  onChange={(e) => {
                    const repo = reposData?.repos.find(
                      (r) => r.id === Number(e.target.value),
                    );
                    if (repo) selectRepo(repo);
                  }}
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-fg outline-none focus:border-sky-500"
                >
                  <option value="">Choisir un repo…</option>
                  {reposData?.repos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName}
                      {r.private ? " 🔒" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted">
              Nom du projet
            </label>
            <input
              autoFocus={tab === "manual"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du projet"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Description optionnelle…"
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs text-muted">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                    color === c ? "ring-2 ring-offset-2 ring-offset-bg" : ""
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
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
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || (tab === "github" && !selectedRepo)}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {submitting ? "Création…" : "Créer le projet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
