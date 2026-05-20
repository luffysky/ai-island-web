import { ImageResponse } from "next/og";
import { getChapter } from "@/lib/content";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const STAGE_COLORS: Record<number, { from: string; to: string; name: string }> = {
  1: { from: "#50fa7b", to: "#8be9fd", name: "基礎之地" },
  2: { from: "#8be9fd", to: "#bd93f9", name: "互動王國" },
  3: { from: "#bd93f9", to: "#ff79c6", name: "後端深淵" },
  4: { from: "#ff79c6", to: "#ffb86c", name: "多語大陸" },
  5: { from: "#ffb86c", to: "#ffd700", name: "商業港口" },
  6: { from: "#ffd700", to: "#50fa7b", name: "AI 紀元" },
  7: { from: "#a78bfa", to: "#c4b5fd", name: "速查附錄" },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chapter = await getChapter(Number(id));

  if (!chapter) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#fff",
            fontSize: 60,
          }}
        >
          AI 島
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const stage = STAGE_COLORS[Number(chapter.stage)] ?? STAGE_COLORS[1];
  const lessonCount = chapter.lessons?.length ?? 0;

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
            background: `linear-gradient(90deg, ${stage.from}, ${stage.to})`,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 50,
            right: 80,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          🏝️ AI 島
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 40,
          }}
        >
          <div
            style={{
              padding: "8px 20px",
              borderRadius: 999,
              background: `linear-gradient(90deg, ${stage.from}, ${stage.to})`,
              color: "#000",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {stage.name}
          </div>
          <div style={{ fontSize: 22, color: "#888" }}>
            Ch{String(chapter.id).padStart(2, "0")}
          </div>
        </div>

        <div
          style={{
            fontSize: 84,
            fontWeight: 900,
            lineHeight: 1.1,
            marginTop: 30,
            maxWidth: "85%",
          }}
        >
          {chapter.title}
        </div>

        {chapter.subtitle && (
          <div
            style={{
              fontSize: 32,
              color: "#aaa",
              marginTop: 20,
              maxWidth: "85%",
              lineHeight: 1.3,
            }}
          >
            {chapter.subtitle}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: "auto",
            paddingTop: 30,
            borderTop: "1px solid #222",
            fontSize: 24,
            color: "#888",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            📚 <span>{lessonCount} lessons</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            ⏱️ <span>約 {chapter.estimatedHours ?? 1} 小時</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            🎮 <span>含 Playground + 練習</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 80,
            fontSize: 20,
            color: "#666",
          }}
        >
          🐹 招財 Z-coin 守護
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
