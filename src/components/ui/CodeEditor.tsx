"use client";

import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useMemo } from "react";

export type CodeLang = "python" | "javascript" | "typescript" | "jsx" | "tsx" | "html" | "css" | "sql";

/**
 * 統一 code 編輯器 — CodeMirror 6
 * - syntax highlight (One Dark theme)
 * - autocomplete (依語言)
 * - Tab 縮排自動
 * - Ctrl/Cmd + Enter 觸發 onRun
 * - autosave localStorage
 */
export function CodeEditor({
  value,
  onChange,
  onRun,
  lang = "python",
  storageKey,
  height = "400px",
  minHeight = "300px",
  placeholder = "// 在這裡寫程式...",
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  lang?: CodeLang;
  storageKey?: string;
  height?: string;
  minHeight?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  // autosave
  useEffect(() => {
    if (!storageKey) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(`nami:${storageKey}`, value);
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [storageKey, value]);

  const langExt = useMemo<Extension[]>(() => {
    switch (lang) {
      case "python": return [python()];
      case "javascript": return [javascript()];
      case "typescript": return [javascript({ typescript: true })];
      case "jsx": return [javascript({ jsx: true })];
      case "tsx": return [javascript({ typescript: true, jsx: true })];
      case "html": return [html({ autoCloseTags: true })];
      case "css": return [css()];
      case "sql": return [sql()];
      default: return [];
    }
  }, [lang]);

  const extensions = useMemo<Extension[]>(() => {
    const runKey = onRun
      ? keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onRun();
              return true;
            },
          },
        ])
      : null;
    const baseTheme = EditorView.theme({
      "&": {
        fontSize: "12.5px",
        height: "100%",
      },
      ".cm-scroller": {
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      },
      ".cm-content": { padding: "10px 0", caretColor: "#50fa7b" },
      ".cm-line": { padding: "0 12px" },
      "&.cm-focused": { outline: "none" },
    });
    return [...langExt, baseTheme, runKey].filter(Boolean) as Extension[];
  }, [langExt, onRun]);

  return (
    <CodeMirror
      value={value}
      onChange={(v) => onChange(v)}
      theme={oneDark}
      height={height}
      minHeight={minHeight}
      extensions={extensions}
      placeholder={placeholder}
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
        indentOnInput: true,
        foldGutter: true,
        highlightSelectionMatches: true,
        searchKeymap: true,
        tabSize: 4,
      }}
    />
  );
}

export function loadEditorValue(storageKey: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(`nami:${storageKey}`) ?? fallback;
  } catch {
    return fallback;
  }
}
