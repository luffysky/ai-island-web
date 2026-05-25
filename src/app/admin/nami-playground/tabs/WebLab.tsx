"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RefreshCw, Download, FileCode, FileBadge, Braces, ExternalLink } from "lucide-react";
import { CodeEditor, loadEditorValue } from "@/components/ui/CodeEditor";

const PRESETS = [
  {
    id: "starter",
    name: "🚀 Starter Hello",
    desc: "最基本的 HTML + CSS + JS、按鈕計數",
    html: `<main>
  <h1>👋 Hello Web</h1>
  <p>第一個練習：按按鈕計次數</p>
  <button id="btn">點我 (<span id="count">0</span>)</button>
</main>`,
    css: `body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  background: #0d1117;
  color: #e6edf3;
  padding: 40px;
  text-align: center;
}
h1 { color: #50fa7b; }
button {
  margin-top: 16px;
  padding: 12px 24px;
  font-size: 16px;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.15s;
}
button:hover { transform: scale(1.05); }`,
    js: `const btn = document.getElementById('btn');
const count = document.getElementById('count');
let n = 0;
btn.addEventListener('click', () => {
  n++;
  count.textContent = n;
  if (n === 10) alert('💯 達成 10 次！');
});`,
  },
  {
    id: "form",
    name: "📝 表單驗證",
    desc: "Email + 密碼即時驗證、錯誤訊息",
    html: `<form id="f">
  <h2>會員註冊</h2>
  <label>Email
    <input id="email" type="email" required>
    <span class="err" id="emailErr"></span>
  </label>
  <label>密碼 (至少 8 字)
    <input id="pw" type="password" minlength="8" required>
    <span class="err" id="pwErr"></span>
  </label>
  <button type="submit">送出</button>
  <p id="ok"></p>
</form>`,
    css: `body { font-family: sans-serif; background: #0d1117; color: #e6edf3; padding: 30px; }
form { max-width: 400px; margin: 0 auto; }
h2 { color: #50fa7b; }
label { display: block; margin: 16px 0; font-size: 14px; }
input { width: 100%; padding: 10px; margin-top: 6px; background: #1a1f2a; border: 1px solid #374151; color: #e6edf3; border-radius: 8px; box-sizing: border-box; }
input:focus { border-color: #50fa7b; outline: none; }
.err { color: #ef4444; font-size: 12px; display: block; margin-top: 4px; min-height: 16px; }
button { width: 100%; padding: 12px; background: #50fa7b; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
#ok { color: #50fa7b; text-align: center; margin-top: 12px; }`,
    js: `const f = document.getElementById('f');
const email = document.getElementById('email');
const pw = document.getElementById('pw');
const emailErr = document.getElementById('emailErr');
const pwErr = document.getElementById('pwErr');
const ok = document.getElementById('ok');

email.addEventListener('input', () => {
  emailErr.textContent = email.value && !email.validity.valid ? '格式不對' : '';
});
pw.addEventListener('input', () => {
  pwErr.textContent = pw.value.length > 0 && pw.value.length < 8 ? \`還差 \${8 - pw.value.length} 字\` : '';
});

f.addEventListener('submit', (e) => {
  e.preventDefault();
  ok.textContent = '✅ 送出 ' + email.value;
  setTimeout(() => ok.textContent = '', 2500);
});`,
  },
  {
    id: "todo",
    name: "✅ Todo List + localStorage",
    desc: "新增 / 刪除 / 持久化、重新整理也在",
    html: `<div class="app">
  <h2>📋 我的 Todo</h2>
  <div class="row">
    <input id="input" placeholder="新增任務..." />
    <button id="add">+</button>
  </div>
  <ul id="list"></ul>
  <p class="stat" id="stat"></p>
</div>`,
    css: `body { font-family: sans-serif; background: #0d1117; color: #e6edf3; padding: 30px; }
.app { max-width: 420px; margin: 0 auto; }
h2 { color: #50fa7b; }
.row { display: flex; gap: 8px; }
input { flex: 1; padding: 10px; background: #1a1f2a; border: 1px solid #374151; color: #e6edf3; border-radius: 8px; }
button { padding: 10px 16px; background: #50fa7b; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
ul { list-style: none; padding: 0; margin: 16px 0; }
li { display: flex; align-items: center; gap: 8px; padding: 10px; background: #1a1f2a; border-radius: 8px; margin-bottom: 6px; }
li.done { opacity: 0.5; text-decoration: line-through; }
li span { flex: 1; cursor: pointer; }
li button { padding: 4px 8px; background: #ef4444; color: white; }
.stat { color: #9ca3af; font-size: 12px; text-align: center; }`,
    js: `const KEY = 'web-lab-todos';
let todos = JSON.parse(localStorage.getItem(KEY) || '[]');
const list = document.getElementById('list');
const input = document.getElementById('input');
const stat = document.getElementById('stat');

function save() { localStorage.setItem(KEY, JSON.stringify(todos)); }
function render() {
  list.innerHTML = '';
  todos.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = t.done ? 'done' : '';
    const span = document.createElement('span');
    span.textContent = t.text;
    span.onclick = () => { todos[i].done = !todos[i].done; save(); render(); };
    const del = document.createElement('button');
    del.textContent = '✕';
    del.onclick = () => { todos.splice(i, 1); save(); render(); };
    li.appendChild(span);
    li.appendChild(del);
    list.appendChild(li);
  });
  const done = todos.filter(t => t.done).length;
  stat.textContent = \`\${todos.length} 項、已完成 \${done}\`;
}
document.getElementById('add').onclick = () => {
  if (!input.value.trim()) return;
  todos.push({ text: input.value.trim(), done: false });
  input.value = '';
  save();
  render();
};
input.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('add').click(); });
render();`,
  },
  {
    id: "fetch",
    name: "🌐 Fetch API + 卡片渲染",
    desc: "從 JSONPlaceholder API 抓資料、渲染成卡片",
    html: `<div class="app">
  <h2>📰 文章列表</h2>
  <button id="load">載入文章</button>
  <div id="grid" class="grid"></div>
</div>`,
    css: `body { font-family: sans-serif; background: #0d1117; color: #e6edf3; padding: 30px; }
.app { max-width: 900px; margin: 0 auto; }
h2 { color: #50fa7b; text-align: center; }
button { display: block; margin: 16px auto; padding: 10px 24px; background: #50fa7b; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-top: 20px; }
.card { background: #1a1f2a; border: 1px solid #374151; padding: 14px; border-radius: 12px; transition: transform 0.2s; }
.card:hover { transform: translateY(-2px); border-color: #50fa7b; }
.card h3 { margin: 0 0 8px; color: #50fa7b; font-size: 14px; }
.card p { margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5; }`,
    js: `const btn = document.getElementById('load');
const grid = document.getElementById('grid');

btn.addEventListener('click', async () => {
  btn.disabled = true;
  btn.textContent = '載入中...';
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=12');
    const posts = await res.json();
    grid.innerHTML = posts.map(p => \`
      <article class="card">
        <h3>#\${p.id} \${p.title}</h3>
        <p>\${p.body.slice(0, 100)}...</p>
      </article>
    \`).join('');
  } catch (e) {
    grid.innerHTML = '<p style="color: #ef4444">載入失敗：' + e.message + '</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = '重新載入';
  }
});`,
  },
  {
    id: "canvas",
    name: "🎨 Canvas 動畫",
    desc: "粒子系統、跟著滑鼠跑的圓點",
    html: `<canvas id="cv"></canvas>
<div class="hint">移動滑鼠看粒子效果</div>`,
    css: `body { margin: 0; background: #000; overflow: hidden; }
canvas { display: block; width: 100vw; height: 100vh; }
.hint { position: fixed; top: 16px; left: 16px; color: #50fa7b; font-family: monospace; font-size: 12px; pointer-events: none; }`,
    js: `const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
cv.width = innerWidth;
cv.height = innerHeight;
addEventListener('resize', () => { cv.width = innerWidth; cv.height = innerHeight; });

const particles = [];
addEventListener('mousemove', (e) => {
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: e.clientX, y: e.clientY,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 60, color: \`hsl(\${Math.random() * 360}, 100%, 60%)\`,
      r: Math.random() * 4 + 2,
    });
  }
});

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, cv.width, cv.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.life--;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 60;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(animate);
}
animate();`,
  },
];

