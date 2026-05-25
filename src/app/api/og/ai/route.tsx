import { NextRequest, NextResponse } from "next/server";

/**
 * AI 生 OG 圖 — 統一路由、依 provider 分流到 5 個 API
 *
 * 用法：
 *   /api/og/ai?prompt=...                       (預設 pollinations、免費無 key)
 *   /api/og/ai?prompt=...&provider=pollinations
 *   /api/og/ai?prompt=...&provider=cloudflare   (要 CF_ACCOUNT_ID + CF_AI_TOKEN)
 *   /api/og/ai?prompt=...&provider=together     (要 TOGETHER_API_KEY)
 *   /api/og/ai?prompt=...&provider=huggingface  (要 HUGGINGFACE_TOKEN)
 *   /api/og/ai?prompt=...&provider=replicate    (要 REPLICATE_API_TOKEN)
 *
 * 共用參數：&w=1200&h=630&seed=42&model=<provider-specific>
 * 各 provider 設定 / 註冊在 /admin/og-preview 介面有完整說明。
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Provider = "pollinations" | "cloudflare" | "together" | "huggingface" | "replicate";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const promptRaw = sp.get("prompt") || "AI Island cyberpunk anime poster, sakura petals, vibrant neon";
  const w = Math.min(2048, Math.max(256, parseInt(sp.get("w") ?? "1200", 10) || 1200));
  const h = Math.min(2048, Math.max(256, parseInt(sp.get("h") ?? "630", 10) || 630));
  const seed = sp.get("seed") ?? "42";
  const model = sp.get("model") ?? "";
  const provider = (sp.get("provider") ?? "pollinations") as Provider;

  const styledPrompt = `${promptRaw}, vibrant colors, cinematic lighting, 4k, high quality`;

  try {
    switch (provider) {
      case "pollinations":
        return await runPollinations(styledPrompt, w, h, seed, model || "flux");
      case "cloudflare":
        return await runCloudflare(styledPrompt, w, h, seed, model || "@cf/black-forest-labs/flux-1-schnell");
      case "together":
        return await runTogether(styledPrompt, w, h, seed, model || "black-forest-labs/FLUX.1-schnell-Free");
      case "huggingface":
        return await runHuggingFace(styledPrompt, w, h, model || "black-forest-labs/FLUX.1-schnell");
      case "replicate":
        return await runReplicate(styledPrompt, w, h, model || "black-forest-labs/flux-schnell");
      default:
        return NextResponse.json({ error: "unknown_provider", supported: ["pollinations", "cloudflare", "together", "huggingface", "replicate"] }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "ai_og_failed", provider, message: e?.message }, { status: 500 });
  }
}

// 1. Pollinations.ai — 無 key
async function runPollinations(prompt: string, w: number, h: number, seed: string, model: string) {
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&model=${model}&nologo=true&enhance=true`;
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" },
  });
}

// 2. Cloudflare Workers AI — env: CF_ACCOUNT_ID + CF_AI_TOKEN
async function runCloudflare(prompt: string, w: number, h: number, seed: string, model: string) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_AI_TOKEN;
  if (!accountId || !token) {
    return NextResponse.json({
      error: "cloudflare_not_configured",
      msg: "缺 CF_ACCOUNT_ID + CF_AI_TOKEN、見 /admin/og-preview 設定步驟",
    }, { status: 503 });
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, num_steps: 4, seed: parseInt(seed, 10) || 42 }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: "cloudflare_api_failed", status: res.status, msg: txt.slice(0, 400) }, { status: 502 });
  }
  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}

// 3. Together AI — env: TOGETHER_API_KEY
async function runTogether(prompt: string, w: number, h: number, seed: string, model: string) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) {
    return NextResponse.json({
      error: "together_not_configured",
      msg: "缺 TOGETHER_API_KEY、見 /admin/og-preview 設定步驟",
    }, { status: 503 });
  }
  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, prompt,
      width: w, height: h,
      steps: 4, n: 1,
      seed: parseInt(seed, 10) || 42,
      response_format: "url",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: "together_api_failed", status: res.status, msg: txt.slice(0, 400) }, { status: 502 });
  }
  const j = await res.json();
  const url = j?.data?.[0]?.url;
  if (!url) return NextResponse.json({ error: "together_no_image", raw: j }, { status: 502 });
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}

// 4. Hugging Face Inference — env: HUGGINGFACE_TOKEN
async function runHuggingFace(prompt: string, w: number, h: number, model: string) {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    return NextResponse.json({
      error: "huggingface_not_configured",
      msg: "缺 HUGGINGFACE_TOKEN、見 /admin/og-preview 設定步驟",
    }, { status: 503 });
  }
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { width: w, height: h, num_inference_steps: 4 },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: "huggingface_api_failed", status: res.status, msg: txt.slice(0, 400) }, { status: 502 });
  }
  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}

// 5. Replicate — env: REPLICATE_API_TOKEN
async function runReplicate(prompt: string, w: number, h: number, model: string) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({
      error: "replicate_not_configured",
      msg: "缺 REPLICATE_API_TOKEN、見 /admin/og-preview 設定步驟",
    }, { status: 503 });
  }
  // 用 Prefer: wait header 等到完成 (60s 內) 才 return
  const createRes = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "wait",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: "16:9",
        num_outputs: 1,
        output_format: "png",
        num_inference_steps: 4,
      },
    }),
  });
  if (!createRes.ok) {
    const txt = await createRes.text();
    return NextResponse.json({ error: "replicate_api_failed", status: createRes.status, msg: txt.slice(0, 400) }, { status: 502 });
  }
  const pred = await createRes.json();
  const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!out) return NextResponse.json({ error: "replicate_no_output", raw: pred }, { status: 502 });
  return NextResponse.redirect(out, { status: 302, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
