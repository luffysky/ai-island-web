import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";

/**
 * 雪鑰自動掃 launchpad worker — 對比 GitHub 最近 commits 跟 TODO/DOING 卡、自動移完成的到 DONE。
 * 認證在呼叫端做（admin cookie 或 cron secret），這裡只做事。
 */

const DEFAULT_REPO = "luffysky/ai-island-web";

async function fetchGithubCommits(): Promise<Array<{ sha: string; message: string; date: string }>> {
  const repo = process.env.GITHUB_REPO ?? DEFAULT_REPO;
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

export async function runAutoSync() {
  const admin = createSupabaseAdmin();

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

  const promptHeader = githubAvailable
    ? "你是雪鑰、AI 島常駐 AI。林董叫你掃 launchpad 看哪些「待辦 / 進行中」其實已做完、要移到 DONE。"
    : "你是雪鑰、AI 島常駐 AI。GitHub API 暫不可達、改用 DONE column 卡片當「已完成」reference、找 TODO/DOING 重複的。";

  const referenceBlock = githubAvailable
    ? "# 最近 " + commits.length + " 個 git commit messages\n" + commits.map((c, i) => (i + 1) + ". [" + c.sha + "] " + c.message).join("\n")
    : "# 已上線 (DONE / 採納) 卡片 (" + doneRef.length + " 張)\n" + doneRef.map((c, i) => (i + 1) + ". " + c.title + (c.description ? " — " + String(c.description).slice(0, 80) : "")).join("\n");

  const todoBlock = "# 未完成的卡片 (" + cardList.length + " 張)\n" + cardList.map((c, i) => (i + 1) + ". [" + c.id + "] " + c.title + (c.description ? " — " + String(c.description).slice(0, 100) : "")).join("\n");

  const taskBlock = githubAvailable
    ? "# 任務\n對每張卡判斷：commit message 暗示已 **完整做完** 嗎？\n- 是 → 寫進 completed、給 commit sha + 1 句理由\n- 部分完成 → 跳過\n- 完全沒做 → 跳過\n寧可少列、不要誤判。"
    : "# 任務\n對每張未完成卡判斷：是不是已被「已上線」某張卡完整涵蓋了？\n- 是 → 寫進 completed、commit_sha 寫 ref:done + 1 句理由\n- 不確定 → 跳過\n- 完全不同 → 跳過\n寧可少列、不要誤判把還沒做的移走。";

  const outputSpec = '# 輸出（嚴格 JSON、無 markdown）\n{\n  "completed": [\n    { "card_id": "uuid", "commit_sha": "abc1234", "reason": "1 句話、< 40 字" }\n  ]\n}\n\n# 規則\n- card_id 必須對得上、不要編造\n- 看不出來的、留空陣列\n- 寧可保守';

  const prompt = promptHeader + "\n\n" + referenceBlock + "\n\n" + todoBlock + "\n\n" + taskBlock + "\n\n" + outputSpec;

  let parsed: any;
  try {
    const { text } = await completeForUsage("admin_assistant", { user: prompt, maxTokens: 2000, temperature: 0.2 });
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
