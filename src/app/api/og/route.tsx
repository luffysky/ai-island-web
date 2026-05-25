import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { SITE_STATS } from "@/lib/site-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "AI 島";
  const subtitle =
    searchParams.get("subtitle") ?? `${SITE_STATS.chapterCount} 章全端養成班`;

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
            padding: "60px 80px",
            position: "relative",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 8,
              background: "linear-gradient(90deg, #50fa7b, #8be9fd, #bd93f9, #ff79c6, #ffb86c, #ffd700)",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 40,
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            🏝️ AI 島
          </div>

          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.1,
              marginTop: 50,
              maxWidth: "85%",
              background: "linear-gradient(135deg, #50fa7b 0%, #8be9fd 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 36,
              color: "#aaa",
              marginTop: 30,
              maxWidth: "85%",
            }}
          >
            {subtitle}
          </div>

          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: "auto",
              paddingTop: 30,
              borderTop: "1px solid #222",
              fontSize: 24,
              color: "#888",
            }}
          >
            <div>🎮 遊戲化學習</div>
            <div>🤖 AI 導師</div>
            <div>📚 {SITE_STATS.chapterCount} 章 {SITE_STATS.lessonCount}+ lessons</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=604800",
        },
      }
    );
  } catch (e: any) {
    console.error("[/api/og] render failed:", e?.message);
    // fallback：給靜態 SVG（永不失敗）
    const safe = (s: string) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" } as any)[c] || c);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#0a0a0a"/>
      <rect width="1200" height="8" fill="url(#g)"/>
      <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#50fa7b"/><stop offset="0.5" stop-color="#8be9fd"/><stop offset="1" stop-color="#ffd700"/></linearGradient></defs>
      <text x="80" y="140" fill="#fff" font-size="36" font-family="sans-serif" font-weight="700">AI Island</text>
      <text x="80" y="280" fill="#50fa7b" font-size="80" font-family="sans-serif" font-weight="900">${safe(title)}</text>
      <text x="80" y="360" fill="#aaa" font-size="32" font-family="sans-serif">${safe(subtitle)}</text>
      <text x="80" y="580" fill="#888" font-size="22" font-family="sans-serif">${SITE_STATS.chapterCount} chapters | ${SITE_STATS.lessonCount}+ lessons</text>
    </svg>`;
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
}