const PANEL_META = {
  html: { label: "HTML", icon: FileCode, color: "text-orange-400" },
  css: { label: "CSS", icon: FileBadge, color: "text-blue-400" },
  js: { label: "JS", icon: Braces, color: "text-yellow-400" },
};

export function WebLab() {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [html, setHtml] = useState(() => loadEditorValue("web-html", PRESETS[0].html));
  const [css, setCss] = useState(() => loadEditorValue("web-css", PRESETS[0].css));
  const [js, setJs] = useState(() => loadEditorValue("web-js", PRESETS[0].js));
  const [auto, setAuto] = useState(true);
  const [running, setRunning] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [activePanel, setActivePanel] = useState<"html" | "css" | "js">("html");

  const srcDoc = useMemo(() => {
    if (!running) return "";
    return `<!doctype html>
<html lang="zh-Hant"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css}</style>
</head><body>
${html}
<script>
try { ${js} } catch (e) { document.body.innerHTML += '<pre style="color:red;padding:12px">JS Error: ' + e.message + '\\n' + e.stack + '</pre>'; }
</script>
</body></html>`;
  }, [html, css, js, running, iframeKey]);

  const pickPreset = (p: typeof PRESETS[number]) => {
    setPreset(p);
    setHtml(p.html);
    setCss(p.css);
    setJs(p.js);
    setIframeKey((k) => k + 1);
  };

  const reset = () => pickPreset(preset);

  const download = () => {
    const html_doc = srcDoc;
    const blob = new Blob([html_doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${preset.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Preset picker */}
      <div className="bg-bg-card border border-border rounded-2xl p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-fg-muted">範例：</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => pickPreset(p)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                preset.id === p.id
                  ? "border-purple-400 bg-purple-500/10 text-purple-300"
                  : "border-border text-fg-muted hover:border-purple-400/50"
              }`}
              title={p.desc}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-accent" />
          <span>邊改邊預覽</span>
        </label>
        {!auto && (
          <button onClick={() => setIframeKey(k => k + 1)} className="px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold inline-flex items-center gap-1">
            <Play size={11} /> 重跑
          </button>
        )}
        <button onClick={() => setRunning(v => !v)} className="px-2.5 py-1 rounded-full border border-border hover:border-purple-400 inline-flex items-center gap-1">
          {running ? <><Pause size={11} /> 停止</> : <><Play size={11} /> 啟動</>}
        </button>
        <button onClick={reset} className="px-2.5 py-1 rounded-full border border-border hover:border-orange-400 inline-flex items-center gap-1">
          <RefreshCw size={11} /> 重設範例
        </button>
        <button onClick={download} className="ml-auto px-2.5 py-1 rounded-full border border-border hover:border-emerald-400 inline-flex items-center gap-1">
          <Download size={11} /> 下載 .html
        </button>
      </div>

      {/* Editor + Preview split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Editor with panel tabs */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center border-b border-border bg-bg-elevated">
            {(["html", "css", "js"] as const).map((k) => {
              const meta = PANEL_META[k];
              const Icon = meta.icon;
              return (
                <button
                  key={k}
                  onClick={() => setActivePanel(k)}
                  className={`px-3 py-2 text-xs font-bold inline-flex items-center gap-1 border-b-2 transition ${
                    activePanel === k
                      ? `${meta.color} border-current`
                      : "text-fg-muted border-transparent hover:text-fg"
                  }`}
                >
                  <Icon size={12} />
                  {meta.label}
                </button>
              );
            })}
            <span className="ml-auto text-[10px] text-fg-muted px-3 font-mono">
              {activePanel === "html" ? html.split("\n").length : activePanel === "css" ? css.split("\n").length : js.split("\n").length} 行
            </span>
          </div>
          <div className="flex-1 min-h-[500px]">
            <CodeEditor
              value={activePanel === "html" ? html : activePanel === "css" ? css : js}
              onChange={(v) => {
                if (activePanel === "html") setHtml(v);
                else if (activePanel === "css") setCss(v);
                else setJs(v);
                if (auto) setIframeKey(k => k + 1);
              }}
              lang={activePanel === "html" ? "html" : activePanel === "css" ? "css" : "javascript"}
              storageKey={`web-${activePanel}`}
              height="100%"
              minHeight="500px"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted inline-flex items-center justify-between">
            <span>🖥️ 即時預覽</span>
            <span className="text-[9px] inline-flex items-center gap-0.5">
              <ExternalLink size={9} /> sandbox
            </span>
          </div>
          <div className="flex-1 min-h-[500px] bg-white">
            <iframe
              key={iframeKey}
              title="web-lab-preview"
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-modals allow-forms"
              className="w-full h-full border-0"
              style={{ minHeight: 500 }}
            />
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="rounded-xl bg-bg-elevated/30 border border-border p-3 text-[11px] text-fg-muted leading-relaxed">
        <div className="font-bold text-fg mb-1">💡 練習方式</div>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>每個範例都能改、改完即時預覽（取消「邊改邊預覽」可手動 Run）</li>
          <li>你寫的 code 自動存在 localStorage、重新整理也還在</li>
          <li>iframe 是隔離的 sandbox、跑任何 JS 都不會影響後台</li>
          <li>「下載 .html」會輸出完整可獨立打開的 HTML 檔</li>
          <li>進階：搭配 Backend Lab 寫一個全端 demo（FastAPI 接這個 fetch）</li>
        </ul>
      </div>
    </div>
  );
}
