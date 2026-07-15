@AGENTS.md

# Suivi Projets : BT-IA (Linear Dashboard)

UI for CGI / **BT-IA** unit. Workspace = Linear org "DailyKuvia", single team **Recast-test (REC)**. Real data since the Planner migration (no more demo issues).

## Stack

- **Next.js 16.2.6** (App Router, Turbopack) — NOT Next.js 15. Breaking changes exist; check `node_modules/next/dist/docs/` before touching routing or caching.
- **TypeScript** strict mode
- **Tailwind v4** — CSS-first `@theme` / `@custom-variant`, NO `tailwind.config.ts`. Semantic tokens in `globals.css` only.
- **SWR** for client-side data fetching with polling
- **recharts** for the status donut chart
- **react-markdown** + **remark-gfm** — render issue descriptions as markdown + interactive GFM task-lists (checklists) on cards and in the modal preview
- **next-auth v5 (beta)** — GitHub OAuth (wired but env vars NOT set in prod → session is dormant; see Auth note)
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
LINEAR_WEBHOOK_SECRET=<signing secret of the Linear webhook>  # for api/linear/webhook
```

Setting Vercel env via CLI works from **bash** (`printf '<val>' | npx vercel env add NAME production`) — NOT PowerShell piping (BOM). AUTH_* vars (for NextAuth) are intentionally unset (see Auth note).

**NEVER** set these via `vercel env add` piped in PowerShell — PowerShell adds a BOM (U+FEFF) that breaks the Authorization header. Use the Vercel dashboard UI instead.

## Directory map

```
src/
  app/
    page.tsx                    # entry point (Suspense wrapper)
    layout.tsx                  # no-flash theme script, metadata
    globals.css                 # semantic token system (dark/light)
    auth.ts                     # NextAuth v5 GitHub provider (root src/auth.ts)
    api/
      issues/route.ts           # GET all issues + POST create
      issues/[id]/route.ts      # PATCH update + DELETE (archive)
      projects/route.ts         # GET all projects + POST create
      projects/[id]/route.ts    # DELETE (archive project)
      projects/[id]/members/    # GET/POST/DELETE membership
      meta/route.ts             # GET {users, states} for dropdowns
      linear/webhook/route.ts   # Linear webhook (HMAC) → repo→project auto-mapping
      github/repos/route.ts     # list GitHub repos (needs session token — auth)
      workspace/invite/route.ts # POST organizationInviteCreate
      auth/[...nextauth]/route.ts
  lib/
    linear.ts                   # GraphQL client (server-only); fetchProjects is TEAM-scoped (first:50, complexity cap)
    metrics.ts                  # pure functions: isOverdue, deriveMetrics, filterByProject ("none"=no-project), filter*
    types.ts                    # all TypeScript interfaces
    fixtures.ts                 # offline deterministic dataset (LINEAR_FIXTURES=1)
    format.ts                   # relativeTime helper
  components/
    Dashboard.tsx               # main client component (SWR, URL params, mutations)
    Sidebar.tsx                 # project switcher + people filter + "Sans projet" bucket
    KpiCards.tsx                # 6 clickable KPI filter cards
    KanbanBoard.tsx             # issues grouped by status column (cards w-80)
    IssueCard.tsx               # expandable; renders desc via <Markdown> + interactive checklist; inline status/assignee, edit/archive
    Markdown.tsx                # SHARED markdown renderer (react-markdown+remark-gfm) + splitChecklist/assembleDescription/toggleNthChecklistLine
    IssueModal.tsx              # create/edit; markdown body + write/preview toggle + Planner-style checklist builder
    StatusSelect.tsx            # inline status <select> (uses ctx.updateIssue)
    AssigneeSelect.tsx          # inline assignee <select>
    MembersModal.tsx            # add/remove project members + invite workspace member
    AddProjectModal.tsx         # new project (GitHub import tab / manual tab)
    AssignProjectModal.tsx      # assign members to projects (matrix)
    StatusChart.tsx             # recharts donut
    PriorityBreakdown.tsx
    OverduePanel.tsx
    ThemeToggle.tsx             # dark/light toggle, persists to localStorage (default light)
    DashboardContext.tsx        # meta + mutation functions via context (updateIssue/archiveIssue/editIssue)
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

## Markdown descriptions & checklists

- Issue descriptions are **markdown**. Rendered via the shared `components/Markdown.tsx` (`react-markdown` + `remark-gfm`).
- **Checklists** = GFM task-list lines `- [ ]` / `- [x]` under a `## Liste de contrôle` heading. On a card they render as **interactive checkboxes**: toggling one edits the source line (`toggleNthChecklistLine`, matched by checkbox index) and persists via `updateIssue(id,{description})`.
- Empty checkbox forced white in dark mode via `[color-scheme:light]` on the input.
- `IssueModal` round-trips with `splitChecklist(md) → {body, items}` and `assembleDescription(body, items)`: free body (markdown, write/preview toggle) + a Planner-style checklist builder (add/check/edit/remove). Keep these helpers the single source of truth — reuse, don't duplicate.

## Repo → project auto-mapping (webhook)

- `api/linear/webhook/route.ts` receives Linear webhooks (Issue + Attachment), verifies HMAC-SHA256 (`LINEAR_WEBHOOK_SECRET`), and for an issue carrying a GitHub attachment, finds-or-creates a Linear project named after the repo and assigns the issue (`linkIssueToRepoProject` in linear.ts). Idempotent. Fills the gap that Linear's native GitHub sync maps repo→team, never repo→project.

## Planner migration (done 2026-06-03)

- All demo issues deleted; real data migrated from Microsoft Planner screenshots → issues **REC-71…REC-99** in project "COVEA - Suivi projet".
- Buckets → **labels** (Initialisation, Documentation legacy, Stratégie & validation, Production code, Refactoring Recast) + Planner tags as labels (Recast, Digishore, Jalon, Pilotage, Equipe).
- Multi-assignee Planner tasks → duplicated (one issue per assignee). Members not yet on Linear (Sara Ismail, Clément Leroy) → unassigned + a `> 👤 Assigné prévu : …` note in the description. Naif/Kyllian/Quentin are real Linear users.
- Companion: Notion Custom Agent that ticks checklists / updates state from meeting transcripts — instructions in `docs/notion-custom-agent-instructions.md`.

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
- Deploy with `npx vercel --prod --yes` from `dashboard/` (also auto-deploys on push to `main`).
- Currently **public / no auth** (POC mode).

## Auth note (deferred — known dormant)

NextAuth GitHub is wired (`src/auth.ts`, login page, SessionProvider) but the env vars are **not set in prod** → `/api/auth/session` returns 500 and the GitHub-import tab shows "Non authentifié" (`/api/github/repos` 401). These are the ONLY current prod console errors and are expected. To activate: create a GitHub OAuth App + set `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `ALLOWED_GITHUB_LOGINS` on Vercel. The dashboard otherwise works fully without it.

## Overdue rule

Date-only compare (`YYYY-MM-DD`). Due **today** is NOT overdue. Completed/canceled issues are never overdue. Implemented in `src/lib/metrics.ts::isOverdue`, unit-tested.
