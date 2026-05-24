"use client";
import { useState } from "react";
import { Chapter } from "@/lib/types";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { History, Save, Eye } from "lucide-react";
import { ChapterVersionsPanel } from "./ChapterVersionsPanel";

export function ChapterEditor({ chapter }: { chapter: Chapter }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [content, setContent] = useState(JSON.stringify(chapter, null, 2));
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const [versionsKey, setVersionsKey] = useState(0); // 用來強制 refetch versions

  const save = async () => {
    setSaving(true);
    try {
      JSON.parse(content); // 驗證 JSON 合法
      const url = note.trim()
        ? `/api/admin/chapters/${chapter.id}?note=${encodeURIComponent(note.trim())}`
        : `/api/admin/chapters/${chapter.id}`;
      const res = await fetch(url, {
        method: "PUT",
        body: content,
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        const txt = await res.text();
        toast.error(`儲存失敗：${txt}`);
        return;
      }
      const data = await res.json().catch(() => ({} as any));
      const ver = data.version ? ` (v${data.version})` : "";
      toast.success(`已儲存${ver}`);
      setNote("");
      setVersionsKey((k) => k + 1);
    } catch (e: any) {
      toast.error(`JSON 格式錯誤：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const loadVersion = async (vid: string) => {
    try {
      const res = await fetch(`/api/admin/chapters/${chapter.id}/versions/${vid}`);
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      const ok = await confirm({
        title: `載入版本 v${j.version}？`,
        description: "目前未儲存的變更會被覆蓋。載入後仍需按「💾 儲存」才會生效（會建立新版本）。",
        confirmLabel: "載入",
      });
      if (!ok) return;
      setContent(JSON.stringify(j.content, null, 2));
      toast.success(`已載入 v${j.version}、按儲存後生效`);
    } catch (e: any) {
      toast.error(`載入失敗：${e?.message || ""}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold">
          ✏️ Ch{String(chapter.id).padStart(2, "0")} · {chapter.title}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowVersions((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1 transition ${
              showVersions
                ? "bg-accent text-black border-accent font-bold"
                : "bg-bg-elevated border-border hover:border-accent"
            }`}
          >
            <History size={13} /> 版本歷史
          </button>
          <Link
            href={`/chapters/${chapter.id}` as any}
            target="_blank"
            className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-sm hover:border-accent flex items-center gap-1"
          >
            <Eye size={13} /> 預覽
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm disabled:opacity-50 flex items-center gap-1"
          >
            <Save size={13} /> {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>

      {/* 變更說明（選填）*/}
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs text-fg-muted shrink-0">變更說明（選）：</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：補 lesson 3 範例、修錯字"
          maxLength={200}
          className="flex-1 bg-bg border border-border rounded-lg px-2 py-1 text-sm focus:border-accent outline-none"
        />
      </div>

      <div className={showVersions ? "grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4" : ""}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-[600px] p-4 bg-bg-elevated border border-border rounded-xl font-mono text-xs leading-relaxed focus:border-accent outline-none"
        />

        {showVersions && (
          <ChapterVersionsPanel
            key={versionsKey}
            chapterId={chapter.id}
            onLoadVersion={loadVersion}
          />
        )}
      </div>

      <div className="mt-3 text-xs text-fg-muted">
        💡 直接編輯 JSON、儲存會自動建立版本快照（chapter_versions）、可回溯。
        前台 lesson 仍走 src/data/chapters/*.json（dev 寫檔、production fail-soft）。
      </div>
    </div>
  );
}
