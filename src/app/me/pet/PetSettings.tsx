"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import { SPECIES_LIST, getSpecies, type SpeciesId } from "@/lib/pet-species";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type AIModel = {
  id: string;
  provider: string;
  model_name: string;
  display_name: string;
  description: string | null;
};

export function PetSettings({ initial }: { initial: any }) {
  const [pet, setPet] = useState({
    name: initial?.name ?? "招財",
    species: (initial?.species ?? "hamster") as SpeciesId,
    proactive_enabled: !!(initial?.proactive_enabled ?? true),
    walk_enabled: !!(initial?.walk_enabled ?? true),
    ai_model_id: (initial?.ai_model_id ?? null) as string | null,
    custom_prompt: (initial?.custom_prompt ?? "") as string,
    use_byok: !!(initial?.use_byok ?? false),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const species = getSpecies(pet.species);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase
      .from("ai_models")
      .select("id, provider, model_name, display_name, description")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setModels(data as AIModel[]);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/pet/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pet),
      });
      const data = await res.json();
      if (!res.ok) setMsg(`失敗：${data.error}`);
      else setMsg("✅ 已儲存");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 預覽卡 */}
      <div className="bg-gradient-to-br from-accent/15 via-accent-2/10 to-bg-card border border-border rounded-2xl p-6 text-center">
        <div className="text-6xl mb-2">{species.emoji}</div>
        <div className="text-lg font-bold">{pet.name}</div>
        <div className="text-xs text-fg-muted mt-1">{species.name}</div>
        <div className="text-xs text-fg-muted mt-1">{species.intro}</div>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-xs text-fg-muted block mb-1">寵物名稱</label>
          <input
            type="text"
            maxLength={30}
            value={pet.name}
            onChange={(e) => setPet({ ...pet, name: e.target.value })}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-fg-muted block mb-2">物種</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SPECIES_LIST.map((s) => {
              const active = pet.species === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPet({ ...pet, species: s.id, name: active ? pet.name : s.defaultName })}
                  className={`p-3 rounded-xl border text-center transition ${
                    active ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="text-3xl">{s.emoji}</div>
                  <div className="text-xs mt-1 font-bold">{s.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        <Toggle
          label="允許在頁面走動"
          help="關閉後寵物會待在固定位置"
          value={pet.walk_enabled}
          onChange={(v) => setPet({ ...pet, walk_enabled: v })}
        />
        <Toggle
          label="主動互動訊息"
          help="開啟後寵物會在閒置時偶爾主動找你聊（每 15 分一次）"
          value={pet.proactive_enabled}
          onChange={(v) => setPet({ ...pet, proactive_enabled: v })}
        />
      </div>

      {/* AI 客製化 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <h2 className="font-bold text-sm">AI 對話客製</h2>
          <span className="text-[10px] text-fg-muted">不設就用預設</span>
        </div>

        <div>
          <label className="text-xs text-fg-muted block mb-1">AI 模型</label>
          <select
            value={pet.ai_model_id ?? ""}
            onChange={(e) => setPet({ ...pet, ai_model_id: e.target.value || null })}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">系統預設（Claude Haiku 4.5、快又便宜）</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}（{m.provider}）
              </option>
            ))}
          </select>
          <p className="text-[10px] text-fg-muted mt-1 leading-snug">
            選別的 model 寵物回應風格 / 速度 / 成本會不一樣。Haiku 是預設便宜款；Sonnet 比較有個性；GPT 風格不同。
          </p>
        </div>

        <div>
          <label className="text-xs text-fg-muted block mb-1">
            自訂個性提示詞（給 AI 看的、控制寵物說話風格）
          </label>
          <textarea
            value={pet.custom_prompt}
            onChange={(e) => setPet({ ...pet, custom_prompt: e.target.value })}
            placeholder={`例如：你是一隻很臭屁的暹羅貓、覺得自己最帥、講話高高在上但其實很黏人。\n\n（留空 = 用我們的預設模板：依物種自動撒嬌 / 吐槽 / 短句）`}
            rows={5}
            maxLength={2000}
            className="w-full bg-bg border border-border rounded-lg p-2 text-xs outline-none focus:border-accent resize-none font-mono"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-fg-muted">{pet.custom_prompt.length} / 2000</p>
            {pet.custom_prompt.length > 0 && (
              <button
                onClick={() => setPet({ ...pet, custom_prompt: "" })}
                className="text-[10px] text-fg-muted hover:text-accent"
              >
                清空、改用預設
              </button>
            )}
          </div>
        </div>

        <div>
          <Toggle
            label="用我自己的 AI API key"
            help={pet.use_byok ? "開啟中 — 用你 /settings/ai-keys 設定的 key、不算系統額度" : "關閉 — 用平台共池額度（每日免費 10 次）"}
            value={pet.use_byok}
            onChange={(v) => setPet({ ...pet, use_byok: v })}
          />
          {pet.use_byok && (
            <Link
              href="/settings/ai-keys"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-1 ml-12"
            >
              去設定 API key <ExternalLink size={11} />
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs">{msg}</span>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-1.5 text-sm bg-accent text-black font-bold rounded-lg disabled:opacity-50"
          >
            {saving ? "儲存中..." : "💾 儲存全部"}
          </button>
        </div>
      </div>

      <div className="text-xs text-fg-muted bg-bg-card border border-border rounded-xl p-3 leading-relaxed">
        💡 <b>不設任何 AI 客製、寵物就用平台預設</b>（Haiku 模型 + 內建個性模板 + 共池額度）。
        想要更有個性可選別的 model + 自己寫 prompt；想無限聊就接自己的 key。
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, help }: { label: string; value: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <span className="relative inline-flex items-center mt-0.5">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="w-9 h-5 bg-bg-elevated rounded-full peer-checked:bg-accent transition" />
        <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow" />
      </span>
      <span className="flex-1 text-sm">
        <span className="font-medium">{label}</span>
        {help && <p className="text-[10px] text-fg-muted mt-0.5">{help}</p>}
      </span>
    </label>
  );
}
