# 5 份交付報告 → 整合待辦（2026-06-03 整理）

讀完 `docs/待閱/待/` 的 5 份報告（健檢/防禦/優化/新功能 + AI模型中台規格），整合成一份可執行、跨報告去重的待辦。**依「風險 × CP 值」排序。**

> 交付包附了 3 個現成 helper（`docs/待閱/待/AI島_交付_2026-05-30/src_lib/`）：`admin-guard.ts`、`with-rate-limit.ts`、`validate.ts`——直接放進 `src/lib/` 就能用。

---

## 🔴 P0 — 安全關鍵（先做、CP 值最高）

| # | 任務 | 來源 | 做法重點 |
|---|---|---|---|
| 1 | **UGC XSS 改白名單清洗** | 健檢 P0-1 | `src/lib/rich-html.ts` 的 regex 黑名單換成 `sanitize-html` / `isomorphic-dompurify`，存入時 + 渲染時雙層清；影響 blog/forum/resume 3 個 `dangerouslySetInnerHTML` 頁 |
| 2 | **套 `admin-guard.ts`** | 健檢 P0-2 | 把現成 `requireAdmin()`/`requireOwner()` 放進 `src/lib/`，101 條 `api/admin/*` 的 inline gate 逐條替換 |
| 3 | **security headers + HSTS** | 防禦 #1 | `next.config.mjs` 加 `headers()`（X-Frame-Options/nosniff/Referrer-Policy/HSTS）+ `poweredByHeader:false`。最容易、回報最大 |
| 4 | **CSP（Report-Only 先行）** | 防禦 #2 | 先 `Content-Security-Policy-Report-Only` 收 violation、別直接強制（會打爆 Three.js/GA4） |
| 5 | **rate limit：/v1/chat + 登入/註冊** | 防禦 #3#4 | 套現成 `with-rate-limit.ts`：v1/chat per-key+per-IP、auth 端 per-IP |
| 6 | **RLS 9 張空 policy 逐表確認** | 健檢 P0-3 | 多數維持 deny-all（正確）；`achievements` 補 `SELECT` policy（功能 bug） |

## 🟠 P1 — 重要

| # | 任務 | 來源 |
|---|---|---|
| 7 | 套 `validate.ts`：高風險 API（金流/AI/UGC/admin）全補 zod `parseBody` | 防禦 #3 |
| 8 | Telegram webhook secret 改強制 + fail-closed | 健檢 P1-1 |
| 9 | admin slug 硬編 fallback `console-x7k2` 移除、收斂常數（25 處） | 健檢 P1-2 / 防禦 #5 |
| 10 | 22 條 RLS policy 補 `WITH CHECK` | 健檢 P1-3 |
| 11 | 2 份未完成 migration 改 idempotent（加 `DROP POLICY IF EXISTS`）並套用 | 健檢 P1-4 |
| 12 | 註冊/發文加 Cloudflare Turnstile + 蜜罐欄位 | 防禦 #4 |
| 13 | 金鑰輪替計畫 + v1 API key 一鍵停用/重發按鈕 | 防禦 #6 |

## 🟡 優化（升級報告，部分已做）

| # | 任務 | 狀態 |
|---|---|---|
| 14 | **OPT-2 next.config 加 `optimizePackageImports`** + `poweredByHeader:false` | 待做（零風險瘦身） |
| 15 | **OPT-1 拆 `chapters-meta`**（client 端只 import 輕量 metadata、別把 8.7MB 章節進前端 bundle）| 待做 ⚠️ 注意：這是 **client bundle** 問題，跟我已修的 **DB egress** 是兩件事 |
| 16 | OPT-7 hot-path `select("*")` 改明確欄位 | 🟢 **章節 metas/nav 已做**（egress 優化那次）；其餘列表 API 待做 |
| 17 | OPT-9 公開頁 ISR / 快取 | 🟢 **章節內容已有 cache + file 模式可選**；blog/排行榜待做 |
| 18 | bundle analyzer 裝起來跑基準 → TipTap/recharts/CodeMirror 動態 import | 待做 |
| 19 | OPT-8 RLS `is_admin()` SECURITY DEFINER function + 補 index | 待做 |

## 🟢 林董手動（console / 設定，code 改不了）

- Owner 帳號開 **Supabase MFA / TOTP**（防禦 #5）
- **Cloudflare 擋在 Zeabur 前**（防禦 #9，DDoS/WAF/Bot Fight，CP 值最高的外層）
- GitHub **Dependabot** + Supabase 定期備份
- 金鑰定期輪替（AI_KEY_SECRET / CRON_SECRET / service_role）

---

## 🚀 新功能（收尾與變現，非開新坑）— 報告建議「只做這 3 個」

1. **B1 自動評測 + 綠寶 AI Code Review** — 補學習閉環最後一哩（test cases→pass/fail→XP→AI 點評）。複用 Pyodide/playground/AI pool/gamification。**留存核心。**
2. **B4 可驗證證書（`/verify/[certId]` + QR + LinkedIn 分享）+ 課程市集收尾**（試看/購物車/bundle/優惠碼）。**直接收錢 + 招生漏斗。**
3. **C1 學習社群 / Cohort**（期數制、進度夥伴、組隊 streak/Boss）。**拉完課率、餵 Discord。**

第二批（工程量小 CP 高）：B2 SRS 間隔複習、D2 綠寶每週複習報告、C2 賽季排行榜。
長線先別動：B5 職缺板、D1 Z-coin 跨產品錢包。

---

## 🧠 AI 模型中台升級規格（獨立大專案）

`AI島_AI模型中台升級規格_v1.md`（1603 行）是一套完整的 **AI Router 成本分級中台**：三層模型池（免費/標準/旗艦）、Intent Detection、Policy Engine、Fallback、成本防爆、Z 幣/VIP 經濟、DB schema、實作規格。
- **核心目標**：免費也能一直聊天、但「昂貴智慧」分級收費、避免 API 成本炸裂。
- 現況：站上已有 AI model pool + BYOK + 月配額 + ai_response_cache，是好基礎。
- **建議**：當成獨立 v3→v4 路線圖專案，等上面 P0 安全 + B1/B4/C1 收尾後再啟動。要做時我可依此規格逐章拆 task。

---

## 📌 我的建議順序（給林董）

1. **這週**：P0 #1~#5（XSS + admin-guard + headers + rate-limit）——3 個 helper 都現成、最快擋住風險。
2. **接著**：#14 next.config（零風險瘦身）+ #15 chapters-meta（前端瘦身）。
3. **行有餘力**：新功能 B1（自動評測）——這是留存槓桿最大的。
4. 中台規格 = 長線，獨立排。

> 註：本 session 已順手完成的相關項：DB egress 優化（metas/nav 不拉全文）、ISR/cache 章節內容、章節編號修正、全站 promo 清除、壞檔程式碼重寫。
