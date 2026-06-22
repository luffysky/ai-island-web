"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Playground } from "@/lib/types";
import { Play, RotateCcw, Copy, Check, Save, Maximize2, Minimize2, Loader2, TerminalSquare } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { usePyodide } from "@/hooks/usePyodide";
import { VirtualTerminal } from "./VirtualTerminal";

// Monaco 動態載入（避免 SSR）
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center text-xs text-fg-muted" style={{ minHeight: 320 }}>
      載入編輯器...
    </div>
  ),
});

// 明亮模式自訂 Monaco 主題：淺灰底 + 深字
function defineMonacoLight(monaco: any) {
  monaco.editor.defineTheme("ai-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a929e", fontStyle: "italic" },
      { token: "keyword", foreground: "a626a4" },
      { token: "keyword.operator", foreground: "0184bb" },
      { token: "operator", foreground: "0184bb" },
      { token: "string", foreground: "50a14f" },
      { token: "string.escape", foreground: "0184bb" },
      { token: "regexp", foreground: "50a14f" },
      { token: "number", foreground: "986801" },
      { token: "constant", foreground: "986801" },
      { token: "constant.language", foreground: "0184bb" },
      { token: "type", foreground: "c18401" },
      { token: "type.identifier", foreground: "c18401" },
      { token: "namespace", foreground: "c18401" },
      { token: "function", foreground: "4078f2" },
      { token: "identifier", foreground: "383a42" },
      { token: "variable", foreground: "e45649" },
      { token: "variable.predefined", foreground: "e45649" },
      { token: "variable.parameter", foreground: "986801" },
      { token: "tag", foreground: "e45649" },
      { token: "attribute.name", foreground: "986801" },
      { token: "attribute.value", foreground: "50a14f" },
      { token: "delimiter", foreground: "383a42" },
      { token: "delimiter.bracket", foreground: "383a42" },
    ],
    colors: {
      "editor.background": "#f3f5f7",
      "editor.foreground": "#383a42",
      "editorLineNumber.foreground": "#9ca3af",
      "editorLineNumber.activeForeground": "#4b5563",
      "editor.lineHighlightBackground": "#e8ebef",
      "editor.selectionBackground": "#cfe6ff",
      "editorCursor.foreground": "#1f883d",
      "editorIndentGuide.background": "#e1e5ea",
      "editorGutter.background": "#eaeef2",
    },
  });
}

// 跟著全站 data-theme 切換
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

// Monaco 語言對照（不是每個都直接對應）
const MONACO_LANG: Record<string, string> = {
  html: "html", css: "css", js: "javascript", javascript: "javascript",
  ts: "typescript", typescript: "typescript",
  python: "python", py: "python",
  go: "go", rust: "rust", rs: "rust",
  java: "java", csharp: "csharp", "c#": "csharp",
  cpp: "cpp", "c++": "cpp", c: "c",
  php: "php", ruby: "ruby", rb: "ruby",
  kotlin: "kotlin", swift: "swift",
  bash: "shell", sh: "shell",
  sql: "sql", sqlite: "sql",
  lua: "lua", dart: "dart", r: "r", scala: "scala",
  jsx: "javascript", tsx: "typescript",
};

// 語言設定：哪些可以本地跑、哪些用 Piston API 沙盒
const LOCAL_LANGS = ["html", "css", "js", "javascript"];
const SANDBOX_LANGS: Record<string, { piston: string; alias?: string; version?: string }> = {
  python: { piston: "python", version: "3.10.0" },
  py: { piston: "python", version: "3.10.0" },
  go: { piston: "go", version: "1.16.2" },
  rust: { piston: "rust", version: "1.68.2" },
  rs: { piston: "rust", version: "1.68.2" },
  java: { piston: "java", version: "15.0.2" },
  csharp: { piston: "csharp", version: "6.12.0" },
  "c#": { piston: "csharp", version: "6.12.0" },
  cpp: { piston: "c++", version: "10.2.0" },
  "c++": { piston: "c++", version: "10.2.0" },
  c: { piston: "c", version: "10.2.0" },
  php: { piston: "php", version: "8.2.3" },
  ruby: { piston: "ruby", version: "3.0.1" },
  rb: { piston: "ruby", version: "3.0.1" },
  kotlin: { piston: "kotlin", version: "1.8.20" },
  swift: { piston: "swift", version: "5.3.3" },
  typescript: { piston: "typescript", version: "5.0.3" },
  ts: { piston: "typescript", version: "5.0.3" },
  bash: { piston: "bash", version: "5.2.0" },
  sh: { piston: "bash", version: "5.2.0" },
  sql: { piston: "sqlite3", version: "3.36.0" },
  lua: { piston: "lua", version: "5.4.4" },
  dart: { piston: "dart", version: "2.19.6" },
  r: { piston: "r", version: "4.1.1" },
  scala: { piston: "scala", version: "3.2.2" },
};

