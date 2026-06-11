// 修 ch03（UI/UX）3.3~3.14 被 stub 掉的 HTML 範例（「稍後將補回完整範例」）。
// 每個 stub 依其所在小節、補上真實、新手友善、可動的範例。最小 diff：用 JSON.stringify 原值替換。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "..", "src", "data", "chapters", "ch03.json");
const J = (lines) => lines.join("\n");
const fence = (code) => "```html\n" + code + "\n```";

// 每課依「stub 出現順序」對應的替換範例
const REPLACEMENTS = {
  "3.3": [ // 對比實驗：壞 vs 好
    J([
      '<!-- ❌ 壞：每個元素一樣大、一樣黑、擠在一起、看不出重點 -->',
      '<div>',
      '  <p>我們的產品</p>',
      '  <p>幫你每天省下 2 小時</p>',
      '  <a href="#">開始使用</a>',
      '  <p>不需要信用卡</p>',
      '</div>',
      '',
      '<!-- ✅ 好：用大小 / 粗細 / 顏色 / 留白做出層次、眼睛自動知道先看哪 -->',
      '<div style="text-align:center; line-height:1.8">',
      '  <h1 style="font-size:40px; font-weight:800; margin:0">幫你每天省下 2 小時</h1>',
      '  <p style="font-size:18px; color:#666; margin:8px 0 24px">最聰明的待辦工具</p>',
      '  <a href="#" style="background:#1f883d; color:#fff; padding:14px 28px;',
      '     border-radius:8px; font-weight:700; text-decoration:none">開始使用</a>',
      '  <p style="font-size:13px; color:#999; margin-top:12px">不需要信用卡</p>',
      '</div>',
    ]),
  ],
  "3.5": [ // 字體載入
    J([
      '<!-- 1. 在 <head> 引入字體；display=swap：字還沒載入完先用系統字、避免一片空白 -->',
      '<link rel="preconnect" href="https://fonts.googleapis.com">',
      '<link rel="stylesheet"',
      '  href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap">',
      '',
      '<style>',
      '  /* 2. 套用字體、後面一定要接 fallback（載入失敗就退回系統字、畫面不會壞） */',
      '  body {',
      '    font-family: "Noto Sans TC", system-ui, "PingFang TC", "Microsoft JhengHei", sans-serif;',
      '  }',
      '</style>',
    ]),
  ],
  "3.6": [ // 實戰：卡片 grid（8pt 間距）
    J([
      '<style>',
      '  /* 間距都用 8 的倍數（8 / 16 / 24 / 32）、整齊又好維護 */',
      '  .grid {',
      '    display: grid;',
      '    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));',
      '    gap: 16px;                 /* 卡片之間 16px */',
      '  }',
      '  .card { padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; }',
      '  .card h3 { margin: 0 0 8px; }   /* 標題跟內文間 8px */',
      '  .card p  { margin: 0; color: #6b7280; }',
      '</style>',
      '',
      '<div class="grid">',
      '  <div class="card"><h3>方案 A</h3><p>適合個人</p></div>',
      '  <div class="card"><h3>方案 B</h3><p>適合團隊</p></div>',
      '  <div class="card"><h3>方案 C</h3><p>適合企業</p></div>',
      '</div>',
    ]),
  ],
  "3.7": [ // Button + Icon（5 狀態）
    J([
      '<style>',
      '  .btn {',
      '    display: inline-flex; align-items: center; gap: 8px;   /* icon 跟文字間 8px */',
      '    background: #1f883d; color: #fff; border: none;',
      '    padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer;',
      '    transition: background .15s;',
      '  }',
      '  .btn:hover         { background: #1a7332; }            /* 滑過：變深 */',
      '  .btn:active        { transform: translateY(1px); }     /* 按下：下沉 1px */',
      '  .btn:disabled      { background: #9ca3af; cursor: not-allowed; }  /* 不可按：灰 */',
      '  .btn:focus-visible { outline: 3px solid #1f883d55; }   /* 鍵盤聚焦：外框 */',
      '</style>',
      '',
      '<button class="btn"><span>＋</span> 新增項目</button>',
    ]),
  ],
  "3.8": [ // 實戰：完整 form HTML
    J([
      '<form>',
      '  <!-- 每個 input 都配一個 <label for>、點文字也能聚焦、無障礙必備 -->',
      '  <label for="email">Email</label>',
      '  <input id="email" type="email" required placeholder="you@example.com">',
      '',
      '  <label for="pw">密碼</label>',
      '  <input id="pw" type="password" required minlength="8">',
      '',
      '  <!-- 錯誤訊息放欄位下方、用「顏色 + 文字」一起講（別只靠顏色） -->',
      '  <p class="error" role="alert">密碼至少 8 個字</p>',
      '',
      '  <button type="submit">註冊</button>',
      '</form>',
    ]),
  ],
  "3.9": [ // 實戰：完整 card CSS
    J([
      '<style>',
      '  .card {',
      '    width: 280px;',
      '    border: 1px solid #e5e7eb; border-radius: 12px;',
      '    overflow: hidden;                 /* 讓圖片跟著圓角一起裁切 */',
      '    box-shadow: 0 1px 3px rgba(0,0,0,.08);',
      '  }',
      '  .card img   { width: 100%; height: 160px; object-fit: cover; display: block; }',
      '  .card .body { padding: 16px; }',
      '  .card h3    { margin: 0 0 4px; font-size: 18px; }',
      '  .card p     { margin: 0; color: #6b7280; font-size: 14px; }',
      '</style>',
      '',
      '<article class="card">',
      '  <img src="/cover.jpg" alt="課程封面">',
      '  <div class="body">',
      '    <h3>UI/UX 入門</h3>',
      '    <p>3 小時學會基本設計原則</p>',
      '  </div>',
      '</article>',
    ]),
    // Card grid 響應式
    J([
      '<style>',
      '  /* auto-fill + minmax：螢幕寬就多排幾張、窄就自動換行、不用寫 media query */',
      '  .cards {',
      '    display: grid;',
      '    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));',
      '    gap: 16px;',
      '  }',
      '</style>',
      '',
      '<div class="cards">',
      '  <article class="card">…</article>',
      '  <article class="card">…</article>',
      '  <article class="card">…</article>',
      '</div>',
    ]),
  ],
  "3.10": [ // Modal 完整結構
    J([
      '<!-- 遮罩：蓋住背景、點它可以關閉 -->',
      '<div class="overlay">',
      '  <!-- role=dialog + aria-modal 讓螢幕報讀器知道「這是對話框」 -->',
      '  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="title">',
      '    <h2 id="title">刪除這筆資料？</h2>',
      '    <p>刪除後無法復原。</p>',
      '    <div class="actions">',
      '      <button class="ghost">取消</button>',
      '      <button class="danger">確定刪除</button>',
      '    </div>',
      '  </div>',
      '</div>',
      '',
      '<style>',
      '  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5);',
      '             display: grid; place-items: center; }   /* 一行置中 modal */',
      '  .modal   { background: #fff; padding: 24px; border-radius: 12px; width: 320px; }',
      '  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }',
      '  .danger  { background: #dc2626; color: #fff; border: none;',
      '             padding: 8px 16px; border-radius: 8px; }',
      '</style>',
    ]),
  ],
  "3.11": [ // Side nav 實戰
    J([
      '<nav class="side">',
      '  <!-- aria-current="page"：標出「目前所在頁」、給人也給報讀器看 -->',
      '  <a href="/"         class="item active" aria-current="page">🏠 首頁</a>',
      '  <a href="/courses"  class="item">📚 課程</a>',
      '  <a href="/settings" class="item">⚙️ 設定</a>',
      '</nav>',
      '',
      '<style>',
      '  .side { display: flex; flex-direction: column; width: 200px; padding: 8px; }',
      '  .item { display: flex; gap: 8px; padding: 10px 12px; border-radius: 8px;',
      '          color: #374151; text-decoration: none; }',
      '  .item:hover  { background: #f3f4f6; }',
      '  .item.active { background: #1f883d22; color: #1f883d; font-weight: 600; }',
      '</style>',
    ]),
  ],
  "3.12": [ // Empty State 設計
    J([
      '<!-- 空狀態：別只留白、要說「為什麼空」+「下一步做什麼」 -->',
      '<div class="empty">',
      '  <div class="icon">📭</div>',
      '  <h3>還沒有任何筆記</h3>',
      '  <p>建立第一則筆記、開始整理你的想法。</p>',
      '  <button class="btn">＋ 新增筆記</button>',
      '</div>',
      '',
      '<style>',
      '  .empty { text-align: center; padding: 48px 16px; color: #6b7280; }',
      '  .empty .icon { font-size: 48px; }',
      '  .empty h3 { margin: 12px 0 4px; color: #111827; }',
      '</style>',
    ]),
    // Skeleton 實作
    J([
      '<!-- 載入中：用「骨架」佔位、比一直轉圈圈更不焦慮（先讓人預期內容長怎樣） -->',
      '<div class="skeleton-card">',
      '  <div class="sk sk-img"></div>',
      '  <div class="sk sk-line"></div>',
      '  <div class="sk sk-line short"></div>',
      '</div>',
      '',
      '<style>',
      '  .sk { background: #e5e7eb; border-radius: 6px;',
      '        animation: pulse 1.2s ease-in-out infinite; }   /* 微微閃 = 載入中 */',
      '  .sk-img  { height: 140px; }',
      '  .sk-line { height: 12px; margin-top: 10px; }',
      '  .sk-line.short { width: 60%; }',
      '  @keyframes pulse { 50% { opacity: .5; } }',
      '</style>',
    ]),
    // Error State 設計
    J([
      '<!-- 錯誤狀態：說「發生什麼事」+ 給「重試」按鈕、別讓用戶卡死 -->',
      '<div class="error-state">',
      '  <div class="icon">⚠️</div>',
      '  <h3>載入失敗</h3>',
      '  <p>網路好像不太穩、請再試一次。</p>',
      '  <button class="btn" onclick="location.reload()">重新載入</button>',
      '</div>',
      '',
      '<style>',
      '  .error-state { text-align: center; padding: 48px 16px; }',
      '  .error-state .icon { font-size: 48px; }',
      '  .error-state h3 { margin: 12px 0 4px; }',
      '  .error-state p  { color: #6b7280; }',
      '</style>',
    ]),
  ],
  "3.13": [ // Toast 設計
    J([
      '<!-- Toast：短暫浮出、幾秒後自動消失、回饋「剛剛那個動作成功了」 -->',
      '<div class="toast toast-success" role="status">✅ 已儲存</div>',
      '',
      '<style>',
      '  .toast {',
      '    position: fixed; bottom: 24px; right: 24px;',
      '    padding: 12px 18px; border-radius: 10px; color: #fff;',
      '    box-shadow: 0 4px 12px rgba(0,0,0,.15);',
      '  }',
      '  .toast-success { background: #16a34a; }',
      '  .toast-error   { background: #dc2626; }',
      '  /* role="status" 讓螢幕報讀器也會念出來、不只用看的 */',
      '</style>',
    ]),
  ],
  "3.14": [ // ARIA labels
    J([
      '<!-- 只有 icon 的按鈕、一定要加 aria-label、否則報讀器只會念「按鈕」兩個字 -->',
      '<button aria-label="關閉視窗">✕</button>',
      '<button aria-label="搜尋">🔍</button>',
      '',
      '<!-- 用圖示表達狀態時、補一段「只給報讀器聽」的文字 -->',
      '<span aria-hidden="true">🔴</span>',
      '<span class="sr-only">離線中</span>',
      '',
      '<style>',
      '  /* sr-only：視覺上看不到、但螢幕報讀器讀得到（無障礙標準寫法） */',
      '  .sr-only {',
      '    position: absolute; width: 1px; height: 1px;',
      '    padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0;',
      '  }',
      '</style>',
    ]),
  ],
};

