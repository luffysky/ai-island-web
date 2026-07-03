import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { encryptKey, maskKey } from "@/lib/ai-crypto";

// GET /api/user/ai-keys - 列出（不含原文 / 加密值；metadata 只帶 masked+base_url+model）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("user_api_keys")
    .select("id, provider, label, is_active, created_at, last_used_at, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

// POST /api/user/ai-keys - 新增一把 key（insert 新 row、不 upsert/覆蓋）
// 支援同一 provider 多把（各自 label）；custom 另存 base_url + model 到 metadata。
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { provider, apiKey, label, baseUrl, model } = await req.json();
  if (!provider || !apiKey) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }
  if (provider === "custom" && (!baseUrl || !model)) {
    return NextResponse.json({ error: "自訂端點需填 Base URL 與模型名" }, { status: 400 });
  }

  const encrypted = encryptKey(apiKey);

  // metadata：masked 給列表顯示（不解密原文）；custom 才存 base_url / model。
  const metadata: Record<string, string> = { masked: maskKey(apiKey) };
  if (provider === "custom") {
    metadata.base_url = String(baseUrl).trim().replace(/\/+$/, "");
    metadata.model = String(model).trim();
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("user_api_keys")
    .insert({
      user_id: user.id,
      provider,
      api_key_encrypted: encrypted,
      label: label || `${provider} key`,
      is_active: true,
      metadata,
    })
    .select("id, provider, label, is_active, created_at, last_used_at, metadata")
    .single();

  if (error) {
    // 23505 = 舊的 UNIQUE (user_id, provider) 還在 → 同 provider 只能一把。
    // 要開放同 provider 多把、跑 supabase/user_api_keys_metadata_migration.sql（會 drop 該 constraint）。
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "此 provider 已有一把 key（目前每個 provider 限一把）。要換的話先刪掉舊的。" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, key: data, masked: maskKey(apiKey) });
}

// PATCH /api/user/ai-keys - 切換啟用狀態 { id, is_active }
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, is_active } = await req.json();
  if (!id || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("user_api_keys")
    .update({ is_active })
    .eq("id", id)
    .eq("user_id", user.id) // 只能改自己的
    .select("id, provider, label, is_active, created_at, last_used_at, metadata")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, key: data });
}

// DELETE /api/user/ai-keys?id=xxx（新）或 ?provider=xxx（舊、向後相容）
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const provider = params.get("provider");
  if (!id && !provider) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  let q = admin.from("user_api_keys").delete().eq("user_id", user.id);
  q = id ? q.eq("id", id) : q.eq("provider", provider as string);
  const { error } = await q;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
