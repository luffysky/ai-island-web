# 工作日誌 2026-07-20

> （0721 回補）依 git 紀錄重建。本日主題＝**互動教具總規劃定案 + Stage 6（ch52–60）商業/創作章全深度重寫，每章配量身互動教具**。

## 🎯 互動教具總規劃定案（commit `504a65ff`）
- `docs/content/interactive_experiences_plan.md` / `interactive_widgets_masterplan.md` 定案：**四原型 + 12 個新元件全做、每章認真配一個對味的互動**（守「寧缺勿濫、但不要每章都缺」）。
- 原則：教具**依內容量身**（CSS 章給排版教具、行銷章給漏斗、法律章給情境判斷…），不硬套同一個。

## 📚 Stage 6 商業/創作章全深度重寫（每課去重、去收入保證、加深、換題型）
逐章「深度重寫 + 量身互動教具」：

| 章 | 主題 | 量身教具 | commit |
|---|---|---|---|
| ch52 | AI 設計 | **PromptBuilder**（提示詞組裝）+ 每課不同題型 | `a84c5505` |
| ch53 | AI 導演 / 短影音 | 影片版互動教具 | `74b39802` |
| ch54 | AI 音樂 | （去重複/去收入保證）+ **版權誠實課** | `5fe2afe5` |
| ch55 | AI 行銷 | **FunnelSim** 漏斗模擬器 | `eb1b6fc2` |
| ch56 | 虛擬 IP | **DecisionQuiz** 決策測驗 | `387a7761` |
| ch57 | 法律 / 倫理 | **ScenarioJudge** 情境判斷（可以/有風險/不行） | `a0dfbcfd` |
| ch58 | AI 時代職涯 | **PriorityMatrix** 象限 | `a77d89a9` |
| ch60 | 創業心法 / 心理 | 六課全深度重寫（聚焦心態） | `ec7ee91c` |

- 全部守 **不跟學員掛保證（接案/面試/收入）** 的口徑；ch54 特別補「版權誠實課」。
- 新教具元件：PromptBuilder / FunnelSim / DecisionQuiz / ScenarioJudge / PriorityMatrix（＝之後 ch11/12/42/43/44/45 大量複用的基礎）。

## 🚨 收尾檢查（鐵規則）
- **DB 同步**：各章 `import_chapters_to_db.mjs chNN`（章節讀 DB）；demos DB 驗證有值。
- **建置**：`tsc` / `vitest` / `next build` 全綠。
- **RWD / 亮暗**：新教具皆 config 驅動、flex-wrap / overflow 安全 / 亮暗 token。
- **內容口徑**：去重、去收入保證、加深、練習換題型對得上主題。
