import { NextRequest, NextResponse } from "next/server";

/**
 * AI 生 OG 圖 — 走 Pollinations.ai (免費、無 key、無 rate limit)
 *
 * 用法：
 *   /api/og/ai?prompt=AI%20island%20cyberpunk%20floating&seed=42
 *   /api/og/ai?prompt=...&w=1200&h=630
 *
 * 對應 LottieFiles + chapter OG 之外另一條路。
 * 站台 Open Graph image 想用 AI 生圖 (品牌風 / 章節主題不同插畫) 改用這個。
 *
 * 在 chapter metadata 用法：
 *   const ogImage = `${SITE_URL}/api/og/ai?prompt=${encodeURIComponent(`${chapter.title} cyberpunk anime poster`)}`;
 *
 * Trade-off:
 * - 優：完全免費、無 key、不用註冊
 * - 缺：生圖約 3-15 秒、第一次 social crawler 可能 timeout
 * - 解法：FB / X 爬一次後 cache 24hr、之後秒回
 *
 * 其他免費 AI 圖選項 (Pollinations 不滿意時換)：
 * - Cloudflare Workers AI: 每天 10k neurons 免費、需 account ID + token
 * - Together AI FLUX schnell: $0.0027/圖、品質最好、free trial $25
 * - Hugging Face Inference: 免費 rate-limited、cold start 慢
 * - Replicate: 試用 free credits、之後 $0.001-0.05/圖
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const promptRaw = sp.get("prompt") || "AI Island - learning platform, cyberpunk neon island, sakura petals, anime aesthetic";
  const w = Math.min(2048, Math.max(256, parseInt(sp.get("w") ?? "1200", 10) || 1200));
  const h = Math.min(2048, Math.max(256, parseInt(sp.get("h") ?? "630", 10) || 630));
  const seed = sp.get("seed") ?? "42";
  const model = sp.get("model") ?? "flux"; // flux / flux-realism / flux-anime / flux-3d / any-dark / turbo

  // 加品牌 style suffix
  const styledPrompt = `${promptRaw}, vibrant colors, high quality, 4k, ${
    model === "flux-anime" ? "anime illustration, Studio Ghibli style," : ""
  }cinematic lighting`;

  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(styledPrompt)}?width=${w}&height=${h}&seed=${seed}&model=${model}&nologo=true&enhance=true`;

  try {
    // 直接 redirect 到 Pollinations URL、Cloudflare / FB / X cache 自動處理
    // (比 fetch + buffer 快 + 省記憶體)
    return NextResponse.redirect(url, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "ai_og_failed", message: e?.message, fallback_url: url },
      { status: 500 },
    );
  }
}
