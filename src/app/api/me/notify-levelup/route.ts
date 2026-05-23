import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { pushUserNotif } from "@/lib/notify-helpers";
import { notifyAdmin } from "@/lib/notify-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const newLevel = Number(body.newLevel ?? 0);
  if (newLevel < 2) return NextResponse.json({ ok: true });

  const { data: prof } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).single();
  const name = (prof as any)?.display_name || (prof as any)?.username || "user";

  await pushUserNotif({
    userId: user.id,
    kind: "level_up",
    title: `🎉 升等到 Lv ${newLevel}！`,
    body: "繼續努力、下個關卡更精彩",
    link: "/me",
  });
  notifyAdmin({
    kind: "level_up",
    dedupeKey: `lvup:${user.id}:${newLevel}`,
    text: `🎉 ${name} 升等到 Lv ${newLevel}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
