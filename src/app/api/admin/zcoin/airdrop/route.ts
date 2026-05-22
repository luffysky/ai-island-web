import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

const MAX_PER_USER = 5000;
const MAX_TOTAL_USERS = 5000;
const MIN_REASON_LEN = 5;

type Segment =
  | { kind: "all" }
  | { kind: "members" }
  | { kind: "premium" }
  | { kind: "xp_gte"; value: number }
  | { kind: "level_gte"; value: number }
  | { kind: "ids"; ids: string[] };

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("id, role, username")
    .eq("id", user.id)
    .single();
  if (p?.role !== "admin") return null;
  return p;
}

async function resolveSegment(segment: Segment): Promise<string[]> {
  const admin = createSupabaseAdmin();
  const cap = MAX_TOTAL_USERS + 1; // pull one extra to detect overflow

  if (segment.kind === "all") {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .is("banned_at", null)
      .limit(cap);
    return (data ?? []).map((r: any) => r.id);
  }
  if (segment.kind === "members") {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "member")
      .is("banned_at", null)
      .limit(cap);
    return (data ?? []).map((r: any) => r.id);
  }
  if (segment.kind === "premium") {
    // 從 subscriptions 找 status=active
    const { data: subs } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("status", "active")
      .limit(cap);
    return Array.from(new Set((subs ?? []).map((r: any) => r.user_id).filter(Boolean)));
  }
  if (segment.kind === "xp_gte") {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .gte("xp", segment.value)
      .is("banned_at", null)
      .limit(cap);
    return (data ?? []).map((r: any) => r.id);
  }
  if (segment.kind === "level_gte") {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .gte("level", segment.value)
      .is("banned_at", null)
      .limit(cap);
    return (data ?? []).map((r: any) => r.id);
  }
  if (segment.kind === "ids") {
    return segment.ids.slice(0, cap);
  }
  return [];
}

// 預覽：估算 segment 人數、不寫入
export async function GET(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const kind = (sp.get("kind") ?? "all") as any;
  const value = Number(sp.get("value") ?? 0);
  const segment: Segment =
    kind === "xp_gte" ? { kind, value } :
    kind === "level_gte" ? { kind, value } :
    { kind };
  const ids = await resolveSegment(segment);
  return NextResponse.json({
    count: ids.length,
    capped: ids.length > MAX_TOTAL_USERS,
    limit: MAX_TOTAL_USERS,
  });
}

export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { segment, amount, reason } = await req.json();
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt === 0 || Math.abs(amt) > MAX_PER_USER) {
    return NextResponse.json({ error: "bad_amount", limit: MAX_PER_USER }, { status: 400 });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < MIN_REASON_LEN) {
    return NextResponse.json({ error: "reason_required", minLen: MIN_REASON_LEN }, { status: 400 });
  }
  if (!segment || !segment.kind) {
    return NextResponse.json({ error: "segment_required" }, { status: 400 });
  }

  const ids = await resolveSegment(segment as Segment);
  if (ids.length === 0) {
    return NextResponse.json({ error: "no_users_in_segment" }, { status: 400 });
  }
  if (ids.length > MAX_TOTAL_USERS) {
    return NextResponse.json({
      error: "too_many_users",
      count: ids.length,
      limit: MAX_TOTAL_USERS,
    }, { status: 413 });
  }
  if (ids.includes(me.id)) {
    // 也允許含 admin 自己、但記錄
  }

  const admin = createSupabaseAdmin();

  // 批次寫入：先寫 transactions、再更新 profiles
  const txnRows = ids.map((uid) => ({
    user_id: uid,
    type: amt > 0 ? "admin_airdrop" : "admin_deduct",
    amount: amt,
    reason: `airdrop:${reason.trim().slice(0, 200)}`,
    meta: {
      source: "admin_airdrop",
      actor_id: me.id,
      actor_username: (me as any).username,
      segment,
    },
  }));

  const { error: txErr } = await admin.from("coin_transactions").insert(txnRows);
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  // 更新 profiles：用 raw SQL 一次 update 多筆（或迴圈）
  // 用 RPC 比較好、但這裡先用迴圈、controlled 在 5000 內可接受
  let updated = 0;
  for (const uid of ids) {
    const { data: p } = await admin.from("profiles").select("z_coin").eq("id", uid).maybeSingle();
    const newBal = (p?.z_coin ?? 0) + amt;
    if (newBal < 0) continue; // 跳過會超扣的用戶
    const { error: upErr } = await admin
      .from("profiles")
      .update({ z_coin: newBal })
      .eq("id", uid);
    if (!upErr) updated++;
  }

  await admin.from("audit_logs").insert({
    actor_id: me.id,
    actor_username: (me as any).username,
    action: "admin.zcoin_airdrop",
    target_type: "segment",
    target_id: segment.kind,
    changes: {
      segment,
      amount: amt,
      targeted: ids.length,
      updated,
      reason: reason.trim(),
    },
    ip: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ ok: true, targeted: ids.length, updated, delta: amt });
}
