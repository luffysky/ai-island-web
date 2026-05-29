"use client";

import { useState } from "react";
import { Loader2, Download, Copy, Printer, Sparkles } from "lucide-react";

const TARGETS = [
  { value: "junior",    label: "Junior 工程師", emoji: "🌱" },
  { value: "senior",    label: "Senior / 跳槽", emoji: "🚀" },
  { value: "indie",     label: "Indie Hacker", emoji: "🛠️" },
  { value: "freelance", label: "接案 / freelance", emoji: "💼" },
];

// 簡單的 markdown → HTML 渲染（標題 + 列表 + 粗體 + 連結）
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3 class='font-bold text-base mt-4 mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='font-bold text-lg mt-5 mb-2 border-b border-border pb-1'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='font-extrabold text-2xl mb-1'>$1</h1>")
    .replace(/^&gt; (.+)$/gm, "<blockquote class='border-l-2 border-accent-2 pl-3 italic text-fg-muted my-2'>$1</blockquote>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">$1</a>')
    .replace(/^- (.+)$/gm, "<li class='ml-5 list-disc my-0.5'>$1</li>")
    .replace(/\n\n/g, "<br/>");
}

export function ResumeClient() {
  const [target, setTarget] = useState("junior");
  const [md, setMd] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");

  async function generate() {
    setLoading(true);
    setMd("");
    try {
      const res = await fetch("/api/me/resume/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const text = await res.text();
      let j: any;
      try { j = JSON.parse(text); } catch { j = { error: `Server ${res.status}: ${text.slice(0, 200)}` }; }
      if (j.markdown) {
        setMd(j.markdown);
        setModel(j.model ?? "");
      } else {
        setMd(`❌ ${j.error ?? "未知錯誤"}`);
      }
    } catch (e: any) {
      setMd(`❌ ${e?.message ?? "fetch failed"}`);
    } finally {
      setLoading(false);
    }
  }

  function copyMd() {
    navigator.clipboard.writeText(md).then(() => alert("已複製 markdown 到剪貼簿"));
  }

  function downloadMd() {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-island-resume-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    window.print();
  }

  return (
    <div>
      {/* 工具列 */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4 print:hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {TARGETS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTarget(t.value)}
              className={`text-sm rounded-lg p-2 border transition ${target === t.value ? "border-accent bg-accent/10 font-bold" : "border-border bg-bg-elevated hover:border-accent/40"}`}
            >
              <div className="text-xl mb-0.5">{t.emoji}</div>
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="btn-chip btn-chip-success w-full justify-center py-3 text-sm font-bold disabled:opacity-50"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> 雪鑰寫作中...</> : <><Sparkles size={14} /> ✨ 讓雪鑰幫我生成履歷</>}
        </button>
        {md && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            <button onClick={copyMd} className="btn-chip btn-chip-info"><Copy size={12} /> 複製 markdown</button>
            <button onClick={downloadMd} className="btn-chip btn-chip-info"><Download size={12} /> 下載 .md</button>
            <button onClick={printPdf} className="btn-chip btn-chip-info"><Printer size={12} /> 印 PDF (Ctrl+P)</button>
            {model && <span className="text-xs text-fg-muted ml-auto self-center">by {model}</span>}
          </div>
        )}
      </div>

      {/* 預覽 */}
      {md && (
        <article className="bg-bg-card border border-border rounded-xl p-6 md:p-10 prose prose-invert max-w-none print:border-0 print:p-0 print:bg-white print:text-black">
          <div className="resume-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
        </article>
      )}

      {/* print styles */}
      <style jsx global>{`
        @media print {
          body { background: white; color: black; }
          aside, nav, header, footer, button { display: none !important; }
          .resume-content h1, .resume-content h2, .resume-content h3 { color: black !important; }
          .resume-content blockquote { border-color: #888 !important; color: #555 !important; }
        }
        .resume-content ul, .resume-content li { padding-left: 0; }
        .resume-content blockquote + br { display: none; }
      `}</style>
    </div>
  );
}
