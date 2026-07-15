import type {
  Issue,
  MetaResponse,
  Project,
  Team,
  User,
  WorkflowStateOption,
} from "./types";

// Deterministic dataset used when LINEAR_FIXTURES=1, so the dashboard can be
// run and end-to-end tested offline without a Linear API key. Due dates are
// computed relative to "now" so overdue / due-today cases stay correct
// whenever the tests run.

function relDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

const STATES = {
  triage: { name: "Triage", type: "triage" as const, color: "#eb5757" },
  backlog: { name: "Backlog", type: "backlog" as const, color: "#bec2c8" },
  todo: { name: "Todo", type: "unstarted" as const, color: "#e2e2e2" },
  inProgress: { name: "In Progress", type: "started" as const, color: "#f2c94c" },
  inReview: { name: "In Review", type: "started" as const, color: "#5e6ad2" },
  done: { name: "Done", type: "completed" as const, color: "#4cb782" },
  canceled: { name: "Canceled", type: "canceled" as const, color: "#95a2b3" },
};

const FIXTURE_USERS: User[] = [
  { id: "user-naif", name: "naif", displayName: "Naif Asswiel", avatarUrl: null },
  { id: "user-sarah", name: "sarah", displayName: "Sarah Chen", avatarUrl: null },
  { id: "user-bob", name: "bob", displayName: "Bob Martin", avatarUrl: null },
];

const FIXTURE_STATES: WorkflowStateOption[] = [
  { id: "st-backlog", name: "Backlog", type: "backlog", color: "#bec2c8", position: 0, teamKey: "REC" },
  { id: "st-todo", name: "Todo", type: "unstarted", color: "#e2e2e2", position: 1, teamKey: "REC" },
  { id: "st-prog", name: "In Progress", type: "started", color: "#f2c94c", position: 2, teamKey: "REC" },
  { id: "st-review", name: "In Review", type: "started", color: "#5e6ad2", position: 3, teamKey: "REC" },
  { id: "st-done", name: "Done", type: "completed", color: "#4cb782", position: 4, teamKey: "REC" },
  { id: "st-cancel", name: "Canceled", type: "canceled", color: "#95a2b3", position: 5, teamKey: "REC" },
];

export const FIXTURE_META: MetaResponse = {
  users: FIXTURE_USERS,
  states: FIXTURE_STATES,
};

const T_REC = { id: "team-rec", key: "REC", name: "Recast-test" };

export const FIXTURE_TEAMS: Team[] = [T_REC];

const NAIF = {
  id: "user-naif",
  name: "naif",
  displayName: "Naif Asswiel",
  avatarUrl: null,
};
const BOB = {
  id: "user-bob",
  name: "bob",
  displayName: "Bob Martin",
  // Inline SVG avatar so screenshots/tests don't depend on the network.
  avatarUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#7c3aed"/><text x="20" y="26" font-size="16" fill="white" text-anchor="middle" font-family="sans-serif">BM</text></svg>',
    ),
};

export const FIXTURE_PROJECTS: Project[] = [
  {
    id: "proj-rag",
    name: "RAG System - Next Phase Implementation",
    color: "#5e6ad2",
    state: "started",
  },
  {
    id: "proj-covea",
    name: "COVEA - Suivi projet",
    color: "#f2c94c",
    state: "backlog",
  },
  { id: "proj-empty", name: "Empty Project", color: "#26b5ce", state: "planned" },
];

const P_RAG = { id: "proj-rag", name: "RAG System - Next Phase Implementation" };
const P_COVEA = { id: "proj-covea", name: "COVEA - Suivi projet" };

function issue(partial: Partial<Issue> & Pick<Issue, "identifier" | "title" | "state">): Issue {
  return {
    id: partial.identifier,
    description: "",
    url: `https://linear.app/recast-test/issue/${partial.identifier}`,
    priority: 0,
    priorityLabel: "No priority",
    dueDate: null,
    updatedAt: hoursAgo(1),
    completedAt: null,
    canceledAt: null,
    assignee: null,
    project: null,
    team: T_REC,
    labels: [],
    parent: null,
    ...partial,
  };
}