const LANG_LABELS: Record<string, string> = {
  html: "HTML", css: "CSS", js: "JavaScript", javascript: "JavaScript",
  python: "Python", py: "Python", go: "Go", rust: "Rust", rs: "Rust",
  java: "Java", csharp: "C#", "c#": "C#", cpp: "C++", "c++": "C++", c: "C",
  php: "PHP", ruby: "Ruby", rb: "Ruby", kotlin: "Kotlin", swift: "Swift",
  typescript: "TypeScript", ts: "TypeScript", bash: "Bash", sh: "Bash",
  sql: "SQL", lua: "Lua", dart: "Dart", r: "R", scala: "Scala",
};

const PREVIEW_SAFETY_SCRIPT = `
<script>
(() => {
  function normalizeHref(rawHref) {
    if (!rawHref || rawHref.startsWith("#")) return null;
    if (/^(mailto:|tel:|https?:\\/\\/)/i.test(rawHref)) return rawHref;
    if (rawHref.startsWith("//")) return window.location.protocol + rawHref;
    if (/^[\\w.-]+\\.[a-z]{2,}(\\/.*)?$/i.test(rawHref)) return "https://" + rawHref;
    return new URL(rawHref, window.location.href).toString();
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor) return;

    const href = normalizeHref(anchor.getAttribute("href"));
    if (!href) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    window.open(href, "_blank", "noopener,noreferrer");
  });
})();
</script>`;

function injectIntoHead(html: string, content: string) {
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${content}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${content}</head>`);
  }
  return `<!DOCTYPE html><html><head>${content}</head><body>${html}</body></html>`;
}

function injectBeforeBodyEnd(html: string, content: string) {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${content}</body>`);
  }
  return `${html}${content}`;
}

