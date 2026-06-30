"use client";

import { useState } from "react";
import { Upload, Loader2, CheckCircle2, XCircle, ImageIcon, Wand2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const DEFAULT_AREAS = [
  { row: 0, col: 0, label: "📚 章節", url: "/chapters" },
  { row: 0, col: 1, label: "📝 副本", url: "/courses" },
  { row: 0, col: 2, label: "🏆 排行", url: "/leaderboard" },
  { row: 1, col: 0, label: "👤 我的", url: "/me" },
  { row: 1, col: 1, label: "✍️ 部落格", url: "/blogs" },
  { row: 1, col: 2, label: "⚙️ 設定", url: "/settings" },
];

export function RichMenuClient({ currentImageUrl, hasUserBot }: { currentImageUrl: string | null; hasUserBot: boolean }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [setting, setSetting] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl || "");
  const [areas, setAreas] = useState(DEFAULT_AREAS);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload?folder=rich-menu", {
      credentials: "include", method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || j.message);
      setImageUrl(j.url);
      toast.success("圖片已上傳");
    } catch (e: any) {
      toast.error(e?.message || "上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  const setup = async () => {
    if (!imageUrl) {
      toast.error("先上傳圖片或填網址");
      return;
    }
    setSetting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/line/setup-richmenu", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, areas }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setResult({ ok: true, msg: `Rich Menu 已套用、menuId=${j.menuId}` });
        toast.success("套用成功");
      } else {
        setResult({ ok: false, msg: j.error || j.message || "失敗" });
        toast.error("套用失敗");
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e?.message });
      toast.error("套用失敗");
    } finally {
      setSetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!hasUserBot && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> User bot 還沒設定 (USER_LINE_CHANNEL_TOKEN/SECRET 未設)、Rich Menu 套用會失敗。先到 Zeabur 加 env。
        </div>
      )}

      {/* 圖片上傳 */}
      <section className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
        <h2 className="font-bold text-sm flex items-center gap-2"><ImageIcon size={14} /> 步驟 1：選擇圖片</h2>
        {imageUrl ? (
          <div className="relative">
            <img src={imageUrl} alt="rich menu" className="w-full rounded-lg border border-border" style={{ aspectRatio: "2500/1686" }} />
            <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/70 text-white text-xs">換一張</button>
          </div>
        ) : (
          <label className="block">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent transition cursor-pointer">
              <Upload size={24} className="mx-auto mb-2 text-fg-muted" />
              <div className="text-sm font-bold">點此上傳或拖曳 PNG / JPEG</div>
              <div className="text-xs text-fg-muted mt-1">建議 2500×1686、≤ 1 MB</div>
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
              disabled={uploading}
            />
          </label>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-fg-muted">或直接貼 URL：</span>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 bg-bg border border-border rounded px-2 py-1 outline-none focus:border-accent"
          />
        </div>
      </section>

      {/* 區域設定 */}
      <section className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
        <h2 className="font-bold text-sm">步驟 2：6 區按鈕對應</h2>
        <div className="text-xs text-fg-muted">
          Rich Menu 預設切 2 列 × 3 欄 = 6 區、點哪區跳哪個網址。
        </div>
        <div className="grid grid-cols-3 gap-2">
          {areas.map((a, i) => (
            <div key={i} className="bg-bg-elevated rounded-lg p-2">
              <div className="text-[10px] text-fg-muted mb-1">第 {a.row + 1} 列 第 {a.col + 1} 欄</div>
              <input
                value={a.label}
                onChange={(e) => setAreas((prev) => prev.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                className="w-full bg-bg border border-border rounded px-2 py-1 text-xs mb-1"
                placeholder="顯示名 (LINE Logs 用)"
              />
              <input
                value={a.url}
                onChange={(e) => setAreas((prev) => prev.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x))}
                className="w-full bg-bg border border-border rounded px-2 py-1 text-xs font-mono"
                placeholder="/path"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 套用 */}
      <section className="flex items-center justify-end gap-2">
        <button
          onClick={setup}
          disabled={!imageUrl || setting || uploading}
          className="px-5 py-2.5 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1 disabled:opacity-50"
        >
          {setting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          套用到 LINE bot
        </button>
      </section>

      {result && (
        <div className={`rounded-lg p-3 text-xs ${result.ok ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
          <div className="font-bold inline-flex items-center gap-1">
            {result.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {result.ok ? "成功" : "失敗"}
          </div>
          <div className="mt-1 break-all">{result.msg}</div>
        </div>
      )}
    </div>
  );
}
