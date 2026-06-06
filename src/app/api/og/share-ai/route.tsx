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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const persona = (sp.get("persona") || "綠寶").slice(0, 12);
  const q = stripMd(sp.get("q") || "").slice(0, 64);
  const a = stripMd(sp.get("a") || "").slice(0, 240);

  // 把所有會畫出來的字湊在一起做子集（含固定文案、引號裝飾、Q/A、導師名）
  const renderedText =
    "🏝️ AI 島🤖 綠寶 AI 導師 · 邊學邊問ai-island-web.snowrealm.petQ：在問邊學邊問。“" +
    persona + q + a;
  const [bodyFont, boldFont] = await Promise.all([
    loadCjkFont(renderedText, 400),
    loadCjkFont(renderedText, 700),
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
          padding: "60px 72px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 品牌柔光暈：右上綠、左下青 */}
        <div style={{ position: "absolute", top: -240, right: -150, width: 580, height: 580, borderRadius: "50%", background: "#50fa7b", opacity: 0.16, filter: "blur(50px)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -260, left: -170, width: 540, height: 540, borderRadius: "50%", background: "#8be9fd", opacity: 0.12, filter: "blur(50px)", display: "flex" }} />
        {/* 頂端細光條（品牌色） */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 6, display: "flex", background: "linear-gradient(90deg, #50fa7b 0%, #8be9fd 100%)" }} />
        {/* 大引號裝飾 */}
        <div style={{ position: "absolute", top: 122, left: 60, fontSize: 260, lineHeight: 1, fontWeight: 700, color: "#50fa7b", opacity: 0.1, display: "flex" }}>“</div>

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
          <span>🏝️ AI 島</span>
          <span style={{ display: "flex", alignItems: "center", background: "rgba(80,250,123,0.16)", border: "1px solid rgba(80,250,123,0.4)", color: "#50fa7b", borderRadius: 999, padding: "6px 18px", fontSize: 24 }}>
            🤖 {persona}
          </span>
        </div>

        {/* body：垂直置中、Q（小）+ 回答（大字主角） */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 20 }}>
          {q ? (
            <div style={{ display: "flex", fontSize: 28, color: "#9aa0aa", lineHeight: 1.3 }}>Q：{q}</div>
          ) : null}
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, lineHeight: 1.42, color: "#f3f5f8" }}>
            {a || "在 AI 島問綠寶、邊學邊問。"}
          </div>
        </div>

        {/* footer：細分隔線 + 署名 / 網址 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", width: "100%", height: 1, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 23, color: "#6b7280" }}>
            <span style={{ display: "flex" }}>🤖 {persona} AI 導師 · 邊學邊問</span>
            <span style={{ display: "flex", color: "#50fa7b" }}>ai-island-web.snowrealm.pet</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts.length ? fonts : undefined,
      // 同 persona+q+a → 同一張圖，讓 CDN/爬蟲快取、後續秒回
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" },
    }
  );
}
