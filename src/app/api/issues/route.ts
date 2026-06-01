import { createIssue, fetchAllIssues } from "@/lib/linear";
import { deriveMetrics } from "@/lib/metrics";
import { fixtureIssues } from "@/lib/fixtures";
import type { CreateIssueInput } from "@/lib/types";

// Always run at request time and hit Linear fresh; SWR on the client drives the
// polling cadence. No server cache to invalidate -> no webhook needed.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const issues =
      process.env.LINEAR_FIXTURES === "1"
        ? fixtureIssues()
        : await fetchAllIssues();
    const metrics = deriveMetrics(issues);
    return Response.json({ issues, metrics, fetchedAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // NOTE: POC has no auth. Before sharing the URL, gate this behind a session
  // cookie check (see docs/POC-PLAN.md, Security).
  try {
    const body = (await req.json()) as CreateIssueInput;
    if (!body.title || !body.title.trim()) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }
    const issue = await createIssue(body);
    return Response.json({ issue }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
