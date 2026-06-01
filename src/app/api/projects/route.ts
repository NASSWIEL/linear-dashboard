import { createProject, fetchProjects } from "@/lib/linear";
import { FIXTURE_PROJECTS } from "@/lib/fixtures";
import type { CreateProjectInput } from "@/lib/types";

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateProjectInput;
    if (!body.name?.trim()) {
      return Response.json({ error: "Le nom est obligatoire" }, { status: 400 });
    }
    const project = await createProject({
      name: body.name.trim(),
      description: body.description,
      color: body.color,
    });
    return Response.json({ project }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
