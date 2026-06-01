import type {
  Issue,
  MetricFilter,
  Metrics,
  PriorityBucket,
  StateColumn,
  WorkflowStateType,
} from "./types";

const DONE_TYPES: ReadonlySet<WorkflowStateType> = new Set([
  "completed",
  "canceled",
]);

// Column ordering on the board: left (early) to right (terminal).
const TYPE_ORDER: Record<WorkflowStateType, number> = {
  triage: 0,
  backlog: 1,
  unstarted: 2,
  started: 3,
  completed: 4,
  canceled: 5,
};

// Linear priority is an Int: 0 No priority, 1 Urgent, 2 High, 3 Medium, 4 Low.
const PRIORITY_ORDER = ["Urgent", "High", "Medium", "Low", "No priority"];

/** Local "YYYY-MM-DD" for a given date (defaults to now). */
export function todayYMD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * An issue is overdue when it has a due date strictly before today and is not
 * already completed or canceled. Due *today* is NOT overdue (date-only compare).
 */
export function isOverdue(issue: Issue, today: string = todayYMD()): boolean {
  if (!issue.dueDate) return false;
  if (DONE_TYPES.has(issue.state.type)) return false;
  return issue.dueDate < today;
}

export function deriveMetrics(
  issues: Issue[],
  today: string = todayYMD(),
): Metrics {
  const overdue = issues.filter((i) => isOverdue(i, today));

  const countOfType = (t: WorkflowStateType) =>
    issues.filter((i) => i.state.type === t).length;

  const backlog = countOfType("backlog") + countOfType("triage");
  const todo = countOfType("unstarted");
  const inProgress = countOfType("started");
  const completed = countOfType("completed");
  const canceled = countOfType("canceled");

  // Columns: one per distinct state present, ordered by lifecycle then name.
  const columnMap = new Map<string, StateColumn>();
  for (const issue of issues) {
    const key = issue.state.name;
    const existing = columnMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      columnMap.set(key, {
        name: issue.state.name,
        type: issue.state.type,
        color: issue.state.color,
        count: 1,
      });
    }
  }
  const columns = [...columnMap.values()].sort((a, b) => {
    const byType = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
    return byType !== 0 ? byType : a.name.localeCompare(b.name);
  });

  const priorityMap = new Map<string, number>();
  for (const issue of issues) {
    const label = issue.priorityLabel || "No priority";
    priorityMap.set(label, (priorityMap.get(label) ?? 0) + 1);
  }
  const byPriority: PriorityBucket[] = [...priorityMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.label) - PRIORITY_ORDER.indexOf(b.label),
    );

  const denominator = issues.length - canceled;
  const completionRate =
    denominator > 0 ? Math.round((completed / denominator) * 100) : 0;

  return {
    total: issues.length,
    backlog,
    todo,
    inProgress,
    completed,
    canceled,
    overdueCount: overdue.length,
    overdue,
    completionRate,
    columns,
    byPriority,
  };
}

/** Filter to a single project, or return all when projectId is null/"all". */
export function filterByProject(
  issues: Issue[],
  projectId: string | null,
): Issue[] {
  if (!projectId || projectId === "all") return issues;
  return issues.filter((i) => i.project?.id === projectId);
}

/**
 * Scope to a single assignee. "all" = no filter, "unassigned" = no assignee,
 * otherwise match the assignee's user id.
 */
export function filterByAssignee(
  issues: Issue[],
  assigneeId: string | null,
): Issue[] {
  if (!assigneeId || assigneeId === "all") return issues;
  if (assigneeId === "unassigned") return issues.filter((i) => !i.assignee);
  return issues.filter((i) => i.assignee?.id === assigneeId);
}

/** Narrow the board to a KPI-card selection (clicking "Overdue", etc.). */
export function filterByMetric(
  issues: Issue[],
  filter: MetricFilter,
  today: string = todayYMD(),
): Issue[] {
  switch (filter) {
    case "overdue":
      return issues.filter((i) => isOverdue(i, today));
    case "in-progress":
      return issues.filter((i) => i.state.type === "started");
    case "done":
      return issues.filter((i) => i.state.type === "completed");
    case "todo":
      return issues.filter((i) => i.state.type === "unstarted");
    case "backlog":
      return issues.filter(
        (i) => i.state.type === "backlog" || i.state.type === "triage",
      );
    case "unassigned":
      return issues.filter((i) => !i.assignee);
    case "all":
    default:
      return issues;
  }
}
