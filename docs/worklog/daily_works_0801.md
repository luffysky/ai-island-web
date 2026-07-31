# 工作日誌 2026-07-31 ～ 08-01

> 待辦主檔：`docs/todo/todo_list_0801.md`（0723→0801 改名）。
> 本段主軸：**全章節教材清晰度審查 + 命理三功能 + 教具大工程起步 + 分身島 Agent 12 個功能 + 平台/規劃文件**。全程 tsc/vitest/next build 綠、批次推送。

---

## A · 全 80 章教材清晰度/正確性審查（林董抓 231 為起點）→ 修 21 處
林董發現 ch26.6 `*args/**kwargs`「收所有」與範例矛盾。6 平行子代理掃 ch01–79 找同類 bug，我**逐條驗證**後修 21 處（分 3 批 push）：
- 殘留作者註記：ch17.9「← wait, user 1 還是 user 3?」+ 竄改資料（總額/累計對不上）
- 算錯的數字（本地驗算）：ch78.4 softmax、ch78.6 CrossEntropyLoss(mean=0.1834 非 0.3133)
- 過時/講反：ch10.8 Next15 fetch 預設改 no-store、ch63.1 GPT-3.5→GPT-5、ch67.3 OWASP 2021→2017
- 技術錯：ch27.3 np.median、ch32.5/32.9 Go slice/goroutine、ch36.1/36.4/36.6 PHP coercive/Eloquent非JOIN/DB::prepared、ch64.4 正則交替
- 內容截斷補完：ch67.1/67.3、ch38.1 速查表；ch66.1 色名色碼不符、ch53.1 模式數
- ch26.6 本體：「所有」→「剩下沒被具名參數拿走的」+ 逐步 callout

## B · 命理三功能（232/233/234）
- **232 訪客免註冊試運勢**：`/api/fortune/public`（零 AI 決定性）+ GuestFortune（選星座看基本運勢→引導註冊解鎖塔羅/八字/梅花）
- **233 八字改生日/時辰 + 幫別人算**：bazi POST 自訂排盤(不動 profile)、12 時辰下拉(記得時辰不記得幾點也能選)
- **234 歷史加八字/梅花**：history 折入 iching、八字單獨命盤卡（修「裸生日」列）
- ＊八字排盤本就是 lunar-javascript 正統演算（準）；限制＝無真太陽時校正、缺時辰缺時柱

## C · 教具大工程（林董定調 §4.1.5：太薄→全站加密）
- 定調規則：程式碼章每課沙盒必備、概念課給對應道具、非程式章給領域道具、建新「玩了就懂」元件。
- 新元件：**RegexTester**、**WritingStudio**(TipTap+引導發部落格)。
- **3 章 100% 覆蓋**（每個沙盒本地/node 實跑驗過）：
  - **ch26** Python 基礎 38 課（27 沙盒+12 教具；含 numpy/pandas/matplotlib/sklearn 可跑沙盒、手刻神經網路前向反向）
  - **ch7** 程式邏輯共通 28 課（17+14；12 JS 沙盒 node 驗 + 11 概念教具）
  - **ch16** 後端全圖 25 課（14+11；Token Bucket/N+1 可跑 + 架構決策教具）

## D · 分身島 Agent — 12 個功能（本段最大宗）
純程式 agent backlog **清空**。全部 tsc/vitest(187)/build 綠、逐一 push、migration 跑上 prod：

**§2.1 引擎**
- 2.1.3 執行中自動建 skill（成功後自動蒸餾建議、💡一鍵採用；`skill-synth.ts` 兩處共用）
- 2.1.4 經理–專才階層（`assignSpecialists` 指派角色、專才聚焦提示）
- 2.1.5 真串流部分成果（平行專才 Promise.race 邊完成邊串流）
- 2.1.6 **OpenAPI→tools**（貼 spec→自動變工具；SSRF 防護+逾時；表 agent_openapi_sources；7 測試；UI 加來源）

**§2.6 AI 員工**
- 2.6.1 自主任務規劃（排程 autonomous：員工依職責+歷史+記憶自己決定做什麼）
- 2.6.2 草稿全文預覽（發文/寄信前看完整內容再批准）
- 2.6.5 Agent 互相共享資料（黑板表 agent_shared_data + data.write/read/list 工具、jsonb 不經 LLM）

**§2.7 省 token/治理**
- 2.7.1 Rule-filter（招呼語/重複任務決定性短路、不燒 LLM）
- 2.7.3 Diff 只讀變動（重讀同資源內容≥90%同→只送差異；6 測試）
- 2.7.4 per-agent 日預算（每員工每日任務上限、防失控燒錢）
- 2.7.12 技能熱門排序
- 2.7.13 教學閉環（/agent 加「🎓 從用到建」5 步畢業路徑卡）
- 2.7.2 RAG 查核為**早已完成**（launchAgentTask 已接 match_agent_tasks + agent_memory）

## E · 平台/規劃文件
- `docs/Platform.md`：AI 島這側對 SnowRealm Platform 整合的看法（含 181 個 auth.getUser() 無單一身份入口的隱藏債）。
- `docs/island/分身島規劃待閱.md`：**四個大工程規劃書**（2.6.4 AI 公司世界觀 / 2.6.6 Workspace Hub / 2.7.7 AI COO / 2.7.9 技能市集）——各給願景/架構/分期/誠實評估 + 綜合優先序（建議先做 2.6.4）+ 三條紅線。

## 🏁 收尾健檢（0801）
- **DB**：本段建的 8 個物件全在（suggested_skill/openapi_sources/shared_data/schedules.autonomous/skills.daily_budget/機會島三表）；SQL 224 表 vs DB 229、**0 缺**。
- **欄位審計**：新 agent 查詢全乾淨（殘留 ✗ 皆 template-literal/URL 誤報）。
- **建置**：tsc ✅ · vitest 187 ✅ · next build ✅。
- **RWD/亮暗**：新 UI（OpenAPI 區/自主 toggle/日預算欄/草稿預覽/教學卡/命理/教具）皆響應式 + 深淺色。**PWA** 未動（manifest/SW 不受影響）。

## ⏳ 下次開工
- 分身島四大工程：依規劃書從 **2.6.4 AI 公司世界觀** 起（地基·CP值最高）。
- 教具大工程續章：ch31/32/47/48… 補沙盒；非程式大章鋪領域道具。
- 每日晨報 §5（整合天氣）、寵物系列 §6（待林董拍板島內新區 or 獨立分站）。
