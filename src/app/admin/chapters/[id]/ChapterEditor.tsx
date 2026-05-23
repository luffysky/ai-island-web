"use client";
import { useState } from "react";
import { Chapter } from "@/lib/types";
import Link from "next/link";

export function ChapterEditor({ chapter }: { chapter: Chapter }) {
  const [content, setContent] = useState(JSON.stringify(chapter, null, 2));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      JSON.parse(content); // 驗證 JSON 合法
      const res = await fetch(`/api/admin/chapters/${chapter.id}`, {
        method: "PUT",
        body: content,
        headers: { "content-type": "application/json" },
      });
      if (res.ok) setMessage("✓ 已儲存");
      else setMessage(`✗ 失敗：${await res.text()}`);
    } catch (e: any) {
      setMessage(`✗ JSON 格式錯誤：${e.message}`);
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          ✏️ Ch{String(chapter.id).padStart(2, "0")} · {chapter.title}
        </h2>
        <div className="flex gap-2">
          <Link
            href={`/chapters/${chapter.id}`}
            target="_blank"
            className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-sm hover:border-accent"
          >
            🔗 預覽
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm disabled:opacity-50"
          >
            {saving ? "儲存中..." : "💾 儲存"}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-3 p-3 rounded-lg bg-bg-card border border-border text-sm">
          {message}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-[600px] p-4 bg-bg-elevated border border-border rounded-xl font-mono text-xs leading-relaxed focus:border-accent outline-none"
      />

      <div className="mt-3 text-xs text-fg-muted">
        💡 此處直接編輯 JSON。
        Production 上線後應改成豐富表單編輯器 + 寫回 Supabase content 表（避免直接改 file system）。
      </div>
    </div>
  );
}
