// 產生完整 docs/lesson_image_audit.md：每個需要配圖的 lesson 都給檔名 + GPT prompt。
// A/B/C 分類沿用 _oneshot-pic-audit.mjs 的關鍵字。GPT 也能做 A 類（截圖式教學）。
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "src/data/chapters";
const files = readdirSync(dir).filter((f) => /^ch\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));

const all = [];
for (const f of files) {
  const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
  for (const l of raw.lessons ?? []) {
    all.push({ cid: raw.id, ctitle: raw.title, lid: l.id, title: l.title, one: l.oneLineSummary ?? "" });
  }
}

const A_KW = ["安裝","設置","設定","configure","Setup","Install","環境變數","PATH",".env","VSCode","Visual Studio Code","終端機","Terminal","PowerShell","shell","Git ","GitHub","git init","git commit","npm install","npm 安裝","Supabase","Vercel","Zeabur","Cloudflare","Dashboard","後台","REPL","Codex","Cursor","Claude Code","Docker 安裝","Docker Compose","DevTools","F12"];
const B_KW = ["為什麼","什麼是","原理","機制","底層","怎麼運作","如何運作","vs"," vs ","比較","差別","對比","閉包","scope","作用域","this","綁定","Promise","async","await","Event Loop","事件迴圈","JOIN","transaction","Index","索引","正規化","JWT","OAuth","session","Cookie","Box Model","Flexbox","Grid","盒模型","reactivity","響應式","雙向綁定","型別","type","遞迴","演算法","REST","GraphQL","RPC","DNS","SSL","HTTPS","HTTP/2","HTTP/3","DataFrame","tensor","RAG","embedding","prompt"];
const C_KW = ["流程","架構","pipeline","stack","結構","請求","request","response","CI/CD","部署流程","Deploy","Webhook","callback","Agent","tool calling","爬蟲流程","資料流","微服務","monolith","monorepo","中介軟體","middleware"];
const SKIP_KW = ["練習","小考","boss","quiz"];
const m = (kw, t) => { const lo = t.toLowerCase(); return kw.some((k) => lo.includes(k.toLowerCase())); };

const A = [], B = [], C = [];
for (const l of all) {
  const t = `${l.title} ${l.one}`;
  if (m(SKIP_KW, t)) continue;
  if (m(A_KW, t)) A.push(l);
  else if (m(C_KW, t)) C.push(l);
  else if (m(B_KW, t)) B.push(l);
}

const nn = (id) => String(id).padStart(2, "0");
const fname = (l) => `ch${nn(l.cid)}_l${String(l.lid).replace(/\./g, "_")}.png`;

// 各類 prompt 產生器（concept 用 lesson 標題 + 一句話）
function promptA(l) {
  return `Step-by-step illustrated how-to guide for 「${l.title}」. Multi-panel numbered steps ①②③, screenshot-style dark UI panels with red highlight boxes / arrows on the key button or field, clean infographic. Short Traditional-Chinese labels OK. Portrait 3:4. ${l.one ? "重點：" + l.one : ""}`.trim();
}
function promptB(l) {
  return `Clean educational infographic explaining 「${l.title}」. Flat design, dark navy #0a0e14, colorful accents, 3-4 panels with arrows, English keyword labels + emoji, Linear/Stripe-doc style. 16:9. ${l.one ? "重點：" + l.one : ""}`.trim();
}
function promptC(l) {
  return `Technical flowchart / architecture diagram of 「${l.title}」. Minimal excalidraw/AWS-diagram style, dark bg, nodes + labeled arrows showing flow, color-coded node types, English short labels. 16:9. ${l.one ? "重點：" + l.one : ""}`.trim();
}

function table(list, mkPrompt) {
  let cur = "";
  const lines = [];
  for (const l of list) {
    const chHdr = `Ch${nn(l.cid)} ${l.ctitle}`;
    if (chHdr !== cur) { cur = chHdr; lines.push(`\n**${chHdr}**\n`); lines.push("| 檔名 | Lesson | prompt |", "|---|---|---|"); }
    lines.push(`| \`${fname(l)}\` | L${l.lid} ${l.title} | ${mkPrompt(l).replace(/\|/g, "/")} |`);
  }
  return lines.join("\n");
}

const out = `# Lesson 圖文配圖 audit — 全量清單（每條都有檔名 + GPT prompt）

**目的**：林董直接拿這份去 ChatGPT（gpt-image-1）生圖。**所有需要配圖的 lesson 都列出來了、每條都有 prompt。**
**重生**：\`node scripts/_gen-image-audit.mjs\`（章節內容改了就重跑）。
**日期**：自動產生。

---

## 0. GPT 生圖更新說明

之前以為「A 類截圖步驟圖 GPT 做不來」——**錯了**。\`example/pic/1~6.png\`（Python 環境變數、VSCode 中文包、Codex CLI、REPL）就是 **GPT 直接生**的截圖式教學圖。所以 **A / B / C 三類都可以用 GPT 生**，A 類用下面的「操作教學 template」即可。

> 提醒：GPT 對「長段中文」「像素級精準 UI」還是會糊；A 類拿到圖後對照真實畫面檢查一下，差太多再用 Snipping Tool 補真截圖。

## 1. 檔名 / 存放規範

- 存放：\`public/lesson-img/ch{NN}/{檔名}.png\`（每章一資料夾）
- 檔名：本清單「檔名」欄已給好（\`ch{NN}_l{lessonId}.png\`）
- 生好丟進對應資料夾、跟嶼築說一聲，會依檔名插進該 lesson 的 markdown \`![]()\`。

## 2. 🖼️ A 類：操作教學 / 截圖步驟（共 ${A.length} 條）

> prompt 已含「多步驟編號 + 紅框標註 + 截圖風格」。
${table(A, promptA)}

---

## 3. 📊 B 類：概念解說圖（共 ${B.length} 條）

> prompt 已含「深色 infographic + 英文 label + emoji」風格。
${table(B, promptB)}

---

## 4. 🔵 C 類：流程 / 架構圖（共 ${C.length} 條）

> prompt 已含「flowchart + 節點箭頭 + 顏色分類」風格。
${table(C, promptC)}

---

## 5. 用量小結

| 類型 | 條數 |
|---|---|
| A 操作教學 | ${A.length} |
| B 概念解說 | ${B.length} |
| C 流程架構 | ${C.length} |
| **合計** | **${A.length + B.length + C.length}** |

建議先做 A 類（新手最卡）+ B 類前端核心（ch02/04/05/07），看效果再往下。
`;

writeFileSync("docs/lesson_image_audit.md", out, "utf8");
console.log(`A=${A.length} B=${B.length} C=${C.length} total=${A.length + B.length + C.length} → docs/lesson_image_audit.md`);
