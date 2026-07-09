import { test, expect } from "./fixtures";

// 章節列表點擊流程：/chapters 有列表 → 點進某章 → 看到 CH 內容 / lesson。
// 內容從 DB 讀（force-dynamic），所以斷言可見文字、不只 status。

test("章節列表渲染，含『所有章節』與 lesson 數", async ({ page }) => {
  await page.goto("/chapters");
  await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
  // 「N 章 × 7 大區域、共 M 個 lesson」
  await expect(page.getByText(/共\s*\d+\s*個\s*lesson/)).toBeVisible();
});

test("直接進 /chapters/26 看得到章節內容", async ({ page }) => {
  await page.goto("/chapters/26");
  // 章節頁標題含「Ch」；lesson 卡或章節標題可見即算內容有渲染
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // 頁面非空：主要內容區塊有渲染
  await expect(page.locator("main").first()).toBeVisible();
});

test("從列表點第一張章節卡進入某章", async ({ page }) => {
  await page.goto("/chapters");
  await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
  // 章節地圖裡指向 /chapters/<id> 的連結；取第一個真正的章節連結
  const chapterLink = page.locator('a[href^="/chapters/"]').first();
  await expect(chapterLink).toBeVisible();
  await chapterLink.click();
  await expect(page).toHaveURL(/\/chapters\/\d+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
