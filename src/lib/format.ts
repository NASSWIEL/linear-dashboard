// Client-safe presentation helpers (no secrets, no server-only imports).

export interface PriorityStyle {
  label: string;
  dot: string; // tailwind bg color for the indicator
  badge: string; // tailwind classes for a pill
}

export function priorityStyle(label: string): PriorityStyle {
  switch (label) {
    case "Urgent":
      return {
        label,
        dot: "bg-red-500",
        badge: "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-500/30",
      };
    case "High":
      return {
        label,
        dot: "bg-orange-500",
        badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/30",
      };
    case "Medium":
      return {
        label,
        dot: "bg-amber-400",
        badge: "bg-amber-400/10 text-amber-700 dark:text-amber-200 ring-1 ring-amber-400/30",
      };
    case "Low":
      return {
        label,
        dot: "bg-sky-500",
        badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30",
      };
    default:
      return {
        label: "No priority",
        dot: "bg-faint",
        badge: "bg-zinc-500/10 text-muted ring-1 ring-zinc-500/20",
      };
  }
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
  if (daysDiff === 0) text = "Due today";
  else if (daysDiff === 1) text = "Due tomorrow";
  else if (daysDiff === -1) text = "1 day overdue";
  else if (daysDiff < 0) text = `${Math.abs(daysDiff)} days overdue`;
  else text = `Due in ${daysDiff} days`;

  return { text, daysDiff };
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}
