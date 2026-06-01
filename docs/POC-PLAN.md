# POC Plan — Linear-like CRUD dashboard

Turn the read-only dashboard into an interactive, Linear-style project tool.
**Mode: POC, public, no auth** (password gate deferred by user — see Security).

## Decisions (locked)
- **Access:** public for now; auth added later. Do NOT share the prod URL widely meanwhile (the API key can mutate the whole workspace).
- **Assignees:** real Linear members only (ASSWIEL Naif, Linear bot, Unassigned).
- **Delete = archive** (reversible via Linear `issueArchive`). No hard delete.

## Feature set
1. **Richer COVEA showcase data** — real Linear issues in the COVEA project, tagged `demo`, varied states/priorities/due-dates/assignees.
2. **Click-to-filter KPI cards** — click "Overdue"/"In progress"/"Done"/"Total" to filter the board; click again to clear. Composable with the `?project=` filter via a `?filter=` URL param.
3. **Inline status change** — a dropdown on each card (Backlog/Todo/In Progress/In Review/Done/Canceled).
4. **Inline reassign** — a dropdown on each card (real members + Unassigned).
5. **Create issue** — "New issue" button → modal (title, description, project, state, assignee, priority, due date).
6. **Edit issue** — edit title/description/priority/due date in a modal.
7. **Archive issue** — button with confirm → `issueArchive`.

## Architecture

### Data/write layer — `src/lib/linear.ts`
Add server-side functions (key stays server-only):
- `fetchUsers()` → workspace members `{ id, name, displayName, avatarUrl }` (GraphQL `users`).
- `fetchStates()` → team REC workflow states `{ id, name, type, color, position }` (GraphQL `team.states`).
- `createIssue(input)` → `issueCreate` mutation.
- `updateIssue(id, input)` → `issueUpdate` (state, assignee, title, description, priority, dueDate).
- `archiveIssue(id)` → `issueArchive`.

### API route handlers
- `app/api/issues/route.ts` — keep GET; add **POST** (create).
- `app/api/issues/[id]/route.ts` — **PATCH** (update fields), **DELETE** (archive).
- `app/api/meta/route.ts` — **GET** `{ users, states }` for the dropdowns (cached client-side via SWR, long interval).

All mutation handlers validate input and return the updated/created issue or `{ error }`.
(When auth lands: each mutation handler re-checks the session cookie.)

### Types — `src/lib/types.ts`
Add `User`, `WorkflowStateOption`, `CreateIssueInput`, `UpdateIssueInput`.

### Filtering — `src/lib/metrics.ts`
Add `filterByMetric(issues, filter)`: `all` | `overdue` | `in-progress` | `done` | `todo` | `backlog` | `unassigned`, reusing `isOverdue`/`state.type`. Dashboard composes `filterByProject` → `filterByMetric` → `deriveMetrics`.

### Components
- `KpiCards.tsx` → cards become buttons; `activeFilter` highlight; `onSelect(filter)`.
- `IssueCard.tsx` → add `StatusSelect`, `AssigneeSelect`, edit + archive buttons (only render controls when not read-only).
- New: `StatusSelect.tsx`, `AssigneeSelect.tsx` (lightweight Tailwind dropdowns), `IssueModal.tsx` (create/edit form), `Toolbar.tsx` ("New issue" button + active-filter chip).
- `Dashboard.tsx` → SWR for `/api/meta`; read `?filter=`; wire create/update/archive handlers calling the API then `mutate('/api/issues')`; pass users/states down. No optimistic updates in v1 (refetch on success).

## Phasing (execution order)
1. **Fictional COVEA data** (via Linear MCP now) — visible immediately, unblocks everything.
2. **Click-to-filter** — pure client; zero risk.
3. **Write layer + `/api/meta`** — functions + endpoints.
4. **Inline status + reassign dropdowns.**
5. **Create + edit modal + archive.**
6. **Verify** — `npm run build`, unit tests, local Playwright pass on each mutation, then deploy.
7. **(Deferred) Auth gate** — login page + `DASHBOARD_PASSWORD` env + middleware + per-mutation cookie check, before sharing.

## Verification
- Unit: extend `metrics.test.ts` for `filterByMetric`.
- Build/type-check clean.
- Local E2E (Playwright, real Linear): create → appears; status change → moves column; reassign → avatar changes; archive → disappears; each KPI filter narrows the board.
- Deploy to Vercel; smoke-test prod.

## Security (deferred, but required before real use)
The dashboard holds a **workspace-wide** Linear key and currently has **no auth**. Public write/delete = anyone with the URL can mutate your whole Linear. Acceptable only for private POC. Before sharing: add the password gate (Phase 7).
