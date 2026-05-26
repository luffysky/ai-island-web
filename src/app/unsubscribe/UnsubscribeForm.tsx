"use client";

import { useState } from "react";

export function UnsubscribeForm({
  token,
  current,
}: {
  token: string;
  current: {
    newsletter: boolean;
    product_updates: boolean;
    course_announcements: boolean;
    weekly_digest: boolean;
  };
}) {
  const [prefs, setPrefs] = useState(current);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const updatePref = (key: keyof typeof prefs) => {
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const unsubscribeAll = async () => {
    setLoading(true);
    const res = await fetch("/api/email/unsubscribe", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, all: true, reason }),
    });
    if (res.ok) setDone(true);
    setLoading(false);
  };

  const savePrefs = async () => {
    setLoading(true);
    const res = await fetch("/api/email/unsubscribe", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, prefs, reason }),
    });
    if (res.ok) setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="p-6 bg-bg-card border border-border rounded-lg text-center">
        <h2 className="text-xl font-bold mb-2">✅ 已更新</h2>
        <p className="text-sm text-fg-muted">
          Email 偏好已儲存、感謝你的回饋。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-5 bg-bg-card border border-border rounded-lg">
        <h2 className="font-bold mb-3">選擇要收的通知</h2>
        <div className="space-y-2 text-sm">
          {[
            { key: "newsletter" as const, label: "電子報", desc: "每月精選內容、課程推薦" },
            { key: "product_updates" as const, label: "產品更新", desc: "新功能、改版說明" },
            { key: "course_announcements" as const, label: "課程上線通知", desc: "新章節 / 課程開放" },
            { key: "weekly_digest" as const, label: "每週學習摘要", desc: "你的學習進度回顧" },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 p-2 hover:bg-bg-elevated rounded cursor-pointer">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={() => updatePref(key)}
                className="mt-1 accent-accent"
              />
              <div className="flex-1">
                <div className="font-medium">{label}</div>
                <div className="text-xs text-fg-muted">{desc}</div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={savePrefs}
          disabled={loading}
          className="w-full mt-4 px-4 py-2 bg-accent text-black rounded-lg font-bold hover:scale-[1.02] transition disabled:opacity-50"
        >
          儲存偏好
        </button>
      </div>

      <div className="p-5 bg-bg-card border border-red-500/30 rounded-lg">
        <h2 className="font-bold mb-3 text-red-500">退訂全部</h2>
        <p className="text-sm text-fg-muted mb-3">
          我們很可惜失去你、但尊重你的選擇。可以告訴我們原因嗎？（選填）
        </p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full mb-3 px-3 py-2 bg-bg-elevated border border-border rounded text-sm"
        >
          <option value="">不告知</option>
          <option value="too_frequent">通知太頻繁</option>
          <option value="not_relevant">內容跟我無關</option>
          <option value="never_signed_up">我從沒訂閱過</option>
          <option value="not_using">我已不使用 AI 島</option>
          <option value="other">其他</option>
        </select>
        <button
          onClick={unsubscribeAll}
          disabled={loading}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
        >
          退訂全部通知
        </button>
      </div>
    </div>
  );
}
