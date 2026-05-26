"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2, Send, RefreshCw, Copy, Check, ImagePlus } from "lucide-react";

type UploadedImage = {
  id: string;
  base64: string;       // 不含 data: prefix
  mediaType: string;    // image/png / image/jpeg
  previewUrl: string;   // 帶 data: prefix（給 <img> 用）
};

/**
 * Nami AI 助教浮動按鈕（支援截圖上傳）
 * 用法：在每個 Tab 加 <AskAI code={code} error={stderr} lang="python" context="Scrape Lab" />
 */
export function AskAI({
  code,
  error,
  lang = "python",
  context,
  className = "",
}: {
  code: string;
  error?: string;
  lang?: string;
  context?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ask = async (q?: string) => {
    setLoading(true);
    setResponse("");
    setErr("");
    try {
      const res = await fetch("/api/admin/playground/ai-help", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          error,
          question: q ?? question,
          lang,
          context,
          images: images.map((img) => ({ base64: img.base64, mediaType: img.mediaType })),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error === "no_api_key" ? j.message : (j.message || j.error || "AI 失敗"));
      setResponse(j.text || "(AI 沒回應)");
    } catch (e: any) {
      setErr(e?.message ?? "AI 失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 5 - images.length);
    const newImages: UploadedImage[] = [];
    for (const file of list) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 4 * 1024 * 1024) {
        setErr(`圖片 ${file.name} 超過 4MB、跳過`);
        continue;
      }
      try {
        const base64 = await fileToBase64(file);
        newImages.push({
          id: crypto.randomUUID(),
          base64: base64.split(",")[1] ?? base64,    // 去掉 data:image/...;base64, prefix
          mediaType: file.type,
          previewUrl: base64,                          // 完整 data URL 給 <img>
        });
      } catch (e) {
        console.warn("[AskAI] read file failed:", e);
      }
    }
    setImages((prev) => [...prev, ...newImages].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // 支援貼上（Ctrl/Cmd + V）
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleFiles(dt.files);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // 把回應裡的 code block 轉成可複製的 <pre>
  const renderResponse = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      const m = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
      if (m) {
        return (
          <pre key={i} className="bg-[#0d1117] text-[#e6edf3] rounded-lg p-3 my-2 text-[11px] font-mono overflow-x-auto border border-border">
            <code>{m[2]}</code>
          </pre>
        );
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part.replace(/`([^`]+)`/g, "$1").split(/(`[^`]+`)/g).map((seg, j) =>
            seg.startsWith("`") && seg.endsWith("`") ? (
              <code key={j} className="bg-bg-elevated px-1 py-0.5 rounded text-accent text-[11px]">{seg.slice(1, -1)}</code>
            ) : <span key={j}>{seg}</span>
          )}
        </span>
      );
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold hover:from-purple-500/30 hover:to-pink-500/30 hover:scale-105 transition ${className}`}
        title="問 AI 助教 (Claude / GPT)"
      >
        <Sparkles size={12} /> 問 AI {error && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="bg-bg-card border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl shadow-purple-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  <span className="font-bold">AI 助教</span>
                  {context && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-900 dark:text-purple-100">{context}</span>}
                </div>
                <button onClick={() => setOpen(false)} className="p-1 text-fg-muted hover:text-fg">
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Context preview */}
                {(code || error) && (
                  <details className="border border-border rounded-lg overflow-hidden">
                    <summary className="cursor-pointer px-3 py-2 bg-bg-elevated text-xs text-fg-muted">
                      📎 AI 會看到你的 code{error ? " + 錯誤訊息" : ""} (點開預覽)
                    </summary>
                    {code && (
                      <pre className="text-[10px] bg-[#0d1117] text-[#e6edf3] p-2 m-0 max-h-32 overflow-y-auto font-mono">{code.slice(0, 600)}{code.length > 600 ? "\n..." : ""}</pre>
                    )}
                    {error && (
                      <pre className="text-[10px] bg-red-950/30 text-red-200 p-2 m-0 max-h-32 overflow-y-auto font-mono border-t border-border">{error.slice(0, 600)}</pre>
                    )}
                  </details>
                )}

                {/* Uploaded images 預覽 */}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.previewUrl}
                          alt="upload"
                          className="w-20 h-20 object-cover rounded-lg border border-border"
                        />
                        <button
                          onClick={() => removeImage(img.id)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-90 hover:opacity-100"
                          title="移除"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <div className="text-[10px] text-fg-muted w-full">
                      已選 {images.length}/5 張圖、AI 會看到一起回答
                    </div>
                  </div>
                )}

                {/* Quick prompts */}
                {!response && !loading && (
                  <div className="space-y-1.5">
                    <div className="text-xs text-fg-muted">快速問：</div>
                    {[
                      { q: "這 code 有什麼問題？", icon: "🐛" },
                      { q: "解釋這段 code 在做什麼", icon: "📖" },
                      { q: "怎麼讓它更好？", icon: "✨" },
                      { q: "下一步可以試什麼？", icon: "🎯" },
                      ...(images.length > 0 ? [{ q: "看截圖、告訴我這是什麼問題", icon: "🔍" }] : []),
                    ].map((p) => (
                      <button
                        key={p.q}
                        onClick={() => { setQuestion(p.q); ask(p.q); }}
                        className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-purple-400 hover:bg-purple-500/5 transition text-xs"
                      >
                        {p.icon} {p.q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Response */}
                {loading && (
                  <div className="flex items-center justify-center py-8 text-fg-muted text-sm">
                    <Loader2 className="animate-spin mr-2" size={14} /> AI 思考中...
                  </div>
                )}
                {err && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                    ⚠️ {err}
                  </div>
                )}
                {response && (
                  <div className="bg-bg-elevated text-fg rounded-lg p-3 text-sm leading-relaxed relative">
                    <button
                      onClick={copy}
                      className="absolute top-2 right-2 p-1 text-fg-muted hover:text-accent transition"
                      title="複製"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    {renderResponse(response)}
                  </div>
                )}
              </div>

              {/* Footer / Ask */}
              <div className="border-t border-border p-3 bg-bg-card">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || images.length >= 5}
                    className="p-2 rounded-lg border border-border hover:border-purple-400 hover:bg-purple-500/5 transition disabled:opacity-50"
                    title={images.length >= 5 ? "最多 5 張" : "上傳截圖（也可 Ctrl+V 貼上）"}
                  >
                    <ImagePlus size={14} />
                  </button>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={images.length > 0 ? "問截圖相關問題..." : "自己問問題（可 Ctrl+V 貼截圖）..."}
                    onKeyDown={(e) => { if (e.key === "Enter" && (question.trim() || images.length > 0)) ask(); }}
                    className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400"
                    disabled={loading}
                  />
                  <button
                    onClick={() => ask()}
                    disabled={loading || (!question.trim() && images.length === 0)}
                    className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    問
                  </button>
                  {response && (
                    <button
                      onClick={() => { setResponse(""); setErr(""); setImages([]); }}
                      className="px-3 py-2 rounded-lg border border-border text-xs"
                      title="再問一次（清空圖片）"
                    >
                      <RefreshCw size={11} />
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-fg-muted mt-1.5">
                  限 30 次 / 小時 · 用 system Anthropic / OpenAI key · 支援截圖（最多 5 張 / 單張 4MB）
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
