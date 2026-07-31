# SnowRealm Platform — AI 島這一側的看法

> 建立 2026-07-31。作者：Claude（長期在 **AI 島** 這個 repo 裡幹活的這隻）。
> 讀完 SnowRealmSpace 那四份平台文件（`platform.md`、`SnowRealm-Platform-Planning.md`、
> `SnowRealm-Platform-todo.md`、`SnowRealm-SDK-vs-Platform.md`）後，寫一份**從 AI 島往外看**的補充。
> 那四份是站在 Space／全生態的視角；這份只回答一件事：**「AI 島被點名當一堆能力的收斂種子，那 AI 島自己這棟房子，到底準備好了沒、要先動什麼、要放棄什麼。」**

---

## 一、先說結論

那套大方向我同意，而且沒什麼好吵的：

- **Space 是 Home、不是 Platform 本身**（Apple/Windows 類比對）。
- **`snowrealm-id` 中立 OIDC 發證方**、`identity_links` 綁定、**已驗證 email 只能當輔助不能當唯一依據**——對。
- **共用能力走 HTTP API + 各語言薄 SDK**、**絞殺式收斂而非大爆炸重寫**——對，這條對 AI 島尤其重要，因為 AI 島是 Next.js，很容易誤以為「大家共用一個 npm 就好」，那樣多聞(Python)/YukiBoard(Kotlin) 接不進來。
- **兩個時鐘**（入口耐心、地基趁早收斂）——對，而且我要補一句 AI-島版本的：**AI 島是「地基那個時鐘」裡被指名最多次的零件供應商**，所以 AI 島不能只當旁觀者等平台，它自己得先把要捐出去的零件擦乾淨。

下面全部是「AI 島這棟房子」的實話，不是重複那四份。

---

## 二、AI 島被點名當種子的四件事——我對照過 code，逐項說實話

平台文件把 AI 島列為 **AI Router / Z幣 / Agent / Memory** 的收斂種子。我在這 repo 裡待很久，逐項給你「真的假的」：

### 1. AI Router（`ai-router.ts` + `resolve-usage-ai.ts`）——✅ 真的最成熟，但也最纏
- 真有候選鏈、熔斷、低信心升級、免費優先、BYOK。文件說「最成熟」不是恭維，是事實。
- **但它在 AI 島內部被咬得很深**：`completeForUsage` 被運勢、分身島 agent、創作者島、翻譯、每日晨報…到處呼叫，還綁 `ai_usage_daily` 記帳與 gating。**抽成 HTTP 服務的難點不是 router 本身，是「把這些呼叫點的契約講清楚」**（vision、串流、usage-key、BYOK 這四個介面要先凍結，否則每個消費端各自 fork 回去）。
- 我的建議：**種子選 AI 島的能力、但契約抄 Space `ai-core` 的乾淨介面**（`completeForUsage` 那個最小面）。能力 AI 島強、介面 Space 乾淨，兩邊各取一半。

### 2. Z幣 `coin_transactions`（ADR-003）——✅ 唯一被當「平台貨幣」設計的，但 AI 島是它的重度消費者
- ADR-003 確實把 Z 幣定義成平台經濟、單一單位、冪等訂單、接三個金流。當種子沒問題。
- **風險在消費端不在帳本**：AI 島內部花 Z 幣/賺 Z 幣的地方超多（島經濟 `island-economy`、創作者島 dust、LINE bot 指令、運勢 gating、完課獎勵…）。一旦帳本抽成中央服務，**AI 島就從「自己家的帳本」變成「別人服務的 client」**——跨了行程邊界，冪等就不再是「同一個 DB transaction」保證得了的。**扣款冪等鍵一定要由呼叫方帶、服務端去重**，否則跨網路重試會雙扣。這件事 AI 島現在因為都在同一個 DB 裡、反而還沒被逼著面對。
- AI Dot 帳本文件說「與 Z 幣同一個雙分錄 ledger、兩種帳戶」——同意，但**定價表（一次呼叫扣幾點）是還沒拍板的綠地**，這個沒定，第 1 批就卡住。

### 3. Agent（分身島 `agent_tasks/steps/approvals` + skills/employees/mcp/schedules）——✅ 全生態最大的 agent，但最深綁 AI 島
- 這塊是我親手在建的，我最有資格說：**分身島是七產品裡唯一「像樣的 agent 引擎」**（L1 拆解→L3 反思→L4 技能合成→L5 多代理，還有 bridge/employees/mcp/排程）。當平台 Agent 種子當之無愧。
- **但它跟 AI 島的 DB、Z 幣、AI Router、通路（LINE/TG/Discord）綁死**。要變成「住在 Space、全生態共用的一個 Agent」，等於把引擎跟 AI 島剝離——工程量最大的一塊。
- **這裡有平台文件也點到的撞車**：Space 有自己的 agent-core，AI 島有分身島。**必須現在就拍板「全生態一個 Agent」**，否則兩套 agent 記憶/工具/技能各養一套，之後合併是惡夢。我的票：**一個，引擎用分身島、工具/記憶介面收斂**。

### 4. Memory（`agent_memory` + `ci_memories`／creator-island 語意記憶）——✅ 有現成 pgvector embedding
- AI 島真的有兩套 embedding 記憶（agent 的 + 創作者島的）。當種子可以。
- **但這正好證明「AI 島內部自己就已經 fork 了一次」**——agent 記憶跟創作者島記憶沒共用。所以收斂到平台前，AI 島內部最好先想清楚這兩套要不要先合，別把「內部的分裂」原封不動搬到平台。

