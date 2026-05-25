import { NextResponse } from "next/server";

/**
 * AI 圖 provider 診斷 — 直接打開看 prod env 跟 fetch 到底卡哪
 *
 * 不顯示 key 本身、只顯示「有沒設 / 長度 / prefix」
 * 也實際 ping 一下各 provider endpoint、看是否能連
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function envInfo(name: string) {
  const v = process.env[name];
  if (!v) return { set: false };
  return {
    set: true,
    length: v.length,
    prefix: v.slice(0, 6) + "***",
    suffix: "***" + v.slice(-4),
  };
}

async function pingProvider(name: string, fn: () => Promise<Response>): Promise<{ ok: boolean; status?: number; ms: number; error?: string; body?: string }> {
  const t0 = Date.now();
  try {
    const res = await fn();
    const ms = Date.now() - t0;
    const body = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, ms, body: body.slice(0, 300) };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, error: e?.message ?? String(e) };
  }
}

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    runtime: "nodejs",
    env: {
      CF_ACCOUNT_ID: envInfo("CF_ACCOUNT_ID"),
      CF_AI_TOKEN: envInfo("CF_AI_TOKEN"),
      TOGETHER_API_KEY: envInfo("TOGETHER_API_KEY"),
      HUGGINGFACE_TOKEN: envInfo("HUGGINGFACE_TOKEN"),
      REPLICATE_API_TOKEN: envInfo("REPLICATE_API_TOKEN"),
    },
    pings: {} as Record<string, any>,
  };

  // 各 provider 實際 ping (用 minimum payload、看 prod 端能不能連到 + 真實 status)
  const pings: Promise<void>[] = [];

  // Together — 用 GET /v1/models (輕量)
  if (process.env.TOGETHER_API_KEY) {
    pings.push((async () => {
      result.pings.together = await pingProvider("together", () =>
        fetch("https://api.together.ai/v1/models", {
          headers: { "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}` },
        }),
      );
    })());
  }

  // HuggingFace — whoami-v2 (token 驗證、輕量)
  if (process.env.HUGGINGFACE_TOKEN) {
    pings.push((async () => {
      result.pings.huggingface = await pingProvider("huggingface", () =>
        fetch("https://huggingface.co/api/whoami-v2", {
          headers: { "Authorization": `Bearer ${process.env.HUGGINGFACE_TOKEN}` },
        }),
      );
    })());
  }

  // Cloudflare — 直接打 AI 真實 namespace (列 model)、確認 ai:read 權限
  // /accounts/{id}/tokens/verify 對 Workers AI scoped token 會誤判 401、不可靠
  if (process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN) {
    pings.push((async () => {
      result.pings.cloudflare = await pingProvider("cloudflare", () =>
        fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/models/search?per_page=1`, {
          headers: { "Authorization": `Bearer ${process.env.CF_AI_TOKEN}` },
        }),
      );
    })());
  }

  // Replicate — /v1/account (token 驗證、輕量)
  if (process.env.REPLICATE_API_TOKEN) {
    pings.push((async () => {
      result.pings.replicate = await pingProvider("replicate", () =>
        fetch("https://api.replicate.com/v1/account", {
          headers: { "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}` },
        }),
      );
    })());
  }

  // Pollinations 不用 key、直接 ping 首頁
  pings.push((async () => {
    result.pings.pollinations = await pingProvider("pollinations", () =>
      fetch("https://image.pollinations.ai/", { method: "HEAD" }),
    );
  })());

  await Promise.all(pings);

  // 解讀
  result.diagnosis = diagnoseAll(result);

  return NextResponse.json(result, { status: 200 });
}

function diagnoseAll(r: any): string[] {
  const out: string[] = [];

  for (const [k, info] of Object.entries(r.env as Record<string, any>)) {
    if (info.set) {
      out.push(`✅ ${k} 已設、長度 ${info.length}、${info.prefix}...${info.suffix}`);
    } else {
      out.push(`❌ ${k} 沒設、Zeabur 環境變數要加`);
    }
  }

  out.push("");

  for (const [provider, ping] of Object.entries(r.pings as Record<string, any>)) {
    if (ping.ok) {
      out.push(`✅ ${provider} ping 通 (${ping.status} / ${ping.ms}ms) — 連得到、token 有效`);
    } else if (ping.status === 401) {
      out.push(`🔑 ${provider} 401 — token 無效、重拿 key 貼到 env`);
    } else if (ping.status === 403) {
      out.push(`🚫 ${provider} 403 — token 沒這權限、重生 token 給對的 scope`);
    } else if (ping.status === 404) {
      out.push(`📍 ${provider} 404 — endpoint 變了、要更新 code`);
    } else if (ping.status === 429) {
      out.push(`⏱️ ${provider} 429 — rate limited、等等再試`);
    } else if (ping.error) {
      out.push(`💥 ${provider} fetch throw — ${ping.error.slice(0, 100)}`);
    } else {
      out.push(`⚠️ ${provider} ${ping.status} / ${ping.ms}ms — body: ${(ping.body ?? "").slice(0, 100)}`);
    }
  }

  return out;
}
