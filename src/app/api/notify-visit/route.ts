import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { notifyAdmin } from "@/lib/notify-admin";

export const dynamic = "force-dynamic";

// In-memory dedupe（5 分鐘內同 IP+UA+path 不重通知、單實例）
const recent = new Map<string, number>();

// 預設只通知重要路徑（其他靜默）
const NOTIFY_PATHS = [
  /^\/$/,                          // 首頁
  /^\/chapters(\/.*)?$/,           // 章節
  /^\/courses(\/.*)?$/,            // 副本
  /^\/forum(\/.*)?$/,
  /^\/blogs(\/.*)?$/,
  /^\/island/,
  /^\/login/,
  /^\/signup/,
  /^\/pricing/,
];

function shouldNotify(path: string): boolean {
  return NOTIFY_PATHS.some((re) => re.test(path));
}

function parseDevice(ua: string): string {
  if (!ua) return "?";
  let os = "?", browser = "?";
  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  return `${browser} on ${os}`;
}

async function fetchGeo(ip: string): Promise<{ text: string; mapsUrl?: string }> {
  if (!ip || ip === "0.0.0.0" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return { text: "本機" };
  }
  const token = process.env.IPINFO_TOKEN;
  try {
    const url = token ? `https://ipinfo.io/${ip}/json?token=${token}` : `https://ipinfo.io/${ip}/json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { "User-Agent": "ai-island" } });
    if (!r.ok) return { text: "?" };
    const d = await r.json() as any;
    // 國家 / 城市 / 郵遞區號（縮到區概念）/ ISP / IP
    const parts = [d.country, d.city, d.postal].filter(Boolean);
    let text = parts.length ? parts.join(" · ") : "?";
    if (d.org) text += `\n📡 ${String(d.org).slice(0, 50)}`;
    text += `\n🌐 ${ip}`;
    const mapsUrl = d.loc ? `https://www.google.com/maps?q=${d.loc}` : undefined;
    return { text, mapsUrl };
  } catch {
    return { text: "?" };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const path = String(body.path ?? "/").slice(0, 200);
  const referrer = String(body.referrer ?? "").slice(0, 200);
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()) ||
             req.headers.get("x-real-ip") || "0.0.0.0";
  const ua = req.headers.get("user-agent") ?? "?";

  if (!shouldNotify(path)) return NextResponse.json({ ok: true, skipped: "path" });

  const key = `${ip}|${path}`;
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < 5 * 60_000) return NextResponse.json({ ok: true, skipped: "dedupe" });
  recent.set(key, now);

  // 清舊 entries（>1h）
  if (recent.size > 1000) {
    for (const [k, ts] of recent) if (now - ts > 3600_000) recent.delete(k);
  }

  // 判別登入狀態
  let userTag = "👀 訪客";
  let lastSeenText = "";
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("display_name, username, role, last_active_at").eq("id", user.id).single();
      const name = (p as any)?.display_name || (p as any)?.username || user.email?.split("@")[0] || "user";
      const role = (p as any)?.role;
      const roleTag = role === "admin" ? " 👑" : role === "editor" ? " ✏️" : "";
      userTag = `🔑 ${name}${roleTag}`;
      // 上次活躍距今
      const lastAt = (p as any)?.last_active_at;
      if (lastAt) {
        const diffMs = Date.now() - new Date(lastAt).getTime();
        const diffMin = Math.round(diffMs / 60000);
        if (diffMin < 1) lastSeenText = "（剛剛還在）";
        else if (diffMin < 60) lastSeenText = `（距上次 ${diffMin} 分鐘）`;
        else if (diffMin < 1440) lastSeenText = `（距上次 ${Math.round(diffMin / 60)} 小時）`;
        else lastSeenText = `（距上次 ${Math.round(diffMin / 1440)} 天）`;
      } else {
        lastSeenText = "（首次訪問）";
      }
    }
  } catch {}

  const device = parseDevice(ua);
  const geo = await fetchGeo(ip);
  const refTxt = referrer ? ` ← ${new URL(referrer).pathname}` : "";
  const mapsLine = geo.mapsUrl ? `\n📍 點看地圖：${geo.mapsUrl}` : "";

  notifyAdmin({
    kind: userTag.startsWith("👀") ? "visit" : userTag.includes("👑") ? "admin_login" : "user_login",
    dedupeKey: key,
    text: `${userTag} 看 ${path}${refTxt}${lastSeenText}\n📍 ${geo.text}\n💻 ${device}${mapsLine}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
