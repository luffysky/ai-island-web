"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";

export default function BlogSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/blog/settings");
      const json = await res.json();
      setSettings(json.settings);
      setLoading(false);
    })();
  }, []);

  const set = (k: string, v: any) => setSettings((s: any) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/blog/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blog_title: settings.blog_title,
        blog_desc: settings.blog_desc,
        blog_slug: settings.blog_slug || null,
        is_enabled: settings.is_enabled,
      }),
    });
    setSaving(false);
    const json = await res.json();
    if (!res.ok) {
      setMsg("✗ " + (json.message || json.error));
      return;
    }
    setSettings(json.settings);
    setMsg("✓ 已儲存");
    setTimeout(() => setMsg(""), 2500);
  };

  if (loading) {
    return <div className="h-64 rounded-xl bg-bg-card animate-pulse" />;
  }

  return (
    <div className="max-w-2xl">
      <Link href="/me/blog" className="text-sm text-fg-muted hover:text-fg flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> 回部落格
      </Link>
      <h1 className="text-2xl font-bold mb-6">部落格設定</h1>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium mb-1.5 block">部落格標題</label>
          <input
            value={settings?.blog_title ?? ""}
            onChange={(e) => set("blog_title", e.target.value)}
            placeholder="例如：Luffy 的程式日記"
            className="w-full bg-bg-card border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">部落格簡介</label>
          <textarea
            value={settings?.blog_desc ?? ""}
            onChange={(e) => set("blog_desc", e.target.value)}
            rows={3}
            placeholder="介紹一下你的部落格"
            className="w-full bg-bg-card border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">自訂網址</label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-fg-muted">/blogs/</span>
            <input
              value={settings?.blog_slug ?? ""}
              onChange={(e) => set("blog_slug", e.target.value)}
              placeholder="your-name"
              className="flex-1 bg-bg-card border border-border rounded-lg p-2.5 outline-none focus:border-accent"
            />
          </div>
          <p className="text-xs text-fg-muted mt-1">
            留空的話、網址會用你的帳號 ID。只能用英數字和連字號。
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={settings?.is_enabled ?? true}
            onChange={(e) => set("is_enabled", e.target.checked)}
          />
          公開我的部落格（關閉後別人看不到）
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-accent text-black font-bold text-sm hover:scale-105 transition flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            儲存設定
          </button>
          {msg && (
            <span className={`text-sm ${msg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
              {msg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
