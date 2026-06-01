import {
  addProjectMember,
  fetchProjectMembership,
  removeProjectMember,
} from "@/lib/linear";

export const dynamic = "force-dynamic";

// NOTE: POC has no auth. Gate these mutations before sharing the URL.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (process.env.LINEAR_FIXTURES === "1") {
      const { FIXTURE_META } = await import("@/lib/fixtures");
      return Response.json({
        members: FIXTURE_META.users,
        leadId: FIXTURE_META.users[0]?.id ?? null,
      });
    }
    return Response.json(await fetchProjectMembership(id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = (await req.json()) as { userId?: string };
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }
    return Response.json(await addProjectMember(id, userId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }
    return Response.json(await removeProjectMember(id, userId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
