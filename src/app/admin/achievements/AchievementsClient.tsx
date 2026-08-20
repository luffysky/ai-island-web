"use client";

import { useEffect, useState } from "react";
import { Trophy, Plus, Trash2, Pencil, Check, X, Loader2, AlertTriangle } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  z_coin_reward: number;
  rarity: string;
}

const CATEGORIES = ["milestone", "speed", "social", "perfect", "hidden"];
const CATEGORY_ZH: Record<string, string> = {
  milestone: "里程碑",
  speed: "速度",
  social: "社群",
  perfect: "完美",
  hidden: "隱藏",
};
const RARITIES = ["common", "rare", "epic", "legendary"];
const RARITY_ZH: Record<string, string> = {
  common: "普通",
  rare: "稀有",
  epic: "史詩",
  legendary: "傳說",
};
const RARITY_COLOR: Record<string, string> = {
  common: "text-fg-muted",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

type Draft = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xp_reward: number;
  z_coin_reward: number;
};

const EMPTY_DRAFT: Draft = {
  id: "",
  name: "",
  description: "",
  icon: "🏆",
  category: "milestone",
  rarity: "common",
  xp_reward: 100,
  z_coin_reward: 20,
};

export function AchievementsClient() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [unlockCount, setUnlockCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 新增表單
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  // 編輯中的 id + 編輯草稿
  const [editId, setEditId] = useState("");
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [confirmDel, setConfirmDel] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    const d = await fetch("/api/admin/achievements")
      .then((r) => (r.ok ? r.json() : { achievements: [], unlockCount: {} }))
      .catch(() => ({ achievements: [], unlockCount: {} }));
    setItems(d.achievements ?? []);
    setUnlockCount(d.unlockCount ?? {});
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (saving) return;
    setErr("");
    if (!draft.id.trim() || !draft.name.trim() || !draft.description.trim() || !draft.icon.trim()) {
      setErr("id / 名稱 / 說明 / 圖示 都要填");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error ?? "新增失敗");
        return;
      }
      setItems((cur) => [d.achievement, ...cur]);
      setDraft(EMPTY_DRAFT);
      setShowAdd(false);
    } catch {
      setErr("連線失敗");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (a: Achievement) => {
    setEditId(a.id);
    setEditDraft({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      rarity: a.rarity,
      xp_reward: a.xp_reward,
      z_coin_reward: a.z_coin_reward,
    });
    setErr("");
  };

  const saveEdit = async () => {
    if (busyId) return;
    setBusyId(editId);
    setErr("");
    try {
      const r = await fetch(`/api/admin/achievements?id=${encodeURIComponent(editId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name,
          description: editDraft.description,
          icon: editDraft.icon,
          category: editDraft.category,
          rarity: editDraft.rarity,
          xp_reward: editDraft.xp_reward,
          z_coin_reward: editDraft.z_coin_reward,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error ?? "更新失敗");
        return;
      }
      setItems((cur) => cur.map((x) => (x.id === editId ? d.achievement : x)));
      setEditId("");
    } catch {
      setErr("連線失敗");
    } finally {
      setBusyId("");
    }
  };

  const del = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    setErr("");
    try {
      const r = await fetch(`/api/admin/achievements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d.error ?? "刪除失敗");
        return;
      }
      setItems((cur) => cur.filter((x) => x.id !== id));
      setConfirmDel("");
    } catch {
      setErr("連線失敗");
    } finally {
      setBusyId("");
    }
  };

  const numField = (label: string, val: number, on: (n: number) => void) => (
    <label className="text-xs text-fg-muted flex flex-col gap-1">
      {label}
      <input
        type="number"
        value={val}
        onChange={(e) => on(Number(e.target.value))}
        className="w-24 px-2 py-1 rounded bg-bg-elevated border border-border text-fg text-sm"
      />
    </label>
  );

  const draftForm = (d: Draft, set: (patch: Partial<Draft>) => void, isNew: boolean) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isNew && (
          <input
            value={d.id}
            onChange={(e) => set({ id: e.target.value })}
            placeholder="id（slug，小寫英數-）"
            className="w-48 px-2 py-1 rounded bg-bg-elevated border border-border text-fg text-sm"
          />
        )}
        <input
          value={d.icon}
          onChange={(e) => set({ icon: e.target.value })}
          placeholder="🏆"
          className="w-16 px-2 py-1 rounded bg-bg-elevated border border-border text-fg text-sm text-center"
        />
        <input
          value={d.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="成就名稱"
          className="flex-1 min-w-[10rem] px-2 py-1 rounded bg-bg-elevated border border-border text-fg text-sm"
        />
      </div>
      <textarea
        value={d.description}
        onChange={(e) => set({ description: e.target.value })}
        placeholder="達成條件 / 說明"
        rows={2}
        className="w-full px-2 py-1 rounded bg-bg-elevated border border-border text-fg text-sm"
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-fg-muted flex flex-col gap-1">
          分類
          <select
            value={d.category}
            onChange={(e) => set({ category: e.target.value })}
            className="px-2 py-1 rounded bg-bg-elevated border border-border text-fg text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_ZH[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-fg-muted flex flex-col gap-1">
          稀有度
          <select
            value={d.rarity}
            onChange={(e) => set({ rarity: e.target.value })}
            className="px-2 py-1 rounded bg-bg-elevated border border-border text-fg text-sm"
          >
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {RARITY_ZH[r]}
              </option>
            ))}
          </select>
        </label>
        {numField("XP 獎勵", d.xp_reward, (n) => set({ xp_reward: n }))}
        {numField("Z 幣獎勵", d.z_coin_reward, (n) => set({ z_coin_reward: n }))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-pink-500/10 border border-yellow-500/30 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold mb-1 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-accent" strokeWidth={2.25} />
              成就管理
            </h1>
            <p className="text-sm text-fg-muted">
              新增 / 編輯 / 刪除可解鎖成就的條件、XP / Z 幣獎勵、圖示與稀有度。改完用戶下次達成條件會用新規則。已被解鎖的成就不能刪除（保護使用者紀錄），只能編輯。
            </p>
          </div>
          <button
            onClick={() => {
              setShowAdd((v) => !v);
              setDraft(EMPTY_DRAFT);
              setErr("");
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            新增成就
          </button>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {err}
        </div>
      )}

      {showAdd && (
        <div className="bg-bg-card border border-accent/40 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm">新增成就</h3>
          {draftForm(draft, (patch) => setDraft((d) => ({ ...d, ...patch })), true)}
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              建立
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-sm"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-fg-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          載入中…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((a) => {
            const unlocked = unlockCount[a.id] ?? 0;
            const editing = editId === a.id;
            return (
              <div key={a.id} className="bg-bg-card border border-border rounded-xl p-4">
                {editing ? (
                  <div className="space-y-3">
                    {draftForm(editDraft, (patch) => setEditDraft((d) => ({ ...d, ...patch })), false)}
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={busyId === a.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
                      >
                        {busyId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        儲存
                      </button>
                      <button
                        onClick={() => setEditId("")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-sm"
                      >
                        <X className="w-4 h-4" />
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="text-3xl shrink-0">{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold">{a.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-bg-elevated text-warning">+{a.xp_reward} XP</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-bg-elevated text-emerald-400">+{a.z_coin_reward} Z</span>
                        <span className={`text-xs font-semibold ${RARITY_COLOR[a.rarity] ?? "text-fg-muted"}`}>
                          {RARITY_ZH[a.rarity] ?? a.rarity}
                        </span>
                      </div>
                      <p className="text-sm text-fg-muted mt-1">{a.description}</p>
                      <div className="flex items-center gap-3 text-xs text-fg-muted mt-2 flex-wrap">
                        <span className="font-mono opacity-70">{a.id}</span>
                        <span>· {CATEGORY_ZH[a.category] ?? a.category}</span>
                        <span>· 已解鎖 {unlocked} 人</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => startEdit(a)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg-elevated border border-border text-xs hover:border-accent"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          編輯
                        </button>
                        {confirmDel === a.id ? (
                          <>
                            <button
                              onClick={() => del(a.id)}
                              disabled={busyId === a.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-danger/15 border border-danger/40 text-danger text-xs disabled:opacity-50"
                            >
                              {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              確定刪除
                            </button>
                            <button
                              onClick={() => setConfirmDel("")}
                              className="px-2 py-1 rounded bg-bg-elevated border border-border text-xs"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDel(a.id)}
                            disabled={unlocked > 0}
                            title={unlocked > 0 ? "已有人解鎖、不能刪除" : "刪除"}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg-elevated border border-border text-xs hover:border-danger disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            刪除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
