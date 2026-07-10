"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export interface ChecklistItem {
  text: string;
  done: boolean;
}

const CHECKBOX_RE = /^(\s*[-*]\s+\[)( |x|X)(\])(\s+)(.*)$/;
const CHECKLIST_HEADING_RE = /^#{1,6}\s+Liste de contr[oô]le\s*$/i;

/** Flip the Nth (0-based) checkbox in a markdown string. */
export function toggleNthChecklistLine(md: string, n: number): string {
  let seen = -1;
  return md
    .split("\n")
    .map((ln) => {
      if (!CHECKBOX_RE.test(ln)) return ln;
      seen += 1;
      if (seen !== n) return ln;
      return ln.replace(
        /^(\s*[-*]\s+\[)( |x|X)(\])/,
        (_m, pre, mark, post) => `${pre}${mark === " " ? "x" : " "}${post}`,
      );
    })
    .join("\n");
}

/**
 * Split a description into its free body and the "Liste de contrôle" items.
 * Everything before the checklist heading stays in `body`; checkbox lines after
 * it become items. If there is no checklist heading, body = the whole string.
 */
export function splitChecklist(md: string | null | undefined): {
  body: string;
  items: ChecklistItem[];
} {
  const src = md ?? "";
  const lines = src.split("\n");
  const headingIdx = lines.findIndex((l) => CHECKLIST_HEADING_RE.test(l.trim()));
  if (headingIdx === -1) return { body: src, items: [] };

  const items: ChecklistItem[] = [];
  for (const l of lines.slice(headingIdx + 1)) {
    const m = l.match(CHECKBOX_RE);
    if (m) items.push({ done: m[2].toLowerCase() === "x", text: m[5].trim() });
  }
  const body = lines.slice(0, headingIdx).join("\n").trimEnd();
  return { body, items };
}

/** Recompose a description from a free body and checklist items. */
export function assembleDescription(
  body: string,
  items: ChecklistItem[],
): string {
  const clean = (body ?? "").trimEnd();
  const valid = items.filter((i) => i.text.trim());
  if (valid.length === 0) return clean;
  const list = valid
    .map((i) => `- [${i.done ? "x" : " "}] ${i.text.trim()}`)
    .join("\n");
  return `${clean ? clean + "\n\n" : ""}## Liste de contrôle\n${list}`;
}

function buildComponents(
  source: string,
  onToggle?: (next: string) => void,
): Components {
  let cbIndex = -1;
  return {
    h1: (p) => <p className="mt-2 font-semibold text-fg">{p.children}</p>,
    h2: (p) => <p className="mt-2 font-semibold text-fg">{p.children}</p>,
    h3: (p) => <p className="mt-2 font-semibold text-fg">{p.children}</p>,
    p: (p) => <p className="text-muted">{p.children}</p>,
    strong: (p) => (
      <strong className="font-semibold text-fg">{p.children}</strong>
    ),
    ul: (p) => (
      <ul className="list-disc space-y-0.5 pl-4 marker:text-faint">
        {p.children}
      </ul>
    ),
    ol: (p) => (
      <ol className="list-decimal space-y-0.5 pl-4 marker:text-faint">
        {p.children}
      </ol>
    ),
    li: (p) => {
      const isTask = (p.className ?? "").includes("task-list-item");
      return (
        <li className={isTask ? "-ml-4 flex list-none items-start gap-1.5" : ""}>
          {p.children}
        </li>
      );
    },
    blockquote: (p) => (
      <blockquote className="border-l-2 border-border pl-2 text-faint">
        {p.children}
      </blockquote>
    ),
    input: (p) => {
      if (p.type !== "checkbox") return <input {...p} />;
      const idx = (cbIndex += 1);
      return (
        <input
          type="checkbox"
          checked={!!p.checked}
          disabled={!onToggle}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggle?.(toggleNthChecklistLine(source, idx))}
          className="mt-0.5 shrink-0 cursor-pointer accent-sky-500 [color-scheme:light]"
        />
      );
    },
  };
}

/** Shared markdown renderer. Checkboxes are interactive only when `onToggle` is set. */
export function Markdown({
  source,
  onToggle,
}: {
  source: string;
  onToggle?: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5 text-sm text-muted [&_code]:rounded [&_code]:bg-elevated [&_code]:px-1 [&_a]:text-sky-600 [&_a]:underline">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildComponents(source, onToggle)}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
