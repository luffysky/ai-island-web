import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { encryptKey, maskKey } from "@/lib/ai-crypto";

// GET /api/user/ai-keys - 列出（masked）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("user_api_keys")
    .select("id, provider, label, is_active, created_at, last_used_at")
    .eq("user_id", user.id);

  return NextResponse.json({ keys: data ?? [] });
}

// POST /api/user/ai-keys - 加 / 更新
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { provider, apiKey, label } = await req.json();
  if (!provider || !apiKey) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const encrypted = encryptKey(apiKey);

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("user_api_keys")
    .upsert({
      user_id: user.id,
      provider,
      api_key_encrypted: encrypted,
      label: label || `${provider} key`,
      is_active: true,
    }, { onConflict: "user_id,provider" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, masked: maskKey(apiKey) });
}

// DELETE /api/user/ai-keys?provider=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const provider = new URL(req.url).searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "missing_provider" }, { status: 400 });

  const admin = createSupabaseAdmin();
  await admin
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  return NextResponse.json({ ok: true });
}