export function fixtureIssues(): Issue[] {
  return [
    issue({
      identifier: "REC-101",
      title: "Fix PDF loader timeout on large documents",
      state: STATES.inProgress,
      priority: 1,
      priorityLabel: "Urgent",
      dueDate: relDate(-3), // overdue
      assignee: NAIF,
      project: P_RAG,
      labels: [
        { name: "bug", color: "#eb5757" },
        { name: "backend", color: "#5e6ad2" },
      ],
      updatedAt: hoursAgo(2),
    }),
    issue({
      identifier: "REC-102",
      title: "Add unit tests for the gemini client",
      state: STATES.todo,
      priority: 2,
      priorityLabel: "High",
      dueDate: relDate(0), // due today -> NOT overdue
      assignee: NAIF,
      project: P_RAG,
      labels: [{ name: "testing", color: "#4cb782" }],
      updatedAt: hoursAgo(5),
      parent: {
        id: "REC-101",
        identifier: "REC-101",
        title: "Fix PDF loader timeout on large documents",
      },
    }),
    issue({
      identifier: "REC-103",
      title: "Design the dashboard UI and component system",
      state: STATES.inReview,
      priority: 3,
      priorityLabel: "Medium",
      dueDate: relDate(2),
      assignee: null, // unassigned
      project: P_RAG,
      labels: [
        { name: "design", color: "#bb87fc" },
        { name: "frontend", color: "#26b5ce" },
        { name: "ui", color: "#f2c94c" },
        { name: "polish", color: "#95a2b3" }, // 4 labels -> truncation
      ],
      updatedAt: hoursAgo(8),
    }),
    issue({
      identifier: "REC-104",
      title: "Set up CI/CD pipeline with GitHub Actions",
      state: STATES.backlog,
      priority: 4,
      priorityLabel: "Low",
      dueDate: null, // no due date
      assignee: BOB, // avatar image
      project: P_RAG,
      updatedAt: hoursAgo(20),
    }),
    issue({
      identifier: "REC-105",
      title: "Refactor Recast core engine",
      state: STATES.inProgress,
      priority: 2,
      priorityLabel: "High",
      dueDate: relDate(-1), // overdue
      assignee: NAIF,
      project: P_COVEA,
      labels: [{ name: "refactor", color: "#5e6ad2" }],
      updatedAt: hoursAgo(3),
    }),
    issue({
      identifier: "REC-106",
      title: "SLM model refinement experiments",
      state: STATES.todo,
      priority: 3,
      priorityLabel: "Medium",
      dueDate: relDate(5),
      assignee: null,
      project: P_COVEA,
      updatedAt: hoursAgo(30),
    }),
    issue({
      identifier: "REC-107",
      title: "Write Claude Code skills documentation",
      state: STATES.done,
      priority: 3,
      priorityLabel: "Medium",
      dueDate: relDate(-10), // past due but completed -> NOT overdue
      assignee: NAIF,
      project: P_COVEA,
      completedAt: hoursAgo(48),
      updatedAt: hoursAgo(48),
    }),
    issue({
      identifier: "REC-108",
      title: "Deprecated synchronization approach",
      state: STATES.canceled,
      priority: 0,
      priorityLabel: "No priority",
      dueDate: relDate(-7), // past due but canceled -> NOT overdue
      project: P_COVEA,
      canceledAt: hoursAgo(72),
      updatedAt: hoursAgo(72),
    }),
    issue({
      identifier: "REC-109",
      title: "Investigate embeddings cache invalidation",
      state: STATES.backlog,
      priority: 0,
      priorityLabel: "No priority",
      dueDate: null,
      assignee: null,
      project: null, // no project
      updatedAt: hoursAgo(50),
    }),
    issue({
      identifier: "REC-110",
      title: "Security audit of the RAG pipeline",
      state: STATES.inProgress,
      priority: 1,
      priorityLabel: "Urgent",
      dueDate: relDate(-5), // overdue
      assignee: NAIF,
      project: P_RAG,
      labels: [{ name: "security", color: "#eb5757" }],
      updatedAt: hoursAgo(1),
    }),
    issue({
      identifier: "REC-111",
      title: "Update README with setup instructions",
      state: STATES.done,
      priority: 4,
      priorityLabel: "Low",
      dueDate: null,
      assignee: NAIF,
      project: P_RAG,
      completedAt: hoursAgo(6),
      updatedAt: hoursAgo(6),
    }),
    issue({
      identifier: "REC-112",
      title: "Triage incoming bug report",
      state: STATES.triage,
      priority: 2,
      priorityLabel: "High",
      dueDate: relDate(0), // due today -> NOT overdue
      assignee: NAIF,
      project: P_RAG,
      updatedAt: hoursAgo(4),
    }),
  ];
}
