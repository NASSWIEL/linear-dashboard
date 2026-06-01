import { fetchProjects } from "@/lib/linear";
import { FIXTURE_PROJECTS } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects =
      process.env.LINEAR_FIXTURES === "1"
        ? FIXTURE_PROJECTS
        : await fetchProjects();
    return Response.json({ projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
