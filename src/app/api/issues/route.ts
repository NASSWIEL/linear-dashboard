import { fetchAllIssues } from "@/lib/linear";
import { deriveMetrics } from "@/lib/metrics";
import { fixtureIssues } from "@/lib/fixtures";

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
