"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Power } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTW } from "@/lib/format-date";

type Rule = {
  id: string;
  kind: string;
  key: string;
  value: any;
  enabled: boolean;
  note: string | null;
  updated_at: string;
};

const KINDS = ["xp_event", "coin_event", "achievement_trigger", "streak_bonus", "level_reward"];

const PRESETS: Record<string, { keys: string[]; tip: string }> = {
  xp_event: { keys: ["lesson_complete", "quiz_perfect", "daily_checkin", "forum_thread_create", "forum_reply_create", "blog_publish"], tip: "value 範例：{ \"xp\": 10 }" },
  coin_event: { keys: ["daily_checkin", "quest_reward", "lesson_complete"], tip: "value 範例：{ \"amount\": 5 }" },
  achievement_trigger: { keys: ["first_lesson", "streak_7", "streak_30", "first_blog", "100_lessons"], tip: "value 範例：{ \"condition\": \"...\" }" },
  streak_bonus: { keys: ["multiplier_7", "multiplier_30", "multiplier_100"], tip: "value 範例：{ \"multiplier\": 1.5 }" },
  level_reward: { keys: ["lv_5", "lv_10", "lv_30", "lv_60"], tip: "value 範例：{ \"z_coin\": 100 }" },
};

export function GamificationRulesClient({ initial }: { initial: Rule[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [rules, setRules] = useState(initial);
  const [newKind, setNewKind] = useState("xp_event");
  const [newKey, setNewKey] = useState("");
  const [newValueRaw, setNewValueRaw] = useState("{}");

  const create = async () => {
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(newValueRaw || "{}");
    } catch {
      toast.error("value 不是有效 JSON");
      return;
    }
    if (!newKey.trim()) {
      toast.warning("key 必填");
      return;
    }
    try {
      const res = await fetch("/api/admin/gamification", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: newKind, key: newKey.trim(), value: parsedValue }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      toast.success("已新增規則");
      setNewKey("");
      setNewValueRaw("{}");
      router.refresh();
    } catch (e: any) {
      toast.error(`新增失敗：${e?.message || ""}`);
    }
  };

  const update = async (id: string, patch: Partial<Rule>) => {
    const before = rules;
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try {
      const res = await fetch(`/api/admin/gamification/${id}`, {
      credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      toast.success("已儲存");
    } catch {
      setRules(before);
      toast.error("儲存失敗");
    }
  };

  const remove = async (id: string, key: string) => {
    const ok = await confirm({ title: `刪除規則「${key}」？`, destructive: true, confirmLabel: "刪除" });
    if (!ok) return;
    const res = await fetch(`/api/admin/gamification/${id}`, {
      credentials: "include", method: "DELETE" });
    if (res.ok) {
      setRules((rs) => rs.filter((r) => r.id !== id));
      toast.success("已刪除");
    } else toast.error("刪除失敗");
  };

  // group by kind
  const byKind: Record<string, Rule[]> = {};
  for (const r of rules) {
    if (!byKind[r.kind]) byKind[r.kind] = [];
    byKind[r.kind].push(r);
  }

  return (
    <div className="space-y-4">
      {/* 新增 */}
      <div className="rounded-xl bg-bg-card border border-border p-3 space-y-2">
        <div className="text-sm font-bold">＋ 新增規則</div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_3fr_auto] gap-2">
          <select value={newKind} onChange={(e) => setNewKind(e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            list={`preset-${newKind}`}
            placeholder="key（例：lesson_complete）"
            className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
          />
          <datalist id={`preset-${newKind}`}>
            {(PRESETS[newKind]?.keys ?? []).map((k) => <option key={k} value={k} />)}
          </datalist>
          <input
            value={newValueRaw}
            onChange={(e) => setNewValueRaw(e.target.value)}
            placeholder='value JSON 例：{"xp": 10}'
            className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
          />
          <button onClick={create} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm flex items-center gap-1">
            <Plus size={13} /> 新增
          </button>
        </div>
        <p className="text-[10px] text-fg-muted">{PRESETS[newKind]?.tip}</p>
      </div>

      {/* 列表 by kind */}
      {KINDS.map((kind) => (
        <section key={kind}>
          <h2 className="text-sm font-bold text-fg-muted mb-2 uppercase tracking-wide">{kind}</h2>
          <div className="rounded-xl bg-bg-card border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-bg-elevated text-fg-muted text-xs">
                <tr>
                  <th className="text-left px-3 py-2">Key</th>
                  <th className="text-left px-3 py-2">Value (JSON)</th>
                  <th className="text-left px-3 py-2">啟用</th>
                  <th className="text-left px-3 py-2">備註</th>
                  <th className="text-left px-3 py-2">更新</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(byKind[kind] ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-fg-muted text-xs">無規則</td></tr>
                ) : byKind[kind].map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-mono text-accent">{r.key}</td>
                    <td className="px-3 py-2">
                      <input
                        defaultValue={JSON.stringify(r.value)}
                        onBlur={(e) => {
                          try {
                            const v = JSON.parse(e.target.value);
                            if (JSON.stringify(v) !== JSON.stringify(r.value)) update(r.id, { value: v });
                          } catch {
                            toast.error("value 不是合法 JSON");
                          }
                        }}
                        className="w-full bg-bg border border-border rounded px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => update(r.id, { enabled: !r.enabled })}
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${r.enabled ? "bg-accent/15 text-accent" : "bg-bg-elevated text-fg-muted"}`}
                      >
                        <Power size={11} /> {r.enabled ? "啟用" : "停用"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        defaultValue={r.note ?? ""}
                        onBlur={(e) => {
                          if (e.target.value !== (r.note ?? "")) update(r.id, { note: e.target.value || null });
                        }}
                        placeholder="說明..."
                        className="w-full bg-bg border border-border rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-[10px] text-fg-muted">{formatTW(r.updated_at)}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => remove(r.id, r.key)} className="text-fg-muted hover:text-red-400 p-1">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="text-xs text-fg-muted">
        ⚠️ 部分規則需要程式碼支援才會生效（目前 gamification engine 還未全面接入此表、屬於 LT-16 後續工程）。
      </p>
    </div>
  );
}
