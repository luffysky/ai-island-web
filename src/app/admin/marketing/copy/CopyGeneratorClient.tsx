"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, Save, Wand2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const PLATFORMS = [
  { key: "facebook", label: "Facebook", emoji: "📘", limit: 500, hint: "中長文、講故事、配 1-3 個 hashtag、可加 CTA" },
  { key: "instagram", label: "Instagram", emoji: "📷", limit: 300, hint: "短文 + 5-15 個 hashtag、emoji 多、視覺優先" },
  { key: "x", label: "X (Twitter)", emoji: "🐦", limit: 280, hint: "極短、有梗、1-2 hashtag、可分串" },
  { key: "threads", label: "Threads", emoji: "🧵", limit: 500, hint: "對話感、自然、串文友善、emoji 中性" },
  { key: "line", label: "LINE OA", emoji: "💚", limit: 500, hint: "親切像朋友、emoji 適中、可帶 button" },
  { key: "email_subject", label: "Email 標題", emoji: "✉️", limit: 60, hint: "好奇、急迫、明確、無 emoji 較開信" },
  { key: "blog_title", label: "Blog 標題 + meta", emoji: "📝", limit: 80, hint: "SEO 友善、含關鍵字、數字 / 列表標題類型表現好" },
];

export function CopyGeneratorClient() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<"casual" | "professional" | "playful" | "urgent">("casual");
  const [cta, setCta] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [savedAsDraft, setSavedAsDraft] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const toast = useToast();

  const generate = async () => {
    if (!topic.trim()) {
      toast.warning("先填主題");
      return;
    }
    setLoading(true);
    setResults({});
    setSavedAsDraft(null);
    try {
      const res = await fetch("/api/admin/marketing/copy/generate", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, audience, tone, cta, platforms: PLATFORMS.map((p) => p.key) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "failed");
      setResults(j.contents ?? {});
      toast.success("✨ AI 已生完 " + Object.keys(j.contents ?? {}).length + " 個版本");
    } catch (e: any) {
      toast.error("生成失敗：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (key: string) => {
    await navigator.clipboard.writeText(results[key] ?? "");
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const saveAsDraft = async () => {
    if (Object.keys(results).length === 0) {
      toast.warning("先生成內容");
      return;
    }
    try {
      const res = await fetch("/api/admin/marketing/drafts", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic.slice(0, 100),
          topic,
          platforms: Object.keys(results),
          contents: results,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "save failed");
      setSavedAsDraft(j.id);
      toast.success("✅ 已存草稿、可到「內容日曆 / 排程」排定發佈時間");
    } catch (e: any) {
      toast.error("存草稿失敗：" + e.message);
    }
  };

  return (
    <div className="space-y-3">
      {/* Input area */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-xs font-bold text-fg-muted mb-1 block">📌 主題 / 想推什麼 *</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例：AI 島 Ch75 HTTP 新章上線、5 個 lesson 講透 URL/Method/Status code/Header/CORS。給想學後端的新手"
            rows={3}
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-purple-400"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-fg-muted mb-1 block">🎯 目標受眾</label>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="例：22-35 歲、想轉職前端 / 全端、台灣"
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-purple-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-fg-muted mb-1 block">📢 CTA (行動呼籲)</label>
            <input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="例：到 ai-island-web.snowrealm.pet/chapters/75 免費試讀第一節"
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-purple-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-fg-muted">語氣：</span>
          {(["casual", "professional", "playful", "urgent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`px-3 py-1 rounded-full border transition ${
                tone === t ? "border-purple-400 bg-purple-500/15 text-purple-900 dark:text-purple-100" : "border-border text-fg-muted hover:border-purple-400/50"
              }`}
            >
              {t === "casual" && "🌸 親切"}
              {t === "professional" && "💼 專業"}
              {t === "playful" && "🎉 活潑"}
              {t === "urgent" && "⚡ 急迫"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            生 7 個平台 copy
          </button>
          {Object.keys(results).length > 0 && (
            <button
              onClick={saveAsDraft}
              className="px-4 py-2 rounded-full border border-emerald-500/40 text-emerald-300 text-sm inline-flex items-center gap-1.5 hover:bg-emerald-500/10"
            >
              <Save size={13} />
              存草稿 → 去排程
            </button>
          )}
          {savedAsDraft && (
            <span className="text-[11px] text-emerald-400">✓ 已存草稿 (id={savedAsDraft.slice(0, 8)})</span>
          )}
        </div>
      </div>

      {/* Results — 7 個平台卡 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PLATFORMS.map((p) => {
          const txt = results[p.key] ?? "";
          return (
            <div key={p.key} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-bg-elevated border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.emoji}</span>
                  <div>
                    <div className="text-sm font-bold">{p.label}</div>
                    <div className="text-[10px] text-fg-muted">{p.hint}</div>
                  </div>
                </div>
                {txt && (
                  <button onClick={() => copy(p.key)} className="text-fg-muted hover:text-emerald-400 transition" title="複製">
                    {copiedKey === p.key ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
              <div className="p-3 min-h-[140px] text-xs whitespace-pre-wrap leading-relaxed">
                {txt ? (
                  <>
                    <pre className="whitespace-pre-wrap font-sans">{txt}</pre>
                    <div className="mt-2 text-[10px] text-fg-muted text-right">
                      {txt.length} / {p.limit} 字 {txt.length > p.limit && <span className="text-orange-400">⚠️ 超過建議長度</span>}
                    </div>
                  </>
                ) : (
                  <div className="text-fg-muted/40 italic h-full flex items-center justify-center">
                    <Wand2 size={12} className="inline mr-1" /> 等待 AI 生成
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
