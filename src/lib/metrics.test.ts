import { describe, expect, it } from "vitest";
import type { Issue, IssueState, WorkflowStateType } from "./types";
import {
  deriveMetrics,
  filterByMetric,
  filterByProject,
  isOverdue,
  todayYMD,
} from "./metrics";
import { fixtureIssues } from "./fixtures";

const STATE: Record<string, IssueState> = {
  backlog: { name: "Backlog", type: "backlog", color: "#bec2c8" },
  todo: { name: "Todo", type: "unstarted", color: "#e2e2e2" },
  started: { name: "In Progress", type: "started", color: "#f2c94c" },
  review: { name: "In Review", type: "started", color: "#5e6ad2" },
  done: { name: "Done", type: "completed", color: "#4cb782" },
  canceled: { name: "Canceled", type: "canceled", color: "#95a2b3" },
};

function mk(overrides: Partial<Issue> & { identifier: string }): Issue {
  return {
    id: overrides.identifier,
    title: "Issue",
    description: null,
    priority: 0,
    priorityLabel: "No priority",
    dueDate: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    url: "https://linear.app/x",
    completedAt: null,
    canceledAt: null,
    state: STATE.todo,
    assignee: null,
    project: null,
    labels: [],
    ...overrides,
  };
}

const TODAY = "2026-06-01";

describe("isOverdue", () => {
  it("is true for a past due date on an active issue", () => {
    expect(isOverdue(mk({ identifier: "A", dueDate: "2026-05-31" }), TODAY)).toBe(
      true,
    );
  });

  it("is FALSE for a due date of today (boundary)", () => {
    expect(isOverdue(mk({ identifier: "B", dueDate: TODAY }), TODAY)).toBe(false);
  });

  it("is false for a future due date", () => {
    expect(isOverdue(mk({ identifier: "C", dueDate: "2026-06-02" }), TODAY)).toBe(
      false,
    );
  });

  it("is false when there is no due date", () => {
    expect(isOverdue(mk({ identifier: "D", dueDate: null }), TODAY)).toBe(false);
  });

  it("is false for a past due date when completed", () => {
    expect(
      isOverdue(
        mk({ identifier: "E", dueDate: "2026-01-01", state: STATE.done }),
        TODAY,
      ),
    ).toBe(false);
  });

  it("is false for a past due date when canceled", () => {
    expect(
      isOverdue(
        mk({ identifier: "F", dueDate: "2026-01-01", state: STATE.canceled }),
        TODAY,
      ),
    ).toBe(false);
  });
});

describe("deriveMetrics", () => {
  it("returns zeroed metrics for an empty list", () => {
    const m = deriveMetrics([], TODAY);
    expect(m.total).toBe(0);
    expect(m.columns).toEqual([]);
    expect(m.byPriority).toEqual([]);
    expect(m.overdue).toEqual([]);
    expect(m.completionRate).toBe(0);
  });

  it("groups backlog and triage together in the backlog KPI", () => {
    const triage: IssueState = { name: "Triage", type: "triage", color: "#e00" };
    const m = deriveMetrics(
      [
        mk({ identifier: "T", state: triage }),
        mk({ identifier: "B", state: STATE.backlog }),
      ],
      TODAY,
    );
    expect(m.backlog).toBe(2);
  });

  it("counts In Review as in-progress (started type)", () => {
    const m = deriveMetrics(
      [
        mk({ identifier: "P", state: STATE.started }),
        mk({ identifier: "R", state: STATE.review }),
      ],
      TODAY,
    );
    expect(m.inProgress).toBe(2);
  });

  it("computes completionRate excluding canceled from the denominator", () => {
    const m = deriveMetrics(
      [
        mk({ identifier: "1", state: STATE.done }),
        mk({ identifier: "2", state: STATE.done }),
        mk({ identifier: "3", state: STATE.todo }),
        mk({ identifier: "4", state: STATE.canceled }),
      ],
      TODAY,
    );
    // 2 done / (4 total - 1 canceled) = 2/3 = 67%
    expect(m.completionRate).toBe(67);
  });

  it("orders columns by lifecycle type then name", () => {
    const m = deriveMetrics(
      [
        mk({ identifier: "1", state: STATE.done }),
        mk({ identifier: "2", state: STATE.review }),
        mk({ identifier: "3", state: STATE.started }),
        mk({ identifier: "4", state: STATE.backlog }),
      ],
      TODAY,
    );
    expect(m.columns.map((c) => c.name)).toEqual([
      "Backlog",
      "In Progress",
      "In Review",
      "Done",
    ]);
  });

  it("orders priority buckets Urgent -> No priority", () => {
    const m = deriveMetrics(
      [
        mk({ identifier: "1", priorityLabel: "Low" }),
        mk({ identifier: "2", priorityLabel: "Urgent" }),
        mk({ identifier: "3", priorityLabel: "Medium" }),
      ],
      TODAY,
    );
    expect(m.byPriority.map((b) => b.label)).toEqual([
      "Urgent",
      "Medium",
      "Low",
    ]);
  });
});

