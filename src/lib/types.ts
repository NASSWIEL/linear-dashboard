export type WorkflowStateType =
  | "triage"
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "canceled";

export interface IssueState {
  name: string;
  type: WorkflowStateType;
  color: string;
}

export interface IssueAssignee {
  name: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface IssueProject {
  id: string;
  name: string;
}

export interface IssueLabel {
  name: string;
  color: string;
}

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  priority: number; // 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
  priorityLabel: string;
  dueDate: string | null; // TimelessDate "YYYY-MM-DD"
  updatedAt: string;
  url: string;
  completedAt: string | null;
  canceledAt: string | null;
  state: IssueState;
  assignee: IssueAssignee | null;
  project: IssueProject | null;
  labels: IssueLabel[];
}

export interface Project {
  id: string;
  name: string;
  color: string | null;
  state: string | null;
}

export interface StateColumn {
  name: string;
  type: WorkflowStateType;
  color: string;
  count: number;
}

export interface PriorityBucket {
  label: string;
  count: number;
}

export interface Metrics {
  total: number;
  backlog: number;
  todo: number;
  inProgress: number;
  completed: number;
  canceled: number;
  overdueCount: number;
  overdue: Issue[];
  completionRate: number; // 0..100, completed / (total - canceled)
  columns: StateColumn[]; // ordered for the kanban board + chart
  byPriority: PriorityBucket[];
}

export interface IssuesResponse {
  issues: Issue[];
  metrics: Metrics;
  fetchedAt: number;
}

export interface ProjectsResponse {
  projects: Project[];
}
