import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

/**
 * 把「今日運勢」渲染成可分享的 OG 卡片（1200x630）。
 * params: z=星座中文 · e=星座 emoji · s=分數 · o=整體運勢文 · c=幸運色 · n=幸運數字 · d=日期
 * 同參數 → 同一張圖（CDN 快取、秒回）。＊命理供參考娛樂。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 只含這次要畫的字的子集字型，避免 next/og 中文變豆腐字。失敗回 null 用預設字型。 */
async function loadCjkFont(text: string, weight: 400 | 700): Promise<ArrayBuffer | null> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await fetch(api, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }).then((r) => r.text());
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

const clip = (s: string, n: number) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const zodiac = clip(sp.get("z") || "星座", 6);
  const emoji = clip(sp.get("e") || "✨", 4);
  const score = Math.max(0, Math.min(100, Number(sp.get("s")) || 0));
  const overall = clip(sp.get("o") || "今天是把想法付諸行動的好日子。", 90);
  const color = clip(sp.get("c") || "", 8);
  const number = clip(sp.get("n") || "", 4);
  const date = clip(sp.get("d") || "", 12);

  const renderedText =
    "🏝️ AI 島 今日運勢分享自 · 每日運勢愛情事業財運幸運色幸運數字分ai-island-web.snowrealm.pet" +
    zodiac + emoji + overall + color + number + date;
  const [bodyFont, boldFont] = await Promise.all([loadCjkFont(renderedText, 400), loadCjkFont(renderedText, 700)]);
  const fonts = [
    bodyFont && { name: "Noto Sans TC", data: bodyFont, weight: 400 as const, style: "normal" as const },
    boldFont && { name: "Noto Sans TC", data: boldFont, weight: 700 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[];

  // 分數對應色帶（低→高：琥珀→紫→綠）
  const ring = score >= 80 ? "#a78bfa" : score >= 60 ? "#8b5cf6" : "#f59e0b";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex", flexDirection: "column", width: "100%", height: "100%",
          background: "#0b0a12", color: "#fff",
          fontFamily: fonts.length ? "'Noto Sans TC', sans-serif" : "sans-serif",
          padding: "58px 68px", position: "relative", overflow: "hidden",
        }}
      >
        {/* 星空柔光暈 */}
        <div style={{ position: "absolute", top: -260, right: -160, width: 620, height: 620, borderRadius: "50%", background: "#8b5cf6", opacity: 0.22, filter: "blur(60px)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -280, left: -180, width: 560, height: 560, borderRadius: "50%", background: "#22d3ee", opacity: 0.12, filter: "blur(60px)", display: "flex" }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 6, display: "flex", background: "linear-gradient(90deg, #a78bfa 0%, #22d3ee 100%)" }} />

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28, fontWeight: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>🏝️ AI 島 · 每日運勢</span>
          {date ? <span style={{ display: "flex", color: "#9aa0aa", fontWeight: 400, fontSize: 24 }}>{date}</span> : null}
        </div>

        {/* body */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 40 }}>
          {/* 左：星座 emoji + 分數環 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 300 }}>
            <div style={{ display: "flex", fontSize: 150, lineHeight: 1 }}>{emoji}</div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>{zodiac}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(139,92,246,0.16)", border: `2px solid ${ring}`, borderRadius: 999, padding: "8px 24px" }}>
              <span style={{ display: "flex", fontSize: 46, fontWeight: 700, color: ring }}>{score}</span>
              <span style={{ display: "flex", fontSize: 26, color: "#c4b5fd" }}>分</span>
            </div>
          </div>

          {/* 右：整體運勢 + 幸運色/數字 */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 26, justifyContent: "center" }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, lineHeight: 1.42, color: "#f3f0ff" }}>
              {overall}
            </div>
            {(color || number) ? (
              <div style={{ display: "flex", gap: 16 }}>
                {color ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "12px 22px", fontSize: 28 }}>
                    <span style={{ display: "flex" }}>🎨 幸運色</span>
                    <span style={{ display: "flex", fontWeight: 700, color: "#c4b5fd" }}>{color}</span>
                  </div>
                ) : null}
                {number ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "12px 22px", fontSize: 28 }}>
                    <span style={{ display: "flex" }}>🔢 幸運數字</span>
                    <span style={{ display: "flex", fontWeight: 700, color: "#c4b5fd" }}>{number}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", width: "100%", height: 1, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 23, color: "#6b7280" }}>
            <span style={{ display: "flex" }}>✨ 分享自 AI 島 · 每日運勢（僅供參考娛樂）</span>
            <span style={{ display: "flex", color: "#a78bfa" }}>ai-island-web.snowrealm.pet</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      fonts: fonts.length ? fonts : undefined,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" },
    }
  );
}
