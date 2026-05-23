"use client";

import { useState } from "react";
import { SPECIES_LIST, getSpecies, type SpeciesId } from "@/lib/pet-species";

export function PetSettings({ initial }: { initial: any }) {
  const [pet, setPet] = useState({
    name: initial?.name ?? "招財",
    species: (initial?.species ?? "hamster") as SpeciesId,
    proactive_enabled: !!(initial?.proactive_enabled ?? true),
    walk_enabled: !!(initial?.walk_enabled ?? true),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const species = getSpecies(pet.species);

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
                    active
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50"
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

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs">{msg}</span>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-1.5 text-sm bg-accent text-black font-bold rounded-lg disabled:opacity-50"
          >
            {saving ? "儲存中..." : "💾 儲存"}
          </button>
        </div>
      </div>

      <div className="text-xs text-fg-muted bg-bg-card border border-border rounded-xl p-3">
        💡 PR 1 是基本版：走動 + 反應 lesson / XP 事件 + 預寫台詞。
        後續 PR 會加 AI 對話、長期記憶、主動 context 訊息。
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
