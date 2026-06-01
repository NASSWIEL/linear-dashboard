import Anthropic from "@anthropic-ai/sdk";
import type { Issue } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ActionItem {
  id: string;
  titre: string;
  raison: string;
}

interface SummaryResult {
  immediat: ActionItem[];
  surveiller: ActionItem[];
  résumé: string;
  generatedAt: number;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY non configurée." },
      { status: 500 },
    );
  }

  try {
    const { issues, projectName, assigneeLabel } = (await req.json()) as {
      issues: Issue[];
      projectName: string;
      assigneeLabel: string | null;
    };

    if (!issues?.length) {
      return Response.json(
        { error: "Aucune tâche à analyser." },
        { status: 400 },
      );
    }

    const issuesSummary = issues.map((i) => ({
      id: i.identifier,
      titre: i.title,
      priorité: i.priorityLabel,
      statut: i.state.name,
      type: i.state.type,
      échéance: i.dueDate ?? "aucune",
      assigné: i.assignee?.displayName ?? "Non assigné",
    }));

    const contextLine = assigneeLabel
      ? `, filtré par la personne "${assigneeLabel}"`
      : "";

    const prompt = `Tu es un assistant de gestion de projet agile. Analyse les tâches ci-dessous et réponds en JSON uniquement, sans markdown.
Contexte : projet "${projectName}"${contextLine}. Aujourd'hui : ${new Date().toISOString().slice(0, 10)}.

Tâches :
${JSON.stringify(issuesSummary, null, 2)}

Réponds avec exactement ce JSON (rien d'autre) :
{
  "immediat": [{ "id": "REC-XX", "titre": "...", "raison": "..." }],
  "surveiller": [{ "id": "REC-XX", "titre": "...", "raison": "..." }],
  "résumé": "..."
}

Règles :
- "immediat" (max 5) : tâches en retard (échéance < aujourd'hui et non terminées/annulées) OU priorité Urgente/Haute non terminées.
- "surveiller" (max 5) : tâches à risque — non assignées, échéance dans < 3 jours, ou statut bloqué.
- "résumé" : 2-3 phrases concises en français pour le responsable. Mentionne le nombre de bloquants et la priorité d'action.
- Ne cite pas les tâches déjà terminées ou annulées dans les listes.`;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const result = JSON.parse(cleaned) as Omit<SummaryResult, "generatedAt">;

    return Response.json({
      ...result,
      generatedAt: Date.now(),
    } satisfies SummaryResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return Response.json({ error: message }, { status: 500 });
  }
}
