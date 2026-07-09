Run npm run test:e2e
  npm run test:e2e
  shell: /usr/bin/bash -e {0}
  env:
    E2E_BASE_URL: https://ai-island-web.snowrealm.pet
> ai-island@2.0.0 test:e2e
> playwright test
Running 34 tests using 2 workers
  -   1 [chromium] › e2e/auth-gated.spec.ts:19:7 › 需登入流程（預設跳過、需 E2E_USER/E2E_PASS + storageState） › /me 學習後台顯示（需登入）
  ✘   2 [chromium] › e2e/chapters.spec.ts:6:5 › 章節列表渲染，含『所有章節』與 lesson 數 (14.0s)
  ✘   3 [chromium] › e2e/chapters.spec.ts:13:5 › 直接進 /chapters/26 看得到章節內容 (24.1s)
  ✘   4 [chromium] › e2e/chapters.spec.ts:6:5 › 章節列表渲染，含『所有章節』與 lesson 數 (retry #1) (12.5s)
  ✘   6 [chromium] › e2e/chapters.spec.ts:21:5 › 從列表點第一張章節卡進入某章 (12.5s)
  ✓   5 [chromium] › e2e/chapters.spec.ts:13:5 › 直接進 /chapters/26 看得到章節內容 (retry #1) (17.9s)
  ✘   7 [chromium] › e2e/chapters.spec.ts:21:5 › 從列表點第一張章節卡進入某章 (retry #1) (11.8s)
  ✘   8 [chromium] › e2e/home.spec.ts:15:5 › 首頁載入、hero 可見、標題正確 (12.1s)
  ✘   9 [chromium] › e2e/home.spec.ts:25:5 › 導覽列有 章節 / 部落格，點『章節』進 /chapters (12.0s)
  ✘  10 [chromium] › e2e/home.spec.ts:15:5 › 首頁載入、hero 可見、標題正確 (retry #1) (14.4s)
  ✘  11 [chromium] › e2e/home.spec.ts:25:5 › 導覽列有 章節 / 部落格，點『章節』進 /chapters (retry #1) (14.5s)
  ✘  12 [chromium] › e2e/public-pages.spec.ts:6:5 › /pricing 顯示免費 / 價格內容 (12.1s)
  ✓  13 [chromium] › e2e/public-pages.spec.ts:13:5 › /blogs 顯示部落格列表或空狀態 (1.8s)
  ✘  15 [chromium] › e2e/public-pages.spec.ts:20:5 › /forum 討論區載入 (11.4s)
  ✘  14 [chromium] › e2e/public-pages.spec.ts:6:5 › /pricing 顯示免費 / 價格內容 (retry #1) (13.6s)
  ✘  16 [chromium] › e2e/public-pages.spec.ts:20:5 › /forum 討論區載入 (retry #1) (11.8s)
  ✘  17 [chromium] › e2e/public-pages.spec.ts:26:5 › /login 顯示登入表單與按鈕 (11.1s)
  ✘  18 [chromium] › e2e/public-pages.spec.ts:35:5 › /leaderboard 排行榜載入 (11.2s)
  ✘  19 [chromium] › e2e/public-pages.spec.ts:26:5 › /login 顯示登入表單與按鈕 (retry #1) (11.9s)
  ✘  20 [chromium] › e2e/public-pages.spec.ts:35:5 › /leaderboard 排行榜載入 (retry #1) (11.8s)
  ✘  21 [chromium] › e2e/rwd.spec.ts:14:5 › 首頁在手機寬度無水平溢出、漢堡選單可達 (13.3s)
  ✘  22 [chromium] › e2e/rwd.spec.ts:26:5 › /chapters 在手機寬度無水平溢出 (13.5s)
  ✘  23 [chromium] › e2e/rwd.spec.ts:14:5 › 首頁在手機寬度無水平溢出、漢堡選單可達 (retry #1) (13.9s)
  ✘  24 [chromium] › e2e/rwd.spec.ts:26:5 › /chapters 在手機寬度無水平溢出 (retry #1) (13.6s)
  ✘  25 [chromium] › e2e/search.spec.ts:6:5 › 搜尋頁載入、有搜尋框 (11.0s)
  ✘  27 [chromium] › e2e/search.spec.ts:6:5 › 搜尋頁載入、有搜尋框 (retry #1) (11.4s)
  ✓  28 [chromium] › e2e/seo.spec.ts:6:5 › /robots.txt 回 200 且含 AI 允許路徑 (687ms)
  ✓  29 [chromium] › e2e/seo.spec.ts:17:5 › /sitemap.xml 回 200 且是 XML (273ms)
  -  30 [mobile] › e2e/auth-gated.spec.ts:19:7 › 需登入流程（預設跳過、需 E2E_USER/E2E_PASS + storageState） › /me 學習後台顯示（需登入）
  ✘  31 [mobile] › e2e/chapters.spec.ts:6:5 › 章節列表渲染，含『所有章節』與 lesson 數 (11.2s)
  ✘  26 [chromium] › e2e/search.spec.ts:12:5 › 輸入 python 送出，結果區出現（結果或『沒找到』都算過） (30.1s)
  ✘  32 [mobile] › e2e/chapters.spec.ts:6:5 › 章節列表渲染，含『所有章節』與 lesson 數 (retry #1) (11.7s)
  ✓  34 [mobile] › e2e/chapters.spec.ts:13:5 › 直接進 /chapters/26 看得到章節內容 (20.6s)
  ✘  33 [chromium] › e2e/search.spec.ts:12:5 › 輸入 python 送出，結果區出現（結果或『沒找到』都算過） (retry #1) (30.5s)
  ✘  35 [mobile] › e2e/chapters.spec.ts:21:5 › 從列表點第一張章節卡進入某章 (11.5s)
  ✘  36 [mobile] › e2e/home.spec.ts:15:5 › 首頁載入、hero 可見、標題正確 (12.4s)
  ✘  37 [mobile] › e2e/chapters.spec.ts:21:5 › 從列表點第一張章節卡進入某章 (retry #1) (12.6s)
  ✘  38 [mobile] › e2e/home.spec.ts:15:5 › 首頁載入、hero 可見、標題正確 (retry #1) (14.1s)
  ✘  39 [mobile] › e2e/home.spec.ts:25:5 › 導覽列有 章節 / 部落格，點『章節』進 /chapters (13.4s)
  ✘  40 [mobile] › e2e/public-pages.spec.ts:6:5 › /pricing 顯示免費 / 價格內容 (12.5s)
  ✘  41 [mobile] › e2e/home.spec.ts:25:5 › 導覽列有 章節 / 部落格，點『章節』進 /chapters (retry #1) (14.6s)
  ✘  42 [mobile] › e2e/public-pages.spec.ts:6:5 › /pricing 顯示免費 / 價格內容 (retry #1) (14.1s)
  ✓  43 [mobile] › e2e/public-pages.spec.ts:13:5 › /blogs 顯示部落格列表或空狀態 (2.1s)
  ✘  44 [mobile] › e2e/public-pages.spec.ts:26:5 › /login 顯示登入表單與按鈕 (11.8s)
  ✘  45 [mobile] › e2e/public-pages.spec.ts:20:5 › /forum 討論區載入 (11.5s)
  ✘  46 [mobile] › e2e/public-pages.spec.ts:26:5 › /login 顯示登入表單與按鈕 (retry #1) (13.4s)
  ✘  47 [mobile] › e2e/public-pages.spec.ts:20:5 › /forum 討論區載入 (retry #1) (12.9s)
  ✘  48 [mobile] › e2e/public-pages.spec.ts:35:5 › /leaderboard 排行榜載入 (11.4s)
  ✘  49 [mobile] › e2e/rwd.spec.ts:14:5 › 首頁在手機寬度無水平溢出、漢堡選單可達 (14.1s)
  ✘  50 [mobile] › e2e/public-pages.spec.ts:35:5 › /leaderboard 排行榜載入 (retry #1) (12.5s)
  ✘  51 [mobile] › e2e/rwd.spec.ts:14:5 › 首頁在手機寬度無水平溢出、漢堡選單可達 (retry #1) (14.8s)
  ✘  52 [mobile] › e2e/rwd.spec.ts:26:5 › /chapters 在手機寬度無水平溢出 (13.8s)
  ✘  53 [mobile] › e2e/search.spec.ts:6:5 › 搜尋頁載入、有搜尋框 (11.0s)
  ✘  54 [mobile] › e2e/rwd.spec.ts:26:5 › /chapters 在手機寬度無水平溢出 (retry #1) (13.8s)
  ✘  55 [mobile] › e2e/search.spec.ts:6:5 › 搜尋頁載入、有搜尋框 (retry #1) (11.6s)
  ✓  57 [mobile] › e2e/seo.spec.ts:6:5 › /robots.txt 回 200 且含 AI 允許路徑 (281ms)
  ✓  58 [mobile] › e2e/seo.spec.ts:17:5 › /sitemap.xml 回 200 且是 XML (481ms)
  ✘  56 [mobile] › e2e/search.spec.ts:12:5 › 輸入 python 送出，結果區出現（結果或『沒找到』都算過） (30.3s)
  ✘  59 [mobile] › e2e/search.spec.ts:12:5 › 輸入 python 送出，結果區出現（結果或『沒找到』都算過） (retry #1) (30.6s)
  1) [chromium] › e2e/chapters.spec.ts:6:5 › 章節列表渲染，含『所有章節』與 lesson 數 ──────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
       6 | test("章節列表渲染，含『所有章節』與 lesson 數", async ({ page }) => {
       7 |   await page.goto("/chapters");
    >  8 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
       9 |   // 「N 章 × 7 大區域、共 M 個 lesson」
      10 |   await expect(page.getByText(/共\s*\d+\s*個\s*lesson/)).toBeVisible();
      11 | });
        at /home/runner/work/ai-island-web/ai-island-web/e2e/chapters.spec.ts:8:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
       6 | test("章節列表渲染，含『所有章節』與 lesson 數", async ({ page }) => {
       7 |   await page.goto("/chapters");
    >  8 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
       9 |   // 「N 章 × 7 大區域、共 M 個 lesson」
      10 |   await expect(page.getByText(/共\s*\d+\s*個\s*lesson/)).toBeVisible();
      11 | });
        at /home/runner/work/ai-island-web/ai-island-web/e2e/chapters.spec.ts:8:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  2) [chromium] › e2e/chapters.spec.ts:21:5 › 從列表點第一張章節卡進入某章 ───────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
      21 | test("從列表點第一張章節卡進入某章", async ({ page }) => {
      22 |   await page.goto("/chapters");
    > 23 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
      24 |   // 章節地圖裡指向 /chapters/<id> 的連結；取第一個真正的章節連結
      25 |   const chapterLink = page.locator('a[href^="/chapters/"]').first();
      26 |   await expect(chapterLink).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/chapters.spec.ts:23:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/chapters-從列表點第一張章節卡進入某章-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/chapters-從列表點第一張章節卡進入某章-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
      21 | test("從列表點第一張章節卡進入某章", async ({ page }) => {
      22 |   await page.goto("/chapters");
    > 23 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
      24 |   // 章節地圖裡指向 /chapters/<id> 的連結；取第一個真正的章節連結
      25 |   const chapterLink = page.locator('a[href^="/chapters/"]').first();
      26 |   await expect(chapterLink).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/chapters.spec.ts:23:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/chapters-從列表點第一張章節卡進入某章-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/chapters-從列表點第一張章節卡進入某章-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/chapters-從列表點第一張章節卡進入某章-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/chapters-從列表點第一張章節卡進入某章-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  3) [chromium] › e2e/home.spec.ts:15:5 › 首頁載入、hero 可見、標題正確 ────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByText('最難').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByText('最難').first()
      18 |   // hero 主標語（分段在多個 span，用片語斷言）
      19 |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    > 20 |   await expect(page.getByText("最難").first()).toBeVisible();
         |                                              ^
      21 |   // 品牌
      22 |   await expect(page.getByRole("link", { name: /AI 島/ }).first()).toBeVisible();
      23 | });
        at /home/runner/work/ai-island-web/ai-island-web/e2e/home.spec.ts:20:46
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/home-首頁載入、hero-可見、標題正確-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/home-首頁載入、hero-可見、標題正確-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByText('最難').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByText('最難').first()
      18 |   // hero 主標語（分段在多個 span，用片語斷言）
      19 |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    > 20 |   await expect(page.getByText("最難").first()).toBeVisible();
         |                                              ^
      21 |   // 品牌
      22 |   await expect(page.getByRole("link", { name: /AI 島/ }).first()).toBeVisible();
      23 | });
        at /home/runner/work/ai-island-web/ai-island-web/e2e/home.spec.ts:20:46
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/home-首頁載入、hero-可見、標題正確-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/home-首頁載入、hero-可見、標題正確-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/home-首頁載入、hero-可見、標題正確-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/home-首頁載入、hero-可見、標題正確-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  4) [chromium] › e2e/home.spec.ts:25:5 › 導覽列有 章節 / 部落格，點『章節』進 /chapters ───────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('link', { name: '章節' }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('link', { name: '章節' }).first()
      29 |   const chaptersLink = page.getByRole("link", { name: "章節" });
      30 |   const blogsLink = page.getByRole("link", { name: "部落格" });
    > 31 |   await expect(chaptersLink.first()).toBeVisible();
         |                                      ^
      32 |   await expect(blogsLink.first()).toBeVisible();
      33 |
      34 |   await chaptersLink.first().click();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/home.spec.ts:31:38
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('link', { name: '章節' }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('link', { name: '章節' }).first()
      29 |   const chaptersLink = page.getByRole("link", { name: "章節" });
      30 |   const blogsLink = page.getByRole("link", { name: "部落格" });
    > 31 |   await expect(chaptersLink.first()).toBeVisible();
         |                                      ^
      32 |   await expect(blogsLink.first()).toBeVisible();
      33 |
      34 |   await chaptersLink.first().click();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/home.spec.ts:31:38
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  5) [chromium] › e2e/public-pages.spec.ts:6:5 › /pricing 顯示免費 / 價格內容 ──────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByText(/免費/).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByText(/免費/).first()
       8 |   // h1「全部課程 100% 免費」（分段 span）
       9 |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    > 10 |   await expect(page.getByText(/免費/).first()).toBeVisible();
         |                                              ^
      11 | });
      12 |
      13 | test("/blogs 顯示部落格列表或空狀態", async ({ page }) => {
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:10:46
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--pricing-顯示免費-價格內容-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--pricing-顯示免費-價格內容-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByText(/免費/).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByText(/免費/).first()
       8 |   // h1「全部課程 100% 免費」（分段 span）
       9 |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    > 10 |   await expect(page.getByText(/免費/).first()).toBeVisible();
         |                                              ^
      11 | });
      12 |
      13 | test("/blogs 顯示部落格列表或空狀態", async ({ page }) => {
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:10:46
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--pricing-顯示免費-價格內容-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--pricing-顯示免費-價格內容-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/public-pages--pricing-顯示免費-價格內容-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/public-pages--pricing-顯示免費-價格內容-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  6) [chromium] › e2e/public-pages.spec.ts:20:5 › /forum 討論區載入 ─────────────────────────────────────
    Error: expect(page).toHaveTitle(expected) failed
    Expected pattern: /討論區/
    Received string:  "Forum | AI Island"
    Timeout: 10000ms
    Call log:
      - Expect "toHaveTitle" with timeout 10000ms
        13 × unexpected value "Forum | AI Island"
      20 | test("/forum 討論區載入", async ({ page }) => {
      21 |   await page.goto("/forum");
    > 22 |   await expect(page).toHaveTitle(/討論區/);
         |                      ^
      23 |   await expect(page.locator("body")).toContainText(/討論|看板|發文|貼文|社群/);
      24 | });
      25 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:22:22
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--forum-討論區載入-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--forum-討論區載入-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(page).toHaveTitle(expected) failed
    Expected pattern: /討論區/
    Received string:  "Forum | AI Island"
    Timeout: 10000ms
    Call log:
      - Expect "toHaveTitle" with timeout 10000ms
        13 × unexpected value "Forum | AI Island"
      20 | test("/forum 討論區載入", async ({ page }) => {
      21 |   await page.goto("/forum");
    > 22 |   await expect(page).toHaveTitle(/討論區/);
         |                      ^
      23 |   await expect(page.locator("body")).toContainText(/討論|看板|發文|貼文|社群/);
      24 | });
      25 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:22:22
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--forum-討論區載入-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--forum-討論區載入-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/public-pages--forum-討論區載入-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/public-pages--forum-討論區載入-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  7) [chromium] › e2e/public-pages.spec.ts:26:5 › /login 顯示登入表單與按鈕 ─────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /登入/ }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /登入/ }).first()
      26 | test("/login 顯示登入表單與按鈕", async ({ page }) => {
      27 |   await page.goto("/login");
    > 28 |   await expect(page.getByRole("heading", { name: /登入/ }).first()).toBeVisible();
         |                                                                   ^
      29 |   // email 欄位 + 送出按鈕 + 第三方登入（.first()：hydration 可能短暫雙渲染）
      30 |   await expect(page.getByPlaceholder("Email").first()).toBeVisible();
      31 |   await expect(page.getByRole("button", { name: /Google 登入/ }).first()).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:28:67
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--login-顯示登入表單與按鈕-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--login-顯示登入表單與按鈕-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /登入/ }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /登入/ }).first()
      26 | test("/login 顯示登入表單與按鈕", async ({ page }) => {
      27 |   await page.goto("/login");
    > 28 |   await expect(page.getByRole("heading", { name: /登入/ }).first()).toBeVisible();
         |                                                                   ^
      29 |   // email 欄位 + 送出按鈕 + 第三方登入（.first()：hydration 可能短暫雙渲染）
      30 |   await expect(page.getByPlaceholder("Email").first()).toBeVisible();
      31 |   await expect(page.getByRole("button", { name: /Google 登入/ }).first()).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:28:67
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--login-顯示登入表單與按鈕-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--login-顯示登入表單與按鈕-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/public-pages--login-顯示登入表單與按鈕-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/public-pages--login-顯示登入表單與按鈕-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  8) [chromium] › e2e/public-pages.spec.ts:35:5 › /leaderboard 排行榜載入 ───────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /全島排行榜/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /全島排行榜/ })
      35 | test("/leaderboard 排行榜載入", async ({ page }) => {
      36 |   await page.goto("/leaderboard");
    > 37 |   await expect(page.getByRole("heading", { name: /全島排行榜/ })).toBeVisible();
         |                                                              ^
      38 | });
      39 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:37:62
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--leaderboard-排行榜載入-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--leaderboard-排行榜載入-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /全島排行榜/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /全島排行榜/ })
      35 | test("/leaderboard 排行榜載入", async ({ page }) => {
      36 |   await page.goto("/leaderboard");
    > 37 |   await expect(page.getByRole("heading", { name: /全島排行榜/ })).toBeVisible();
         |                                                              ^
      38 | });
      39 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:37:62
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--leaderboard-排行榜載入-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--leaderboard-排行榜載入-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/public-pages--leaderboard-排行榜載入-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/public-pages--leaderboard-排行榜載入-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  9) [chromium] › e2e/rwd.spec.ts:14:5 › 首頁在手機寬度無水平溢出、漢堡選單可達 ───────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('button', { name: /導覽選單/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /導覽選單/ })
      18 |
      19 |   const hamburger = page.getByRole("button", { name: /導覽選單/ });
    > 20 |   await expect(hamburger).toBeVisible();
         |                           ^
      21 |   await hamburger.click();
      22 |   // 展開後行動選單裡看得到「章節」
      23 |   await expect(page.getByRole("link", { name: "章節" }).first()).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/rwd.spec.ts:20:27
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('button', { name: /導覽選單/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /導覽選單/ })
      18 |
      19 |   const hamburger = page.getByRole("button", { name: /導覽選單/ });
    > 20 |   await expect(hamburger).toBeVisible();
         |                           ^
      21 |   await hamburger.click();
      22 |   // 展開後行動選單裡看得到「章節」
      23 |   await expect(page.getByRole("link", { name: "章節" }).first()).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/rwd.spec.ts:20:27
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  10) [chromium] › e2e/rwd.spec.ts:26:5 › /chapters 在手機寬度無水平溢出 ─────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
      28 |   await page.waitForLoadState("networkidle").catch(() => {});
      29 |   await assertNoHorizontalOverflow(page);
    > 30 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
      31 | });
      32 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/rwd.spec.ts:30:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/rwd--chapters-在手機寬度無水平溢出-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/rwd--chapters-在手機寬度無水平溢出-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
      28 |   await page.waitForLoadState("networkidle").catch(() => {});
      29 |   await assertNoHorizontalOverflow(page);
    > 30 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
      31 | });
      32 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/rwd.spec.ts:30:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/rwd--chapters-在手機寬度無水平溢出-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/rwd--chapters-在手機寬度無水平溢出-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/rwd--chapters-在手機寬度無水平溢出-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/rwd--chapters-在手機寬度無水平溢出-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  11) [chromium] › e2e/search.spec.ts:6:5 › 搜尋頁載入、有搜尋框 ─────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /語意搜尋/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /語意搜尋/ })
       6 | test("搜尋頁載入、有搜尋框", async ({ page }) => {
       7 |   await page.goto("/search");
    >  8 |   await expect(page.getByRole("heading", { name: /語意搜尋/ })).toBeVisible();
         |                                                             ^
       9 |   await expect(page.getByRole("searchbox", { name: /搜尋內容/ })).toBeVisible();
      10 | });
      11 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/search.spec.ts:8:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/search-搜尋頁載入、有搜尋框-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/search-搜尋頁載入、有搜尋框-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /語意搜尋/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /語意搜尋/ })
       6 | test("搜尋頁載入、有搜尋框", async ({ page }) => {
       7 |   await page.goto("/search");
    >  8 |   await expect(page.getByRole("heading", { name: /語意搜尋/ })).toBeVisible();
         |                                                             ^
       9 |   await expect(page.getByRole("searchbox", { name: /搜尋內容/ })).toBeVisible();
      10 | });
      11 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/search.spec.ts:8:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/search-搜尋頁載入、有搜尋框-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/search-搜尋頁載入、有搜尋框-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/search-搜尋頁載入、有搜尋框-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/search-搜尋頁載入、有搜尋框-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  12) [chromium] › e2e/search.spec.ts:12:5 › 輸入 python 送出，結果區出現（結果或『沒找到』都算過） ───────────────────────
    Test timeout of 30000ms exceeded.
    Error: locator.fill: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for getByRole('searchbox', { name: /搜尋內容/ })
      13 |   await page.goto("/search");
      14 |   const box = page.getByRole("searchbox", { name: /搜尋內容/ });
    > 15 |   await box.fill("python");
         |             ^
      16 |   await box.press("Enter");
      17 |
      18 |   // 送出後網址帶上 q
        at /home/runner/work/ai-island-web/ai-island-web/e2e/search.spec.ts:15:13
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/search-輸入-python-送出，結果區出現（結果或『沒找到』都算過）-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/search-輸入-python-送出，結果區出現（結果或『沒找到』都算過）-chromium/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Test timeout of 30000ms exceeded.
    Error: locator.fill: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for getByRole('searchbox', { name: /搜尋內容/ })
      13 |   await page.goto("/search");
      14 |   const box = page.getByRole("searchbox", { name: /搜尋內容/ });
    > 15 |   await box.fill("python");
         |             ^
      16 |   await box.press("Enter");
      17 |
      18 |   // 送出後網址帶上 q
        at /home/runner/work/ai-island-web/ai-island-web/e2e/search.spec.ts:15:13
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/search-輸入-python-送出，結果區出現（結果或『沒找到』都算過）-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/search-輸入-python-送出，結果區出現（結果或『沒找到』都算過）-chromium-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/search-輸入-python-送出，結果區出現（結果或『沒找到』都算過）-chromium-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/search-輸入-python-送出，結果區出現（結果或『沒找到』都算過）-chromium-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  13) [mobile] › e2e/chapters.spec.ts:6:5 › 章節列表渲染，含『所有章節』與 lesson 數 ───────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
       6 | test("章節列表渲染，含『所有章節』與 lesson 數", async ({ page }) => {
       7 |   await page.goto("/chapters");
    >  8 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
       9 |   // 「N 章 × 7 大區域、共 M 個 lesson」
      10 |   await expect(page.getByText(/共\s*\d+\s*個\s*lesson/)).toBeVisible();
      11 | });
        at /home/runner/work/ai-island-web/ai-island-web/e2e/chapters.spec.ts:8:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
       6 | test("章節列表渲染，含『所有章節』與 lesson 數", async ({ page }) => {
       7 |   await page.goto("/chapters");
    >  8 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
       9 |   // 「N 章 × 7 大區域、共 M 個 lesson」
      10 |   await expect(page.getByText(/共\s*\d+\s*個\s*lesson/)).toBeVisible();
      11 | });
        at /home/runner/work/ai-island-web/ai-island-web/e2e/chapters.spec.ts:8:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/chapters-章節列表渲染，含『所有章節』與-lesson-數-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  14) [mobile] › e2e/chapters.spec.ts:21:5 › 從列表點第一張章節卡進入某章 ────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
      21 | test("從列表點第一張章節卡進入某章", async ({ page }) => {
      22 |   await page.goto("/chapters");
    > 23 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
      24 |   // 章節地圖裡指向 /chapters/<id> 的連結；取第一個真正的章節連結
      25 |   const chapterLink = page.locator('a[href^="/chapters/"]').first();
      26 |   await expect(chapterLink).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/chapters.spec.ts:23:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/chapters-從列表點第一張章節卡進入某章-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/chapters-從列表點第一張章節卡進入某章-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
      21 | test("從列表點第一張章節卡進入某章", async ({ page }) => {
      22 |   await page.goto("/chapters");
    > 23 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
      24 |   // 章節地圖裡指向 /chapters/<id> 的連結；取第一個真正的章節連結
      25 |   const chapterLink = page.locator('a[href^="/chapters/"]').first();
      26 |   await expect(chapterLink).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/chapters.spec.ts:23:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/chapters-從列表點第一張章節卡進入某章-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/chapters-從列表點第一張章節卡進入某章-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/chapters-從列表點第一張章節卡進入某章-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/chapters-從列表點第一張章節卡進入某章-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  15) [mobile] › e2e/home.spec.ts:15:5 › 首頁載入、hero 可見、標題正確 ─────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByText('最難').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByText('最難').first()
      18 |   // hero 主標語（分段在多個 span，用片語斷言）
      19 |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    > 20 |   await expect(page.getByText("最難").first()).toBeVisible();
         |                                              ^
      21 |   // 品牌
      22 |   await expect(page.getByRole("link", { name: /AI 島/ }).first()).toBeVisible();
      23 | });
        at /home/runner/work/ai-island-web/ai-island-web/e2e/home.spec.ts:20:46
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/home-首頁載入、hero-可見、標題正確-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/home-首頁載入、hero-可見、標題正確-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByText('最難').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByText('最難').first()
      18 |   // hero 主標語（分段在多個 span，用片語斷言）
      19 |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    > 20 |   await expect(page.getByText("最難").first()).toBeVisible();
         |                                              ^
      21 |   // 品牌
      22 |   await expect(page.getByRole("link", { name: /AI 島/ }).first()).toBeVisible();
      23 | });
        at /home/runner/work/ai-island-web/ai-island-web/e2e/home.spec.ts:20:46
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/home-首頁載入、hero-可見、標題正確-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/home-首頁載入、hero-可見、標題正確-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/home-首頁載入、hero-可見、標題正確-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/home-首頁載入、hero-可見、標題正確-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  16) [mobile] › e2e/home.spec.ts:25:5 › 導覽列有 章節 / 部落格，點『章節』進 /chapters ────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('link', { name: '部落格' }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('link', { name: '部落格' }).first()
      30 |   const blogsLink = page.getByRole("link", { name: "部落格" });
      31 |   await expect(chaptersLink.first()).toBeVisible();
    > 32 |   await expect(blogsLink.first()).toBeVisible();
         |                                   ^
      33 |
      34 |   await chaptersLink.first().click();
      35 |   await expect(page).toHaveURL(/\/chapters\/?$/);
        at /home/runner/work/ai-island-web/ai-island-web/e2e/home.spec.ts:32:35
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('link', { name: '部落格' }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('link', { name: '部落格' }).first()
      30 |   const blogsLink = page.getByRole("link", { name: "部落格" });
      31 |   await expect(chaptersLink.first()).toBeVisible();
    > 32 |   await expect(blogsLink.first()).toBeVisible();
         |                                   ^
      33 |
      34 |   await chaptersLink.first().click();
      35 |   await expect(page).toHaveURL(/\/chapters\/?$/);
        at /home/runner/work/ai-island-web/ai-island-web/e2e/home.spec.ts:32:35
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/home-導覽列有-章節-部落格，點『章節』進-chapters-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  17) [mobile] › e2e/public-pages.spec.ts:6:5 › /pricing 顯示免費 / 價格內容 ───────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByText(/免費/).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByText(/免費/).first()
       8 |   // h1「全部課程 100% 免費」（分段 span）
       9 |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    > 10 |   await expect(page.getByText(/免費/).first()).toBeVisible();
         |                                              ^
      11 | });
      12 |
      13 | test("/blogs 顯示部落格列表或空狀態", async ({ page }) => {
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:10:46
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--pricing-顯示免費-價格內容-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--pricing-顯示免費-價格內容-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByText(/免費/).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByText(/免費/).first()
       8 |   // h1「全部課程 100% 免費」（分段 span）
       9 |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    > 10 |   await expect(page.getByText(/免費/).first()).toBeVisible();
         |                                              ^
      11 | });
      12 |
      13 | test("/blogs 顯示部落格列表或空狀態", async ({ page }) => {
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:10:46
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--pricing-顯示免費-價格內容-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--pricing-顯示免費-價格內容-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/public-pages--pricing-顯示免費-價格內容-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/public-pages--pricing-顯示免費-價格內容-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  18) [mobile] › e2e/public-pages.spec.ts:20:5 › /forum 討論區載入 ──────────────────────────────────────
    Error: expect(page).toHaveTitle(expected) failed
    Expected pattern: /討論區/
    Received string:  "Forum | AI Island"
    Timeout: 10000ms
    Call log:
      - Expect "toHaveTitle" with timeout 10000ms
        13 × unexpected value "Forum | AI Island"
      20 | test("/forum 討論區載入", async ({ page }) => {
      21 |   await page.goto("/forum");
    > 22 |   await expect(page).toHaveTitle(/討論區/);
         |                      ^
      23 |   await expect(page.locator("body")).toContainText(/討論|看板|發文|貼文|社群/);
      24 | });
      25 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:22:22
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--forum-討論區載入-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--forum-討論區載入-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(page).toHaveTitle(expected) failed
    Expected pattern: /討論區/
    Received string:  "Forum | AI Island"
    Timeout: 10000ms
    Call log:
      - Expect "toHaveTitle" with timeout 10000ms
        13 × unexpected value "Forum | AI Island"
      20 | test("/forum 討論區載入", async ({ page }) => {
      21 |   await page.goto("/forum");
    > 22 |   await expect(page).toHaveTitle(/討論區/);
         |                      ^
      23 |   await expect(page.locator("body")).toContainText(/討論|看板|發文|貼文|社群/);
      24 | });
      25 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:22:22
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--forum-討論區載入-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--forum-討論區載入-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/public-pages--forum-討論區載入-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/public-pages--forum-討論區載入-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  19) [mobile] › e2e/public-pages.spec.ts:26:5 › /login 顯示登入表單與按鈕 ──────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /登入/ }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /登入/ }).first()
      26 | test("/login 顯示登入表單與按鈕", async ({ page }) => {
      27 |   await page.goto("/login");
    > 28 |   await expect(page.getByRole("heading", { name: /登入/ }).first()).toBeVisible();
         |                                                                   ^
      29 |   // email 欄位 + 送出按鈕 + 第三方登入（.first()：hydration 可能短暫雙渲染）
      30 |   await expect(page.getByPlaceholder("Email").first()).toBeVisible();
      31 |   await expect(page.getByRole("button", { name: /Google 登入/ }).first()).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:28:67
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--login-顯示登入表單與按鈕-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--login-顯示登入表單與按鈕-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /登入/ }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /登入/ }).first()
      26 | test("/login 顯示登入表單與按鈕", async ({ page }) => {
      27 |   await page.goto("/login");
    > 28 |   await expect(page.getByRole("heading", { name: /登入/ }).first()).toBeVisible();
         |                                                                   ^
      29 |   // email 欄位 + 送出按鈕 + 第三方登入（.first()：hydration 可能短暫雙渲染）
      30 |   await expect(page.getByPlaceholder("Email").first()).toBeVisible();
      31 |   await expect(page.getByRole("button", { name: /Google 登入/ }).first()).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:28:67
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--login-顯示登入表單與按鈕-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--login-顯示登入表單與按鈕-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/public-pages--login-顯示登入表單與按鈕-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/public-pages--login-顯示登入表單與按鈕-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  20) [mobile] › e2e/public-pages.spec.ts:35:5 › /leaderboard 排行榜載入 ────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /全島排行榜/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /全島排行榜/ })
      35 | test("/leaderboard 排行榜載入", async ({ page }) => {
      36 |   await page.goto("/leaderboard");
    > 37 |   await expect(page.getByRole("heading", { name: /全島排行榜/ })).toBeVisible();
         |                                                              ^
      38 | });
      39 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:37:62
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--leaderboard-排行榜載入-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--leaderboard-排行榜載入-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /全島排行榜/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /全島排行榜/ })
      35 | test("/leaderboard 排行榜載入", async ({ page }) => {
      36 |   await page.goto("/leaderboard");
    > 37 |   await expect(page.getByRole("heading", { name: /全島排行榜/ })).toBeVisible();
         |                                                              ^
      38 | });
      39 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/public-pages.spec.ts:37:62
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/public-pages--leaderboard-排行榜載入-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/public-pages--leaderboard-排行榜載入-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/public-pages--leaderboard-排行榜載入-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/public-pages--leaderboard-排行榜載入-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  21) [mobile] › e2e/rwd.spec.ts:14:5 › 首頁在手機寬度無水平溢出、漢堡選單可達 ────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('button', { name: /導覽選單/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /導覽選單/ })
      18 |
      19 |   const hamburger = page.getByRole("button", { name: /導覽選單/ });
    > 20 |   await expect(hamburger).toBeVisible();
         |                           ^
      21 |   await hamburger.click();
      22 |   // 展開後行動選單裡看得到「章節」
      23 |   await expect(page.getByRole("link", { name: "章節" }).first()).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/rwd.spec.ts:20:27
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('button', { name: /導覽選單/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /導覽選單/ })
      18 |
      19 |   const hamburger = page.getByRole("button", { name: /導覽選單/ });
    > 20 |   await expect(hamburger).toBeVisible();
         |                           ^
      21 |   await hamburger.click();
      22 |   // 展開後行動選單裡看得到「章節」
      23 |   await expect(page.getByRole("link", { name: "章節" }).first()).toBeVisible();
        at /home/runner/work/ai-island-web/ai-island-web/e2e/rwd.spec.ts:20:27
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/rwd-首頁在手機寬度無水平溢出、漢堡選單可達-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  22) [mobile] › e2e/rwd.spec.ts:26:5 › /chapters 在手機寬度無水平溢出 ───────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
      28 |   await page.waitForLoadState("networkidle").catch(() => {});
      29 |   await assertNoHorizontalOverflow(page);
    > 30 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
      31 | });
      32 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/rwd.spec.ts:30:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/rwd--chapters-在手機寬度無水平溢出-mobile/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/rwd--chapters-在手機寬度無水平溢出-mobile/error-context.md
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /所有章節/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /所有章節/ })
      28 |   await page.waitForLoadState("networkidle").catch(() => {});
      29 |   await assertNoHorizontalOverflow(page);
    > 30 |   await expect(page.getByRole("heading", { name: /所有章節/ })).toBeVisible();
         |                                                             ^
      31 | });
      32 |
        at /home/runner/work/ai-island-web/ai-island-web/e2e/rwd.spec.ts:30:61
    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/rwd--chapters-在手機寬度無水平溢出-mobile-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────
    Error Context: test-results/rwd--chapters-在手機寬度無水平溢出-mobile-retry1/error-context.md
    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/rwd--chapters-在手機寬度無水平溢出-mobile-retry1/trace.zip
    Usage:
        npx playwright show-trace test-results/rwd--chapters-在手機寬度無水平溢出-mobile-retry1/trace.zip
    ────────────────────────────────────────────────────────────────────────────────────────────────
  23) [mobile] › e2e/search.spec.ts:6:5 › 搜尋頁載入、有搜尋框 ───────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /語意搜尋/ })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found
    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('heading', { name: /語意搜尋/ })