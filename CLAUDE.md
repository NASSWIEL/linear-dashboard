@AGENTS.md

# Suivi IA — AT (Linear Dashboard)

## Stack

- **Next.js 16.2.6** (App Router, Turbopack) — NOT Next.js 15. Breaking changes exist; check `node_modules/next/dist/docs/` before touching routing or caching.
- **TypeScript** strict mode
- **Tailwind v4** — CSS-first `@theme` / `@custom-variant`, NO `tailwind.config.ts`. Semantic tokens in `globals.css` only.
- **SWR** for client-side data fetching with polling
- **recharts** for the status donut chart
- **Vitest** for unit tests (`npm test`)
- Node v24, npm 11

## Key commands

```powershell
cd C:\retrodoc\frame-agnetic\dashboard

npm run dev          # real Linear data (needs .env.local)
$env:LINEAR_FIXTURES="1"; npm run dev   # offline demo mode (no key needed)
npm test             # vitest unit tests (37 tests)
npm run build        # production build check
```

Dev server runs on port 3002 (3000 is usually occupied).

## Environment variables

`.env.local` (gitignored) — required for real data:
```
LINEAR_API_KEY=<personal key from Linear → Settings → API>
LINEAR_TEAM_KEY=REC
NEXT_PUBLIC_LINEAR_TEAM_KEY=REC
```

**NEVER** set these via `vercel env add` piped in PowerShell — PowerShell adds a BOM (U+FEFF) that breaks the Authorization header. Use the Vercel dashboard UI instead.

## Directory map

```
src/
  app/
    page.tsx                    # entry point (Suspense wrapper)
    layout.tsx                  # no-flash theme script, metadata
    globals.css                 # semantic token system (dark/light)
    api/
      issues/route.ts           # GET all issues + POST create
      issues/[id]/route.ts      # PATCH update + DELETE (archive)
      projects/route.ts         # GET all projects
      projects/[id]/members/    # GET/POST/DELETE membership
      meta/route.ts             # GET {users, states} for dropdowns
  lib/
    linear.ts                   # GraphQL client (server-only)
    metrics.ts                  # pure functions: isOverdue, deriveMetrics, filter*
    types.ts                    # all TypeScript interfaces
    fixtures.ts                 # offline deterministic dataset (LINEAR_FIXTURES=1)
    format.ts                   # relativeTime helper
  components/
    Dashboard.tsx               # main client component (SWR, URL params, mutations)
    Sidebar.tsx                 # project switcher + people filter
    KpiCards.tsx                # 6 clickable KPI filter cards
    KanbanBoard.tsx             # issues grouped by status column
    IssueCard.tsx               # inline status/assignee dropdowns, edit/archive
    IssueModal.tsx              # create/edit modal
    MembersModal.tsx            # add/remove project members
    StatusChart.tsx             # recharts donut
    PriorityBreakdown.tsx
    OverduePanel.tsx
    ThemeToggle.tsx             # dark/light toggle, persists to localStorage
    DashboardContext.tsx        # meta + mutation functions via context
public/assets/
  lg_cgi_color.png              # CGI wordmark logo (red)
```

## Linear API conventions

- Auth header: `Authorization: <key>` — **NO `Bearer` prefix**
- GraphQL endpoint: `https://api.linear.app/graphql`
- Team key: `REC`
- All route handlers use `export const dynamic = "force-dynamic"` — no server cache
- Delete = `issueArchive` mutation (reversible, not hard delete)
- Project membership: `projectUpdate(input:{memberIds:[...]})` — no dedicated add/remove mutation; read current set, write modified list

## URL param composition

Three params compose left-to-right:
1. `?project=<id>` — scopes the entire dashboard (KPIs, charts, board)
2. `?assignee=<id|"unassigned">` — further narrows within the project
3. `?filter=<MetricFilter>` — narrows the board only (KPI type filter)

## Theme system

Semantic CSS vars in `globals.css`:
- `:root` = light: `--bg`, `--surface`, `--elevated`, `--border`, `--fg`, `--muted`, `--faint`
- `.dark` = dark overrides
- Exposed as Tailwind utilities via `@theme inline`: `bg-bg`, `bg-surface`, `text-fg`, `text-muted`, etc.
- `@custom-variant dark (&:where(.dark, .dark *))` in globals.css
- **Never** use hard-coded `zinc-*` colors in components — use semantic tokens only

## Conventions

- Accent TEXT in light mode: `text-{color}-700 dark:text-{color}-300` (not `text-{color}-400` which is too faint on white)
- No comments explaining what code does — only why when non-obvious
- No emojis in `.ts`/`.tsx` files (UI strings are fine)
- Git email: always `naifsaleem20@gmail.com` (not the CGI work email)

## Deployed

- **URL:** https://linear-dashboard-beta.vercel.app
- **Vercel project:** `nayef-asswiels-projects/linear-dashboard`
- Auto-deploys on push to `main` via GitHub integration
- Currently **public / no auth** (POC mode — password gate is deferred, documented in `docs/POC-PLAN.md`)

## Overdue rule

Date-only compare (`YYYY-MM-DD`). Due **today** is NOT overdue. Completed/canceled issues are never overdue. Implemented in `src/lib/metrics.ts::isOverdue`, unit-tested.
