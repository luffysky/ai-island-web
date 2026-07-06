"use client";

import { useState } from "react";
import { Brain, Sparkles, Save, Trash2, MessageSquare, Check, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Topic = { topic: string; count: number };
type Prefs = {
  custom_prompt?: string;
  tone?: string;
  remember_enabled?: boolean;
  [k: string]: any;
};

type Initial = {
  summary: string | null;
  preferences: Prefs;
  topics: Topic[];
  turn_count: number;
};

const TONES: { value: string; label: string }[] = [
  { value: "short", label: "簡短" },
  { value: "detailed", label: "詳細" },
  { value: "encouraging", label: "鼓勵" },
  { value: "direct", label: "直接" },
];

// preferences 裡「非使用者自訂」的系統 key（cron summarizer 產的）、拿來做記憶亮點
const HIGHLIGHT_KEYS: { key: string; label: string }[] = [
  { key: "style", label: "風格" },
  { key: "jargon_familiar", label: "已熟悉術語" },
  { key: "jargon_unfamiliar", label: "還在學的術語" },
  { key: "tone_hints", label: "風格提示" },
];

export function AiProfileClient({ initial }: { initial: Initial }) {
  const confirm = useConfirm();
  const p = initial.preferences || {};
  const [customPrompt, setCustomPrompt] = useState<string>(p.custom_prompt ?? "");
  const [tone, setTone] = useState<string>(p.tone ?? "");
  const [remember, setRemember] = useState<boolean>(p.remember_enabled !== false);
  const [summary, setSummary] = useState<string>(initial.summary ?? "");

  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savedSummary, setSavedSummary] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>(initial.topics || []);
  const [prefs, setPrefs] = useState<Prefs>(p);

  const patch = async (body: any) => {
    const res = await fetch("/api/me/ai-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`(${res.status})`);
    return res.json();
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    setErr(null);
    try {
      await patch({ custom_prompt: customPrompt, tone: tone || "", remember_enabled: remember });
      setSavedPrefs(true);
      setTimeout(() => setSavedPrefs(false), 2500);
    } catch (e) {
      setErr("儲存失敗 " + (e as Error).message);
    } finally {
      setSavingPrefs(false);
    }
  };

  const saveSummary = async () => {
    setSavingSummary(true);
    setErr(null);
    try {
      await patch({ summary: summary || null });
      setSavedSummary(true);
      setTimeout(() => setSavedSummary(false), 2500);
    } catch (e) {
      setErr("儲存失敗 " + (e as Error).message);
    } finally {
      setSavingSummary(false);
    }
  };

  const clearAll = async () => {
    if (!(await confirm({ title: "確定要清除 AI 對你的所有記憶嗎？", description: "此動作無法復原。", destructive: true, confirmLabel: "清除" }))) return;
    setClearing(true);
    setErr(null);
    try {
      const res = await fetch("/api/me/ai-profile", { method: "DELETE" });
      if (!res.ok) throw new Error(`(${res.status})`);
      setSummary("");
      setTopics([]);
      setPrefs({});
      setCustomPrompt("");
      setTone("");
      setRemember(true);
    } catch (e) {
      setErr("清除失敗 " + (e as Error).message);
    } finally {
      setClearing(false);
    }
  };

  const highlights = HIGHLIGHT_KEYS.map(({ key, label }) => {
    const v = (prefs as any)[key];
    if (!v) return null;
    const text = Array.isArray(v) ? v.slice(0, 6).join("、") : String(v);
    if (!text) return null;
    return { label, text };
  }).filter(Boolean) as { label: string; text: string }[];

  return (
    <div className="space-y-8">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-accent" />
          AI 記憶與偏好
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          自訂綠寶與各處 AI 助理如何跟你互動、並管理它對你的長期記憶。
        </p>
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
          {err}
        </div>
      )}

      {/* (a) 自訂綠寶 / AI */}
      <section className="p-5 bg-bg-card border border-border rounded-lg space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          自訂綠寶 / AI
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            自訂指示
            <span className="text-fg-muted font-normal">（AI 會優先遵守，例如「用台語詞彙」「先給結論再解釋」）</span>
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="例如：請叫我阿明、回答時多給程式碼範例、避免太長的鋪陳。"
            className="w-full p-3 rounded-lg bg-bg-elevated border border-border text-sm resize-y focus:outline-none focus:border-accent"
          />
          <div className="text-xs text-fg-muted text-right">{customPrompt.length} / 2000</div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">語氣偏好</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTone("")}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                tone === "" ? "bg-accent text-black border-accent font-medium" : "bg-bg-elevated border-border hover:border-accent"
              }`}
            >
              預設
            </button>
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  tone === t.value ? "bg-accent text-black border-accent font-medium" : "bg-bg-elevated border-border hover:border-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg-elevated cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={() => setRemember((v) => !v)}
            className="mt-1 accent-accent"
          />
          <div className="flex-1">
            <div className="font-medium text-sm">記住我的偏好</div>
            <div className="text-xs text-fg-muted">
              關閉後，AI 不會在對話中使用你的長期記憶與自訂指示（不影響已儲存的內容）。
            </div>
          </div>
        </label>

        <button
          onClick={savePrefs}
          disabled={savingPrefs}
          className="w-full px-4 py-3 bg-accent text-black rounded-lg font-bold hover:scale-[1.01] transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : savedPrefs ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savingPrefs ? "儲存中…" : savedPrefs ? "已儲存" : "儲存偏好"}
        </button>
      </section>

      {/* (b) AI 對你的記憶 */}
      <section className="p-5 bg-bg-card border border-border rounded-lg space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          AI 對你的記憶
          <span className="text-xs font-normal text-fg-muted ml-auto">累積 {initial.turn_count} 次對話</span>
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            近期摘要
            <span className="text-fg-muted font-normal">（AI 自動整理，你也可以修改）</span>
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="目前還沒有記憶。多跟 AI 對話後，這裡會出現它對你的了解。"
            className="w-full p-3 rounded-lg bg-bg-elevated border border-border text-sm resize-y focus:outline-none focus:border-accent"
          />
          <button
            onClick={saveSummary}
            disabled={savingSummary}
            className="px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm font-medium hover:border-accent transition disabled:opacity-50 flex items-center gap-2"
          >
            {savingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : savedSummary ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savingSummary ? "儲存中…" : savedSummary ? "已儲存" : "儲存摘要"}
          </button>
        </div>

        {topics.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">常聊主題</div>
            <div className="flex flex-wrap gap-2">
              {topics.slice(0, 12).map((t) => (
                <span key={t.topic} className="px-3 py-1 rounded-full text-xs bg-bg-elevated border border-border">
                  {t.topic}
                  <span className="text-fg-muted ml-1">×{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">記憶亮點</div>
            <ul className="space-y-1 text-sm text-fg-muted">
              {highlights.map((h) => (
                <li key={h.label}>
                  <span className="text-fg font-medium">{h.label}：</span>
                  {h.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <button
            onClick={clearAll}
            disabled={clearing}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/10 transition disabled:opacity-50 flex items-center gap-2"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {clearing ? "清除中…" : "清除所有記憶"}
          </button>
          <p className="text-xs text-fg-muted mt-2">
            這會清空摘要、常聊主題與 AI 累積的偏好（不含你上方的自訂指示，除非一併重設）。
          </p>
        </div>
      </section>
    </div>
  );
}
