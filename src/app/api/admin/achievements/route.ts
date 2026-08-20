import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORIES = ["milestone", "speed", "social", "perfect", "hidden"];
const RARITIES = ["common", "rare", "epic", "legendary"];

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

// GET — 成就清單 + 各成就解鎖人數
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const admin = createSupabaseAdmin();
  const { data: achievements } = await admin
    .from("achievements")
    .select("*")
    .order("xp_reward", { ascending: false });
  const { data: unlocks } = await admin.from("user_achievements").select("achievement_id");
  const unlockCount: Record<string, number> = {};
  (unlocks ?? []).forEach((u: any) => {
    unlockCount[u.achievement_id] = (unlockCount[u.achievement_id] ?? 0) + 1;
  });
  return NextResponse.json({ achievements: achievements ?? [], unlockCount });
}

// POST — 新增成就（id 為 slug 主鍵、需唯一）
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const b = await req.json().catch(() => ({}) as any);
  const id = String(b.id ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const name = String(b.name ?? "").trim().slice(0, 80);
  const description = String(b.description ?? "").trim().slice(0, 300);
  const icon = String(b.icon ?? "").trim().slice(0, 8);
  if (!id || !name || !description || !icon) {
    return NextResponse.json({ error: "缺 id/name/description/icon（id 只能小寫英數與 -）" }, { status: 400 });
  }
  const category = CATEGORIES.includes(b.category) ? b.category : "milestone";
  const rarity = RARITIES.includes(b.rarity) ? b.rarity : "common";
  const xp_reward = clampInt(b.xp_reward, 100, 0, 100000);
  const z_coin_reward = clampInt(b.z_coin_reward, 20, 0, 100000);
  const admin = createSupabaseAdmin();
  const { data: exists } = await admin.from("achievements").select("id").eq("id", id).maybeSingle();
  if (exists) return NextResponse.json({ error: `id「${id}」已存在` }, { status: 409 });
  const { data, error } = await admin
    .from("achievements")
    .insert({ id, name, description, icon, category, xp_reward, z_coin_reward, rarity })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ achievement: data });
}

// PATCH ?id= — 編輯（不允許改 id 主鍵）
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const b = await req.json().catch(() => ({}) as any);
  const patch: Record<string, any> = {};
  if (typeof b.name === "string") patch.name = b.name.trim().slice(0, 80);
  if (typeof b.description === "string") patch.description = b.description.trim().slice(0, 300);
  if (typeof b.icon === "string") patch.icon = b.icon.trim().slice(0, 8);
  if (CATEGORIES.includes(b.category)) patch.category = b.category;
  if (RARITIES.includes(b.rarity)) patch.rarity = b.rarity;
  if (b.xp_reward !== undefined) patch.xp_reward = clampInt(b.xp_reward, 100, 0, 100000);
  if (b.z_coin_reward !== undefined) patch.z_coin_reward = clampInt(b.z_coin_reward, 20, 0, 100000);
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("achievements").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ achievement: data });
}

// DELETE ?id= — 刪除（若已有人解鎖會被 FK 擋下，回明確錯誤）
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { count } = await admin
    .from("user_achievements")
    .select("achievement_id", { count: "exact", head: true })
    .eq("achievement_id", id);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `已有 ${count} 人解鎖此成就，不能刪除（避免破壞使用者紀錄）。可改為編輯內容。` },
      { status: 409 },
    );
  }
  const { error } = await admin.from("achievements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
