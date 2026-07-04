import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { recordFeedback, getReasoningRun } from "@/lib/creator-engine/fie/feedback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { candidateId, verdict:'accepted'|'rejected'|'edited', note? } → { ok } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { runId } = await params;
  const b = await req.json().catch(() => ({} as any));
  const candidateId = String(b.candidateId ?? "");
  const verdict = b.verdict;
  if (!candidateId || !["accepted", "rejected", "edited"].includes(verdict)) return NextResponse.json({ error: "validation", message: "缺 candidateId / verdict" }, { status: 422 });

  const data = await getReasoningRun(runId);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await requireWorkspaceRole((data.run as any).workspace_id, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  const r = await recordFeedback(u.userId, runId, candidateId, verdict, b.note);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
