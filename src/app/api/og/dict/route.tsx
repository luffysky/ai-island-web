import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";

// edge runtime — Satori 在 edge 上更快（跟其他 /api/og 一致）
export const runtime = "edge";
export const dynamic = "force-dynamic";

const CAT: Record<string, { label: string; color: string }> = {
  syntax: { label: "語法", color: "#38bdf8" },
  concept: { label: "概念", color: "#34d399" },
  slang: { label: "工程師黑話", color: "#e879f9" },
  tool: { label: "工具", color: "#fbbf24" },
  error: { label: "常見錯誤", color: "#fb7185" },
  reference: { label: "參考", color: "#a78bfa" },
};

/** 程式辭典詞條 OG 卡：?term=&zh=&cat=&plain=&langs= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const term = (searchParams.get("term") ?? "程式術語").slice(0, 40);
  const zh = (searchParams.get("zh") ?? "").slice(0, 40);
  const catKey = searchParams.get("cat") ?? "concept";
  const plain = (searchParams.get("plain") ?? "").slice(0, 90);
  const langs = (searchParams.get("langs") ?? "").split(",").filter(Boolean).slice(0, 4);
  const cat = CAT[catKey] ?? CAT.concept;

  try {
    return new ImageResponse(
      (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#0a0a0a", color: "#fff", fontFamily: "sans-serif", padding: "56px 72px", position: "relative" }}>
          {/* 分類色光暈 */}
          <div style={{ position: "absolute", top: -200, right: -140, width: 520, height: 520, borderRadius: "100%", background: cat.color, opacity: 0.16, filter: "blur(120px)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: cat.color }} />

          <div style={{ display: "flex", flexDirection: "column", flex: 1, borderRadius: 28, border: "2px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", padding: "48px 56px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 800 }}>
                📖 <span style={{ color: "#22d3ee" }}>AI 島程式辭典</span>
              </div>
              <div style={{ display: "flex", padding: "8px 20px", borderRadius: 999, background: cat.color, color: "#000", fontSize: 24, fontWeight: 800 }}>
                {cat.label}
              </div>
            </div>

            <div style={{ display: "flex", fontSize: term.length > 18 ? 68 : 88, fontWeight: 900, lineHeight: 1.05, marginTop: 40, color: "#fff", letterSpacing: -1, maxWidth: "94%" }}>
              {term}
            </div>
            {zh ? <div style={{ display: "flex", fontSize: 40, fontWeight: 600, marginTop: 8, color: cat.color }}>{zh}</div> : <div style={{ display: "flex" }} />}
            {plain ? <div style={{ display: "flex", fontSize: 26, marginTop: 22, color: "#b8b8b8", lineHeight: 1.4, maxWidth: "92%" }}>{plain}…</div> : <div style={{ display: "flex" }} />}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", fontSize: 22, color: "#8a8a8a" }}>
              <div style={{ display: "flex" }}>ai-island-web.snowrealm.pet</div>
              <div style={{ display: "flex", gap: 8 }}>{langs.length ? langs.join(" · ") : ""}</div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } }
    );
  } catch (e: any) {
    console.error("[/api/og/dict] render failed:", e?.message);
    const safe = (s: string) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" } as any)[c] || c);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0a0a0a"/><rect width="1200" height="10" fill="${cat.color}"/><text x="72" y="140" fill="#22d3ee" font-size="30" font-family="sans-serif">📖 AI 島程式辭典</text><text x="72" y="300" fill="#fff" font-size="76" font-family="sans-serif" font-weight="900">${safe(term)}</text><text x="72" y="360" fill="${cat.color}" font-size="38" font-family="sans-serif">${safe(zh)}</text><text x="72" y="580" fill="#888" font-size="22" font-family="sans-serif">ai-island-web.snowrealm.pet</text></svg>`;
    return new NextResponse(svg, { status: 200, headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
  }
}
