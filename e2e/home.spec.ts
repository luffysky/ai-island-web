import { test, expect } from "./fixtures";
import { type Page } from "@playwright/test";

// 首頁點擊流程：載入 → 標題/hero → 導覽列有「章節/部落格」→ 點「章節」→ 到 /chapters。
// 桌面與手機（Pixel 5 project）都會跑；手機時導覽列收在漢堡選單裡、先展開。

// 手機版導覽列（md 以下）藏在漢堡選單，桌面版直接顯示。
// 回傳「導覽連結所在的容器」locator，讓後續斷言/點擊兩種版型通吃。
async function openNav(page: Page) {
  const hamburger = page.getByRole("button", { name: /導覽選單/ });
  if (await hamburger.isVisible().catch(() => false)) {
    await hamburger.click();
  }
}

test("首頁載入、hero 可見、標題正確", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/AI 島/);
  // hero 主標語（分段在多個 span，用片語斷言）
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("最難").first()).toBeVisible();
  // 品牌
  await expect(page.getByRole("link", { name: /AI 島/ }).first()).toBeVisible();
});

test("導覽列有 章節 / 部落格，點『章節』進 /chapters", async ({ page }) => {
  await page.goto("/");
  await openNav(page);

  const chaptersLink = page.getByRole("link", { name: "章節" });
  const blogsLink = page.getByRole("link", { name: "部落格" });
  await expect(chaptersLink.first()).toBeVisible();
  await expect(blogsLink.first()).toBeVisible();

  await chaptersLink.first().click();
  await expect(page).toHaveURL(/\/chapters\/?$/);
  await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
});
