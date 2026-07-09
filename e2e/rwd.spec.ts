import { test, expect } from "./fixtures";

// RWD：手機寬度下不得有水平溢出，且行動版導覽（漢堡）可達。
// 強制小 viewport → 桌面 project 也會以手機尺寸跑這支（Pixel 5 project 本來就是手機）。
test.use({ viewport: { width: 390, height: 844 } });

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 2,
  );
  expect(overflow, "頁面不應水平溢出（scrollWidth <= innerWidth + 2）").toBe(true);
}

test("首頁在手機寬度無水平溢出、漢堡選單可達", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle").catch(() => {});
  await assertNoHorizontalOverflow(page);

  const hamburger = page.getByRole("button", { name: /導覽選單/ });
  await expect(hamburger).toBeVisible();
  await hamburger.click();
  // 展開後行動選單裡看得到「章節」
  await expect(page.getByRole("link", { name: "章節" }).first()).toBeVisible();
});

test("/chapters 在手機寬度無水平溢出", async ({ page }) => {
  await page.goto("/chapters");
  await page.waitForLoadState("networkidle").catch(() => {});
  await assertNoHorizontalOverflow(page);
  await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
});
