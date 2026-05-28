/**
 * 從 outline 篩出「最適合圖文解說」的 lesson、分 3 類：
 *   A 截圖步驟圖（安裝 / IDE / Dashboard 操作）
 *   B 概念解說圖（抽象概念視覺化）
 *   C 流程 / 架構圖
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "src/data/chapters";
const files = readdirSync(dir).filter((f) => /^ch\d+\.json$/.test(f));

const all = [];
for (const f of files) {
  const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
  for (const l of raw.lessons ?? []) {
    all.push({
      chapter_id: raw.id,
      chapter_title: raw.title,
      file: f,
      lesson_id: l.id,
      lesson_number: l.number,
      lesson_title: l.title,
      one: l.oneLineSummary ?? "",
    });
  }
}

// A: 截圖步驟圖（安裝 / 工具 / Dashboard 操作）
const A_KW = [
  "安裝", "設置", "設定", "configure", "Setup", "Install",
  "環境變數", "PATH", ".env",
  "VSCode", "Visual Studio Code",
  "終端機", "Terminal", "PowerShell", "shell",
  "Git ", "GitHub", "git init", "git commit",
  "npm install", "npm 安裝",
  "Supabase", "Vercel", "Zeabur", "Cloudflare",
  "Dashboard", "後台",
  "REPL", "Codex", "Cursor", "Claude Code",
  "Docker 安裝", "Docker Compose",
  "DevTools", "F12",
];

// B: 概念解說圖（抽象概念視覺化）
const B_KW = [
  "為什麼", "什麼是", "原理", "機制", "底層", "怎麼運作", "如何運作",
  "vs", " vs ", "比較", "差別", "對比",
  "閉包", "scope", "作用域", "this", "綁定",
  "Promise", "async", "await", "Event Loop", "事件迴圈",
  "JOIN", "transaction", "Index", "索引", "正規化",
  "JWT", "OAuth", "session", "Cookie",
  "Box Model", "Flexbox", "Grid", "盒模型",
  "reactivity", "響應式", "雙向綁定",
  "型別", "type",
  "遞迴", "演算法",
  "REST", "GraphQL", "RPC",
  "DNS", "SSL", "HTTPS", "HTTP/2", "HTTP/3",
  "DataFrame", "tensor",
  "RAG", "embedding", "prompt",
];

// C: 流程 / 架構圖
const C_KW = [
  "流程", "架構", "pipeline", "stack", "結構",
  "請求", "request", "response",
  "CI/CD", "部署流程", "Deploy",
  "Webhook", "callback",
  "Agent", "tool calling",
  "爬蟲流程", "資料流",
  "微服務", "monolith", "monorepo",
  "中介軟體", "middleware",
];

const SKIP_KW = ["練習", "小考", "boss", "quiz"];

function match(kw, t) {
  const lo = t.toLowerCase();
  return kw.some((k) => lo.includes(k.toLowerCase()));
}

const A = [];
const B = [];
const C = [];

for (const l of all) {
  const text = `${l.lesson_title} ${l.one}`;
  if (match(SKIP_KW, text)) continue;
  const hitA = match(A_KW, text);
  const hitB = match(B_KW, text);
  const hitC = match(C_KW, text);
  if (hitA) A.push(l);
  else if (hitC) C.push(l);
  else if (hitB) B.push(l);
}

console.log("=== A 截圖步驟圖（", A.length, "條）===");
for (const l of A) console.log(`  Ch${String(l.chapter_id).padStart(2,"0")} L${l.lesson_id} | ${l.lesson_title}`);

console.log("\n=== B 概念解說圖（", B.length, "條）===");
for (const l of B) console.log(`  Ch${String(l.chapter_id).padStart(2,"0")} L${l.lesson_id} | ${l.lesson_title}`);

console.log("\n=== C 流程/架構圖（", C.length, "條）===");
for (const l of C) console.log(`  Ch${String(l.chapter_id).padStart(2,"0")} L${l.lesson_id} | ${l.lesson_title}`);
