"use client";

import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { sql } from "@codemirror/lang-sql";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { useEffect, useMemo, useState } from "react";
import { snippetsForLang } from "./code-snippets";
import { emmetTabKeymap } from "./emmet-tab";

// 明亮模式：淺灰底 + 深字（atom-one-light 系語法色），對應全站 data-theme="light"
const lightEditorTheme = EditorView.theme(
  {
    "&": { color: "#1f2328", backgroundColor: "#f3f5f7" },
    ".cm-content": { caretColor: "#1f883d" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#1f883d" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "#cfe6ff" },
    ".cm-activeLine": { backgroundColor: "rgba(0,0,0,0.04)" },
    ".cm-gutters": { backgroundColor: "#eaeef2", color: "#9ca3af", border: "none" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(0,0,0,0.06)", color: "#4b5563" },
    ".cm-selectionMatch": { backgroundColor: "rgba(37,99,235,0.14)" },
    ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": { backgroundColor: "rgba(37,99,235,0.18)", outline: "1px solid rgba(37,99,235,0.4)" },
    ".cm-tooltip": { backgroundColor: "#ffffff", border: "1px solid #d1d9e0", color: "#1f2328" },
    ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "#dbeafe", color: "#1f2328" },
    ".cm-foldPlaceholder": { backgroundColor: "#e5e7eb", color: "#6b7280", border: "1px solid #d1d9e0" },
  },
  { dark: false },
);
const lightHighlightStyle = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#5b6673", fontStyle: "italic" },
  { tag: [t.keyword, t.moduleKeyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword], color: "#a626a4" },
  { tag: [t.string, t.special(t.string), t.docString], color: "#3d8b40" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#0184bb" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#4078f2" },
  { tag: [t.propertyName], color: "#4078f2" },
  { tag: [t.typeName, t.className, t.namespace, t.tagName], color: "#c18401" },
  { tag: [t.attributeName], color: "#986801" },
  { tag: [t.operator, t.punctuation, t.separator], color: "#383a42" },
  { tag: [t.regexp], color: "#50a14f" },
  { tag: [t.meta, t.self], color: "#4078f2" },
  { tag: t.heading, color: "#e45649", fontWeight: "bold" },
  { tag: [t.link, t.url], color: "#4078f2", textDecoration: "underline" },
  { tag: t.invalid, color: "#e45649" },
]);
const lightTheme: Extension = [lightEditorTheme, syntaxHighlighting(lightHighlightStyle)];

/** 跟著全站 data-theme 切換（light → 淺色 IDE） */
function useIsLight() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const read = () => setLight(document.documentElement.getAttribute("data-theme") === "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return light;
}

export type CodeLang =
  | "python" | "javascript" | "typescript" | "jsx" | "tsx"
  | "html" | "css" | "sql" | "json" | "markdown" | "yaml"
  | "rust" | "go" | "java" | "cpp" | "c" | "text";

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
  const isLight = useIsLight();
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
      case "json": return [json()];
      case "markdown": return [markdown()];
      case "yaml": return [yaml()];
      case "rust": return [rust()];
      case "go": return [go()];
      case "java": return [java()];
      case "cpp":
      case "c": return [cpp()];
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
    // 各語言 snippet autocomplete (Python / JS / HTML / CSS / SQL / JSON / Markdown 10 種)
    const snipExt = autocompletion({
      override: [(ctx) => {
        const before = ctx.matchBefore(/[a-zA-Z!]+/);
        if (!before || (before.from === before.to && !ctx.explicit)) return null;
        return {
          from: before.from,
          options: snippetsForLang(lang),
          validFor: /^[a-zA-Z!]*$/,
        };
      }],
      defaultKeymap: true,
    });
    // Tab 鍵 Emmet 展開 (HTML / JSX / TSX) + fallback autocomplete + indent
    const emmetExt = emmetTabKeymap(lang);
    return [emmetExt, ...langExt, snipExt, baseTheme, runKey].filter(Boolean) as Extension[];
  }, [langExt, onRun, lang]);

  return (
    <CodeMirror
      value={value}
      onChange={(v) => onChange(v)}
      theme={isLight ? lightTheme : oneDark}
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
