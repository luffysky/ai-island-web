import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { notifyAdmin } from "@/lib/notify-admin";
import { buildSimpleCard } from "@/lib/line-flex";

export const dynamic = "force-dynamic";

// 同 page+IP 1 分鐘內不重複（短期 dedupe 避免 beforeunload + path-change 雙觸發）
const recent = new Map<string, number>();

const NOTIFY_PATHS = [/^\/$/, /^\/chapters/, /^\/courses/, /^\/forum/, /^\/blogs/, /^\/island/];
function shouldNotify(path: string): boolean { return NOTIFY_PATHS.some((re) => re.test(path)); }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const path = String(body.path ?? "/").slice(0, 200);
  const durationMs = Number(body.durationMs ?? 0);
  if (!shouldNotify(path)) return NextResponse.json({ ok: true, skipped: "path" });
  if (durationMs < 5000) return NextResponse.json({ ok: true, skipped: "too_short" }); // 不到 5 秒不報

  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()) || req.headers.get("x-real-ip") || "0.0.0.0";
  const key = `${ip}|${path}|leave`;
  const now = Date.now();
  if ((recent.get(key) ?? 0) > now - 60_000) return NextResponse.json({ ok: true, skipped: "dedupe" });
  recent.set(key, now);

  let userTag = "👀 訪客";
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("display_name, username, role").eq("id", user.id).single();
      const name = (p as any)?.display_name || (p as any)?.username || user.email?.split("@")[0] || "user";
      const role = (p as any)?.role;
      const roleTag = role === "admin" ? " 👑" : role === "editor" ? " ✏️" : "";
      userTag = `🔑 ${name}${roleTag}`;
    }
  } catch {}

  const sec = Math.round(durationMs / 1000);
  const human = sec < 60 ? `${sec} 秒` : sec < 3600 ? `${Math.round(sec / 60)} 分鐘` : `${(sec / 3600).toFixed(1)} 小時`;

  const flex = buildSimpleCard({
    emoji: "🚪",
    title: `${userTag.replace(/^[👀🔑] /, "")} 離開`,
    accentColor: "#bd93f9",
    meta: [
      { label: "📄 頁面", value: path },
      { label: "⏱️ 停留", value: human },
    ],
  });

  notifyAdmin({
    kind: "leave",
    dedupeKey: key,
    text: `${userTag} 離開 ${path}（停留 ${human}）`,
    flex,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
