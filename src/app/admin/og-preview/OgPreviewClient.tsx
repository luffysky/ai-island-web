"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, ExternalLink, AlertCircle, Settings } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type ModelStatus = "ok" | "flaky" | "paid" | "broken";
type ModelEntry = { id: string; label: string; status: ModelStatus; note?: string };

type Provider = {
  key: "pollinations" | "cloudflare" | "together" | "huggingface" | "replicate";
  name: string;
  emoji: string;
  desc: string;
  models: ModelEntry[];
  setupSteps: string[];
  envVars: string[];
  signupUrl: string;
  pricing: string;
  speed: string;
  quality: string;
  color: string;
};

const STATUS_BADGE: Record<ModelStatus, { label: string; cls: string }> = {
  ok: { label: "✅ 穩", cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" },
  flaky: { label: "⚠️ 不穩", cls: "text-yellow-300 bg-yellow-500/15 border-yellow-500/30" },
  paid: { label: "💰 需付費", cls: "text-orange-300 bg-orange-500/15 border-orange-500/30" },
  broken: { label: "❌ 目前掛", cls: "text-red-300 bg-red-500/15 border-red-500/30" },
};

const PROVIDERS: Provider[] = [
  {
    key: "pollinations",
    name: "Pollinations.ai",
    emoji: "🌸",
    desc: "完全免費、無 key、URL 模式、用了就走",
    models: [
      { id: "flux", label: "Flux (平衡)", status: "ok" },
      { id: "flux-anime", label: "Flux Anime (動漫風) 🌸", status: "ok" },
      { id: "flux-realism", label: "Flux Realism (寫實)", status: "ok" },
      { id: "flux-3d", label: "Flux 3D", status: "ok" },
      { id: "turbo", label: "Turbo (最快)", status: "ok" },
    ],
    setupSteps: ["✅ 無需設定、直接能用"],
    envVars: [],
    signupUrl: "https://pollinations.ai/",
    pricing: "完全免費",
    speed: "3-15 秒",
    quality: "中-高",
    color: "border-emerald-500/40 bg-emerald-500/5",
  },
  {
    key: "cloudflare",
    name: "Cloudflare Workers AI",
    emoji: "☁️",
    desc: "每天 10,000 neurons 免費、量大最划算",
    models: [
      { id: "@cf/black-forest-labs/flux-1-schnell", label: "Flux Schnell", status: "ok", note: "穩定推薦" },
    ],
    setupSteps: [
      "1. 去 https://dash.cloudflare.com 註冊 (有 GitHub 直接登)",
      "2. 進 dashboard、URL 列 32 字元 hex 就是 Account ID、複製",
      "3. My Profile → API Tokens → Create Token → 選「Workers AI」template",
      "4. 把 Account ID 跟 Token 加到 .env.local：",
      "   CF_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "   CF_AI_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    ],
    envVars: ["CF_ACCOUNT_ID", "CF_AI_TOKEN"],
    signupUrl: "https://dash.cloudflare.com/profile/api-tokens",
    pricing: "10k neurons/day 免費 (約 200 張圖) — 超過 $0.011/1k neurons",
    speed: "1-5 秒",
    quality: "中",
    color: "border-orange-500/40 bg-orange-500/5",
  },
  {
    key: "together",
    name: "Together AI",
    emoji: "🤝",
    desc: "FLUX schnell 品質最好、新註冊 $25 free credit",
    models: [
      { id: "black-forest-labs/FLUX.1-schnell-Free", label: "FLUX.1 Schnell Free", status: "ok", note: "永久免費" },
    ],
    setupSteps: [
      "1. 去 https://api.together.xyz 註冊 (Google / Email)",
      "2. 新註冊送 $25 free credit",
      "3. Dashboard → API Keys → Create new key、複製",
      "4. 加到 .env.local：",
      "   TOGETHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "💡 FLUX.1-schnell-Free model 永遠免費、不扣 credit",
    ],
    envVars: ["TOGETHER_API_KEY"],
    signupUrl: "https://api.together.xyz/",
    pricing: "Schnell-Free 完全免費、其他 $0.0027-0.025/MP",
    speed: "1-3 秒",
    quality: "最高 🏆",
    color: "border-purple-500/40 bg-purple-500/5",
  },
  {
    key: "huggingface",
    name: "Hugging Face",
    emoji: "🤗",
    desc: "免費 rate-limited、上千 model 任挑、cold start 慢",
    models: [
      { id: "black-forest-labs/FLUX.1-schnell", label: "FLUX.1 Schnell", status: "ok", note: "router 唯一還可走的" },
    ],
    setupSteps: [
      "1. 去 https://huggingface.co 註冊 (免費)",
      "2. Settings → Access Tokens → New token",
      "3. Token Type 選「Read」(只查模型用)、命名後 Create",
      "4. 加到 .env.local：",
      "   HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxx",
      "⚠️ Free tier 有 rate limit、cold start 第一次 30s、之後幾秒",
    ],
    envVars: ["HUGGINGFACE_TOKEN"],
    signupUrl: "https://huggingface.co/settings/tokens",
    pricing: "Free tier (rate limited) / Pro $9/mo",
    speed: "5-30 秒 (cold start 慢)",
    quality: "高",
    color: "border-yellow-500/40 bg-yellow-500/5",
  },
  {
    key: "replicate",
    name: "Replicate",
    emoji: "🔁",
    desc: "Pay-per-use、新註冊有 trial credits、各種 SOTA 模型",
    models: [
      { id: "black-forest-labs/flux-schnell", label: "Flux Schnell", status: "ok", note: "$0.003/圖 (Replicate 一定要綁卡才給 token)" },
    ],
    setupSteps: [
      "1. 去 https://replicate.com 註冊 (GitHub / Email)",
      "2. 新註冊有 free trial credits (約 30-100 張圖)",
      "3. Settings → API Tokens → 複製 token",
      "4. 加到 .env.local：",
      "   REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxx",
      "💡 之後用完 trial、要加信用卡才能繼續",
    ],
    envVars: ["REPLICATE_API_TOKEN"],
    signupUrl: "https://replicate.com/account/api-tokens",
    pricing: "Trial free → $0.003-0.05/圖 (信用卡儲值)",
    speed: "3-10 秒",
    quality: "高",
    color: "border-blue-500/40 bg-blue-500/5",
  },
];

export function OgPreviewClient() {
  const [provider, setProvider] = useState<Provider>(PROVIDERS[0]);
  const [model, setModel] = useState<string>(PROVIDERS[0].models[0].id);
  const [prompt, setPrompt] = useState("AI Island, sakura petals floating, anime style, learning platform poster");
  const [seed, setSeed] = useState("42");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const pickProvider = (p: Provider) => {
    setProvider(p);
    setModel(p.models[0].id);
    setImageUrl(null);
    setError(null);
    setShowSetup(p.setupSteps.length > 1); // 預設展開非 pollinations 的設定
  };

  const generate = async () => {
    if (!prompt.trim()) {
      toast.warning("填 prompt");
      return;
    }
    setLoading(true);
    setError(null);
    setImageUrl(null);
    const url = `/api/og/ai?provider=${provider.key}&prompt=${encodeURIComponent(prompt)}&model=${encodeURIComponent(model)}&seed=${seed}&w=1200&h=630&_t=${Date.now()}`;
    try {
      // 用 fetch 抓 image binary 而不是 <img src=url> — 因為 <img> 拿不到 server 回的 JSON error msg
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // 完整顯示 server 回的 hint / msg / status (不只 generic 訊息)
        const detail = [
          `📡 HTTP ${res.status}`,
          j.api_status ? `API status: ${j.api_status}` : null,
          j.msg ? `訊息: ${j.msg}` : null,
          j.hint ? `💡 ${j.hint}` : null,
          j.api_url ? `URL: ${j.api_url}` : null,
        ].filter(Boolean).join("\n");
        throw new Error(detail || `HTTP ${res.status}`);
      }
      // 成功 — image binary 或 redirect 到 image URL
      const ct = res.headers.get("content-type") ?? "";
      if (ct.startsWith("image/")) {
        // binary、轉成 blob URL
        const blob = await res.blob();
        setImageUrl(URL.createObjectURL(blob));
      } else {
        // 不是 image (redirect 已 follow、應該不會到這)、直接用 endpoint URL 給 <img>
        setImageUrl(url);
      }
    } catch (e: any) {
      setError(e.message || "失敗");
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async (urlPattern: string) => {
    await navigator.clipboard.writeText(urlPattern);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("URL 已複製");
  };

  const usagePattern = `${typeof window !== "undefined" ? window.location.origin : ""}/api/og/ai?provider=${provider.key}&prompt=<PROMPT>&model=${model}`;

  return (
    <div className="space-y-4">
      {/* 5 個 provider 卡 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.key}
            onClick={() => pickProvider(p)}
            className={`text-left p-3 rounded-2xl border transition ${
              provider.key === p.key
                ? `${p.color} ring-2 ring-purple-400/40`
                : `border-border hover:border-purple-400/40 hover:bg-bg-elevated`
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xl">{p.emoji}</span>
              <span className="font-bold text-xs">{p.name}</span>
            </div>
            <div className="text-[10px] text-fg-muted leading-relaxed">{p.desc}</div>
            <div className="mt-1.5 text-[10px] space-y-0.5">
              <div>💰 {p.pricing}</div>
              <div>⏱️ {p.speed} · 品質 {p.quality}</div>
            </div>
          </button>
        ))}
      </div>

      {/* 當前 provider 詳細 + 設定 */}
      <div className={`rounded-2xl border p-4 ${provider.color}`}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{provider.emoji}</span>
            <div>
              <div className="font-bold">{provider.name}</div>
              <div className="text-[10px] text-fg-muted">{provider.desc}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {provider.setupSteps.length > 1 && (
              <button
                onClick={() => setShowSetup(!showSetup)}
                className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-accent inline-flex items-center gap-1"
              >
                <Settings size={11} /> 設定步驟
              </button>
            )}
            <a
              href={provider.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-accent inline-flex items-center gap-1"
            >
              <ExternalLink size={11} /> 註冊 / 拿 key
            </a>
          </div>
        </div>

        {/* 設定步驟 (展開) */}
        {showSetup && (
          <div className="mb-3 p-3 rounded-xl bg-bg/50 border border-border text-xs space-y-1">
            <div className="font-bold text-fg-muted text-[10px] uppercase">設定步驟</div>
            {provider.setupSteps.map((step, i) => (
              <div key={i} className="font-mono text-[11px] text-fg-muted">{step}</div>
            ))}
            {provider.envVars.length > 0 && (
              <div className="mt-2 text-[10px] text-fg-muted/80">
                ⚠️ 設好後重啟 server 才會 reload .env.local
              </div>
            )}
          </div>
        )}

        {/* 表單 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-2">
            <label className="text-[10px] text-fg-muted">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full mt-0.5 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs"
            >
              {provider.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {STATUS_BADGE[m.status].label.replace(/^\S+ /, "")} {m.label}{m.note ? ` — ${m.note}` : ""}
                </option>
              ))}
            </select>
            {/* 當前 model 狀態徽章 */}
            {(() => {
              const cur = provider.models.find((m) => m.id === model);
              if (!cur) return null;
              const b = STATUS_BADGE[cur.status];
              return (
                <div className={`mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${b.cls}`}>
                  {b.label}{cur.note ? ` · ${cur.note}` : ""}
                </div>
              );
            })()}
          </div>
          <div>
            <label className="text-[10px] text-fg-muted">Seed</label>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full mt-0.5 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs font-mono"
            />
          </div>
        </div>

        <div className="mt-2">
          <label className="text-[10px] text-fg-muted">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="w-full mt-0.5 bg-bg border border-border rounded-lg p-2 text-xs"
            placeholder="AI Island anime, sakura, neon cyberpunk..."
          />
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            生成
          </button>
          <button
            onClick={() => copyUrl(usagePattern)}
            className="px-3 py-2 rounded-full border border-border hover:border-emerald-400 text-xs inline-flex items-center gap-1"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            複製 URL pattern
          </button>
        </div>

        <div className="mt-2 text-[10px] text-fg-muted font-mono break-all bg-bg/40 p-2 rounded">
          {usagePattern}
        </div>
      </div>

      {/* 圖片預覽 / 錯誤 */}
      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-bold text-sm text-red-300">生成失敗</div>
              <div className="text-xs text-fg-muted mt-1 font-mono">{error}</div>
              {error.includes("not_configured") && (
                <div className="text-xs text-orange-300 mt-2">
                  ↑ 點上面「設定步驟」按鈕看怎麼配 env 變數
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {imageUrl && (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 bg-bg-elevated text-xs text-fg-muted flex items-center justify-between">
            <span>🖼️ {provider.name} / {model}</span>
            <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">
              開原圖 <ExternalLink size={10} />
            </a>
          </div>
          <img src={imageUrl} alt="AI generated OG" className="w-full" />
        </div>
      )}

      {/* 給 dev 看的：怎麼套到 chapter / blog metadata */}
      <div className="rounded-2xl bg-bg-elevated/30 border border-border p-4 text-xs leading-relaxed">
        <div className="font-bold text-fg mb-2">💡 怎麼套到 chapter / blog 的 OG image</div>
        <pre className="bg-bg/40 p-3 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">{`// src/app/chapters/[id]/page.tsx generateMetadata
const ogImage = \`\${SITE_URL}/api/og/ai\`
  + \`?provider=${provider.key}\`
  + \`&model=${model}\`
  + \`&prompt=\${encodeURIComponent(chapter.title + " anime poster")}\`;`}</pre>
        <p className="mt-2 text-fg-muted">
          ⚠️ <b>第一次</b> FB / X 爬會生圖 (3-30 秒、可能 timeout)、之後 CDN cache 24hr。
          建議搭配 <code className="bg-bg-elevated px-1 rounded">/api/og/chapter/[id]</code> 當 fallback (Satori 純文字、極快)。
        </p>
      </div>
    </div>
  );
}
