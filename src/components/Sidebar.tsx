"use client";

import { useState } from "react";
import type { Project, Team, User } from "@/lib/types";
import { initials, userColor, TEAM_CARD_COLORS } from "@/lib/format";

export function Sidebar({
  teams,
  selectedTeam,
  onSelectTeam,
  countByTeam,
  projects,
  selectedId,
  onSelect,
  onAddProject,
  onArchiveProject,
  totalCount,
  countFor,
  noProjectCount,
  members,
  selectedAssignee,
  onSelectAssignee,
  countByAssignee,
}: {
  teams: Team[];
  selectedTeam: string;
  onSelectTeam: (key: string) => void;
  countByTeam: (key: string) => number;
  projects: Project[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddProject: () => void;
  onArchiveProject: (id: string) => void;
  totalCount: number;
  countFor: (projectId: string) => number;
  noProjectCount: number;
  members: User[];
  selectedAssignee: string;
  onSelectAssignee: (key: string) => void;
  countByAssignee: (key: string) => number;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-bg">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/lg_cgi_color.png"
            alt="CGI"
            className="h-full w-full object-contain"
          />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-fg">Suivi Projets : BT-IA</p>
          <p className="text-[11px] text-muted">CGI · BT-IA</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {teams.length > 0 && (
          <>
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
              Équipes
            </p>
            <ProjectItem
              active={selectedTeam === "all"}
              onClick={() => onSelectTeam("all")}
              dotColor="#a1a1aa"
              label="Toutes les équipes"
              count={countByTeam("all")}
              onArchive={null}
            />
            {teams.map((t) => (
              <ProjectItem
                key={t.id}
                active={selectedTeam === t.key}
                onClick={() => onSelectTeam(t.key)}
                dotColor={TEAM_CARD_COLORS[t.key] ?? "#6366f1"}
                label={t.name}
                count={countByTeam(t.key)}
                onArchive={null}
              />
            ))}
            <div className="h-3" />
          </>
        )}

        <div className="flex items-center justify-between px-2 pb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Projets
          </p>
          <button
            type="button"
            onClick={onAddProject}
            title="Nouveau projet"
            className="flex h-4 w-4 items-center justify-center rounded text-faint hover:bg-elevated hover:text-fg"
          >
            +
          </button>
        </div>

        <ProjectItem
          active={selectedId === "all"}
          onClick={() => onSelect("all")}
          dotColor="#a1a1aa"
          label="Tous les projets"
          count={totalCount}
          onArchive={null}
        />

        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            active={selectedId === project.id}
            onClick={() => onSelect(project.id)}
            dotColor={project.color ?? "#71717a"}
            label={project.name}
            count={countFor(project.id)}
            onArchive={() => onArchiveProject(project.id)}
          />
        ))}

        {projects.length === 0 && (
          <p className="px-2 py-2 text-xs text-faint">Aucun projet trouvé.</p>
        )}

        {noProjectCount > 0 && (
          <ProjectItem
            active={selectedId === "none"}
            onClick={() => onSelect("none")}
            dotColor="#71717a"
            label="Sans projet"
            count={noProjectCount}
            onArchive={null}
          />
        )}

        <p className="px-2 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Personnes
        </p>

        <PersonItem
          active={selectedAssignee === "all"}
          onClick={() => onSelectAssignee("all")}
          variant="everyone"
          label="Tout le monde"
          count={countByAssignee("all")}
        />

        {members.map((m) => (
          <PersonItem
            key={m.id}
            active={selectedAssignee === m.id}
            onClick={() => onSelectAssignee(m.id)}
            variant="member"
            label={m.displayName}
            avatarUrl={m.avatarUrl}
            color={userColor(m.id)}
            count={countByAssignee(m.id)}
          />
        ))}

        <PersonItem
          active={selectedAssignee === "unassigned"}
          onClick={() => onSelectAssignee("unassigned")}
          variant="unassigned"
          label="Non assigné"
          count={countByAssignee("unassigned")}
        />
      </nav>

      <div className="border-t border-border px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          En direct · actualisation auto
        </div>
      </div>
    </aside>
  );
}

function ProjectItem({
  active,
  onClick,
  dotColor,
  label,
  count,
  onArchive,
}: {
  active: boolean;
  onClick: () => void;
  dotColor: string;
  label: string;
  count: number;
  onArchive: (() => void) | null;
}) {
  const [confirmArchive, setConfirmArchive] = useState(false);

  return (
    <div className="group relative mt-0.5">
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
          active
            ? "bg-elevated text-fg"
            : "text-muted hover:bg-surface hover:text-fg"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-inset ring-black/10 dark:ring-white/15"
            style={{ backgroundColor: dotColor }}
          />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 rounded-full bg-elevated px-1.5 py-0.5 text-[11px] tabular-nums text-muted">
          {count}
        </span>
      </button>

      {onArchive && !confirmArchive && (
        <button
          type="button"
          title="Archiver le projet"
          onClick={(e) => { e.stopPropagation(); setConfirmArchive(true); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 hidden rounded px-1 py-0.5 text-[11px] text-faint hover:bg-elevated hover:text-red-500 group-hover:flex"
        >
          ⋯
        </button>
      )}

      {onArchive && confirmArchive && (
        <span className="absolute inset-x-1 top-1/2 -translate-y-1/2 flex items-center justify-end gap-1.5 rounded-lg bg-bg/95 py-1 pr-2">
          <span className="text-[11px] text-muted">Archiver ?</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
            className="rounded bg-red-600/80 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-red-600"
          >
            Oui
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirmArchive(false); }}
            className="rounded bg-elevated px-1.5 py-0.5 text-[11px] text-fg hover:bg-faint"
          >
            Non
          </button>
        </span>
      )}
    </div>
  );
}

function PersonItem({
  active,
  onClick,
  variant,
  label,
  avatarUrl,
  color,
  count,
}: {
  active: boolean;
  onClick: () => void;
  variant: "everyone" | "member" | "unassigned";
  label: string;
  avatarUrl?: string | null;
  color?: string;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-label={`Filtrer par ${label}`}
      onClick={onClick}
      className={`mt-0.5 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-elevated text-fg"
          : "text-muted hover:bg-surface hover:text-fg"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {variant === "everyone" ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-elevated text-[9px] text-fg">
            ∗
          </span>
        ) : variant === "unassigned" ? (
          <span className="h-5 w-5 shrink-0 rounded-full border border-dashed border-border" />
        ) : avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={label}
            className="h-5 w-5 shrink-0 rounded-full ring-1 ring-border"
          />
        ) : (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
            style={{ backgroundColor: color ?? "var(--elevated)" }}
          >
            {initials(label)}
          </span>
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 rounded-full bg-elevated px-1.5 py-0.5 text-[11px] tabular-nums text-muted">
        {count}
      </span>
    </button>
  );
}
