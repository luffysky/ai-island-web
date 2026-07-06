import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { runReasoning } from "@/lib/creator-engine/fie/reason";
import { bumpCreatorXp } from "@/lib/creator-engine/growth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { workspaceId, seedFragmentIds[>=1], mode?, intent?, maxCandidates? } → { runId, mode, observation, candidates[] } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  const seedFragmentIds: string[] = Array.isArray(b.seedFragmentIds) ? b.seedFragmentIds.filter((x: any) => typeof x === "string") : [];
  if (!workspaceId || seedFragmentIds.length < 1) return NextResponse.json({ error: "validation", message: "缺 workspaceId / 至少 1 個碎片" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  try {
    // 自帶 55s 逾時：整條推理若拖太久，回乾淨的 JSON 504（而不是讓上游 gateway 回 HTML 錯誤頁、前端 res.json() 爆 "Unexpected token '<'"）。
    const result = await Promise.race([
      runReasoning({ workspaceId, userId: u.userId, seedFragmentIds, mode: b.mode, intent: b.intent, maxCandidates: b.maxCandidates }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("__timeout__")), 55_000)),
    ]);
    void bumpCreatorXp(u.userId, 5); // #91 完成一次推理 +5 Creator XP
    return NextResponse.json(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "__timeout__") return NextResponse.json({ error: "timeout", message: "推理花的時間太久了，碎片少選幾個、或稍後再試一次。" }, { status: 504 });
    return NextResponse.json({ error: "reason_failed", message: msg }, { status: 502 });
  }
}
