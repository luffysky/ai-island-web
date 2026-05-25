"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Brand = {
  brand_name: string;
  tagline: string;
  description: string;
  voice_tone: string;
  do_words: string[];
  dont_words: string[];
  signature: string;
  hashtag_pool: string[];
};

export function BrandVoiceClient({ initial }: { initial: Brand | null }) {
  const [b, setB] = useState<Brand>({
    brand_name: initial?.brand_name ?? "AI 島",
    tagline: initial?.tagline ?? "",
    description: initial?.description ?? "",
    voice_tone: initial?.voice_tone ?? "",
    do_words: initial?.do_words ?? [],
    dont_words: initial?.dont_words ?? [],
    signature: initial?.signature ?? "",
    hashtag_pool: initial?.hashtag_pool ?? [],
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success("✅ Brand voice 已存、所有 AI 即時套用");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const arrayInput = (label: string, key: "do_words" | "dont_words" | "hashtag_pool", placeholder: string) => (
    <div>
      <label className="text-xs font-bold text-fg-muted mb-1 block">{label}</label>
      <input
        value={b[key].join(", ")}
        onChange={(e) => setB({ ...b, [key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        placeholder={placeholder}
        className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-fg-muted mb-1 block">品牌名</label>
            <input value={b.brand_name} onChange={(e) => setB({ ...b, brand_name: e.target.value })} className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-fg-muted mb-1 block">Tagline (一句話介紹)</label>
            <input value={b.tagline} onChange={(e) => setB({ ...b, tagline: e.target.value })} placeholder="繁體中文程式自學平台、跟 AI 寵物一起冒險" className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-fg-muted mb-1 block">品牌介紹 (給 AI 看)</label>
          <textarea
            value={b.description}
            onChange={(e) => setB({ ...b, description: e.target.value })}
            placeholder="AI 島是一個給華語使用者的程式設計 + AI 技能養成平台..."
            rows={3}
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-fg-muted mb-1 block">語氣指導 (voice tone)</label>
          <textarea
            value={b.voice_tone}
            onChange={(e) => setB({ ...b, voice_tone: e.target.value })}
            placeholder="親切活潑、繁中台灣口語、學長學姊感、適度 emoji、不端官話"
            rows={3}
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {arrayInput("✅ 鼓勵用詞 (逗號分隔)", "do_words", "學員, 一起, 冒險, 練功")}
          {arrayInput("❌ 避免用詞 (逗號分隔)", "dont_words", "客戶, 購買, 完美, 顯然")}
        </div>

        {arrayInput("🏷️ Hashtag 池 (逗號分隔)", "hashtag_pool", "#AI島, #台灣程式自學, #繁中, #IndieDev")}

        <div>
          <label className="text-xs font-bold text-fg-muted mb-1 block">結尾簽名 (選填)</label>
          <input value={b.signature} onChange={(e) => setB({ ...b, signature: e.target.value })} placeholder="— AI 島團隊 🏝️" className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          儲存 Brand Voice
        </button>
      </div>
    </div>
  );
}
