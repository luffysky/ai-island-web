"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";

const ROWS: { key: string; label: string; desc: string }[] = [
  { key: "line_pref_daily_brief", label: "每日晨報", desc: "每天早上一則：天氣生活建議 + 今日運勢 + 今天值得做的 3 件事" },
  { key: "line_pref_deadlines", label: "機會截止提醒", desc: "收藏的機會距報名截止 30/14/7/3/1 天" },
  { key: "line_pref_subscriptions", label: "機會訂閱符合", desc: "有新機會符合你訂閱的條件" },
  { key: "line_pref_agent", label: "分身島任務", desc: "任務完成 / 需要你確認的動作" },
  { key: "line_pref_learning", label: "學習提醒", desc: "完課 / 成就 / 連勝里程碑" },
  { key: "line_pref_fortune", label: "每日運勢", desc: "每天早上把你的今日運勢推到 LINE" },
];

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`relative w-10 h-6 rounded-full transition ${on ? "bg-emerald-500" : "bg-black/20 dark:bg-white/20"} disabled:opacity-50`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}

export function NotificationPrefs() {
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const [bound, setBound] = useState(false);
  const [saving, setSaving] = useState("");

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/me/notification-prefs"); if (r.ok) { const d = await r.json(); setPrefs(d.prefs ?? {}); setBound(!!d.bound); } } catch { /* ignore */ }
    })();
  }, []);

  const toggle = async (key: string) => {
    if (!prefs || saving) return;
    const next = !prefs[key];
    setPrefs({ ...prefs, [key]: next });
    setSaving(key);
    try {
      await fetch("/api/me/notification-prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: next }) });
    } catch { setPrefs({ ...prefs, [key]: !next }); } finally { setSaving(""); }
  };

  if (!prefs) return null;
  const master = prefs.line_notify_enabled !== false;

  return (
    <section className="surface p-4">
      <h2 className="font-bold flex items-center gap-2 mb-1"><Bell className="w-4 h-4 text-accent" /> LINE 通知偏好</h2>
      <p className="text-xs text-fg-muted mb-3">{bound ? "選擇哪些事件要推到你的 LINE。" : "先綁定 LINE（上方）才會收到推播；這裡的設定綁定後生效。"}</p>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <div><div className="text-sm font-medium">LINE 推播總開關</div><div className="text-[11px] text-fg-muted">關掉＝所有 LINE 通知都不送</div></div>
        <div className="flex items-center gap-2">{saving === "line_notify_enabled" && <Loader2 className="w-3.5 h-3.5 animate-spin text-fg-muted" />}<Toggle on={master} onClick={() => toggle("line_notify_enabled")} /></div>
      </div>

      <div className={master ? "" : "opacity-40 pointer-events-none"}>
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="min-w-0 pr-3"><div className="text-sm font-medium">{row.label}</div><div className="text-[11px] text-fg-muted">{row.desc}</div></div>
            <div className="flex items-center gap-2 shrink-0">{saving === row.key && <Loader2 className="w-3.5 h-3.5 animate-spin text-fg-muted" />}<Toggle on={prefs[row.key] !== false} onClick={() => toggle(row.key)} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
