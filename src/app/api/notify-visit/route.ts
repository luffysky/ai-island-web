import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { notifyAdmin } from "@/lib/notify-admin";
import { buildSimpleCard } from "@/lib/line-flex";

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

async function fetchGeo(ip: string): Promise<{ location: string; org?: string; ipText: string; mapsUrl?: string }> {
  if (!ip || ip === "0.0.0.0" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return { location: "本機", ipText: ip };
  }
  // ＊來源選擇是實測出來的：對台灣凱擘(KBT)/中華等 IP，ipinfo.io 會把某些 IP 標錯城市
  //   （實測 203.204.74.176 → ipinfo 標「台中」，但 ip-api / ipapi.co 正確標「新北市」）。
  //   所以主來源用 ip-api.com（含 regionName 縣市 + city + district，實測較準），ipwho.is 次之、ipinfo 墊底。
  //   要「精準到區」還是得靠使用者授權 GPS（🎯 GPS，見 preciseLocation）。

  // 1. ip-api.com（免費免 key、含 regionName/city/district；免費版走 http、rate limit 45/min，訪問通知量夠用）
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,district,zip,lat,lon,isp,as&lang=zh-TW`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const d = await r.json() as any;
      if (d?.status === "success") {
        const parts = [d.country, d.regionName, d.city, d.district].filter(Boolean);
        const location = parts.length ? [...new Set(parts as string[])].join(" · ") : "?";
        const mapsUrl = d.lat != null && d.lon != null ? `https://www.google.com/maps?q=${d.lat},${d.lon}` : undefined;
        const org = d.isp || d.as;
        return { location, org: org ? String(org).slice(0, 60) : undefined, ipText: ip, mapsUrl };
      }
    }
  } catch { /* 換下一個來源 */ }

  // 2. ipwho.is（https、免費免 key、含 region 縣市）
  try {
    const r = await fetch(`https://ipwho.is/${ip}?lang=zh-TW`, { signal: AbortSignal.timeout(3000), headers: { "User-Agent": "ai-island" } });
    if (r.ok) {
      const d = await r.json() as any;
      if (d?.success) {
        const parts = [d.country, d.region, d.city].filter(Boolean);
        const location = parts.length ? [...new Set(parts as string[])].join(" · ") : "?";
        const mapsUrl = d.latitude != null && d.longitude != null ? `https://www.google.com/maps?q=${d.latitude},${d.longitude}` : undefined;
        const org = d.connection?.isp || d.connection?.org;
        return { location, org: org ? String(org).slice(0, 60) : undefined, ipText: ip, mapsUrl };
      }
    }
  } catch { /* 換下一個來源 */ }

  // 3. 墊底：ipinfo.io（註：對部分凱擘 IP 會標錯城市，只當最後手段；有 IPINFO_TOKEN 較準）
  const token = process.env.IPINFO_TOKEN;
  try {
    const url = token ? `https://ipinfo.io/${ip}/json?token=${token}` : `https://ipinfo.io/${ip}/json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { "User-Agent": "ai-island" } });
    if (!r.ok) return { location: "?", ipText: ip };
    const d = await r.json() as any;
    const parts = [d.country, d.region, d.city, d.postal].filter(Boolean);
    const location = parts.length ? [...new Set(parts as string[])].join(" · ") : "?";
    const mapsUrl = d.loc ? `https://www.google.com/maps?q=${d.loc}` : undefined;
    return { location, org: d.org ? String(d.org).slice(0, 60) : undefined, ipText: ip, mapsUrl };
  } catch {
    return { location: "?", ipText: ip };
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

  // 判別登入狀態（先抓 user 才能 build 正確 dedupe key + 精準位置）
  let userTag = "👀 訪客";
  let userKey = "anon";
  let lastSeenText = "";
  let preciseLocation: string | null = null; // GPS 精準縣市/區
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userKey = user.id.slice(0, 8);
      const { data: p } = await supabase.from("profiles").select("display_name, username, role, last_active_at, geo_country, geo_city").eq("id", user.id).single();
      const name = (p as any)?.display_name || (p as any)?.username || user.email?.split("@")[0] || "user";
      const role = (p as any)?.role;
      const roleTag = role === "admin" ? " 👑" : role === "editor" ? " ✏️" : "";
      userTag = `🔑 ${name}${roleTag}`;
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
      // 用戶有授權 GPS 精準位置 → 優先用這個
      const geoCity = (p as any)?.geo_city;
      const geoCountry = (p as any)?.geo_country;
      if (geoCity) {
        preciseLocation = [geoCountry, geoCity].filter(Boolean).join(" · ");
      }
    }
  } catch {}

  // dedupe key 含 userKey、不同帳號各自獨立
  const key = `${userKey}|${ip}|${path}`;
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < 5 * 60_000) return NextResponse.json({ ok: true, skipped: "dedupe" });
  recent.set(key, now);

  if (recent.size > 1000) {
    for (const [k, ts] of recent) if (now - ts > 3600_000) recent.delete(k);
  }

  const device = parseDevice(ua);
  const geo = await fetchGeo(ip);
  const refTxt = referrer ? new URL(referrer).pathname : "";
  const isVisitor = userTag.startsWith("👀");
  const isAdmin = userTag.includes("👑");

  // GPS 精準位置 vs IP 推算位置區分清楚
  const locationMeta = preciseLocation
    ? [{ label: "🎯 GPS", value: preciseLocation }, { label: "📡 IP 推算", value: geo.location }]
    : [{ label: "📡 IP 推算", value: geo.location }];

  const flex = buildSimpleCard({
    emoji: isAdmin ? "👑" : isVisitor ? "👀" : "🔑",
    title: `${userTag.replace(/^[👀🔑] /, "").replace(/ [👑✏️]$/, "")} 來看了`,
    accentColor: isAdmin ? "#ffd700" : isVisitor ? "#8be9fd" : "#50fa7b",
    meta: [
      { label: "📄 路徑", value: path },
      ...(refTxt ? [{ label: "← 來自", value: refTxt }] : []),
      ...locationMeta,
      ...(geo.org ? [{ label: "🏢 ISP", value: geo.org }] : []),
      { label: "🌐 IP", value: geo.ipText },
      { label: "💻 裝置", value: device },
      ...(lastSeenText ? [{ label: "⏱️ 上次", value: lastSeenText.replace(/[（）]/g, "") }] : []),
    ],
    buttons: geo.mapsUrl ? [{ label: "📍 看 IP 大概", uri: geo.mapsUrl }] : undefined,
  });

  const locText = preciseLocation
    ? `🎯 GPS ${preciseLocation}\n📡 IP 推算 ${geo.location}`
    : `📡 IP 推算 ${geo.location}`;

  notifyAdmin({
    kind: isVisitor ? "visit" : isAdmin ? "admin_login" : "user_login",
    dedupeKey: key,
    text: `${userTag} 看 ${path}${refTxt ? ` ← ${refTxt}` : ""}${lastSeenText}\n${locText}${geo.org ? `\n🏢 ${geo.org}` : ""}\n🌐 ${geo.ipText}\n💻 ${device}`,
    flex,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
