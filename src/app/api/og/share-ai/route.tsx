import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

/**
 * 把一段綠寶 AI 回覆渲染成可分享的 OG 卡片（1200x630）。
 * params: a=回答(必填,會截斷) · q=問題(選填) · persona=導師名(預設 綠寶)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const q = stripMd(sp.get("q") || "").slice(0, 70);
  const a = stripMd(sp.get("a") || "").slice(0, 300);

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
          fontFamily: "sans-serif",
          padding: "64px 72px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景光暈 */}
        <div style={{ position: "absolute", top: -200, right: -160, width: 520, height: 520, borderRadius: "50%", background: "#50fa7b", opacity: 0.18, filter: "blur(40px)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -220, left: -160, width: 480, height: 480, borderRadius: "50%", background: "#8be9fd", opacity: 0.14, filter: "blur(40px)", display: "flex" }} />

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
    { width: 1200, height: 630 }
  );
}