function buildHtmlPreview(userCode: string) {
  const trimmed = userCode.trim();
  const fullHtml = trimmed.includes("<html") || trimmed.includes("<!DOCTYPE")
    ? trimmed
    : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${trimmed}</body></html>`;
  const withBase = injectIntoHead(fullHtml, '<meta charset="utf-8"><base target="_blank">');
  return injectBeforeBodyEnd(withBase, PREVIEW_SAFETY_SCRIPT);
}

function buildCssPreview(css: string) {
  return buildHtmlPreview(`<style>${css}</style><div class="demo">
  <h1>標題 H1</h1>
  <h2>次標題 H2</h2>
  <p>段落、看 CSS 怎麼套。<a href="#">連結</a></p>
  <button>按鈕</button>
  <ul><li>項目 A</li><li>項目 B</li></ul>
  <input placeholder="輸入" />
</div>`);
}

export function PlaygroundCard({
  playground,
  lessonId,
  isLoggedIn,
  onRun,
}: {
  playground: Playground;
  lessonId: string;
  isLoggedIn: boolean;
  onRun?: () => void;
}) {
  const [lang, setLang] = useState<string>(playground.language);
  const [code, setCode] = useState(playground.initialCode);
  const [stdin, setStdin] = useState("");
  const isLight = useIsLight();
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showStdin, setShowStdin] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const supabase = createSupabaseBrowser();
  const pyodide = usePyodide(false);

  const isLocal = LOCAL_LANGS.includes(lang);
  const isPython = lang === "python" || lang === "py";
  const isSandbox = lang in SANDBOX_LANGS;
  const showPreview = lang === "html" || lang === "css";

  // 載入 user 之前存的 code
  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("playgrounds")
        .select("code, language")
        .eq("user_id", user.id)
        .eq("playground_key", playground.key)
        .maybeSingle();
      if (data?.code) {
        setCode(data.code);
        if (data.language) setLang(data.language as any);
      }
    })();
  }, [isLoggedIn, playground.key]);

  const runViaSandbox = async () => {
    try {
      const res = await fetch("/api/playground/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, code, stdin }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        if (res.status === 401 || res.status === 403) {
          setOutput("❌ 請先登入才能執行程式（沙盒避免被當免費 codepen）");
        } else if (res.status === 429) {
          setOutput("❌ 太頻繁、請稍等幾秒再試");
        } else if (res.status >= 500) {
          setOutput("❌ 沙盒服務暫時無法使用（Piston API 可能在維護）、請稍後再試。\n或先用本機跑這段 code。");
        } else {
          setOutput(`❌ 服務異常（HTTP ${res.status}）、請稍後再試`);
        }
        return;
      }

      const data = await res.json();
      if (data.error) {
        setOutput(`❌ ${data.error}`);
      } else {
        const stdout = data.stdout || "";
        const stderr = data.stderr || "";
        const exitCode = data.exitCode !== undefined ? `\n[exit ${data.exitCode}]` : "";
        setOutput(`${stdout}${stderr ? `\n\n--- stderr ---\n${stderr}` : ""}${exitCode}`);
      }
    } catch (e: any) {
      setOutput(`❌ 沙盒錯誤：${e.message}\n（請檢查網路或稍後再試）`);
    }
  };

  const run = async () => {
    setRunning(true);
    setOutput("");
    onRun?.(); // 記「跑過 playground」訊號（掌握度）

    if (lang === "html") {
      if (iframeRef.current) iframeRef.current.srcdoc = buildHtmlPreview(code);
    } else if (lang === "css") {
      if (iframeRef.current) iframeRef.current.srcdoc = buildCssPreview(code);
    } else if (lang === "js" || lang === "javascript") {
      try {
        const logs: string[] = [];
        const fn = new Function("console", code);
        fn({
          log: (...args: any[]) => logs.push(args.map((a) => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ")),
          error: (...args: any[]) => logs.push("❌ " + args.join(" ")),
          warn: (...args: any[]) => logs.push("⚠️ " + args.join(" ")),
        });
        setOutput(logs.join("\n") || "(沒有 console.log 輸出)");
      } catch (e: any) {
        setOutput(`❌ ${e.message}`);
      }
    } else if (isPython) {
      // Python 優先用 Pyodide（瀏覽器內、不依賴 Piston）
      try {
        setOutput(pyodide.status === "ready" ? "執行中..." : "首次載入 Python 環境（約 5-15 秒）...");
        const r = await pyodide.run(code);
        const stdout = r.stdout || "";
        const stderr = r.stderr || "";
        if (!r.ok && stderr) {
          setOutput(`${stdout}${stdout ? "\n\n" : ""}❌ ${stderr.trim()}`);
        } else {
          setOutput(stdout || "(無輸出、加 print() 看結果)");
        }
      } catch (e: any) {
        // Pyodide 載入失敗 → fallback 到 Piston
        await runViaSandbox();
      }
    } else if (isSandbox) {
      await runViaSandbox();
    } else {
      setOutput(`⚠️ ${lang} 目前不支援即時執行`);
    }
    setRunning(false);
  };

  // HTML / CSS 載入時自動跑
  useEffect(() => {
    if (lang === "html" || lang === "css") {
      const timer = setTimeout(() => run(), 100);
      return () => clearTimeout(timer);
    }
  }, [lang]);

  const reset = () => {
    setCode(playground.initialCode);
    setLang(playground.language);
    setTimeout(run, 50);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const save = async () => {
    if (!isLoggedIn) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("playgrounds")
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        playground_key: playground.key,
        language: lang,
        code,
        title: playground.title,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,playground_key" });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // 支援的語言下拉選項
  const allLangs = [
    ...LOCAL_LANGS.filter((l) => l !== "javascript"),
    ...Object.keys(SANDBOX_LANGS).filter((l, i, arr) => {
      // 去重複（alias）
      const seen = SANDBOX_LANGS[l].piston;
      return arr.findIndex((k) => SANDBOX_LANGS[k]?.piston === seen) === i;
    }),
  ];

  const containerClass = fullscreen
    ? "fixed inset-0 z-50 bg-bg"
    : "rounded-xl border border-border bg-bg my-4";

  const innerHeight = fullscreen ? "h-screen" : "";

  return (
    <div className={containerClass + " overflow-hidden flex flex-col"}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-elevated border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* 語言下拉 */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="text-xs font-mono uppercase px-2 py-1 rounded bg-accent/20 text-accent border-0 outline-none cursor-pointer"
          >
            {allLangs.map((l) => (
              <option key={l} value={l}>{LANG_LABELS[l] ?? l}</option>
            ))}
          </select>
          <span className="text-xs text-fg-muted truncate">
            {playground.title ?? "編輯左邊、按 ▶ 執行"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isSandbox && (
            <button
              onClick={() => setShowStdin(!showStdin)}
              className={`p-1.5 rounded text-xs ${showStdin ? "bg-bg-card" : "hover:bg-bg-card"}`}
              title="stdin 輸入"
            >
              📥
            </button>
          )}
          <button onClick={copy} className="p-1.5 hover:bg-bg-card rounded" title="複製">
            {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
          </button>
          {isLoggedIn && (
            <button onClick={save} className="p-1.5 hover:bg-bg-card rounded" title="存到雲端">
              {saved ? <Check size={14} className="text-accent" /> : <Save size={14} />}
            </button>
          )}
          <button
            onClick={() => setShowTerminal((s) => !s)}
            className={`p-1.5 rounded ${showTerminal ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-bg-card"}`}
            title="虛擬終端機（可實際打指令）"
          >
            <TerminalSquare size={14} />
          </button>
          <button onClick={reset} className="p-1.5 hover:bg-bg-card rounded" title="重置">
            <RotateCcw size={14} />
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="p-1.5 hover:bg-bg-card rounded" title="全螢幕">
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={run}
            disabled={running}
            className="ml-1 flex items-center gap-1 px-3 py-1 bg-accent text-black text-xs font-semibold rounded hover:scale-105 transition disabled:opacity-50"
          >
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
            執行
          </button>
        </div>
      </div>

      {/* stdin */}
      {showStdin && isSandbox && (
        <div className="px-3 py-2 border-b border-border bg-bg shrink-0">
          <div className="text-xs text-fg-muted mb-1">📥 標準輸入（stdin）：</div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="輸入給程式的資料、會傳到 stdin"
            rows={2}
            className="w-full font-mono text-xs p-2 bg-bg-card border border-border rounded outline-none"
          />
        </div>
      )}

      {/* Editor + Preview/Output */}
      <div className={`flex-1 grid ${showPreview ? "md:grid-cols-2" : "grid-cols-1"} ${innerHeight}`} style={{ minHeight: fullscreen ? undefined : (playground.height ?? 320) }}>
        <div
          className={showPreview ? "border-r border-border" : ""}
          style={{ minHeight: fullscreen ? undefined : (playground.height ?? 320) }}
        >
          <MonacoEditor
            height={fullscreen ? "100vh" : (playground.height ?? 320)}
            language={MONACO_LANG[lang] ?? "plaintext"}
            beforeMount={defineMonacoLight}
            theme={isLight ? "ai-light" : "vs-dark"}
            value={code}
            onChange={(v) => setCode(v ?? "")}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: "line",
              cursorBlinking: "smooth",
              folding: true,
              lineNumbers: "on",
              quickSuggestions: true,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
            onMount={(editor, monaco) => {
              // Cmd/Ctrl + Enter 執行
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                run();
              });
              // Cmd/Ctrl + S 儲存
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                save();
              });
            }}
          />
        </div>

        {showPreview ? (
          <iframe
            ref={iframeRef}
            title="preview"
            className="bg-white w-full h-full block"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
            srcDoc='<!DOCTYPE html><html><body style="font-family:sans-serif;color:#888;padding:20px;text-align:center;"><p>👈 編輯 code、點 ▶ 執行</p></body></html>'
            style={{
              minHeight: fullscreen ? undefined : (playground.height ?? 320),
              width: "100%",
              border: 0,
            }}
          />
        ) : null}
      </div>

      {/* Output console */}
      {!showPreview && (
        <div className="border-t border-border p-3 bg-bg-elevated shrink-0 max-h-[300px] overflow-auto">
          <div className="text-xs text-fg-muted mb-1 font-mono flex items-center justify-between">
            <span>▶ 輸出</span>
            <div className="flex items-center gap-2">
              {isPython && <span className="text-xs">🐍 瀏覽器內 Pyodide</span>}
              {!isPython && isSandbox && <span className="text-xs">⚡ 遠端沙盒 (Piston)</span>}
              {output && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(output);
                  }}
                  className="px-2 py-0.5 rounded hover:bg-white/10 transition text-[10px]"
                  aria-label="複製輸出"
                >
                  📋 複製
                </button>
              )}
            </div>
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap text-fg overflow-x-auto">
            {output || (running ? "執行中..." : "點 ▶ 執行")}
          </pre>
        </div>
      )}

      {/* Hint */}
      {playground.hint && !fullscreen && (
        <div className="border-t border-border p-3 text-xs text-fg-muted bg-yellow-500/5 shrink-0">
          💡 {playground.hint}
        </div>
      )}

      {/* 虛擬終端機（可實際打指令）。Python→瀏覽器內 REPL（變數持久）、Shell→沙盒後端 */}
      {showTerminal && !fullscreen && (
        <div className="border-t border-border p-3 shrink-0">
          <VirtualTerminal defaultMode={isPython ? "python" : "shell"} />
        </div>
      )}
    </div>
  );
}
