import { fetchTeams } from "@/lib/linear";

export const dynamic = "force-dynamic";

// The workspace's teams, for the sidebar team switcher.
export async function GET() {
  try {
    if (process.env.LINEAR_FIXTURES === "1") {
      const { FIXTURE_TEAMS } = await import("@/lib/fixtures");
      return Response.json({ teams: FIXTURE_TEAMS });
    }
    return Response.json({ teams: await fetchTeams() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
