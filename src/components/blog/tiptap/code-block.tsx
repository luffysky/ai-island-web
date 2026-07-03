"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent,
} from "@tiptap/react";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * 升級版程式碼區塊：語言下拉 + 檔名 + 一鍵複製，並保留 CodeBlockLowlight 高亮。
 *
 * 存檔 HTML 仍是 `<pre data-filename="…"><code class="language-xx">…</code></pre>`
 * （NodeView 只影響編輯畫面；getHTML/read-only 走原生 renderHTML）。
 * ⚠️ sanitizer 需放行 pre 的 data-filename（見 rich-html-server.ts）。
 */

const LANGUAGES = [
  "plaintext", "javascript", "typescript", "jsx", "tsx", "python", "java", "c", "cpp",
  "csharp", "go", "rust", "php", "ruby", "swift", "kotlin", "sql", "bash", "shell",
  "json", "yaml", "html", "css", "scss", "markdown", "xml", "dockerfile", "diff",
];

function CodeBlockView({ node, updateAttributes, editor }: any) {
  const [copied, setCopied] = useState(false);
  const language: string = node.attrs.language || "plaintext";
  const filename: string = node.attrs.filename || "";
  const editable = editor?.isEditable;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard 不可用時忽略 */ }
  };

  return (
    <NodeViewWrapper className="code-block-wrapper my-4 overflow-hidden rounded-lg border border-border bg-bg-elevated">
      <div className="flex items-center gap-2 border-b border-border bg-bg-card px-3 py-1.5" contentEditable={false}>
        <select
          value={language}
          disabled={!editable}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 text-xs text-fg outline-none focus:border-accent disabled:opacity-70"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        {editable ? (
          <input
            value={filename}
            onChange={(e) => updateAttributes({ filename: e.target.value })}
            placeholder="檔名（選填）"
            className="min-w-0 flex-1 bg-transparent px-1 text-xs text-fg-muted outline-none placeholder:text-fg-muted/60"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate px-1 text-xs text-fg-muted">{filename}</span>
        )}
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs text-fg-muted hover:bg-bg-elevated hover:text-fg transition"
          title="複製程式碼"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "已複製" : "複製"}
        </button>
      </div>
      <pre className="!my-0 !rounded-none !border-0 overflow-x-auto">
        <NodeViewContent as={"code" as any} className={`language-${language}`} />
      </pre>
    </NodeViewWrapper>
  );
}

export const CodeBlockUpgraded = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      filename: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-filename") || "",
        renderHTML: (attrs) => (attrs.filename ? { "data-filename": attrs.filename } : {}),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});
