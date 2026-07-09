// 抓「線上正式站」的公開頁截圖，供補助計畫書第 3 章配圖用（桌機 + 手機各一）。
// 需登入的頁（/me、/island、AI導師、證書）不在此、須本人自行擷取。
// 用法：node scripts/grant-screenshots.mjs
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE_URL || "https://ai-island-web.snowrealm.pet";
const OUT = path.join("docs", "grant", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

// 公開、免登入可截的頁
const PAGES = [
  { name: "01-home", url: "/" },
  { name: "02-chapters", url: "/chapters" },
  { name: "03-chapter-content", url: "/chapters/26" },
  { name: "06-notes-public", url: "/notes/public" },
  { name: "11-forum", url: "/forum" },
  { name: "11-blogs", url: "/blogs" },
];

async function shoot(context, label, viewportTag) {
  const page = await context.newPage();
  const results = [];
  for (const p of PAGES) {
    try {
      await page.goto(BASE + p.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500); // 等動畫/字型/圖穩定
      const file = path.join(OUT, `${p.name}-${viewportTag}.png`);
      await page.screenshot({ path: file, fullPage: true });
      results.push(`✅ ${p.name} (${viewportTag})`);
    } catch (e) {
      results.push(`⚠️ ${p.name} (${viewportTag}): ${String(e.message).slice(0, 80)}`);
    }
  }
  await page.close();
  return results;
}

const browser = await chromium.launch();
const out = [];

// 桌機
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: "ai-island-grant-screenshot" });
out.push(...await shoot(desktop, "desktop", "desktop"));
await desktop.close();

// 手機（Pixel 5）
const mobile = await browser.newContext({ ...devices["Pixel 5"], userAgent: "ai-island-grant-screenshot" });
out.push(...await shoot(mobile, "mobile", "mobile"));
await mobile.close();

await browser.close();
console.log("\n" + out.join("\n"));
console.log(`\n輸出目錄：${OUT}`);
