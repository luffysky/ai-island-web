import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";

// edge runtime — Satori 在 edge 上更快（跟 /api/og 一致）
export const runtime = "edge";
export const dynamic = "force-dynamic";

/** 證書 OG 卡：金色慶祝風，跟品牌章節卡明顯不同。?title=&name=&code= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "完課證書";
  const learner = searchParams.get("name") ?? "AI 島民";
  const code = searchParams.get("code") ?? "";

  try {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "#0a0a0a",
            color: "#fff",
            position: "relative",
            fontFamily: "sans-serif",
            padding: "56px 72px",
          }}
        >
          {/* 金色光暈 */}
          <div style={{ position: "absolute", top: -220, right: -160, width: 560, height: 560, borderRadius: "100%", background: "#ffd700", opacity: 0.16, filter: "blur(120px)" }} />
          <div style={{ position: "absolute", bottom: -260, left: -160, width: 560, height: 560, borderRadius: "100%", background: "#ffb86c", opacity: 0.14, filter: "blur(130px)" }} />
          {/* 頂部金條 */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: "linear-gradient(90deg, #ffb86c, #ffd700, #ffb86c)" }} />

          {/* 金色外框 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              borderRadius: 28,
              border: "2px solid rgba(255,215,0,0.5)",
              background: "rgba(255,215,0,0.04)",
              padding: "48px 56px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 800 }}>
                🏝️ <span style={{ color: "#ffd700" }}>AI 島</span>
              </div>
              <div style={{ display: "flex", padding: "8px 20px", borderRadius: 999, background: "linear-gradient(90deg, #ffb86c, #ffd700)", color: "#000", fontSize: 24, fontWeight: 800 }}>
                🏅 完課證書
              </div>
            </div>

            <div style={{ display: "flex", fontSize: 28, color: "#c9a94a", marginTop: 44, letterSpacing: 2 }}>CERTIFICATE OF COMPLETION</div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, marginTop: 12, color: "#fff" }}>{learner}</div>

            <div
              style={{
                display: "flex",
                fontSize: title.length > 16 ? 60 : 76,
                fontWeight: 900,
                lineHeight: 1.1,
                marginTop: 14,
                maxWidth: "92%",
                color: "#ffd700",
                letterSpacing: -1,
              }}
            >
              {title}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", fontSize: 22, color: "#8a8a8a" }}>
              <div style={{ display: "flex" }}>ai-island-web.snowrealm.pet</div>
              {code ? <div style={{ display: "flex" }}>驗證碼 {code}</div> : <div style={{ display: "flex" }} />}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
      }
    );
  } catch (e: any) {
    console.error("[/api/og/cert] render failed:", e?.message);
    const safe = (s: string) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" } as any)[c] || c);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0a0a0a"/><rect width="1200" height="10" fill="#ffd700"/><text x="72" y="200" fill="#c9a94a" font-size="28" font-family="sans-serif">CERTIFICATE OF COMPLETION</text><text x="72" y="250" fill="#fff" font-size="36" font-family="sans-serif">${safe(learner)}</text><text x="72" y="340" fill="#ffd700" font-size="64" font-family="sans-serif" font-weight="900">${safe(title)}</text><text x="72" y="580" fill="#888" font-size="22" font-family="sans-serif">ai-island-web.snowrealm.pet</text></svg>`;
    return new NextResponse(svg, { status: 200, headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
  }
}
