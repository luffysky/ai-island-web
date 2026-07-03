import { test, expect } from "@playwright/test";

// 語意搜尋流程：/search 打字送出 → 結果區或「找不到」皆算 pass、只要沒炸。
// （語意索引可能還在建、所以「沒找到」也是合法結果、不當失敗。）

test("搜尋頁載入、有搜尋框", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByRole("heading", { name: /語意搜尋/ })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: /搜尋內容/ })).toBeVisible();
});

test("輸入 python 送出，結果區出現（結果或『沒找到』都算過）", async ({ page }) => {
  await page.goto("/search");
  const box = page.getByRole("searchbox", { name: /搜尋內容/ });
  await box.fill("python");
  await box.press("Enter");

  // 送出後網址帶上 q
  await expect(page).toHaveURL(/[?&]q=python/);

  // 兩種合法結局：有結果分組（h2 章節/副本/部落格/論壇）或優雅的「沒找到」空狀態。
  const gotResults = page.getByRole("heading", { level: 2 }).first();
  const emptyState = page.getByText(/沒找到「python」/);
  await expect(gotResults.or(emptyState)).toBeVisible();

  // 沒有整頁崩潰：搜尋框仍在、頁面標題仍在
  await expect(page.getByRole("heading", { name: /語意搜尋/ })).toBeVisible();
});
