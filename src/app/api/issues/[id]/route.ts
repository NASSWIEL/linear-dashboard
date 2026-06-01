import { archiveIssue, updateIssue } from "@/lib/linear";
import type { UpdateIssueInput } from "@/lib/types";

export const dynamic = "force-dynamic";

// NOTE: POC has no auth. Before sharing the URL, gate these mutations behind a
// session cookie check (see docs/POC-PLAN.md, Security).

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateIssueInput;
    const issue = await updateIssue(id, body);
    return Response.json({ issue });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const success = await archiveIssue(id);
    return Response.json({ success });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
