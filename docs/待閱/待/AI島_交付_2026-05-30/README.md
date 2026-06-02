# AI 島 v3 — 交付包（2026-05-30）

審查者：Claude（規劃 / 審查）｜執行：雪鑰（Claude 體系）

## 內容

### `報告/`
| 檔案 | 用途 | 建議順序 |
|---|---|---|
| `AI_ISLAND_健檢與漏洞報告_2026-05-30.md` | 全專案健檢 + 安全漏洞，含修復任務單 | **1（先做）** |
| `AI_ISLAND_駭客防禦加固_2026-05-30.md` | 縱深防禦加固（headers/CSP/rate-limit/驗證/bot） | 2 |
| `AI_ISLAND_升級優化建議_2026-05-30.md` | 效能 / bundle / 架構 / 資料層優化 | 3 |
| `AI_ISLAND_新功能建議_2026-05-30.md` | 收尾與變現導向的新功能建議（非開新坑指南） | 4 |

### `src_lib/`（可直接放進 `src/lib/`）
| 檔案 | 用途 | 對應報告 |
|---|---|---|
| `admin-guard.ts` | 共用 `requireAdmin()` / `requireOwner()`，取代散落的 inline 後台 gate | 漏洞報告 P0-2 |
| `with-rate-limit.ts` | 共用 `enforceRateLimit()` + `clientIp()`，自動回 429 | 防禦報告 #2 |
| `validate.ts` | 共用 `parseBody(req, zodSchema)` + `parseQuery()`，自動回 400 | 防禦報告 #3 |

## 雪鑰一條 route 的標準開頭（三個 helper 疊用）
```ts
const gate = await requireAdmin();          // 1. 權限
if (!gate.ok) return gate.response;

const limited = enforceRateLimit({ key: `x:${gate.userId}`, limit: 30, windowMs: 60_000 }); // 2. 速率
if (limited) return limited;

const parsed = await parseBody(req, Schema); // 3. 輸入
if (!parsed.ok) return parsed.response;
```

## 最高優先（跨報告整合）
1. 漏洞 P0-1 UGC XSS 改白名單清洗
2. 漏洞 P0-2 套用 `admin-guard.ts`
3. 防禦 #1 security headers + #3#4 rate limit（套 `with-rate-limit.ts`）
4. 優化 OPT-1 拆 chapters-meta + OPT-2 next.config

## 注意
- 所有「體積 / 效能」結論請以 bundle analyzer + Lighthouse 實測為準。
- CSP 與 rate-limit 數值先寬後緊、在 staging 調，避免誤殺真實使用者。
- 動 DB 的（RLS / migration）先在 staging 跑。
