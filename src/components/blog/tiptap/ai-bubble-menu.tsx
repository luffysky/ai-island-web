"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import {
  Sparkles, PenLine, ArrowRightToLine, Wand2, Languages, FileText, Loader2, ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Action = "rewrite" | "continue" | "polish" | "translate" | "summarize";
type Lang = "ja" | "en" | "ko" | "classical";

const LANGS: { key: Lang; label: string }[] = [
  { key: "ja", label: "日文" },
  { key: "en", label: "英文" },
  { key: "ko", label: "韓文" },
  { key: "classical", label: "文言文" },
];

/**
 * 選取文字時浮出的 AI 選單：改寫 / 續寫 / 潤稿 / 翻譯（子選單）/ 摘要。
 * 每個動作 POST /api/ai/rewrite、回傳純文字後取代選取（續寫則插在選取之後）。
 */
export function AIBubbleMenu({ editor }: { editor: Editor }) {
  const toast = useToast();
  const [busy, setBusy] = useState<Action | null>(null);
  const [showLang, setShowLang] = useState(false);

  const run = async (action: Action, targetLang?: Lang) => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const text = editor.state.doc.textBetween(from, to, "\n").trim();
    if (!text) return;
    setBusy(action);
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action, targetLang }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || j?.error || "AI 生成失敗");
      const result = String(j.result ?? "").trim();
      if (!result) throw new Error("AI 沒有回覆");
      if (action === "continue") {
        // 續寫：插在選取之後（保留原文），前面補換行
        editor.chain().focus().insertContentAt(to, `\n${result}`).run();
      } else {
        // 其餘：取代選取
        editor.chain().focus().insertContentAt({ from, to }, result).run();
      }
      toast.success("已套用");
    } catch (e: any) {
      toast.error(e?.message || "AI 生成失敗");
    } finally {
      setBusy(null);
      setShowLang(false);
    }
  };

  const btn = "flex items-center gap-1 rounded px-2 py-1 text-xs text-fg hover:bg-bg-elevated transition disabled:opacity-50";

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top" }}
      shouldShow={({ editor: ed, from, to }) => {
        if (!ed.isEditable) return false;
        if (from === to) return false;
        // 程式碼區塊內不顯示 AI 選單
        if (ed.isActive("codeBlock")) return false;
        return true;
      }}
    >
      <div className="relative flex items-center gap-0.5 rounded-lg border border-border bg-bg-card p-1 shadow-2xl">
        <span className="flex items-center gap-1 px-1.5 text-[11px] font-semibold text-accent">
          <Sparkles size={13} /> AI
        </span>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <button type="button" className={btn} disabled={!!busy} onClick={() => run("rewrite")} title="改寫">
          {busy === "rewrite" ? <Loader2 size={13} className="animate-spin" /> : <PenLine size={13} />} 改寫
        </button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => run("continue")} title="續寫">
          {busy === "continue" ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightToLine size={13} />} 續寫
        </button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => run("polish")} title="潤稿">
          {busy === "polish" ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} 潤稿
        </button>
        <button
          type="button"
          className={btn}
          disabled={!!busy}
          onClick={() => setShowLang((s) => !s)}
          title="翻譯"
        >
          {busy === "translate" ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />} 翻譯
          <ChevronRight size={12} className="opacity-60" />
        </button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => run("summarize")} title="摘要">
          {busy === "summarize" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} 摘要
        </button>

        {showLang && (
          <div className="absolute right-0 top-full mt-1 flex flex-col rounded-lg border border-border bg-bg-card p-1 shadow-2xl">
            {LANGS.map((l) => (
              <button
                key={l.key}
                type="button"
                className="rounded px-3 py-1 text-left text-xs text-fg hover:bg-bg-elevated transition"
                disabled={!!busy}
                onClick={() => run("translate", l.key)}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}
