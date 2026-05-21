import { ImageResponse } from "next/og";
import { getChapter } from "@/lib/content";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const STAGE: Record<number, { from: string; to: string; name: string; emoji: string }> = {
  1: { from: "#50fa7b", to: "#8be9fd", name: "基礎之地", emoji: "🌱" },
  2: { from: "#8be9fd", to: "#bd93f9", name: "互動王國", emoji: "⚡" },
  3: { from: "#bd93f9", to: "#ff79c6", name: "後端深淵", emoji: "🔮" },
  4: { from: "#ff79c6", to: "#ffb86c", name: "多語大陸", emoji: "🌐" },
  5: { from: "#ffb86c", to: "#ffd700", name: "商業港口", emoji: "⚓" },
  6: { from: "#ffd700", to: "#50fa7b", name: "AI 紀元", emoji: "🚀" },
  7: { from: "#a78bfa", to: "#c4b5fd", name: "速查附錄", emoji: "📑" },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chapter = await getChapter(Number(id));

  if (!chapter) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", fontSize: 60 }}>
          🏝️ AI 島
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const s = STAGE[Number(chapter.stage)] ?? STAGE[1];
  const lessonCount = chapter.lessons?.length ?? 0;
  const chNum = String(chapter.id).padStart(2, "0");

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
          position: "relative",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {/* 背景光暈 1 — 左上 */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: -180,
            width: 620,
            height: 620,
            borderRadius: "100%",
            background: s.from,
            opacity: 0.22,
            filter: "blur(120px)",
          }}
        />
        {/* 背景光暈 2 — 右下 */}
        <div
          style={{
            position: "absolute",
            bottom: -300,
            right: -160,
            width: 640,
            height: 640,
            borderRadius: "100%",
            background: s.to,
            opacity: 0.22,
            filter: "blur(130px)",
          }}
        />

        {/* 巨大底圖章節號（裝飾）*/}
        <div
          style={{
            position: "absolute",
            bottom: -120,
            right: 20,
            fontSize: 460,
            fontWeight: 900,
            color: "#ffffff",
            opacity: 0.04,
            lineHeight: 1,
          }}
        >
          {chNum}
        </div>

        {/* 頂部漸層條 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 10,
            background: `linear-gradient(90deg, ${s.from}, ${s.to})`,
          }}
        />

        {/* 內容主體 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "70px 80px",
          }}
        >
          {/* 頂列：品牌 + 階段徽章 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 22px",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${s.from}, ${s.to})`,
                color: "#000",
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              {s.emoji} {s.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              🏝️
              <span
                style={{
                  background: `linear-gradient(90deg, ${s.from}, ${s.to})`,
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                AI 島
              </span>
            </div>
          </div>

          {/* 章節號 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 54,
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: 4,
                color: s.from,
              }}
            >
              CHAPTER {chNum}
            </div>
            <div style={{ width: 60, height: 3, background: s.to, borderRadius: 2 }} />
          </div>

          {/* 標題 */}
          <div
            style={{
              fontSize: chapter.title.length > 14 ? 78 : 94,
              fontWeight: 900,
              lineHeight: 1.08,
              marginTop: 18,
              maxWidth: "92%",
              letterSpacing: -1,
            }}
          >
            {chapter.title}
          </div>

          {/* 副標 */}
          {chapter.subtitle ? (
            <div
              style={{
                fontSize: 34,
                color: "#9aa0aa",
                marginTop: 22,
                maxWidth: "84%",
                lineHeight: 1.35,
              }}
            >
              {chapter.subtitle}
            </div>
          ) : null}

          {/* 底列：資訊膠囊 */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: "auto",
            }}
          >
            {[
              `📚 ${lessonCount} 個 lesson`,
              `⏱️ 約 ${chapter.estimatedHours ?? 1} 小時`,
              `🎮 含實戰練習`,
            ].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 24px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  fontSize: 26,
                  color: "#dfe2e8",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* 底部品牌條 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 80px 38px",
            fontSize: 22,
            color: "#6b7079",
          }}
        >
          <div style={{ display: "flex" }}>ai-island-web.snowrealm.pet</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            🐹 招財 Z-coin 守護
          </div>
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