describe("filterByProject", () => {
  const issues = [
    mk({ identifier: "1", project: { id: "p1", name: "One" } }),
    mk({ identifier: "2", project: { id: "p2", name: "Two" } }),
    mk({ identifier: "3", project: null }),
  ];

  it("returns all for 'all' or null", () => {
    expect(filterByProject(issues, "all")).toHaveLength(3);
    expect(filterByProject(issues, null)).toHaveLength(3);
  });

  it("filters to a single project and excludes project-less issues", () => {
    const r = filterByProject(issues, "p1");
    expect(r.map((i) => i.identifier)).toEqual(["1"]);
  });

  it("returns empty for a project with no issues", () => {
    expect(filterByProject(issues, "nope")).toEqual([]);
  });
});

describe("filterByMetric", () => {
  const issues = [
    mk({ identifier: "1", state: STATE.started }),
    mk({ identifier: "2", state: STATE.review }), // started type
    mk({ identifier: "3", state: STATE.todo }),
    mk({ identifier: "4", state: STATE.backlog }),
    mk({ identifier: "5", state: STATE.done }),
    mk({
      identifier: "6",
      state: STATE.started,
      dueDate: "2026-05-01", // overdue vs TODAY
    }),
    mk({
      identifier: "7",
      state: STATE.todo,
      assignee: {
        id: "u1",
        name: "x",
        displayName: "X",
        avatarUrl: null,
      },
    }),
  ];

  it("returns everything for 'all'", () => {
    expect(filterByMetric(issues, "all", TODAY)).toHaveLength(7);
  });

  it("filters in-progress (started type incl. In Review)", () => {
    const r = filterByMetric(issues, "in-progress", TODAY).map((i) => i.identifier);
    expect(r.sort()).toEqual(["1", "2", "6"]);
  });

  it("filters overdue", () => {
    expect(filterByMetric(issues, "overdue", TODAY).map((i) => i.identifier)).toEqual(["6"]);
  });

  it("filters done / todo / backlog", () => {
    expect(filterByMetric(issues, "done", TODAY).map((i) => i.identifier)).toEqual(["5"]);
    expect(filterByMetric(issues, "todo", TODAY).map((i) => i.identifier).sort()).toEqual(["3", "7"]);
    expect(filterByMetric(issues, "backlog", TODAY).map((i) => i.identifier)).toEqual(["4"]);
  });

  it("filters unassigned (excludes the one with an assignee)", () => {
    const r = filterByMetric(issues, "unassigned", TODAY).map((i) => i.identifier);
    expect(r).not.toContain("7");
    expect(r).toHaveLength(6);
  });
});

describe("todayYMD", () => {
  it("formats a date as zero-padded YYYY-MM-DD", () => {
    expect(todayYMD(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("fixture dataset shape (date-stable assertions)", () => {
  const m = deriveMetrics(fixtureIssues());

  it("has the expected totals", () => {
    expect(m.total).toBe(12);
    expect(m.backlog).toBe(3); // 2 backlog + 1 triage
    expect(m.todo).toBe(2);
    expect(m.inProgress).toBe(4); // 3 started + 1 in review
    expect(m.completed).toBe(2);
    expect(m.canceled).toBe(1);
  });

  it("flags exactly the 3 active past-due issues as overdue", () => {
    expect(m.overdueCount).toBe(3);
    expect(m.overdue.map((i) => i.identifier).sort()).toEqual([
      "REC-101",
      "REC-105",
      "REC-110",
    ]);
  });

  it("splits issues correctly across projects", () => {
    const all = fixtureIssues();
    expect(filterByProject(all, "proj-rag")).toHaveLength(7);
    expect(filterByProject(all, "proj-covea")).toHaveLength(4);
    expect(filterByProject(all, "proj-empty")).toHaveLength(0);
  });
});

// Type-only sanity: every WorkflowStateType is handled by ordering.
const _types: WorkflowStateType[] = [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
];
void _types;
