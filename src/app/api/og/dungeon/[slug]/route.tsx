import { ImageResponse } from "next/og";
import { getDungeon } from "@/data/dungeons";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const d = getDungeon(slug);

  if (!d) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", fontSize: 60 }}>
          🏝️ AI 島
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const accent = d.accentHex || "#50fa7b";
  const moduleCount = d.modules?.length ?? 0;

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
        {/* 背景光暈 */}
        <div style={{ position: "absolute", top: -280, right: -160, width: 680, height: 680, borderRadius: "100%", background: accent, opacity: 0.2, filter: "blur(140px)" }} />
        <div style={{ position: "absolute", bottom: -300, left: -180, width: 600, height: 600, borderRadius: "100%", background: accent, opacity: 0.14, filter: "blur(130px)" }} />

        {/* 巨大 emoji 裝飾 */}
        <div style={{ position: "absolute", bottom: -90, right: 30, fontSize: 420, opacity: 0.08 }}>
          {d.emoji}
        </div>

        {/* 頂部漸層條 */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: accent }} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "70px 80px" }}>
          {/* 頂列 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 24px",
                borderRadius: 999,
                background: accent,
                color: "#000",
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              ⚔️ 挑戰副本
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 30, fontWeight: 800 }}>
              🏝️ <span style={{ color: accent }}>AI 島</span>
            </div>
          </div>

          {/* 副本名 */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 56 }}>
            <div style={{ fontSize: 90 }}>{d.emoji}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1 }}>
                {d.name}
              </div>
              <div style={{ fontSize: 30, color: accent, fontWeight: 700, marginTop: 6 }}>
                {d.subtitle}
              </div>
            </div>
          </div>

          {/* tagline */}
          <div style={{ fontSize: 34, color: "#9aa0aa", marginTop: 30, maxWidth: "88%", lineHeight: 1.35 }}>
            {d.tagline}
          </div>

          {/* 底列：Boss + 模組數 */}
          <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 24px",
                borderRadius: 16,
                background: "rgba(255,80,80,0.10)",
                border: "1px solid rgba(255,80,80,0.25)",
                fontSize: 26,
                color: "#ff9b9b",
              }}
            >
              👾 王：{d.boss?.name ?? "副本魔王"}
            </div>
            <div
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
              📦 {moduleCount} 個模組
            </div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>🐹 招財 Z-coin 守護</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    }
  );
}