let raw = fs.readFileSync(FILE, "utf8");
const j = JSON.parse(raw);
const STUB = /```html\s*\n<!--[\s\S]*?程式碼已在內容修正中[\s\S]*?-->\s*\n```/;

let totalReplaced = 0;
for (const lesson of j.lessons) {
  const reps = REPLACEMENTS[lesson.id];
  if (!reps) continue;
  let content = lesson.content;
  let i = 0;
  while (STUB.test(content) && i < reps.length) {
    content = content.replace(STUB, fence(reps[i]));
    i++;
    totalReplaced++;
  }
  if (STUB.test(content)) console.warn(`⚠️ ${lesson.id} 還有 stub 沒被替換（替換了 ${i}/${reps.length}）`);
  if (i !== reps.length) console.warn(`⚠️ ${lesson.id} 期望 ${reps.length} 個、實際替換 ${i}`);
  if (content !== lesson.content) {
    raw = raw.replace(JSON.stringify(lesson.content), JSON.stringify(content));
  }
}

// 驗證沒有殘留 + JSON 合法
JSON.parse(raw);
const remain = (raw.match(/程式碼已在內容修正中/g) || []).length;
fs.writeFileSync(FILE, raw, "utf8");
console.log(`✅ 替換 ${totalReplaced} 個 stub；殘留 ${remain} 個。`);
