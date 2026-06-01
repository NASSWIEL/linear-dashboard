import { inviteWorkspaceMember } from "@/lib/linear";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, role } = (await req.json()) as {
      email: string;
      role?: "member" | "admin" | "guest";
    };
    if (!email?.trim()) {
      return Response.json({ error: "Email obligatoire" }, { status: 400 });
    }
    const result = await inviteWorkspaceMember(email.trim(), role ?? "member");
    return Response.json({ success: true, email: result.email }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return Response.json({ error: message }, { status: 500 });
  }
}
