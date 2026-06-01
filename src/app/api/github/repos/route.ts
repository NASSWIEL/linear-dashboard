import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
}

export async function GET() {
  const session = await auth();
  const token = (session as typeof session & { accessToken?: string })
    ?.accessToken;

  if (!token) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&type=all",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const body = await res.text();
    return Response.json(
      { error: `GitHub API error ${res.status}: ${body.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const raw = (await res.json()) as GitHubRepo[];
  return Response.json({
    repos: raw.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      private: r.private,
    })),
  });
}
