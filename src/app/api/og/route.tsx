import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SITE_STATS } from "@/lib/site-stats";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "AI 島";
  const subtitle =
    searchParams.get("subtitle") ?? `${SITE_STATS.chapterCount} 章全端養成班`;

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
}
