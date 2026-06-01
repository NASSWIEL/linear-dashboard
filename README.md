# Linear Dashboard

A real-time dashboard for Linear issues (team **REC** / Recast-test): KPI cards,
a status Kanban board, an overdue panel, a status donut and a priority
breakdown — with a **sidebar project switcher** that filters every panel. Built
with Next.js 16 (App Router) + TypeScript + Tailwind v4, reading the Linear
GraphQL API directly.

GitHub ↔ Linear stays in sync through Linear's **native GitHub integration**
(two-way: issues, status, assignees, comments). The dashboard simply reads the
current Linear state, so it reflects both Linear edits and GitHub-driven changes.

## How it works

- `src/lib/linear.ts` — server-only Linear GraphQL client (`fetchAllIssues`,
  `fetchProjects`). Uses `Authorization: <LINEAR_API_KEY>` (Personal API keys
  take the raw key, **no `Bearer` prefix**).
- `src/lib/metrics.ts` — pure, unit-tested logic: `isOverdue`, `deriveMetrics`,
  `filterByProject`. Overdue is a date-only compare; an issue due **today is not
  overdue**, and `completed`/`canceled` issues are never overdue.
- `src/app/api/issues` & `src/app/api/projects` — dynamic route handlers
  (`force-dynamic`) that return JSON. They hit Linear fresh on every request.
- `src/components/Dashboard.tsx` — client component. Polls `/api/issues` every
  12s with SWR, reads the selected project from the `?project=` URL param,
  filters client-side and recomputes metrics per project.

### Real-time

The browser refreshes via SWR polling (~12s), so the dashboard always converges
on the current Linear state within one poll. There is intentionally **no server
cache and no webhook** — at this scale polling delivers the same perceived
freshness with far fewer moving parts. See *Optional: webhook* below if you want
server-side push later.

## Prerequisites

- **Linear Personal API key** — Linear → Settings → API → Personal API keys.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in LINEAR_API_KEY
npm run dev                  # http://localhost:3000
```

`.env.local`:

```
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxxxxxx
LINEAR_TEAM_KEY=REC
NEXT_PUBLIC_LINEAR_TEAM_KEY=REC
```

### Offline / demo mode (no API key)

Set `LINEAR_FIXTURES=1` to serve a deterministic dataset that exercises every
edge case (overdue, due-today, completed-past-due, unassigned, no-project,
empty project, label truncation, all priorities and states). Used by the E2E
tests so they run without touching Linear.

```bash
# PowerShell
$env:LINEAR_FIXTURES="1"; npm run dev
```

## Testing

```bash
npm test          # vitest — pure logic + fixture-shape assertions (29 tests)
npm run build     # type-check + production build
```

End-to-end (Playwright): run the dev server with `LINEAR_FIXTURES=1`, then drive
`http://localhost:<port>` — assert KPI values, board columns, project switching
(`?project=`), the empty-project state, and overdue membership.

## GitHub ↔ Linear native integration (one-time)

1. Linear → Settings → Features → Integrations → **GitHub → Connect** (OAuth).
2. Link repository **`NASSWIEL/RAG`** to team **REC**.
3. Enable two-way **issue sync** and **pull request automation**.
4. Branch names like `rec-16-...` and magic words (`Closes REC-16`) auto-link;
   opening a PR moves the issue to In Progress/In Review, merging → Done.

## Deployment (Vercel)

1. Push this repo to GitHub (`NASSWIEL/linear-dashboard`).
2. Import it in Vercel; framework auto-detects as Next.js.
3. Set env vars `LINEAR_API_KEY`, `LINEAR_TEAM_KEY`, `NEXT_PUBLIC_LINEAR_TEAM_KEY`
   (Production + Preview). Do **not** set `LINEAR_FIXTURES`.
4. Deploy.

### Optional: webhook (server-side push)

Not needed for the polling model. If you later want the server to refresh the
instant Linear changes:

1. Wrap `fetchAllIssues` in `unstable_cache(fn, ['linear-issues'], { tags: ['linear-issues'], revalidate: 30 })`.
2. Add `src/app/api/linear-webhook/route.ts` that reads the **raw** body, verifies
   the `Linear-Signature` HMAC-SHA256 against your webhook secret, then calls
   `revalidateTag('linear-issues', { expire: 0 })` (immediate expiry is the
   documented choice for external webhooks; the single-arg form is deprecated).
3. Register the webhook in Linear (Settings → API → Webhooks) pointing at the
   deployed `/api/linear-webhook` URL, subscribed to Issues.
