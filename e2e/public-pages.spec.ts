import { test, expect } from "./fixtures";

// 公開頁面冒煙式點擊：每頁載入不報錯 + 一個關鍵可見元素。
// 純公開流程、不需登入。auth-gated 頁（/me、/store 結帳、/admin）另見檔尾說明、故意跳過。

test("/pricing 顯示免費 / 價格內容", async ({ page }) => {
  await page.goto("/pricing");
  // h1「全部課程 100% 免費」（分段 span）
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/免費/).first()).toBeVisible();
});

test("/blogs 顯示部落格列表或空狀態", async ({ page }) => {
  await page.goto("/blogs");
  await expect(page.getByRole("heading", { name: /部落格/ }).first()).toBeVisible();
  // 有文章卡或「目前還沒有公開部落格」都算頁面正常
  await expect(page.locator("body")).toContainText(/部落格/);
});

test("/forum 討論區載入", async ({ page }) => {
  await page.goto("/forum");
  await expect(page).toHaveTitle(/討論區/);
  await expect(page.locator("body")).toContainText(/討論|看板|發文|貼文|社群/);
});

test("/login 顯示登入表單與按鈕", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /登入/ }).first()).toBeVisible();
  // email 欄位 + 送出按鈕 + 第三方登入（.first()：hydration 可能短暫雙渲染）
  await expect(page.getByPlaceholder("Email").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Google 登入/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^登入$/ }).first()).toBeVisible();
});

test("/leaderboard 排行榜載入", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: /全島排行榜/ })).toBeVisible();
});
