"use client";
import { FileResource } from "@/lib/types";
import { Download, FileCode, FileText, FileJson, Database } from "lucide-react";

const typeLabels: Record<string, { label: string; color: string }> = {
  starter: { label: "起手檔案", color: "bg-blue-500/20 text-blue-400" },
  complete: { label: "完成版", color: "bg-green-500/20 text-green-400" },
  reference: { label: "參考資料", color: "bg-purple-500/20 text-purple-400" },
  data: { label: "範例資料", color: "bg-yellow-500/20 text-yellow-400" },
};

function getIcon(filename: string) {
  if (filename.endsWith(".json")) return <FileJson size={18} />;
  if (filename.endsWith(".csv") || filename.endsWith(".sql")) return <Database size={18} />;
  if (filename.match(/\.(js|ts|tsx|jsx|py|html|css|go|rs|java)$/)) return <FileCode size={18} />;
  return <FileText size={18} />;
}

export function FilesPanel({ files }: { files: FileResource[] }) {
  if (!files || files.length === 0) return null;

  const handleDownload = (file: FileResource) => {
    if (file.url) {
      window.open(file.url, "_blank");
      return;
    }
    if (file.content) {
      const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="my-4 rounded-xl border border-border bg-bg-card p-4">
      <div className="flex items-center gap-2 mb-3 font-semibold text-sm">
        📎 <span>檔案範例</span>
      </div>
      <div className="space-y-2">
        {files.map((f, i) => {
          const meta = typeLabels[f.type] ?? { label: f.type, color: "bg-gray-500/20 text-gray-400" };
          return (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-bg hover:bg-bg-elevated transition"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="text-fg-muted flex-shrink-0">{getIcon(f.filename)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{f.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${meta.color}`}>{meta.label}</span>
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5 truncate">
                    {f.filename}{f.size && ` · ${f.size}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownload(f)}
                className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-accent text-black text-xs font-semibold rounded hover:scale-105 transition flex-shrink-0"
              >
                <Download size={14} /> 下載
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
