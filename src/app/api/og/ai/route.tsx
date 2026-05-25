import { NextRequest, NextResponse } from "next/server";

/**
 * AI 生 OG 圖 — 統一路由、依 provider 分流到 5 個 API
 *
 * runtime nodejs (edge 在 Zeabur 上拿不到 env)
 * 錯誤一律 pass-through 真實 API status + body、不再 wrap 成 502
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Provider = "pollinations" | "cloudflare" | "together" | "huggingface" | "replicate";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

function errJson(provider: string, code: string, status: number, extra: Record<string, any> = {}) {
  return NextResponse.json(
    { error: code, provider, ...extra },
    { status },
  );
}

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
        return errJson(provider, "unknown_provider", 400, { supported: ["pollinations", "cloudflare", "together", "huggingface", "replicate"] });
    }
  } catch (e: any) {
    // catch 內也 log 給後台
    console.error(`[og/ai] ${provider} unexpected throw:`, e?.message, e?.stack?.slice(0, 500));
    return errJson(provider, "unexpected_throw", 500, {
      msg: e?.message ?? String(e),
      stack: e?.stack?.slice(0, 400),
      hint: "code 內 throw、不是 API 拒絕。可能 fetch 連不到、JSON parse 失敗等",
    });
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
    return errJson("cloudflare", "not_configured", 503, {
      msg: "缺 CF_ACCOUNT_ID + CF_AI_TOKEN、見 /admin/og-preview 設定步驟",
      hasAccountId: !!accountId,
      hasToken: !!token,
    });
  }
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, num_steps: 4, seed: parseInt(seed, 10) || 42 }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return errJson("cloudflare", "api_failed", res.status === 401 ? 401 : 502, {
      api_status: res.status,
      msg: txt.slice(0, 600),
      api_url: apiUrl,
      hint: res.status === 401 ? "Token 無效、重拿 Workers AI template token"
        : res.status === 404 ? "Model 名稱錯、用 @cf/black-forest-labs/flux-1-schnell"
        : res.status === 429 ? "今日 quota 用完 (10k neurons/day)"
        : "看 msg 內 Cloudflare 回的錯誤",
    });
  }
  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}

// 3. Together AI — env: TOGETHER_API_KEY (新 domain api.together.ai)
async function runTogether(prompt: string, w: number, h: number, seed: string, model: string) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) {
    return errJson("together", "not_configured", 503, {
      msg: "缺 TOGETHER_API_KEY、見 /admin/og-preview 設定步驟",
    });
  }
  // 新 domain api.together.ai (rebrand 後、舊 api.together.xyz 仍可用但建議新版)
  const apiUrl = "https://api.together.ai/v1/images/generations";
  const body = {
    model, prompt,
    width: w, height: h,
    steps: 4, n: 1,
    seed: parseInt(seed, 10) || 42,
    response_format: "url",
  };
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) {
    return errJson("together", "api_failed", res.status === 401 ? 401 : res.status === 422 ? 422 : 502, {
      api_status: res.status,
      msg: txt.slice(0, 600),
      api_url: apiUrl,
      hint: res.status === 401 ? "Token 無效"
        : res.status === 404 ? "Model 名稱錯、試 'black-forest-labs/FLUX.1-schnell-Free' 或 'black-forest-labs/FLUX.1-schnell'"
        : res.status === 422 ? "參數錯、body 看 msg"
        : res.status === 403 ? "Model 需要 Build Tier 2+ ($5 spend)、試 schnell-Free 不需要 tier"
        : res.status === 429 ? "rate limited"
        : "看 msg 內 Together 回的錯誤",
    });
  }
  let j: any;
  try { j = JSON.parse(txt); } catch {
    return errJson("together", "parse_failed", 502, { raw: txt.slice(0, 400) });
  }
  const url = j?.data?.[0]?.url;
  if (!url) return errJson("together", "no_image_in_response", 502, { raw: txt.slice(0, 600) });
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}

// 4. Hugging Face — env: HUGGINGFACE_TOKEN
// ⚠️ api-inference.huggingface.co 已 deprecated、改 router.huggingface.co
async function runHuggingFace(prompt: string, w: number, h: number, model: string) {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    return errJson("huggingface", "not_configured", 503, {
      msg: "缺 HUGGINGFACE_TOKEN、見 /admin/og-preview 設定步驟",
    });
  }

  // 新 router endpoint (api-inference 已 deprecated)
  // HF 路由表示 model 可能要走 third-party provider (fal-ai / replicate / together)
  // 但純 router URL 仍可試
  const apiUrl = `https://router.huggingface.co/hf-inference/models/${model}`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { width: w, height: h, num_inference_steps: 4 },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return errJson("huggingface", "api_failed", res.status === 401 ? 401 : 502, {
      api_status: res.status,
      msg: txt.slice(0, 600),
      api_url: apiUrl,
      hint: res.status === 401 ? "Token 無效或無 Read 權限"
        : res.status === 404 ? "Model 名稱錯、或不在 HF serverless inference (試 'black-forest-labs/FLUX.1-schnell' 或 'stabilityai/stable-diffusion-xl-base-1.0')"
        : res.status === 503 ? "Model cold start、等 30 秒再試"
        : res.status === 429 ? "Free tier rate limited"
        : "HF 整個 inference 服務這幾個月不穩、建議改用 Together AI 或 Cloudflare",
    });
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.startsWith("image/")) {
    // 不是圖、可能是 JSON 錯誤
    const txt = await res.text().catch(() => "");
    return errJson("huggingface", "not_image_response", 502, { content_type: ct, raw: txt.slice(0, 400) });
  }
  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: { "Content-Type": ct, "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}

// 5. Replicate — env: REPLICATE_API_TOKEN
async function runReplicate(prompt: string, w: number, h: number, model: string) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return errJson("replicate", "not_configured", 503, {
      msg: "缺 REPLICATE_API_TOKEN、見 /admin/og-preview 設定步驟",
    });
  }
  // Replicate 兩種 API:
  //   - /v1/models/{owner}/{name}/predictions  (用 latest version、適合官方 model)
  //   - /v1/predictions + body.version (用特定 version hash)
  // 先試 model API、加 Prefer: wait 等到完成
  const apiUrl = `https://api.replicate.com/v1/models/${model}/predictions`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "wait=60",
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
  const txt = await res.text();
  if (!res.ok) {
    return errJson("replicate", "api_failed", res.status === 401 ? 401 : 502, {
      api_status: res.status,
      msg: txt.slice(0, 600),
      api_url: apiUrl,
      hint: res.status === 401 ? "Token 無效"
        : res.status === 402 ? "Trial credits 用完、需要綁信用卡"
        : res.status === 404 ? "Model 名稱錯、用 black-forest-labs/flux-schnell"
        : res.status === 422 ? "input 參數錯"
        : "看 msg 內 Replicate 回的錯誤",
    });
  }
  let pred: any;
  try { pred = JSON.parse(txt); } catch {
    return errJson("replicate", "parse_failed", 502, { raw: txt.slice(0, 400) });
  }
  // wait=60 後若還沒完成、output 是 null、要 poll
  let out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!out && pred.urls?.get) {
    // poll 一下 (最多 30 秒)
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(pred.urls.get, { headers: { "Authorization": `Bearer ${token}` } });
      if (!pollRes.ok) break;
      const p = await pollRes.json();
      if (p.status === "succeeded") {
        out = Array.isArray(p.output) ? p.output[0] : p.output;
        break;
      }
      if (p.status === "failed" || p.status === "canceled") {
        return errJson("replicate", "prediction_failed", 502, { status: p.status, error: p.error });
      }
    }
  }
  if (!out) return errJson("replicate", "no_output", 502, { raw: txt.slice(0, 400), hint: "等了 30 秒 model 還沒回、Replicate cold start 太慢" });
  return NextResponse.redirect(out, { status: 302, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
