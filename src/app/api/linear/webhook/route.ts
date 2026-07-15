import crypto from "node:crypto";
import { linkIssueToRepoProject } from "@/lib/linear";

export const dynamic = "force-dynamic";

// Linear signs each delivery with HMAC-SHA256 of the raw body using the
// webhook's signing secret, sent in the `Linear-Signature` header.
function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINEAR_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface LinearWebhookPayload {
  action: string;
  type: string;
  webhookTimestamp?: number;
  data?: { id?: string; issueId?: string };
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers.get("linear-signature"))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LinearWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LinearWebhookPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Replay protection: reject deliveries whose timestamp drifts more than 60s.
  if (
    payload.webhookTimestamp &&
    Math.abs(Date.now() - payload.webhookTimestamp) > 60_000
  ) {
    return Response.json({ error: "Stale webhook" }, { status: 400 });
  }

  // We only act on issue creation and on a GitHub attachment landing on an
  // issue (the attachment carries the repo URL and may arrive after the issue).
  const isIssueCreate = payload.type === "Issue" && payload.action === "create";
  const isAttachmentEvent =
    /attachment/i.test(payload.type) &&
    (payload.action === "create" || payload.action === "update");

  if (!isIssueCreate && !isAttachmentEvent) {
    return Response.json({ ok: true, ignored: payload.type });
  }

  const issueId = isIssueCreate ? payload.data?.id : payload.data?.issueId;
  if (!issueId) return Response.json({ ok: true, ignored: "no issueId" });

  try {
    const result = await linkIssueToRepoProject(issueId);
    return Response.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Return 200 so Linear does not hammer retries on a transient/logic error;
    // the run is idempotent, so a later attachment event will retry naturally.
    return Response.json({ ok: false, error: message });
  }
}
