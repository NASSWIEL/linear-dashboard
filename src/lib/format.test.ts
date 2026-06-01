import { describe, expect, it } from "vitest";
import { dueInfo, initials, priorityStyle, relativeTime } from "./format";

function relDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("dueInfo", () => {
  it("returns null with no due date", () => {
    expect(dueInfo(null)).toBeNull();
  });

  it("labels today, tomorrow and future correctly", () => {
    expect(dueInfo(relDate(0))).toEqual({ text: "Due today", daysDiff: 0 });
    expect(dueInfo(relDate(1))).toEqual({ text: "Due tomorrow", daysDiff: 1 });
    expect(dueInfo(relDate(5))).toEqual({ text: "Due in 5 days", daysDiff: 5 });
  });

  it("labels overdue with singular/plural days", () => {
    expect(dueInfo(relDate(-1))).toEqual({ text: "1 day overdue", daysDiff: -1 });
    expect(dueInfo(relDate(-4))).toEqual({
      text: "4 days overdue",
      daysDiff: -4,
    });
  });
});

describe("initials", () => {
  it("uses first + last initial for multi-word names", () => {
    expect(initials("Naif Asswiel")).toBe("NA");
    expect(initials("Jean Claude Van Damme")).toBe("JD");
  });

  it("uses first two letters for a single word", () => {
    expect(initials("bob")).toBe("BO");
  });

  it("handles empty / whitespace input", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});

describe("priorityStyle", () => {
  it("maps known priorities to distinct dot colors", () => {
    expect(priorityStyle("Urgent").dot).toBe("bg-red-500");
    expect(priorityStyle("High").dot).toBe("bg-orange-500");
    expect(priorityStyle("Medium").dot).toBe("bg-amber-400");
    expect(priorityStyle("Low").dot).toBe("bg-sky-500");
  });

  it("falls back to 'No priority' for unknown labels", () => {
    expect(priorityStyle("").label).toBe("No priority");
    expect(priorityStyle("Whatever").label).toBe("No priority");
  });
});

describe("relativeTime", () => {
  it("returns 'just now' for very recent timestamps", () => {
    expect(relativeTime(new Date().toISOString())).toBe("just now");
  });

  it("formats minutes and hours", () => {
    expect(relativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe(
      "5m ago",
    );
    expect(relativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe(
      "3h ago",
    );
  });
});
