import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 雪鑰自動掃 launchpad — 對比 GitHub 最近 commits 跟 TODO/DOING 卡、自動移完成的到 DONE
 *
 * POST /api/admin/kanban/auto-sync  ← admin / cron 都能打
 *   admin 走 cookie auth、cron 走 ?secret=$CRON_SECRET
 *
 * 流程：
 *   1. 撈 launchpad 所有 board 的 TODO/DOING/進行中/評估中 column 全部 cards
 *   2. 撈 GitHub repo 最近 100 commits（不需 auth、public）
 *   3. 餵雪鑰、判斷哪些 card 已完成（根據 commit message + 邏輯推理）
 *   4. 對於 confidence=high 的、自動 PATCH card.column_id → 同 board 的 DONE/已上線/採納
 *   5. 回報移了哪幾張、給林董一份報告
 *
 * Env: GITHUB_REPO（'luffysky/ai-island-web'）
 */

const DEFAULT_REPO = "luffysky/ai-island-web";

async function gate(req: NextRequest) {
  // 兩條認證路徑：cron secret OR admin cookie
  const cronSecret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return { ok: true as const };

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, body: { error: "unauthorized" } };
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(p as any)?.is_owner && !["admin", "owner"].includes((p as any)?.role ?? "")) {
    return { ok: false as const, status: 403, body: { error: "forbidden" } };
  }
  return { ok: true as const };
}

async function fetchGithubCommits(): Promise<Array<{ sha: string; message: string; date: string }>> {
  const repo = process.env.GITHUB_REPO ?? DEFAULT_REPO;
  // 2 次 retry、500ms 間隔
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=100`, {
        headers: {
          "Accept": "application/vnd.github+json",
          "User-Agent": "ai-island/1.0",
          ...(process.env.GITHUB_TOKEN ? { "Authorization": `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = await res.json();
        return ((data ?? []) as any[]).map((c) => ({
          sha: c.sha?.slice(0, 7) ?? "",
          message: String(c.commit?.message ?? "").split("\n")[0].slice(0, 150),
          date: c.commit?.author?.date ?? "",
        }));
      }
    } catch { /* retry */ }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 500));
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e: any) {
    console.error("[kanban/auto-sync] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({
      ok: false,
      error: e?.message ? `internal_error: ${String(e.message).slice(0, 200)}` : "internal_error",
    }, { status: 500 });
  }
}

