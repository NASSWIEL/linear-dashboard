"use client";

import { useEffect, useState } from "react";
import type { Issue } from "@/lib/types";
import { relativeTime } from "@/lib/format";

interface ActionItem {
  id: string;
  titre: string;
  raison: string;
}

interface SummaryResult {
  immediat: ActionItem[];
  surveiller: ActionItem[];
  résumé: string;
  generatedAt: number;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "result"; data: SummaryResult }
  | { status: "error"; message: string };

export function AISummaryPanel({
  issues,
  projectName,
  assigneeLabel,
}: {
  issues: Issue[];
  projectName: string;
  assigneeLabel: string | null;
}) {
  const [state, setState] = useState<State>({ status: "idle" });

  // Reset to idle when context changes
  useEffect(() => {
    setState({ status: "idle" });
  }, [projectName, assigneeLabel]);

  async function analyse() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues, projectName, assigneeLabel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur API");
      setState({ status: "result", data: json as SummaryResult });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Erreur inconnue",
      });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface/60">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-fg">Analyse IA</span>
          <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/30">
            Claude
          </span>
        </div>
        <button
          type="button"
          onClick={analyse}
          disabled={state.status === "loading" || issues.length === 0}
          className="rounded-md bg-violet-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {state.status === "loading" ? "Analyse…" : "Analyser"}
        </button>
      </header>

      <div className="px-4 py-3">
        {state.status === "idle" && (
          <p className="py-4 text-center text-xs text-muted">
            {issues.length === 0
              ? "Aucune tâche à analyser."
              : "Cliquez sur Analyser pour obtenir un résumé IA des priorités."}
          </p>
        )}

        {state.status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-6">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-violet-500" />
            <span className="text-xs text-muted">Analyse en cours…</span>
          </div>
        )}

        {state.status === "error" && (
          <div className="py-3">
            <p className="mb-2 text-xs text-red-700 dark:text-red-400">
              {state.message}
            </p>
            <button
              type="button"
              onClick={analyse}
              className="text-xs text-violet-600 hover:text-violet-400"
            >
              Réessayer
            </button>
          </div>
        )}

        {state.status === "result" && (
          <div className="space-y-3">
            {/* À traiter maintenant */}
            {state.data.immediat.length > 0 && (
              <section>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  À traiter maintenant ({state.data.immediat.length})
                </p>
                <ul className="space-y-2">
                  {state.data.immediat.map((item) => (
                    <li key={item.id} className="text-xs">
                      <span className="font-mono text-faint">{item.id}</span>
                      {" — "}
                      <span className="font-medium text-fg">{item.titre}</span>
                      <br />
                      <span className="text-muted">{item.raison}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* À surveiller */}
            {state.data.surveiller.length > 0 && (
              <section>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  À surveiller ({state.data.surveiller.length})
                </p>
                <ul className="space-y-2">
                  {state.data.surveiller.map((item) => (
                    <li key={item.id} className="text-xs">
                      <span className="font-mono text-faint">{item.id}</span>
                      {" — "}
                      <span className="font-medium text-fg">{item.titre}</span>
                      <br />
                      <span className="text-muted">{item.raison}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Résumé exécutif */}
            {state.data.résumé && (
              <section className="rounded-lg border border-border bg-bg/50 px-3 py-2.5">
                <p className="text-xs leading-relaxed text-muted">
                  {state.data.résumé}
                </p>
              </section>
            )}

            {/* Timestamp */}
            <p className="text-right text-[10px] text-faint">
              Généré {relativeTime(new Date(state.data.generatedAt).toISOString())}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
