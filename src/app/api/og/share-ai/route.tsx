import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

/**
 * 把一段綠寶 AI 回覆渲染成可分享的 OG 卡片（1200x630）。
 * params: a=回答(必填,會截斷) · q=問題(選填) · persona=導師名(預設 綠寶)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 載入 Noto Sans TC 的「子集字型」— 只含這次要畫的字，幾十 KB、夠快。
 * 沒這個的話 next/og 預設字型不含中日韓字、整張卡的中文會變成 □□□ 亂碼（豆腐字）。
 * 任何一步失敗就回 null、改用預設字型（至少不會 500）。
 */
async function loadCjkFont(text: string, weight: 400 | 700): Promise<ArrayBuffer | null> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await fetch(api, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    }).then((r) => r.text());
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    const buf = await fetch(url).then((r) => r.arrayBuffer());
    return buf;
  } catch {
    return null;
  }
}

function stripMd(s: string): string {
  return (s || "")
    .replace(/```[\s\S]*?```/g, "（程式碼略）")
    .replace(/[#>*_`~]/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** 字串 → 穩定小整數 seed（同一回答永遠同一張底圖、可被 CDN 快取） */
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}

/**
 * 從 Cloudflare Workers AI（flux-1-schnell、免費 10k/天）生一張 AI 藝術底圖。
 * 為何不用 Pollinations：其匿名額度已關（改 token 制、Zeabur 共用 IP 會一直 402）。
 * seed 固定 → 同一回答同一張 → 配合 Cache-Control 第一次算完之後 CDN 秒回。
 * 帶 timeout、缺 key 或任何失敗都回 null 走純深色 fallback、保證這張卡永遠不 500。
 * 回 data URL（Satori 嵌入最穩、不必再對外 fetch）。
 */
async function loadArt(seed: number): Promise<string | null> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_AI_TOKEN;
  if (!accountId || !token) return null;
  const prompt =
    "dreamy floating island in the clouds, cyberpunk anime aesthetic, " +
    "soft sakura petals, glowing neon green and cyan accents, cinematic lighting, " +
    "ethereal atmosphere, highly detailed digital painting, 4k";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, num_steps: 4, seed: seed % 4294967295 }),
        signal: ctrl.signal,
      },
    ).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    // flux-1-schnell 回 JSON { result: { image: base64 } }
    const j = await res.json().catch(() => null);
    const b64 = j?.result?.image;
    if (typeof b64 !== "string" || b64.length < 4000) return null;
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const persona = (sp.get("persona") || "綠寶").slice(0, 12);
  const q = stripMd(sp.get("q") || "").slice(0, 70);
  const a = stripMd(sp.get("a") || "").slice(0, 300);

  // 把所有會畫出來的字湊在一起做子集（含固定文案、Q/A、導師名）
  const renderedText =
    "🏝️ AI 島🤖 綠寶 AI 導師 · 邊學邊問ai-island-web.snowrealm.petQ：在問邊學邊問。" +
    persona + q + a;
  const [bodyFont, boldFont, art] = await Promise.all([
    loadCjkFont(renderedText, 400),
    loadCjkFont(renderedText, 700),
    loadArt(seedFrom(persona + a)),
  ]);
  const fonts = [
    bodyFont && { name: "Noto Sans TC", data: bodyFont, weight: 400 as const, style: "normal" as const },
    boldFont && { name: "Noto Sans TC", data: boldFont, weight: 700 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#070709",
          color: "#fff",
          fontFamily: fonts.length ? "'Noto Sans TC', sans-serif" : "sans-serif",
          padding: "64px 72px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* AI 藝術底圖（抓得到才放）— 上半清晰、往下漸深的遮罩讓文字好讀 */}
        {art ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori OG 內非真實 DOM img、必須用原生標籤 */}
            <img src={art} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }} />
            <div
              style={{
                position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex",
                // 上半 ~清晰、中段到底部漸深，壓住大字回答 + footer
                background: "linear-gradient(180deg, rgba(7,7,9,0.45) 0%, rgba(7,7,9,0.72) 46%, rgba(7,7,9,0.95) 100%)",
              }}
            />
          </>
        ) : (
          <>
            {/* 沒底圖時的純深色光暈 fallback */}
            <div style={{ position: "absolute", top: -200, right: -160, width: 520, height: 520, borderRadius: "50%", background: "#50fa7b", opacity: 0.18, filter: "blur(40px)", display: "flex" }} />
            <div style={{ position: "absolute", bottom: -220, left: -160, width: 480, height: 480, borderRadius: "50%", background: "#8be9fd", opacity: 0.14, filter: "blur(40px)", display: "flex" }} />
          </>
        )}

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
          <span>🏝️ AI 島</span>
          <span style={{ display: "flex", alignItems: "center", background: "rgba(80,250,123,0.18)", color: "#50fa7b", borderRadius: 999, padding: "6px 18px", fontSize: 24 }}>
            🤖 {persona}
          </span>
        </div>

        {/* 問題 */}
        {q ? (
          <div style={{ display: "flex", marginTop: 40, fontSize: 30, color: "#9aa0aa", lineHeight: 1.3 }}>
            Q：{q}
          </div>
        ) : null}

        {/* 回答 */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: 24, fontSize: 42, fontWeight: 700, lineHeight: 1.45, color: "#f3f5f8" }}>
          {a || "在 AI 島問綠寶、邊學邊問。"}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, color: "#6b7280" }}>
          <span>綠寶 AI 導師 · 邊學邊問</span>
          <span style={{ color: "#50fa7b" }}>ai-island-web.snowrealm.pet</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts.length ? fonts : undefined,
      // 底圖算一次就好 — 讓 CDN/爬蟲快取，後續秒回（同 persona+a → 同 seed → 同圖）
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" },
    }
  );
}