async function handle(req: NextRequest) {
  const g = await gate(req);
  if (!g.ok) return NextResponse.json(g.body, { status: g.status });

  const admin = createSupabaseAdmin();

  // 撈所有 board + columns + cards (in TODO/DOING/進行中/評估中)
  const [boardsRes, colsRes] = await Promise.all([
    admin.from("admin_kanban_boards").select("id, slug, title"),
    admin.from("admin_kanban_columns").select("id, board_id, title"),
  ]);
  const boards = (boardsRes.data ?? []) as any[];
  const cols = (colsRes.data ?? []) as any[];

  const activeColIds = cols.filter((c) => ["TODO", "DOING", "進行中", "評估中", "待開發", "想法"].includes(c.title)).map((c) => c.id);
  const doneColByBoard: Record<string, string> = {};
  for (const c of cols) {
    if (["DONE", "已上線", "採納"].includes(c.title)) doneColByBoard[c.board_id] = c.id;
  }

  const { data: cards } = await admin
    .from("admin_kanban_cards")
    .select("id, column_id, title, description, category, updated_at")
    .in("column_id", activeColIds.length > 0 ? activeColIds : ["00000000-0000-0000-0000-000000000000"]);

  const cardList = (cards ?? []) as any[];
  if (cardList.length === 0) {
    return NextResponse.json({ ok: true, message: "沒未完成 card 可掃" });
  }

  const commits = await fetchGithubCommits();
  const githubAvailable = commits.length > 0;

  // GitHub fail 時 fallback：拉 DONE column 卡片當「已完成」reference
  let doneRef: any[] = [];
  if (!githubAvailable) {
    const doneColIds = Object.values(doneColByBoard);
    if (doneColIds.length > 0) {
      const { data: doneCards } = await admin
        .from("admin_kanban_cards")
        .select("title, description, updated_at")
        .in("column_id", doneColIds)
        .order("updated_at", { ascending: false })
        .limit(80);
      doneRef = (doneCards ?? []) as any[];
    }
  }

  if (!githubAvailable && doneRef.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "github_fetch_failed_or_no_commits",
      hint: "可能 GitHub API 暫不可達 / rate limit (60/hr 沒帶 token)、且 DONE column 也沒卡可比對。設 GITHUB_TOKEN env 提額度。",
    });
  }

  const apiKey = await getProviderKey("anthropic");
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "no_anthropic_key" }, { status: 503 });
  }
  const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");

  const prompt = githubAvailable
    ? `你是雪鑰、AI 島常駐 AI。林董叫你掃 launchpad 看哪些「待辦 / 進行中」其實已經做完了、要移到 DONE。

# 最近 ${commits.length} 個 git commit messages
${commits.map((c, i) => `${i + 1}. [${c.sha}] ${c.message}`).join("\n")}

# 未完成的卡片 (${cardList.length} 張、column = TODO/DOING/進行中/評估中/待開發/想法)
${cardList.map((c, i) => `${i + 1}. [${c.id}] ${c.title}${c.description ? ` — ${c.description.slice(0, 100)}` : ""}`).join("\n")}

# 任務
對每張卡判斷：根據 commit message、這張卡是否已經 **完整做完**？
- 完整做完 → 寫進「completed」、給 commit sha + 1 句理由
- 部分完成（一半 commit、還有後續）→ 不算、跳過
- 完全沒做 → 跳過、不要列出來

不要列「可能做完但不確定」、寧可少列也不要錯。`
    : `你是雪鑰、AI 島常駐 AI。GitHub API 暫不可達、改用 DONE column 卡片當「已完成」reference、找 TODO/DOING 重複的。

# 已上線 (DONE / 採納) 卡片 (${doneRef.length} 張)
${doneRef.map((c, i) => `${i + 1}. ${c.title}${c.description ? ` — ${c.description.slice(0, 80)}` : ""}`).join("\n")}

# 未完成的卡片 (${cardList.length} 張)
${cardList.map((c, i) => `${i + 1}. [${c.id}] ${c.title}${c.description ? ` — ${c.description.slice(0, 100)}` : ""}`).join("\n")}

# 任務
對每張「未完成」卡判斷：內容是不是 **已經被「已上線」某張卡完整涵蓋了**？
- 是 → 寫進「completed」、給 commit_sha = "ref:done" + 1 句理由（指 DONE 哪張）
- 不確定 → 跳過、不要列出來
- 完全不同 → 跳過

寧可少列、不要誤判把還沒做的卡移走。

# 輸出（嚴格 JSON、無 markdown）
{
  "completed": [
    { "card_id": "uuid", "commit_sha": "abc1234 或 ref:done", "reason": "1 句話、< 40 字" }
  ]
}

# 規則
- card_id 必須對得上上面列出的、不要編造
- 看不出來的、整個 array 留空（"completed": []）
- 寧可保守不要過度自信`;

  let parsed: any;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: modelName, max_tokens: 2000, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ ok: false, error: `anthropic ${res.status}: ${body.slice(0, 200)}` }, { status: 502 });
    }
    const data = await res.json();
    const text = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ ok: false, error: "no_json", raw: text.slice(0, 300) });
    parsed = JSON.parse(m[0]);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "ai_failed" }, { status: 500 });
  }

  const completedList = (parsed.completed ?? []) as Array<{ card_id: string; commit_sha: string; reason: string }>;
  let moved = 0;
  const movedDetails: any[] = [];

  for (const item of completedList) {
    const card = cardList.find((c) => c.id === item.card_id);
    if (!card) continue;
    const board = boards.find((b) => b.id === cols.find((co) => co.id === card.column_id)?.board_id);
    if (!board) continue;
    const doneColId = doneColByBoard[board.id];
    if (!doneColId) continue;

    // 算 position 放最後
    const { count } = await admin.from("admin_kanban_cards").select("id", { count: "exact", head: true }).eq("column_id", doneColId);

    const { error } = await admin.from("admin_kanban_cards").update({
      column_id: doneColId,
      position: count ?? 0,
      meta: { ...(card as any).meta, auto_synced: true, sync_commit: item.commit_sha, sync_reason: item.reason, sync_at: new Date().toISOString() },
    }).eq("id", item.card_id);

    if (!error) {
      moved++;
      movedDetails.push({ title: card.title, board: board.title, commit: item.commit_sha, reason: item.reason });
    }
  }

  // push 通知林董（只在有移時）
  if (moved > 0) {
    try {
      const { notifyAdmin } = await import("@/lib/notify-admin");
      await notifyAdmin({
        kind: "system",
        dedupeKey: `auto_sync:${new Date().toISOString().slice(0, 10)}`,
        text: `[auto_sync] 雪鑰掃了 launchpad、自動移了 ${moved} 張卡到 DONE\n\n${movedDetails.slice(0, 5).map((d) => `✓ ${d.title} (${d.board}、commit ${d.commit})`).join("\n")}`,
      });
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    scanned_commits: commits.length,
    scanned_cards: cardList.length,
    ai_suggested: completedList.length,
    moved,
    moved_details: movedDetails,
  });
}
