// 部落格標章節（林董：跟程式有關的部落格要標章節，細到 ch26.5，可點連到該章節）。
// 對應原則：章級鋪滿(安全)、lesson 級只在標題與某課明確 1:1 才標（不亂標）。
// 寫進 user_blog_articles.chapter_id / lesson_id → 文章頁「相關課程」pill 會顯示並連到該章/該節。
// idempotent：以標題比對更新，可重跑。
// 用法：node scripts/tag-blog-chapters.mjs [--dry]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  const env = {};
  if (existsSync(".env.local")) for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (!m) continue;
    let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}
const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes("--dry");

// [標題關鍵字, chapter_id, lesson_id|null]。關鍵字用文章標題內獨特片段比對。
const MAP = [
  // ── Python 入門 → ch26（lesson 級）──
  ["安裝 Python 與寫下第一支程式", 26, "26.1"],
  ["變數：貼標籤的盒子", 26, "26.2"],
  ["數字與運算：整數、浮點數、餘數", 26, "26.3"],
  ["字串：文字怎麼存", 26, "26.3.5"],
  ["list 清單：一排格子裝東西", 26, "26.4"],
  ["tuple 與 set：不可變與去重", 26, "26.4"],
  ["dict 字典：用鑰匙查值", 26, "26.4"],
  ["if / elif / else：讓程式會判斷", 26, "26.5"],
  ["for 迴圈：重複做同一件事", 26, "26.5"],
  ["while 迴圈與 break / continue", 26, "26.5"],
  ["函式：把步驟打包成一顆按鈕", 26, "26.6"],
  ["參數、回傳值與預設值", 26, "26.6"],
  ["讀寫檔案：把資料存下來", 26, "26.8"],
  ["例外處理 try / except：讓程式不崩", 26, "26.9"],
  ["初學者常犯的 10 個錯", 26, null],
  // ── Python 進階 → ch26（lesson 級）──
  ["型別註記 typing 讓 code 更清楚", 26, "26.12"],
  ["推導式 comprehension：一行寫迴圈", 26, "26.5"],
  ["lambda 與 map / filter / sorted", 26, "26.6"],
  ["裝飾器 decorator 是什麼", 26, "26.11"],
  ["生成器 yield：省記憶體的迭代", 26, "26.11"],
  ["物件導向 class 入門", 26, "26.10"],
  ["繼承與多型", 26, "26.10"],
  ["魔術方法 __init__", 26, "26.10"],
  ["模組、套件與 import", 26, "26.7"],
  ["虛擬環境 venv 與 pip", 26, "26.7"],
  ["好用的標準庫：os / json / datetime", 26, null],
  ["寫出 Pythonic 的 code", 26, null],
  // ── 初學筆記 → ch26 ──
  ["迴圈不可怕", 26, "26.5"],
  ["函式 = 把常用的步驟打包成一顆按鈕", 26, "26.6"],
  ["變數，就是貼了標籤的盒子", 26, "26.2"],
  // ── Python 泛用 / 開發日記 #1 → ch26 章級 ──
  ["用 Python 自動化你每天在做的無聊事", 26, null],
  ["Python 新手最常犯的 5 個錯", 26, null],
  ["開發日記 #1", 26, null],
  // ── 資料處理 → ch27 ──
  ["pandas 入門：資料界的 Excel", 27, "27.4"],
  ["DataFrame 與 Series 基礎", 27, "27.4"],
  ["讀寫 CSV / Excel", 27, "27.4"],
  ["篩選、排序、選欄位", 27, "27.8"],
  ["groupby 分組彙總", 27, "27.8"],
  ["合併資料 merge / concat", 27, "27.8"],
  ["apply 與自訂運算", 27, "27.8"],
  ["樞紐分析 pivot_table", 27, "27.8"],
  ["缺失值處理", 27, "27.20"],
  ["日期時間處理", 27, "27.6"],
  ["numpy 陣列入門", 27, "27.3"],
  ["matplotlib 畫出你的資料", 27, "27.5"],
  // ── 爬蟲 → ch28（開發日記 #2 也是爬蟲）──
  ["requests 入門：抓一個網頁", 28, "28.2"],
  ["BeautifulSoup 解析 HTML", 28, "28.2"],
  ["CSS 選擇器抓到你要的元素", 28, "28.12"],
  ["表單與 POST 請求", 28, null],
  ["分頁爬取與迴圈翻頁", 28, null],
  ["動態網頁與 Selenium", 28, "28.19"],
  ["反爬蟲：User-Agent 與延遲", 28, "28.11"],
  ["直接打 API 更省事", 28, "28.17"],
  ["實戰：爬一個新聞列表", 28, "28.7"],
  ["把爬到的資料存成 CSV", 28, "28.13"],
  ["爬蟲禮貌：robots.txt 與速率", 28, "28.23"],
  ["HTTP 狀態碼與 headers", 28, null],
  ["開發日記 #2", 28, null],
  // ── 機器學習 → ch77 ──
  ["什麼是機器學習（給完全新手）", 77, "77.1"],
  ["特徵與標籤是什麼", 77, "77.3"],
  ["scikit-learn 入門", 77, "77.4"],
  ["實戰：鐵達尼生還預測", 77, null],
  ["特徵工程入門", 77, "77.7"],
  ["過擬合與如何避免", 77, "77.15"],
  ["評估指標：準確率、precision、recall", 77, "77.18"],
  ["KNN 最近鄰", 77, "77.13"],
  ["決策樹與隨機森林", 77, "77.11"],
  ["邏輯回歸：做分類", 77, "77.10"],
  ["線性回歸：預測數值", 77, "77.9"],
  ["訓練集 / 測試集切分", 77, "77.5"],
  // ── 深度學習 → ch78 ──
  ["神經網路的直覺理解", 78, "78.3"],
  ["張量 tensor 是什麼", 78, "78.9"],
  ["建第一個神經網路", 78, "78.10"],
  ["損失函數與優化器", 78, "78.6"],
  ["PyTorch 入門", 78, "78.9"],
  // ── CSS → ch2（章級）──
  ["Flexbox 一次搞懂", 2, null],
  ["RWD 響應式設計", 2, null],
  // ── Debug / 錯誤訊息 → ch71 除錯聖經（章級）──
  ["讀懂錯誤訊息的 SOP", 71, null],
  ["把『看不懂的錯誤訊息』當成尋寶", 71, null],
];

let updated = 0, skipped = 0, notfound = 0, unchanged = 0;
for (const [kw, ch, lesson] of MAP) {
  const { data } = await sb.from("user_blog_articles").select("id,title,chapter_id,lesson_id").eq("is_public", true).ilike("title", `%${kw}%`).limit(2);
  if (!data || data.length === 0) { console.log("⚠️  找不到:", kw); notfound++; continue; }
  if (data.length > 1) { console.log("⚠️  多筆命中(跳過，關鍵字太寬):", kw, "→", data.map((d) => d.title).join(" / ")); skipped++; continue; }
  const a = data[0];
  if (a.chapter_id === ch && (a.lesson_id ?? null) === lesson) { unchanged++; continue; }
  console.log(`  ch${ch}${lesson ? "/" + lesson : ""}  ← ${a.title}`);
  if (!DRY) {
    const { error } = await sb.from("user_blog_articles").update({ chapter_id: ch, lesson_id: lesson }).eq("id", a.id);
    if (error) { console.log("    ❌", error.message); continue; }
  }
  updated++;
}
console.log(`\n📊 ${DRY ? "DRY " : ""}更新 ${updated}、已是最新 ${unchanged}、多筆跳過 ${skipped}、找不到 ${notfound}`);
process.exit(0);
