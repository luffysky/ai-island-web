"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface Prefs {
  newsletter: boolean;
  product_updates: boolean;
  course_announcements: boolean;
  weekly_digest: boolean;
  transactional: boolean;
}

export function EmailPrefsForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (key: keyof Prefs) => {
    setPrefs({ ...prefs, [key]: !prefs[key] });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("email_subscriptions")
      .upsert({
        user_id: user.id,
        email: user.email!,
        newsletter: prefs.newsletter,
        product_updates: prefs.product_updates,
        course_announcements: prefs.course_announcements,
        weekly_digest: prefs.weekly_digest,
        // transactional 永遠 true、不可關
        transactional: true,
        unsubscribed_at: (!prefs.newsletter && !prefs.product_updates && !prefs.course_announcements && !prefs.weekly_digest)
          ? new Date().toISOString()
          : null,
      }, { onConflict: "email" });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const items = [
    { key: "newsletter" as const, label: "📰 電子報", desc: "每月精選、學習技巧" },
    { key: "product_updates" as const, label: "🚀 產品更新", desc: "新功能、改版" },
    { key: "course_announcements" as const, label: "📚 課程通知", desc: "新章節上線" },
    { key: "weekly_digest" as const, label: "📊 每週學習摘要", desc: "你的進度回顧" },
  ];

  return (
    <div className="space-y-4">
      <div className="p-5 bg-bg-card border border-border rounded-lg space-y-2">
        {items.map(({ key, label, desc }) => (
          <label key={key} className="flex items-start gap-3 p-3 hover:bg-bg-elevated rounded cursor-pointer">
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => update(key)}
              className="mt-1 accent-accent"
            />
            <div className="flex-1">
              <div className="font-medium">{label}</div>
              <div className="text-sm text-fg-muted">{desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="p-4 bg-bg-elevated rounded-lg text-sm">
        <strong>🔒 必要通知</strong>（不可關閉）
        <div className="text-xs text-fg-muted mt-1">
          訂單確認、密碼重設、帳號安全等系統通知會持續發送、以保護你的帳號。
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full px-4 py-3 bg-accent text-black rounded-lg font-bold hover:scale-[1.01] transition disabled:opacity-50"
      >
        {saving ? "儲存中..." : saved ? "✅ 已儲存" : "儲存設定"}
      </button>
    </div>
  );
}
