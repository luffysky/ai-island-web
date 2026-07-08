import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// 使用者「我的操作記錄」：把本人跨模組的操作（創作者島嶼 + 學習 + 筆記 + 討論 + 金流 + 購買）
// 匯成一條時間軸，每筆可點進該實體。全部只讀本人 user_id 的資料。
type Item = {
  id: string;
  kind: string;      // 分類（給 icon / 顏色）
  ts: string;        // ISO 時間
  title: string;
  subtitle?: string;
  href?: string | null;
};

const AGENT_LABEL: Record<string, string> = {
  synthesize: "凝聚靈感", evolve: "演化碎片", compose: "編織作品", transcreate: "文化轉譯",
  dna: "分析創作 DNA", advise: "創作顧問", assist: "創作引擎", chat: "與 AI 對話",
  coach: "創作教練週報", reason: "FIE 推理", universe: "碎片宇宙洞察",
};

function snippet(html: string, n = 40) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
}

export async function GET() {
  const supa = await createSupabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const uid = user.id;
  const admin = createSupabaseAdmin();
  const L = 30;

  const [
    agentRuns, works, lessons, notes, threads, replies, coins, purchases,
  ] = await Promise.all([
    admin.from("ci_agent_runs").select("id, agent_type, status, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(L),
    admin.from("ci_works").select("id, title, work_type, is_showcased, created_at").eq("created_by", uid).order("created_at", { ascending: false }).limit(L),
    admin.from("lesson_progress").select("id, chapter_id, lesson_id, completed_at").eq("user_id", uid).eq("completed", true).order("completed_at", { ascending: false }).limit(L),
    admin.from("notes").select("id, title, content, chapter_id, lesson_id, updated_at").eq("user_id", uid).order("updated_at", { ascending: false }).limit(L),
    admin.from("forum_threads").select("id, title, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(L),
    admin.from("forum_replies").select("id, thread_id, content, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(L),
    admin.from("coin_transactions").select("id, amount, reason, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(L),
    admin.from("note_product_purchases").select("id, product_id, price_z, created_at").eq("buyer_id", uid).order("created_at", { ascending: false }).limit(L),
  ]);

  const items: Item[] = [];

  for (const r of agentRuns.data ?? []) {
    items.push({
      id: `ar_${r.id}`, kind: "creator", ts: r.created_at,
      title: `創作者島嶼：${AGENT_LABEL[r.agent_type] ?? r.agent_type}`,
      subtitle: r.status === "succeeded" ? undefined : `狀態：${r.status}`,
      href: "/creator-island",
    });
  }
  for (const w of works.data ?? []) {
    items.push({
      id: `wk_${w.id}`, kind: "work", ts: w.created_at,
      title: `建立作品：${w.title || "（未命名）"}`,
      href: w.is_showcased ? `/works/${w.id}` : `/creator-island/works/${w.id}`,
    });
  }
  for (const l of lessons.data ?? []) {
    if (!l.completed_at) continue;
    items.push({
      id: `lp_${l.id}`, kind: "lesson", ts: l.completed_at,
      title: "完成課程",
      subtitle: `Ch${l.chapter_id}`,
      href: l.lesson_id ? `/chapters/${l.chapter_id}#lesson-${l.lesson_id}` : `/chapters/${l.chapter_id}`,
    });
  }
  for (const n of notes.data ?? []) {
    items.push({
      id: `nt_${n.id}`, kind: "note", ts: n.updated_at,
      title: `筆記：${n.title?.trim() || snippet(n.content) || "（無標題）"}`,
      href: `/me/notes/${n.id}`,
    });
  }
  for (const th of threads.data ?? []) {
    items.push({ id: `th_${th.id}`, kind: "forum", ts: th.created_at, title: `發表討論：${th.title}`, href: `/forum/thread/${th.id}` });
  }
  for (const rp of replies.data ?? []) {
    items.push({ id: `rp_${rp.id}`, kind: "forum", ts: rp.created_at, title: "回覆討論", subtitle: snippet(rp.content), href: `/forum/thread/${rp.thread_id}` });
  }
  for (const c of coins.data ?? []) {
    const sign = c.amount >= 0 ? "+" : "";
    items.push({ id: `cn_${c.id}`, kind: "coin", ts: c.created_at, title: `Z 幣 ${sign}${c.amount}`, subtitle: c.reason });
  }
  for (const p of purchases.data ?? []) {
    items.push({ id: `pu_${p.id}`, kind: "purchase", ts: p.created_at, title: `購買筆記包（-${p.price_z} Z 幣）`, href: `/notes/market/${p.product_id}` });
  }

  items.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

  return NextResponse.json({ items: items.slice(0, 80) }, { headers: { "Cache-Control": "private, max-age=10" } });
}
