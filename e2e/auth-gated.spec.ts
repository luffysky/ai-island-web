// 需登入的流程（/me 學習後台、/store 儲值 / 結帳、/admin 後台、每日測驗作答…）
// 一律「跳過」：需要一組 seeded 測試帳號 + storageState，不在此硬編任何帳密。
//
// 之後要啟用時的作法：
//   1. 環境變數帶帳密：E2E_USER / E2E_PASS（放 GitHub secret、別進 repo）。
//   2. 寫 global-setup 用該帳號登入一次、把登入態存成 storageState（e2e/.auth/user.json）。
//   3. playwright.config.ts 加一個 project：use.storageState = 'e2e/.auth/user.json'。
//   4. 把下面 test.skip 拿掉、改斷言登入後才看得到的內容。
//
// 現在對「線上正式站」跑、不建立/污染真實帳號，所以維持 skip。

import { test } from "@playwright/test";

const hasCreds = !!(process.env.E2E_USER && process.env.E2E_PASS);

test.describe("需登入流程（預設跳過、需 E2E_USER/E2E_PASS + storageState）", () => {
  test.skip(!hasCreds, "未提供測試帳號憑證，略過 auth-gated 流程");

  test("/me 學習後台顯示（需登入）", async () => {
    // TODO: 有 storageState 後在此斷言 /me 私有內容
  });
});
