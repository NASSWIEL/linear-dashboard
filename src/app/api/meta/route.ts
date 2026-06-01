import { fetchStates, fetchUsers } from "@/lib/linear";

export const dynamic = "force-dynamic";

// Users (for the reassign dropdown) and workflow states (for the status
// dropdown). Changes rarely; the client fetches it on a long SWR interval.
export async function GET() {
  try {
    if (process.env.LINEAR_FIXTURES === "1") {
      const { FIXTURE_META } = await import("@/lib/fixtures");
      return Response.json(FIXTURE_META);
    }
    const [users, states] = await Promise.all([fetchUsers(), fetchStates()]);
    return Response.json({ users, states });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
