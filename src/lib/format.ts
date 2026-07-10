// Client-safe presentation helpers (no secrets, no server-only imports).

import type { CSSProperties } from "react";

// Light-theme values of the semantic tokens, pinned (via inline CSS vars) on any
// element given a fixed light background — a team-colored card or sidebar row —
// so its text stays legible even in dark mode. Mirrors :root in globals.css.
export const LIGHT_TOKENS: CSSProperties = {
  colorScheme: "light",
  ["--fg" as string]: "#18181b",
  ["--muted" as string]: "#52525b",
  ["--faint" as string]: "#a1a1aa",
  ["--border" as string]: "#e4e4e7",
  ["--elevated" as string]: "#e4e4e7",
  ["--surface" as string]: "#ffffff",
};

export interface PriorityStyle {
  label: string;
  dot: string; // tailwind bg color for the indicator
  badge: string; // tailwind classes for a pill
}

export function priorityStyle(label: string): PriorityStyle {
  switch (label) {
    case "Urgent":
      return {
        label: "Urgent",
        dot: "bg-red-500",
        badge: "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-500/30",
      };
    case "High":
      return {
        label: "Haute",
        dot: "bg-orange-500",
        badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/30",
      };
    case "Medium":
      return {
        label: "Moyenne",
        dot: "bg-amber-400",
        badge: "bg-amber-400/10 text-amber-700 dark:text-amber-200 ring-1 ring-amber-400/30",
      };
    case "Low":
      return {
        label: "Basse",
        dot: "bg-sky-500",
        badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30",
      };
    default:
      return {
        label: "Aucune priorité",
        dot: "bg-faint",
        badge: "bg-zinc-500/10 text-muted ring-1 ring-zinc-500/20",
      };
  }
}

/**
 * Deterministic, evenly-spread color for a user (or any stable key). Same key
 * always yields the same hue, so a person reads as one color across the board,
 * the assignee dropdown, and the sidebar. Mid saturation/lightness keeps white
 * text legible on the swatch in both themes.
 */
export function userColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return `hsl(${h} 62% 52%)`;
}

// Linear's default palette paints Backlog / Todo / Canceled / Duplicate in
// near-identical grays, so they're indistinguishable on the board and in the
// dropdown. Override with a distinct, intuitive hue per lifecycle stage, matched
// on the (French or English) status name. Unknown names fall back to a colorful
// deterministic hue so no two distinct statuses ever collide on gray.
const STATUS_HUES: [RegExp, string][] = [
  [/triage/i, "#ec4899"], // pink
  [/duplicate|duplicat|double/i, "#f97316"], // orange
  [/cancel|annul/i, "#ef4444"], // red
  [/review|revue|relecture/i, "#8b5cf6"], // violet
  [/progress|cours|doing|wip/i, "#f59e0b"], // amber
  [/done|termin|complet|fini|closed/i, "#10b981"], // emerald
  [/todo|to do|à faire|a faire|unstarted|planned/i, "#3b82f6"], // blue
  [/backlog|icebox/i, "#64748b"], // slate
];

// Client-requested house color per team (keyed by team key = issue identifier
// prefix). Used both as the issue-card background and as the team's dot in the
// sidebar, so a team and its tickets share one color. Extend per new team.
export const TEAM_CARD_COLORS: Record<string, string> = {
  FAC: "#DAF2E3",
  CBC: "#FFEEE8",
};

export function statusColor(name: string): string {
  for (const [re, hex] of STATUS_HUES) if (re.test(name)) return hex;
  // Colorful fallback (never gray) for team-specific status names.
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 68% 55%)`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Human "due" label plus how many whole days until/since the due date. */
export function dueInfo(dueDate: string | null): {
  text: string;
  daysDiff: number;
} | null {
  if (!dueDate) return null;
  const today = new Date();
  const todayMs = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const [y, m, d] = dueDate.split("-").map(Number);
  const dueMs = Date.UTC(y, m - 1, d);
  const daysDiff = Math.round((dueMs - todayMs) / 86_400_000);

  let text: string;
  if (daysDiff === 0) text = "Échéance aujourd'hui";
  else if (daysDiff === 1) text = "Échéance demain";
  else if (daysDiff === -1) text = "1 jour de retard";
  else if (daysDiff < 0) text = `${Math.abs(daysDiff)} jours de retard`;
  else text = `Dans ${daysDiff} jour${daysDiff > 1 ? "s" : ""}`;

  return { text, daysDiff };
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  const months = Math.round(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.round(months / 12)} an${Math.round(months / 12) > 1 ? "s" : ""}`;
}