---

## 三、AI 島這棟房子最大的一筆「隱藏債」：身份是散的

這是四份平台文件**沒講、但對 AI 島最要命**的一點，我實際數過：

> **AI 島有 181 個 API route 各自呼叫 `auth.getUser()`。**

對照 Space——Space 這個 session 已經把身份收斂成**單一入口** `lib/auth/identity.ts`（ADR-024），未來換 SSO「只改一個檔」。**AI 島沒有這個東西。** 身份讀取散在 181 個地方。

意思是：**就算 `snowrealm-id` 明天上線，AI 島也接不進去**，因為沒有一個 choke-point 可以把「身份來源從 Supabase Auth 換成 SnowRealm SSO」。硬接就是 181 處各改一次。

所以 **AI 島這一側的 day-one prep，不是等平台，是自己先蓋一個 `lib/identity.ts` 把 181 個 `auth.getUser()` 收斂過去**——這件事：
- **完全不需要等 `snowrealm-id`**（兩個時鐘裡「地基趁早收斂」那個，AI 島自己就能動）。
- 做完之後，接 SSO 就從「181 處」變成「1 處」。
- 這正是 Space 已經替自己做完、而 AI 島還沒做的功課。

**這是我認為 AI 島為了平台，第一件該做的事。** 比等 SSO 拍板更早、也不需要任何人拍板。

---

## 四、AI 島要「放棄」什麼（加入平台＝交出主權）

收斂不是只拿好處，是交主權。AI 島要有心理準備放掉三樣本來自己的東西：

1. **自己的會員（Pro）→ SnowRealm+**。AI 島現有付費層要被平台會員取代、不再自己定義 Pro。好處是使用者一張票通吃七產品；代價是 AI 島不再獨佔自己的訂閱收入邏輯。
2. **自己的 auth 當真相 → 只當 SSO client**。Supabase Auth 從「發證方」降級成「本地帳號 + `identity_links` 對應到 snowrealm-id」。（承上，先蓋 `lib/identity.ts` 才有辦法優雅降級。）
3. **自己的 Z 幣帳本 → 平台帳本的一個 client**。AI 島的 `coin_transactions` 是種子沒錯，但「種子」的意思是它會被抽出去變成大家的，AI 島之後是去**呼叫**它，不是自己擁有它。

這三樣都符合平台文件的方向，我只是把「AI 島要交出什麼」講白。**交主權這件事要 Luffy 你點頭，不是工程決定。**

---

## 五、如果由我排 AI 島這側的順序（跟平台的 90 天不衝突、是它的子集）

平台文件的 90 天第一步是「收斂 AI Router → 拍板 SSO → Insight 導引測驗 → Space 寵物 MVP → SnowRealm+」。AI 島這棟房子要配合，我會這樣排（**前兩件不需要等任何人拍板、現在就能做**）：

1. **`lib/identity.ts` 收斂**（181 → 1 個身份入口）。純內部重構、零外部依賴、直接降低未來接 SSO 的成本。← **第一優先**
2. **凍結 AI Router 對外契約**（completeForUsage / 串流 / vision / BYOK 四個介面），讓它「可被抽成 HTTP 服務」——就算還沒真的抽，先把介面收窄，別再讓新功能繞過它。
3. **Z 幣扣款全部走冪等鍵**（呼叫方帶 idempotency key），為「帳本變成跨行程服務」預先鋪路——現在還在同 DB 不痛，抽出去就痛。
4. **分身島 Agent 的工具/記憶介面抽象化**——把「工具怎麼註冊、記憶怎麼讀寫」跟 AI 島 DB 解耦，為「全生態一個 Agent」鋪路。等 Luffy 拍板「一個 Agent」再真的搬。
5. 配合平台：AI 島接共用 AI Router（第二個驗證產品）、Pro → SnowRealm+（先涵蓋 AI 島 + Space）。

> 前 4 件的共同點：**都是 AI 島「內部就能做、且做了會讓未來收斂變便宜」的事**，完全吻合「地基趁早收斂」那個時鐘，不用等入口那個時鐘。

---

## 六、我唯一想提醒 Luffy 的一句

平台文件（尤其 Space 那隻 Claude 寫的）已經把「私密是預設、平台是 opt-in 外層」講得很好。我從 AI 島這側加一句**方向相反的提醒**：

> **AI 島天生就是「公開/多人/成長」那一極**（社群、創作者島、機會島、排行榜、公開作品）。它跟 Space 的「私密親密」是生態的兩端。
> 所以整合時，**不要為了統一，把 AI 島的「熱鬧」跟 Space 的「安靜」抹成同一種溫度。** 平台該讓兩種氣質共存、各自保留，而不是收斂成一個平均值。共用的是**地基**（身份/錢/AI/記憶），不是**氣質**。

—— 地基收斂到底，氣質各自保留。這是我這隻在 AI 島待久了、最不希望在整合中被弄丟的東西。❄️

---

*附：本文所有對 AI 島程式現況的描述（181 個 `auth.getUser()`、ai-router/resolve-usage-ai、coin_transactions、分身島 agent_* 系列表、agent_memory/ci_memories）都是 2026-07-31 當下實地 grep 過的，不是憑印象。若日後這些檔案/表有變，以 code 為準。*
