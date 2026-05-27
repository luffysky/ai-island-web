# Discord 「未及時回應」 解法

## 症狀
Discord 跑 `/ai` 顯示「AI-Island 未及時回應」。即使設了 cron keep-warm 也一樣。

## 原因（3 個可能）

Discord 給 interaction ACK 的 **硬性限制 = 3 秒**。超過任一情況都會「未及時回應」：
1. **容器 cold start** — Zeabur 容器 sleep 後、重新冷啟動 Next.js + 載入 module 可能 3-8 秒
2. **keep-warm 不夠頻繁** — 預設 Zeabur 容器 idle ~5 分鐘就 sleep、cron 必須 ≤ 4 分鐘
3. **keep-warm 只 ping 沒預熱重要 module** — 即使 process 在跑、ed25519 key / supabase client 還是 lazy load、第一次真實 interaction 仍冷

## 修法（已 commit）

### Code 端
- `/api/discord-interactions` GET handler 改成主動預熱：
  - 載 ed25519 public key（之前只在第一次 verify 時 lazy load）
  - 建 supabase admin client + 跑 1 個輕量 query 觸發 connection pool
  - touch `decryptKey` import 確保 module cache
- `/api/cron/keep-warm` ping 時帶回 `warmed: [...]` 確認真有預熱

### Zeabur 端（你要做）

**選項 A（推薦）：cron 縮短到 ≤ 4 分鐘**
- cron-job.org 設定 interval = `*/4 * * * *`（每 4 分鐘）
- 不能 5 分鐘以上（Zeabur 容器 5 分鐘 idle 就 sleep）
- 不要選免費 cron-job.org 的 15 分鐘 free tier

**選項 B（最穩）：Zeabur 開 Always-On / 升 Hobby+ plan**
- Zeabur Dashboard → 你的 service → Settings → Lifecycle → 開「Always On」
- 部分 plan 才能用、需付費
- 開了之後容器永不 sleep、cold start 不再是問題

**選項 C：Upstash QStash 取代 cron-job.org**
- Upstash QStash 免費 tier 500 req/天、可 1 分鐘 ping 1 次
- 比 cron-job.org 穩定

## 驗證
1. 等 Zeabur 部署完最新 commit
2. 手動跑：`curl https://ai-island-web.snowrealm.pet/api/discord-interactions`
3. 看回應應該有 `"warmed": ["ed25519_key", "supabase_admin", "ai_crypto"]`
4. 等 cron 跑一次（或手動 `curl https://ai-island-web.snowrealm.pet/api/cron/keep-warm`）
5. 立刻去 Discord 跑 `/ai 你好`、應該秒回 ACK

## 還是不行怎麼辦
1. 看 `/admin/errors` 有沒有 `discord-interactions` 相關 error
2. Zeabur logs 看容器是不是頻繁 restart（可能 OOM）
3. 把 cron interval 縮到 2 分鐘試試
4. 終極：改 Edge runtime（要重寫 ed25519 verify 用 Web Crypto API、且 supabase admin 不能用、要走 REST API、工程量大）
