import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-guard";
import { notifyAdmin } from "@/lib/notify-admin";
import { buildSimpleCard } from "@/lib/line-flex";

export const dynamic = "force-dynamic";

const PostSchema = z.object({
  key_name: z.string().trim().min(1).max(120).regex(/^[A-Z][A-Z0-9_]*$/, {
    message: "key 名只能用大寫字母 / 數字 / 底線、首字字母",
  }),
  purpose: z.string().trim().min(5).max(500),
});

/**
 * POST /api/admin/env-requests
 * admin 提交 ENV 變更申請、立刻 LINE 通知 owner。
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", gate.userId)
    .single();

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.issues }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("env_change_requests")
    .insert({
      requested_by: gate.userId,
      requested_by_username: profile?.username,
      requested_by_display_name: profile?.display_name,
      key_name: parsed.data.key_name,
      purpose: parsed.data.purpose,
    })
    .select()
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "insert_failed", message: error?.message }, { status: 500 });
  }

  // LINE 通知 owner（非阻塞）
  const who = profile?.display_name || profile?.username || "admin";
  notifyAdmin({
    kind: "env_request",
    dedupeKey: `env_req_${row.id}`,
    text: `📨 ${who} 申請 ENV：${parsed.data.key_name}\n用途：${parsed.data.purpose.slice(0, 200)}`,
    flex: buildSimpleCard({
      emoji: "🔐",
      title: "ENV 變更申請",
      accentColor: "#bd93f9",
      body: parsed.data.purpose,
      meta: [
        { label: "申請人", value: who },
        { label: "Key", value: parsed.data.key_name },
      ],
      buttons: [
        { label: "打開 Zeabur", uri: "https://zeabur.com/dashboard", primary: true },
        { label: "後台檢視", uri: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${process.env.NEXT_PUBLIC_ADMIN_SLUG ?? "console-x7k2"}/admin/env` },
      ],
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, request: row });
}

/**
 * GET /api/admin/env-requests
 * 列出 pending + 最近 done/rejected。
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("env_change_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}
