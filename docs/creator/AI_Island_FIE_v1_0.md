# AI Island — Fragment Intelligence Engine (FIE)
## Technical Whitepaper · Version 1.0

> 本文件為 FIE 的官方技術白皮書（v1.0 Research Whitepaper）。
> 正文採理想化（greenfield）設計；每章 Engineering Notes 與附錄 D/E 附「⟢ AI 島現況對照」，誠實標示已實作 vs 尚缺。
> 語言：繁體中文正文 + 英文術語。範例主軸統一為四碎片「高中／夏天／我們／宜蘭」。

---

## 目錄（Table of Contents）

### 章節
- Chapter 0　宣言（Manifesto）
- Chapter 1　Why Current AI Is Shallow（為什麼現在的 AI 很淺）
- Chapter 2　Fragment Philosophy（碎片哲學）
- Chapter 3　Reasoning Layer（推理層）
- Chapter 4　Fragment Intelligence（碎片智能）
- Chapter 5　Fragment Representation（碎片表示模型）
- Chapter 6　Reasoning Pipeline（推理流程）
- Chapter 7　Multiple Narratives（多重敘事）
- Chapter 8　Creator Context（創作者上下文）
- Chapter 9　Case Study（案例研究）
- Chapter 10　Implementation（實作架構）
- Chapter 11　Future（未來方向）

### 附錄
- Appendix A — Glossary（術語辭典）
- Appendix B — Architecture Diagram（架構圖）
- Appendix C — Sequence Diagram（序列圖）
- Appendix D — Data Model（資料模型 JSON Schema）
- Appendix E — REST API Draft（API 草案）
- Appendix F — Future Research（未解問題）
- Appendix G — Comparison（與現有技術比較）

---

# Chapter 0　宣言（Manifesto）

本章確立整份白皮書的立場：Fragment Intelligence Engine（FIE）不是一個更會生成的模型，而是一層在生成之前的理解與推理能力。以下所有章節，都是對本章信念的展開與工程化證明。

## 定位（Positioning）

多數 AI 創作工具遵循同一條路徑：`Prompt → Generation → Result`。這條路徑擅長回答問題，卻不擅長理解創作者。FIE 主張把創作的起點從 Prompt 移回 Fragment，並在生成之前插入一層可解釋的 Reasoning。本章不描述某個既有實作，而是定義理想化的 greenfield 立場；後續章節負責把它拆成 Representation、Reasoning、Candidate、Evidence、Trace 等可實作的層。

## 核心信念（Core Beliefs）

### 一、理解優先於生成（Understanding before Generation）

生成能力的門檻已被大幅拉低：一句 Prompt 就能產出文章、歌詞、小說、程式碼與圖片。但生成能力提升，不代表理解能力同步提升。現有 AI 更像一位知識豐富的續寫者，而不是理解創作者思考過程的共同作者。

FIE 的核心假設是：

> 真正限制 AI 創作品質的，不是模型的生成能力，而是生成之前缺少理解。

因此新的流程是：

```
Fragment
   ↓
Representation    ← 建立可被推理的資料
   ↓
Reasoning         ← 提出多個 Hypothesis
   ↓
Creative Decision ← 創作者選擇方向
   ↓
Generation        ← 只是最後一步
```

生成只是最後一步。理解才是第一步。

### 二、碎片不是 Prompt，而是推理證據（Fragment is Evidence, not Command）

Prompt 是命令，目的是要求 AI 完成一件事。Fragment 不是命令，它是在描述一段曾經存在過的人生。

以貫穿全書的主軸範例四碎片為例：

```
高中
夏天
我們
宜蘭
```

一般 AI 依訓練資料中的共現關係（Co-occurrence）組合，會很快得到「青春、陽光、稻田、夢想、未來」。這些詞都合理，卻沒有回答真正重要的問題：

- **為什麼是宜蘭？** 而不是台北、花蓮？
- **為什麼是高中？** 這個時間點承載了什麼？
- **「我們」是誰？** 朋友、戀人，還是家人？
- **夏天只是季節，還是故事的轉折點？**

AI 知道哪些詞容易一起出現，卻不知道它們為什麼一起出現。FIE 把 Fragment 當作等待推理的 Evidence，先問「為什麼」，再談「寫什麼」。

### 三、AI 提出多個假設，創作者決策（AI proposes Hypotheses, Creator decides）

FIE 不希望 AI 成為創作者。AI 的角色更接近編劇夥伴、世界觀整理者、記憶連結者、靈感推理者。

面對同一組碎片，FIE 不立刻寫，而是先提出多條合理 Hypothesis：

| Hypothesis | 敘事方向 | 隱含情緒 |
|---|---|---|
| H1 | 高中畢業旅行 | 集體、儀式感 |
| H2 | 第一次一起旅行 | 悸動、初次 |
| H3 | 多年後重返宜蘭 | 追憶、物是人非 |
| H4 | 畢業前最後一次相聚 | 離別、珍惜 |

推理完成後，方向交由創作者選擇。AI 提供可能性，不決定唯一答案。這代表 AI 沒有取代創作，而是擴展創作者的可能性。

## The FIE Formula

本白皮書提出核心公式：

```
Story = Fragment + Representation + Reasoning + Creator Context
```

各項的職責：

| 項目 | 職責 | 對應章節主題 |
|---|---|---|
| **Fragment** | 提供素材（記憶、片段、線索） | Fragment Layer |
| **Representation** | 把 Fragment 轉為可被推理的結構化資料 | Representation Layer |
| **Reasoning** | 在證據上建立多個 Hypothesis 與 Confidence | Reasoning Layer |
| **Creator Context** | 注入創作者觀點（Creator DNA / Memory） | Creator Context |
| （Generation） | 只是最後的輸出方式，不在公式核心 | Composition |

缺少其中任何一項，得到的都只是內容生成（Content Generation），而不是創作推理（Creative Reasoning）。

## 七條設計原則（Seven Design Principles）

1. **理解優先於生成。** Understanding 是第一步，Generation 是最後一步。
2. **推理優先於回答。** AI 先思考，不急著給出唯一答案。
3. **碎片不是 Prompt，而是 Evidence。** Fragment 是等待推理的線索，不是待執行的命令。
4. **同一組碎片應產生多條合理敘事。** 單一 Candidate 是缺陷，不是效率。
5. **AI 提供可能性，不決定唯一答案。** AI 輸出 Hypothesis，不輸出裁決。
6. **創作者保有最終決策權。** Reasoning 永遠服務於創作者。
7. **每次創作都應反饋 Creator DNA。** 創作是一個會累積、會演化的閉環。

## Design Goals

本章為何存在？因為若不先在信念層面把「Prompt→Generation」與「Fragment→Reasoning→Generation」的差異釘死，後續所有工程決策都會被無意識地拉回主流生成範式。本章要解決的是三個根本問題：

- **範式問題：** 明確宣告 FIE 屬於「理解層（Understanding Layer）」，而非又一個生成模型；它疊在任何 LLM 之上，不與之競爭。
- **評價問題：** 定義何謂「好」——不是生成得最快，而是理解得最合理。這個判準會反覆用來裁決後續每一章的取捨。
- **角色問題：** 固定 AI 與創作者的分工——AI 提出 Hypothesis，創作者做 Decision。這條界線是整套系統的倫理與產品基石。

## Design Constraints

理想化立場必須受以下約束，否則會退化回一般生成器：

- **Reasoning 必須 Explainable。** 任何 Hypothesis 都要能追溯到具體 Fragment 作為 Evidence；不可解釋的推理等同於黑箱生成。
- **不能只靠 Prompt 硬塞。** 把碎片串成一句長 Prompt 丟給 LLM 續寫，不算 FIE——那只是把理解責任推回模型。理解必須發生在生成之前、且結構外顯。
- **必須保留多個 Candidate。** 系統不得在內部偷偷收斂到單一答案；多假設是硬性契約，見原則 4。
- **創作者可否決。** 任何推理結果都是提案（Proposal），系統不得將其視為既成事實直接生成。
- **Missing Fragment 要被承認。** 當資訊不足（例如「我們」未指明關係），系統必須顯性標記缺口與 Confidence，而非用最高共現詞悄悄補上。

## Engineering Notes

- **理解層與生成層要解耦。** Reasoning 的輸出應是結構化的 Hypothesis 物件（帶 Evidence、Confidence、Weight），而不是自然語言段落。讓 Composition 階段去消費結構，而不是解析散文。
- **Prompt 只是傳輸格式，不是理解本身。** 即使底層仍呼叫 LLM，也要把「推理狀態」保存在系統資料模型裡，而不是留在對話上下文中——否則無法做 Trace、無法重放、無法回饋 DNA。
- **避免共現陷阱。** 工程上最容易的捷徑就是讓模型直接聯想，這會系統性地產出模板化結果。要在架構層強制「先偵測關係、再生成」，否則原則 1 只會停留在文件裡。
- **多 Candidate 有成本。** 生成 N 條假設會放大 token 與延遲成本，需要在後續章節用 Confidence 排序與早停（early-stop）控制，但不可用「省成本」當藉口退回單一答案。

⟢ **AI 島現況對照**

- **已實作：** `ci_fragments`（含 `embedding vector(1536)`）已把碎片存為可檢索資料；`ci_surprising_pairs`（意外配對）與 `ci_related_fragments` 已在做「關係優先於生成」的雛形；`analyzeDNA → ci_creator_dna` 已提供 Creator Context；synthesize / evolve / compose / transcreate 等 agents 已覆蓋「凝聚—演化—編織」流程；`ci_memories` 已能把記憶注入 prompt；`ci_agent_runs` 已是 Reasoning Trace 的雛形。
- **尚缺：** 正式的、與生成解耦的 **Reasoning Layer**；Fragment 的分層 **Representation**；多 **Candidate + Confidence** 排序；完整可追溯的 **Reasoning Trace**；**Missing Fragment** 偵測；以及 Familiar / Adjacent / Exploratory 三種推理模式的正式區分。目前的推理主要「內含」在各 agent 的 prompt 中，尚未抽為獨立、可解釋、可重放的層。

## Failure Cases

FIE 並非萬能，以下情況需要人工介入或明確降級：

- **碎片過少或過於抽象。** 只給「夏天」一個詞時，任何 Hypothesis 都近乎猜測；此時系統應坦承 Confidence 過低、請創作者補碎片，而非硬編故事。
- **創作者意圖與最高 Confidence 假設衝突。** 系統推出「畢業旅行」，但創作者心中其實是「一場沒去成的旅行」。FIE 只能提案，最終仍需創作者否決與導正。
- **高度私密或反常識的關聯。** 「宜蘭」對某位創作者代表喪禮而非青春——這類個人化語義不存在於共現統計中，需靠 Creator Context 累積，冷啟動時必然失準。
- **多假設淪為換句話說。** 若 N 條 Candidate 其實語義雷同，等於沒有提供真正的選擇，需要人工或機制檢查假設間的差異度（diversity）。

## Trade-offs

- **Fragment vs Prompt：** 選 Fragment。Prompt 把所有想法壓縮進一次輸入，逼創作者在思考成形前先下命令；Fragment 允許「先蒐集、後推理」，貼近真實創作流程。代價是系統更複雜、需維護碎片狀態。
- **Multiple Candidate vs Single Candidate：** 選 Multiple。單一答案效率高、成本低，但抹除了創作者的選擇權，違反原則 5。多假設換來成本與延遲，需靠 Confidence 排序控管。
- **Explainable Reasoning vs Pure Generation：** 選 Explainable。純生成更流暢，但無法回答「為什麼」，也無法回饋 DNA。FIE 寧可犧牲部分流暢度，換取可追溯的 Reasoning Trace。
- **Memory / Stateful vs Stateless：** 選 Stateful。無狀態呼叫簡單且易水平擴展，但無法累積 Creator DNA、每次都從零理解創作者。FIE 接受狀態管理與隱私成本，以換取「越用越懂你」。
- （Graph vs Tree 等更細的結構取捨留待 Reasoning 章節展開，本章僅確立「保留多路徑、不早收斂」的原則。）

## Examples

**範例一：主軸四碎片（高中／夏天／我們／宜蘭）。** 一般路徑輸出「夏天陽光灑落，我們奔跑在宜蘭稻田，青春永遠不會結束」——合理但空泛。FIE 先產出 H1–H4 四條假設（畢業旅行／第一次同遊／多年後重返／畢業前最後相聚），標記「我們」關係為 Missing Fragment、Confidence 偏低，再交由創作者選擇 H3「多年後重返宜蘭」，後續生成才帶著「物是人非」的張力，而非泛泛青春。

**範例二：補入第五碎片「一張沒寄出的明信片」。** 新 Evidence 進來後，H3 的 Confidence 上升、H1 下降——因為「沒寄出的明信片」與「重返、遺憾」高度契合。這展示 Fragment 作為 Evidence 如何動態改寫 Hypothesis 排序，而 Prompt 式輸入無法表達這種增量推理。

**範例三：跨碎片的意外配對。** 創作者素材庫中另有「祖母的收音機」與「宜蘭」兩個看似無關的碎片。系統偵測到一個 surprising pair：宜蘭的夏天＝小時候在祖母家聽收音機。FIE 把它作為一條低 Confidence 但高新穎度的 Adjacent Hypothesis 提出，讓創作者決定是否採用——這是共現統計不會給出的連結。

## Counter Example

若不用 FIE，一般 AI 的路徑是：

```
Fragment → Generation
```

把「高中、夏天、我們、宜蘭」直接餵給模型續寫，得到「青春、陽光、夢想」。差別在於：

- **沒有 Reasoning。** 模型跳過了「為什麼是宜蘭、我們是誰」的推理，直接輸出最高共現詞。
- **沒有 Candidate。** 只有一條敘事，創作者沒有選擇，只能接受或重生成（re-roll）。
- **沒有 Creator Context。** 輸出對任何人都一樣，缺乏創作者個性——它反映的是訓練資料的平均值，不是這位創作者的人生。
- **不可解釋、不可回饋。** 沒有 Trace 可追溯，也沒有結構能回寫 Creator DNA，系統永遠學不會這位創作者。

這些內容沒有錯，但缺乏推理，因此也缺乏創作者個性。FIE 的存在，就是把這條被跳過的推理旅程重新放回創作的正中央：

> 碎片不是用來生成內容。碎片，是用來推理故事。

---

# Chapter 1　Why Current AI Is Shallow（為什麼現在的 AI 很淺）

本章的目的不是抱怨當前 AI 不夠強，而是精確定位它「淺」在哪一層。結論先講：問題不在 Generation 的能力，而在 Generation 之前那一段被省略的理解過程——當代創作型 AI 用 Co-occurrence Completion 冒充理解，用 Prompt 壓縮掉思考，並且沒有留下任何 Reasoning Trace 供人檢視。

---

## 淺的定義（What "Shallow" Actually Means）

「淺」在本白皮書中是一個精確的技術判斷，不是修辭。一個系統若滿足以下三條，即被判定為 shallow：

1. 它能**完成文字**（complete text），但不能**完成故事**（complete a story）——輸出在語言層合理，在語意層與創作者無關。
2. 它的推理鏈長度趨近於零：從輸入到輸出之間，沒有可辨識的 Representation → Reasoning 階段。
3. 它無法回答「為什麼是這個輸出，而不是另一個」——因為決策過程本身沒有被物化（materialized）。

當前主流創作流程正好三條全中：

```
Prompt ──▶ LLM ──▶ Generation
```

這條管線之所以「快」，正是因為它把理解外包給了統計。它跳過了理解，直接抵達語言。速度是省略換來的。

---

## Co-occurrence Completion 不等於理解（Co-occurrence Is Not Understanding）

給定本白皮書的主軸四碎片：

```
高中    夏天    我們    宜蘭
```

一個典型 LLM 幾乎必然滑向：

```
高中 ──▶ 青春
夏天 ──▶ 陽光
宜蘭 ──▶ 稻田
我們 ──▶ 夢想
```

這個補全**看起來很懂**，但它的來源不是理解，而是語料庫裡「高中」與「青春」的高共現機率。模型在做的事，本白皮書命名為：

> **Co-occurrence Completion（共現補全）**：以 token 級的統計鄰接關係，逐步填補下一個最可能的詞，而不對輸入之間的**語意角色**與**因果結構**做任何區分。

理解與共現補全的差異，可以用「模型對這四個碎片問了什麼問題」來對照：

| 維度 | Co-occurrence Completion | 真正的 Reasoning |
|------|--------------------------|------------------|
| 主題（Theme） | 不區分，四個碎片權重齊平 | 判定「我們」是主題，其餘是背景 |
| 角色（Role） | 全部視為關鍵詞 | 區分 subject / setting / mood |
| 因果（Causality） | 不建立 | 建立「夏天 × 宜蘭 → 一段限定時空的關係」 |
| 巧合 vs 必然 | 無法分辨 | 標記哪些配對是 surprising、哪些是慣性 |
| 缺失（Missing） | 不知道缺什麼 | 偵測「缺一個衝突 / 一個結束的理由」 |

共現補全能寫出通順的段落，卻無法回答「為什麼**這位**創作者會把這四個碎片放在一起」。它完成了語言，沒完成故事。

---

## 壓縮問題（The Compression Problem）

第二層淺，來自輸入端的資訊坍縮。創作者腦中真正存在的是一個高維度狀態：

```
回憶 ─ 情緒 ─ 人物 ─ 對話 ─ 世界觀 ─ 時間跨度
        （創作者的內在狀態，維度極高）
                    │
                    ▼   壓縮（lossy）
              「寫一個高中夏天在宜蘭的故事」
                    │
                    ▼
                  LLM
```

Prompt 是一次**有損壓縮**（lossy compression）。創作者被迫把一個高維狀態編碼成一句話，AI 接收到的是**壓縮結果**，而不是**思考過程**。關鍵損失發生在生成之前——在模型寫下第一個字之前，大部分個人化的創作資訊就已經在編碼階段丟失了。

這解釋了一個常見現象：作品「看起來很好，卻記不住」。不是模型不夠大，而是它從一開始拿到的就是被抽乾的骨架。加長 Prompt 只是提高壓縮碼率，並不改變「先壓縮、後理解」的錯誤順序。FIE 的立場是反過來：**先展開（Fragment），再表示（Representation），再推理（Reasoning），Prompt 只是推理完成後的其中一種輸出表示，而不是起點。**

```
生活 ──▶ Fragment ──▶ Representation ──▶ Reasoning ──▶ Generation
                                                （Prompt 是此處的一種投影）
```

---

## 生成快於理解（Generation Outruns Understanding）

第三個症狀是時序倒置。當前流程幾乎是：

```
Fragment ──▶ Create ──▶ 作品
```

AI 太早開始生成。真正應該**先發生**的一連串判斷被跳過了：

- 找主題（哪個碎片是核心？）
- 找主角（誰在這個故事裡有能動性？）
- 找時間軸（這四個碎片橫跨多久？）
- 找衝突（沒有衝突就只是風景描寫）
- 找缺失資訊（Missing Fragment：故事缺一個結束的理由）

生成應該是**最後一步**，而現在它是**第一步**。系統把「快」當成優點，但在創作場景，過早生成等於過早鎖定——它在還沒理解創作者之前，就用一個統計最安全的版本填滿了空白。

---

## 缺少 Reasoning Trace（The Missing Reasoning Trace）

第四層、也是最隱蔽的一層淺：即使輸出還不錯，**決策過程消失了**。生成完成後，系統無法回答：

- 為什麼這樣寫？（Why this）
- 還有哪些可能？（What else）
- 哪一條故事線被考慮過但沒被採用？（Rejected candidates）

一個沒有 Reasoning Trace 的系統，本質上是不可檢視、不可干預、不可累積的。創作者無法回頭修改「決策」，只能重新擲骰子（re-roll）。這使得每一次生成都是一次性的，無法沉澱成 Creator DNA。**可回溯的推理路徑，是理解與生成之間唯一可審計的證據。** 缺了它，「AI 理解了創作者」這句話就永遠無法被驗證，只能被相信。

---

## Design Goals

這一章之所以存在，是為了在整本白皮書動工之前，先把「問題」釘死，避免後續章節去優化一個錯誤的目標。它要確立四件事：

1. **重新定位瓶頸**：讓讀者接受「限制不在 Generation，而在 Generation 之前的理解層」。若這一步不成立，後面所有 Reasoning Layer 的設計都失去動機。
2. **命名而非抱怨**：把模糊的「AI 沒靈魂」轉譯成三個可攻擊的技術對象——Co-occurrence Completion、Compression、Missing Trace。能命名，才能設計反制。
3. **建立主軸範例**：用「高中 / 夏天 / 我們 / 宜蘭」作為全書貫穿的基準測資（benchmark），讓抽象論述隨時可被具體驗證。
4. **反對「加大就會好」的預設**：明確主張下一代系統應投資結構（Fragment / Representation / Reasoning / Evidence / Creator Context），而不是投資 Prompt 長度或模型參數。

---

## Design Constraints

本章確立的問題，同時對後續解法施加了不可違反的約束：

- **Reasoning 必須 Explainable**：任何補救方案若無法產出可讀的 Reasoning Trace，就沒有解決「缺 Trace」這個問題，只是換一個黑箱。
- **不能只靠 Prompt**：解法不得把理解重新塞回 Prompt（例如更長的 system prompt、更多 few-shot）。那只是把壓縮問題偽裝掉，維度損失依舊發生在生成前。
- **不能以共現冒充推理**：Representation 必須顯式標記碎片的 role / causality / surprise，否則系統仍在做 Co-occurrence Completion，只是包裝更精緻。
- **理解先於生成的時序不可逆**：架構必須在 Generation 前插入一個獨立、可停下、可檢視的 Reasoning 階段，而非在生成過程中「順便」推理。
- **可證偽**：每一個「AI 理解了創作者」的宣稱，都必須對應到 Trace 中一段可被創作者否決的 Hypothesis + Evidence。

---

## Engineering Notes

工程上，把「理解層」做進現有生成管線，有幾個反覆出現的陷阱與取捨：

- **不要把 Reasoning 實作成更長的 Prompt**。最誘人的捷徑是「叫模型先自己想一想再寫」（chain-of-thought inline）。它偶爾改善品質，但推理仍是一次性、埋在生成上下文裡、無法被外部檢視或儲存——Trace 依然沒有被物化。Reasoning Layer 必須是**獨立階段**，輸出結構化的 Representation 與 Candidates，而不是模型腦內獨白。
- **共現不是敵人，是預設**。LLM 的共現能力是廉價且有用的候選來源；工程重點不是消滅它，而是在其上**加一層判別**：哪些配對是慣性（高中→青春），哪些是 surprising（宜蘭→某段只屬於這位創作者的記憶）。把慣性配對降權，把意外配對升權。
- **偵測 Missing Fragment 比生成更難**。生成是「補上已有的」，偵測缺失是「指出不存在的」。後者需要對故事完整性（主題/衝突/收束）有結構性期望，這是純語言模型最弱的地方，通常需要顯式規則或 schema 輔助。
- **Trace 的儲存成本是真實取捨**。保留每次的 candidates、rejected paths、confidence，會顯著放大寫入量與儲存。取捨點在於：Trace 是 Creator DNA 的原料，短期看是成本，長期看是唯一能讓系統「認識這位創作者」的資產。建議至少保留被採用路徑 + top-k 被否決路徑，而非全量。

⟢ **AI 島現況對照**

- **已實作**：`ci_fragments`（含 `embedding vector(1536)`）已把碎片向量化，具備關聯的物理基礎；`ci_surprising_pairs` 已經在做「意外配對」偵測，正是本章「區分慣性 vs surprising」的雛形；`ci_related_fragments` 提供碎片間關聯；`analyzeDNA → ci_creator_dna` 已把 Creator DNA 從統計往上抽一層；`ci_memories` 已能把記憶注入 prompt；`ci_agent_runs` 已是 execution trace 的雛形。
- **尚缺**：獨立的 **Reasoning Layer**（目前仍偏 Fragment → Create → 生成，理解層沒有被物化成一個階段）；正式的 **Reasoning Trace**（`ci_agent_runs` 記的是執行過程，不是「被否決的故事線」與 confidence）；**Missing Fragment 偵測**；多 **Candidate + Confidence 排序**。換言之，AI 島已經有「理解的原料」，但還沒有「理解這個動作」的獨立產物。

---

## Failure Cases

本章的診斷本身也有邊界，誠實列出 FIE 在這些情況下同樣做不好、需要人工介入：

- **碎片本身就是慣性**：若創作者提供的四個碎片彼此毫無張力（例如「咖啡 / 早晨 / 溫暖 / 放鬆」），系統再怎麼推理也只能得到慣性故事——沒有 surprising pair 可升權。此時需要人工提示補一個異質碎片。
- **創作者意圖與碎片相反**：碎片寫「夏天」，但創作者真正想寫的是「那個夏天之後就再也沒有夏天」。這種反諷性意圖無法從碎片表面推出，需要創作者顯式標記或人工修正 Hypothesis。
- **Missing Fragment 偵測誤報**：系統判定「缺一個衝突」而主動追問，但創作者要的正是一篇無衝突的氛圍散文。過度推測（over-inference）會變成打擾，需人工關閉。
- **Trace 過長導致不可讀**：當 candidates 爆炸，Reasoning Trace 本身變成新的黑箱。可解釋性有其自身的複雜度上限，需要人工設計呈現層級。

---

## Trade-offs

本章的主張，等於在幾個架構岔路上明確選邊。逐一交代為何選 A 不選 B：

- **Fragment First vs Prompt First**：選 Fragment。Prompt 是有損壓縮，把理解推遲到生成後就無法補救；Fragment 保留高維狀態，代價是流程更長、更慢。我們用速度換理解。
- **Multiple Candidates vs Single Output**：選多 Candidate + Confidence。單一輸出快且乾淨，但它把「還有哪些可能」永久刪除，等於預先剝奪創作者的決策權。多候選的代價是排序與呈現成本。
- **Memory vs Stateless**：選有記憶（Creator Context / DNA 參與推理）。Stateless 每次都公平但也每次都陌生；有記憶才能讓「同一組碎片、不同創作者、不同故事」成立，代價是隱私與儲存負擔。
- **Explicit Reasoning Layer vs Inline Chain-of-Thought**：選獨立階段。Inline CoT 便宜、無需改架構，但推理不可儲存、不可檢視、不可累積；獨立層貴，但唯一能產出可審計的 Trace。
- **Graph vs Tree（碎片關聯結構）**：傾向 Graph。故事中的碎片關係是多對多、可回指的（「我們」同時連向「高中」與「宜蘭」），Tree 會強迫單一父節點而失真；代價是 Graph 上的推理與呈現更難收斂——這一取捨在後續章節展開。

---

## Examples

**Example 1 — 主軸四碎片的兩種對待**
輸入 `高中 / 夏天 / 我們 / 宜蘭`。
- Co-occurrence Completion 輸出：青春、陽光、稻田、夢想——通順，但可以套在任何人身上。
- Reasoning-first 期望輸出：判定「我們」為主題（一段關係），「高中 × 夏天」界定其**時間限定性**，「宜蘭」是使這段關係得以發生的 setting，並偵測到 Missing Fragment：缺一個「這段關係如何結束」的碎片。故事因此有了張力，而非風景。

**Example 2 — 壓縮損失的具體樣貌**
創作者腦中：「宜蘭是外婆家，那年夏天是最後一次全家到齊。」
壓縮成 Prompt：「寫一個高中夏天在宜蘭的溫馨故事。」
生成結果會很溫馨——但「最後一次」這個真正的情感核心，在編碼階段就已丟失。AI 沒有寫錯，它只是從未拿到那個資訊。

**Example 3 — 缺 Reasoning Trace 的代價**
兩位創作者用同一組碎片各生成一篇。一週後想比較「當初為什麼一個寫成喜劇、一個寫成離別」。在無 Trace 的系統中，這個問題無法回答——決策已蒸發，只剩結果。在有 Trace 的系統中，可回放：喜劇版把「我們」的 confidence 綁在群體上，離別版把它綁在「即將分離的個體」上——差異可被指認、可被學習成 Creator DNA。

---

## Counter Example

如果**不使用** FIE，一個一般 AI 面對 `高中 / 夏天 / 我們 / 宜蘭` 會怎麼做？

```
使用者輸入四個詞
    │
    ▼
拼成一句 Prompt：「以高中、夏天、我們、宜蘭寫一篇故事」
    │
    ▼
LLM 依 token 共現機率直接生成
    │
    ▼
輸出一篇通順、溫馨、關於青春的散文
    │
    └── 無 Representation：四個詞權重齊平，沒有主題判定
    └── 無 Candidate：只有一個版本，其他可能性被靜默丟棄
    └── 無 Missing 偵測：不知道故事缺一個收束
    └── 無 Trace：問「為什麼這樣寫」只能重擲
```

差在哪：一般 AI 的整條管線只有一個階段（生成），理解被外包給統計、被壓縮在輸入端、被遺忘在輸出後。它的產物是**一篇文章**。FIE 的產物是**一次可檢視、可修改、可累積的創作決策**，文章只是這個決策的其中一種投影。當代 AI 的淺，不是因為它寫得不好，而是因為在它寫下第一個字之前，理解這件事根本沒有發生過。

---

# Chapter 2　Fragment Philosophy（碎片哲學）

本章定義 FIE 的最小推理單位：Fragment。它主張 Fragment 不是 Prompt、不是資料列，而是創作者留下的 Creative Evidence——一段尚未完成、但可被反覆推理的思考。整套 FIE 的行為，都建立在「如何看待一顆 Fragment」這個決定之上。

## 何謂 Fragment（What Is a Fragment）

Fragment 不是 FIE 發明的資料型態。真正的差異在於**如何對待它**：

- **Prompt** 的目的是要求模型「現在完成一件事」。它描述需求、觸發一次生成、然後結束。
- **Fragment** 的目的是保存「一段尚未完成的思考」。它不要求完成，它保留可能性。

因此 Fragment 可以是任何尚未形成完整作品的資訊——一句對話、一個畫面、一個地點、一段旋律、一種味道、一種情緒、一個問題、一個夢境。它的價值不在於「內容本身有多完整」，而在於「未來能支持哪些推理」。

本章用四顆貫穿全書的範例 Fragment：

```
高中    夏天    我們    宜蘭
```

單獨看，它們是四個詞。FIE 關心的不是這四個詞，而是它們之間能長出什麼。

## Fragment 是 Creative Evidence（Fragment as Evidence）

FIE 對 Fragment 的核心定義：

> Fragment 是創作者留下的創作證據（Creative Evidence）。

這裡刻意借用司法/科學的 Evidence 語意。Evidence 有三個性質，恰好對應 FIE 的設計：

| Evidence 性質 | 對應到 Fragment |
|---|---|
| Evidence 不直接下結論，它「支持」結論 | Fragment 不是故事，它支持故事 |
| 同一份 Evidence 可支持多個假設 | 同一顆 Fragment 可參與多個作品 |
| Evidence 需要被 Reasoning 串起來才有意義 | Fragment 的意義由 Reasoning Layer 賦予，非自帶 |

這個定義的直接後果是：**FIE 不在 Fragment 裡儲存「用途」，只儲存「事實」。** 用途是 Reasoning 階段才產生的東西（見 Context-Free 一節）。

## Fragment 是 Atomic（拆到最小可重用）

每顆 Fragment 都應保持足夠小——小到「無法再拆出一個獨立可重用的意義」為止。

反例（一顆過大的 Fragment）：

```
❌ 高中畢業旅行那天大家一起去宜蘭看海
```

這句話其實綑綁了至少五個獨立意義：

```
高中 · 畢業旅行 · 宜蘭 · 海邊 · 我們
```

綑綁在一起時，它只能整句被引用一次；拆開後，每一顆都能獨立進入不同的推理路徑：

```
「畢業旅行」──→ 可支持：離別 / 青春 / 集體記憶
「宜蘭」    ──→ 可支持：海 / 稻田 / 潮濕的空氣 / 返鄉
「我們」    ──→ 可支持：關係 / 群體 / 第一人稱視角
```

Atomic 的判準不是「字數少」，而是「單一意義」。一顆 Fragment 若能被 Reasoning Layer 拆成兩條互不依賴的關聯，它就還不夠 Atomic。

## Fragment 是 Context-Free（建立時不決定用途）

建立 Fragment 時，**不需要、也不應該**先決定它要用在哪裡。

今天留下：

```
桂花香
```

一年後，它可能成為：

```
桂花香
├── 小說裡的一句伏筆
├── 一段歌詞的意象
├── 一支品牌故事的開場
└── 一個電影鏡頭的氣味設定
```

關鍵主張：**Fragment 不屬於任何作品。作品只是 Fragment 的一次組合（a materialization, not an owner）。** 若在建立當下就把 Fragment 綁死用途，等於提前替 Reasoning Layer 下了它還沒有資訊去下的決定——這會摧毀 Fragment 最大的資產：跨作品的可重用性。

Context-Free 不代表「無關聯」。它代表**用途延後綁定（late binding）**：關聯由 Reasoning 在需要時動態建立，而不是在寫入時硬編碼。

## Fragment Network（故事存在於關聯，不在單一 Fragment）

當 Fragment 持續累積，真正重要的已不再是任何一顆 Fragment，而是它們構成的 **Fragment Network**。

```
        桂花
         │
   ┌─────┼─────┬───────┐
 老照片  停車場  秋天   外婆
```

或以四碎片主軸為例：

```
   高中 ────────── 我們
    │        ╲      │
    │         ╲     │
   夏天 ────── 宜蘭 ┘
   （每一條邊 = 一個可被推理啟動的關聯，而非固定劇情）
```

核心命題：

> 故事不存在於某一顆 Fragment，故事存在於關聯（The story lives in the edges, not the nodes）。

這也是為什麼 FIE 選擇 **Graph** 而非 **List** 或 **Tree**：故事的關聯是多對多、可迴圈、可隨時間重排的，這正是 Graph 的形狀。

## Design Goals

這一章存在，是為了回答一個先於所有工程問題的問題：**FIE 的最小推理單位應該是什麼？** 這個決定一旦下錯，後面每一層（Representation / Reasoning / Generation）都會繼承錯誤。

本章要解決的具體問題：

1. **對抗一次性創作（disposable creation）。** Prompt 生成完即消失，創作者一年累積上千次對話卻留不下任何可再用的資產。Fragment 讓「思考」變成可累積、可複利的資產。
2. **讓意義延後綁定。** 好的創作素材，價值往往在寫下的當下無法判定。系統必須允許「先保存、後理解」。
3. **把「理解」定位成關係問題，而非分類問題。** FIE 不問「這顆碎片是什麼類別」，而問「它與哪些碎片有關、為什麼有關」。這一步決定了整個系統是 retrieval 系統還是 reasoning 系統。

## Design Constraints

- **Reasoning 必須 Explainable。** 因為 Fragment 是 Evidence，任何「A 支持了作品 X」的推論都必須能回溯到具體的 Fragment 與關聯，不能是一句「模型覺得相關」。這排除了「只把所有 Fragment 塞進 prompt 讓模型自由發揮」的做法。
- **不能只靠 Prompt。** 若關聯只存在於某次 prompt 的上下文裡，關聯就會隨對話結束而消失——這違反 Fragment 可累積的本質。關聯必須被**物化（persisted）**成資料，而非只活在推理當下。
- **Atomicity 與 Context-Freeness 是寫入期約束，不是選配。** 若允許寫入大顆、綁定用途的 Fragment，Network 會退化成一堆孤島；系統必須在建立階段就引導/協助拆分。
- **關聯必須可被時間與 Creator Context 重新加權。** Fragment 的相關性不是靜態的（見 Trade-offs：Memory vs Stateless）。

## Engineering Notes

- **Atomic 的邊界要靠工具輔助，不能靠使用者自律。** 真人輸入時天然傾向寫整句（「高中畢業那天去宜蘭看海」）。實作上需要一個拆分步驟（人工確認或 AI 建議拆分），否則 Network 從第一天就開始退化。
- **Context-Free 不等於不存 metadata。** 可以存來源、時間、情緒 tag；不能存的是「用途/所屬作品」。要嚴格區分「描述性 metadata」與「規範性用途」。
- **關聯是邊（edge）不是欄位。** 常見錯誤是把關聯塞進 Fragment 的 `related_ids` 陣列——這讓關聯無法帶自己的屬性（權重、理由、建立時間、由誰建立）。關聯應是一等公民的資料列。
- **不要在 embedding 相似度上等號於「有意義的關聯」。** 相似（similar）與相關（related）不同：「高中」和「大學」很相似但未必對某位創作者相關；「桂花」和「外婆」不相似卻可能是最強的關聯。Embedding 是**候選來源**，不是**關聯本身**。
- **Weight / Confidence 要與關聯綁在一起，而非與 Fragment 綁在一起。** 同一顆 Fragment 在不同關聯裡的重要性不同。

**⟢ AI 島現況對照**

- **已實作：** `ci_fragments`（含 `embedding vector(1536)`）已把 Fragment 當節點儲存；`ci_related_fragments` 已把關聯物化成獨立資料列（符合「關聯是邊、不是欄位」）；`ci_surprising_pairs` 已在做「相似 ≠ 相關」的意外配對；Creator DNA（`analyzeDNA` → `ci_creator_dna`）已提供 Creator Relevance 的雛形。
- **尚缺：** 寫入期的 **Atomicity 約束**目前不存在——使用者仍可存入大顆、綑綁多義的 Fragment，沒有拆分引導；Context-Free 的**用途延後綁定**尚未形式化（無明確機制阻止用途被提前寫死）；關聯上的 **Weight/Confidence/理由**尚未成為一等欄位（關聯偏向存在與否，而非帶權重與可解釋理由的邊）。

## Failure Cases

FIE 的 Fragment 哲學在以下情況會失效，需人工介入：

1. **語境高度依賴的 Fragment。** 「他那句話」——脫離當下對話完全無意義的碎片。拆到 Atomic 反而摧毀意義，此時強行 Context-Free 是錯的，需保留一個綁定的最小語境。
2. **創作者只想要「一次性產出」。** 若使用者當下只要一段文案、不打算累積創作資產，Fragment 化是純成本、無回報（見 Trade-offs 的推理成本）。
3. **Network 過度稠密。** 當 Fragment 數量大、且每顆都與許多顆相關，Graph 會逼近全連通，「關聯」失去區辨力——所有東西都相關等於沒有關聯。需要人工或啟發式的關聯剪枝。
4. **錯誤 Atomic 化。** 把本該一體的意象（如某個專有意象「藍色的星期天」）拆成「藍色 / 星期天」，語意被稀釋。機器判斷不出哪些「整體大於部分」，需人工守門。
5. **冷啟動。** Fragment 只有一兩顆時，沒有 Network、沒有可推理的關聯，FIE 退化成普通聯想，此章的優勢完全不成立。

## Trade-offs

- **Graph vs Tree/List。** 選 Graph。故事的關聯是多對多、可迴圈、可重排的；Tree 強加了不存在的階層，List 丟失了關聯。代價是查詢與推理複雜度上升。
- **Fragment vs Prompt。** 選 Fragment。Prompt 一次性、描述需求、結束於一次生成；Fragment 可累積、保存思考、可陪伴創作者數年。代價是初期沒有立即產出、需要累積期。
- **Atomic 小 vs 大。** 選小。小 Fragment 可重用、推理彈性高、關聯更多；代價是初期推理成本提高、Representation 更關鍵、Graph 更複雜。**FIE 明確選擇：用更高的推理成本，換長期創作能力。**
- **Context-Free（延後綁定）vs 建立即綁用途。** 選延後綁定。提前綁用途能省一次推理，但會永久摧毀跨作品重用性——這筆帳長期絕對虧。
- **Memory vs Stateless。** 選 Memory。關聯與權重需隨創作者歷史與時間累積、重加權；Stateless 無法讓 Fragment「陪伴數年、持續形成新作品」。代價是狀態管理、時間權重、一致性的工程負擔。
- **Single vs Multiple Candidate。** 傾向 Multiple。既然 Evidence 可支持多個假設，推理就應產生多個帶 Confidence 的候選組合，而非鎖死單一答案（此點在 Reasoning 章展開，但根源在本章的 Evidence 定義）。

## Examples

**Example 1 — 一顆 Fragment，三個作品。**

```
Fragment：桂花香
├─（半年後）小說：主角推開外婆家門，先聞到的是桂花
├─（一年後）歌詞：「桂花落在你走過的巷口」
└─（兩年後）品牌故事：一支主打「記憶氣味」的香氛開場白
```

同一顆 Context-Free 的 Fragment，在三次不同的 Reasoning 中被重新組合。若當初把它綁死為「小說用」，後兩個作品就不會發生。

**Example 2 — Atomic 化讓四碎片長出故事。**

```
輸入（未拆）：高中畢業旅行大家去宜蘭看海
拆成 Atomic： 高中 · 夏天 · 我們 · 宜蘭

Reasoning 沿著邊走：
  高中 ─ 我們  → 這是一段「群體青春」
  夏天 ─ 宜蘭  → 潮濕、鹹味、午後雷陣雨
  我們 ─ 宜蘭  → 一次共同的離開/返回

輸出主題：不是「去宜蘭玩」，而是「一群人最後一個一起的夏天」
```

故事來自邊（我們×宜蘭、夏天×宜蘭），而不是任何單一詞。

**Example 3 — 意外關聯（相似 ≠ 相關）。**

```
「桂花」與「外婆」：embedding 相似度低（一個是植物、一個是人）
但對這位創作者：兩者是最強的關聯（外婆家門口有桂花樹）

→ 純向量檢索會漏掉這條邊；
→ Fragment Network + Creator Context 才抓得到。
   （對應 AI 島的 ci_surprising_pairs）
```

## Counter Example

如果不用 FIE，一般 AI（單純 Prompt + LLM）會怎麼處理這四顆碎片？

```
輸入：高中 / 夏天 / 我們 / 宜蘭

一般 AI 的做法（各自獨立聯想）：
  高中 → 青春、制服、考試
  夏天 → 陽光、海灘、冰
  我們 → 回憶、友情
  宜蘭 → 稻田、溫泉、旅遊

輸出：一段把上述聯想拼在一起的通順文字。
```

差別在哪：

| | 一般 AI | FIE |
|---|---|---|
| 處理單位 | 四個獨立的詞 | 一張帶邊的 Network |
| 產出的來源 | 每個詞各自的聯想相加 | 詞與詞之間的**關聯** |
| 可累積性 | 對話結束即消失 | Fragment 與關聯被保存、可再用 |
| 可解釋性 | 「模型這樣寫」 | 可回溯到「哪條邊支持了這個主題」 |
| 用途綁定 | 綁死在這一次生成 | Context-Free，可支持未來多個作品 |

一般 AI 增加的是**聯想（associations）**；FIE 增加的是**關聯（relations）**。前者讓輸出更豐富，後者讓創作者更聰明——因為關聯會留下來，一次比一次多。這正是 FIE 選擇 Fragment 作為整個推理系統基礎單位的原因。

---

# Chapter 3　Reasoning Layer（推理層）

Reasoning Layer 是 FIE 介於 Fragment 與 Generation 之間的理解層。它不生成作品，它決定作品「如何被想出來」——把一組沉默的 Fragment 轉譯成一組可被檢視、可被選擇、可被追溯的創作方向。

## 本章定位（Position）

如果 Fragment（Chapter 2）解決「保存」、Representation 解決「描述」，那麼 Reasoning 解決的是最難、也最被傳統 AI 略過的一步：**在生成之前先理解**。本章描述這一層的職責邊界、四階段推理流程、與 Creator DNA 的耦合方式，以及五項不可退讓的原則。

## 為什麼不能直接交給 LLM（Why Not the LLM Directly）

LLM 擅長生成，但生成不等於理解。給定四個 Fragment：

```
高中 / 夏天 / 我們 / 宜蘭
```

一個裸 LLM 會立刻開始寫歌。Reasoning Layer 則先停下來，問一組**分析性而非生成性**的問題：

- 哪個 Fragment 是主軸（load-bearing）？哪些只是背景（context）？
- 是否存在時間順序（temporal order）？
- 是否存在人物關係（relationship）？
- 是否缺少關鍵事件（Missing Fragment）？
- 是否同時存在多種合理故事（multiple valid Hypotheses）？

這些不是「寫什麼」，而是「這些碎片到底在說什麼」。裸 LLM 把上述判斷全部**隱式地、一次性地、不可觀察地**壓進單次 forward pass；Reasoning Layer 把它們**顯式化、分階段、留下 Trace**。差異不在最後那句歌詞，而在歌詞被寫出來之前，系統是否真的理解過 Fragment。

## Reasoning 的定義：它是 Inference，不是聯想（Reasoning as Inference）

本白皮書給 Reasoning 一個嚴格定義：

> Reasoning 是根據 Fragment 建立假設（Hypothesis）、以 Fragment 作為 Evidence 驗證假設、淘汰無法被支持的假設，最後形成一組可創作候選（Candidate）的過程。

因此 Reasoning **不是**關鍵字聯想，**不是** embedding 相似度匹配，**不是** RAG 式的「撈相關再塞進 prompt」。它是一個有中間狀態、有淘汰邏輯、有可信度排序的 **inference process**。相似度檢索可以是 Reasoning 的輸入之一（例如找出候選 Evidence），但它本身不構成 Reasoning。

## 四階段推理流程（Four Stages）

Reasoning 不是單一黑箱呼叫，而是四個可分別檢視的階段：

```
          Fragments
              │
   ┌──────────▼──────────┐
   │ Stage 1 Observation │  只建立事實，不做故事假設
   └──────────┬──────────┘
              │  高中=人生階段 / 夏天=時間 / 宜蘭=地點 / 我們=群體
   ┌──────────▼──────────┐
   │ Stage 2 Hypothesis  │  發散：允許大量可能
   └──────────┬──────────┘
              │  H1 畢業旅行 / H2 初戀 / H3 校外教學 / H4 多年後重返
   ┌──────────▼──────────┐
   │ Stage 3 Evidence    │  逐一驗證：支持 / 衝突 / 缺失
   └──────────┬──────────┘
              │  每個 Hypothesis 必須能解釋現有 Fragment
   ┌──────────▼──────────┐
   │ Stage 4 Candidate   │  收斂：保留最合理，但不刪除其餘
   └──────────┬──────────┘
              ▼
   Candidates (+ Confidence, + Trace)  ──►  Generation
```

**Stage 1 — Observation（觀察）**：只把每個 Fragment 標註為事實層級的角色（時間 / 地點 / 群體 / 人生階段 / 情緒…），不預設任何故事。這一步刻意保持「無立場」，避免過早收斂。

**Stage 2 — Hypothesis（假設）**：允許大量可能同時存在——畢業旅行、初戀、校外教學、多年後重返。此階段的產物是**發散**的，寧可多不可漏。

**Stage 3 — Evidence（驗證）**：對每個 Hypothesis 逐一問三件事：哪些 Fragment 支持它、哪些 Fragment 與它衝突、它需要但缺少哪些 Fragment。每個假設都必須能解釋現有 Fragment，否則降權或淘汰。

**Stage 4 — Candidate（候選）**：保留最合理的推理，但**不刪除其他可能**。Reasoning Layer 的輸出不是唯一答案，而是一組帶可信度、可供創作者探索的方向。

Reasoning Layer 的任務不是「找唯一解」，而是**建立可能性空間（possibility space）**。

## 多重推理與可信度（Multiple Candidates）

對同一組 Fragment，Reasoning Layer 輸出多個帶 Confidence 的 Candidate，而非單一結論：

| Candidate | 主題（Theme） | Confidence | 主要 Evidence | Missing Fragment |
|---|---|---|---|---|
| A | 青春成長 | 87% | 高中 + 夏天 + 我們 | 具體事件 |
| B | 初戀 | 79% | 夏天 + 我們 + 宜蘭 | 對象、關係轉折 |
| C | 多年後重逢 | 66% | 高中 + 我們（時態暗示） | 時間跨度證據 |
| D | 友情 | 61% | 我們 + 宜蘭 | 衝突或高潮 |

Confidence 不是玄學分數，而是「該 Hypothesis 被現有 Fragment 支持的程度 − 被衝突/缺失懲罰的程度」的可解釋合成。創作者（或 Generation Engine）再據此選擇要沿哪一條路生成。

## Reasoning = Fragment + Creator DNA + World Knowledge

Reasoning Layer 不應孤立工作。同一組 Fragment，對慣寫青春的 Creator A 與慣寫懸疑的 Creator B，其 Candidate 排序**應當不同**。因此本層的完整輸入為三源：

```
Reasoning = Fragment            （創作者留下的原始記憶）
          + Creator DNA         （創作者的傾向、母題、語氣先驗）
          + World Knowledge     （常識：夏天→暑假、高中→17歲左右）
```

- **Fragment** 提供事實與素材。
- **Creator DNA** 提供先驗（prior），影響 Hypothesis 的生成傾向與 Candidate 的排序權重（reweighting），但**不得**捏造 Fragment 裡不存在的事實。
- **World Knowledge** 提供把離散 Fragment 接起來的常識橋樑。

三者缺一：只有 Fragment → 冷冰冰的事實堆；只有 DNA → 千篇一律的自我複製；只有 World Knowledge → 泛泛的、誰都能寫的通稿。

## Reasoning Layer 的輸出（Outputs）

Reasoning Layer 不輸出作品，它輸出**結構化的理解**，供 Generation Engine 消費：

- Fragment Summary（每個碎片的角色）
- Fragment Weight（主軸 vs 背景的權重）
- Story Candidates（多個帶 Confidence 的方向）
- Missing Fragment（推理發現的關鍵缺口）
- Timeline / Relationship Graph（時間軸與人物關係）
- Theme / Emotion Curve（主題與情緒曲線）
- Reasoning Trace（下述）

## Reasoning Trace

每一次推理都必須可被回放。Trace 至少保存：

- 使用了哪些 Fragment
- 建立了哪些 Hypothesis
- 淘汰了哪些、為什麼（哪個 Fragment 衝突 / 哪個缺失）
- 保留了哪些 Candidate
- 目前這個排序是怎麼算出來的

Trace 是 FIE 與「一般生成工具」最本質的差異之一：一般工具給你結果，FIE 給你**結果 + 它為什麼是這個結果**。

## Design Goals

本章之所以存在，是為了回答一個問題：**為什麼不能 Prompt 進、作品出，中間什麼都不要？**

1. **把「理解」變成一等公民。** 傳統管線 `Prompt → Generation` 把理解藏在生成裡、不可觀察；FIE 的 `Fragment → Representation → Reasoning → Generation` 把理解抽成獨立、可被檢查的一層。目的不是多一個步驟，而是讓「AI 到底懂不懂這些碎片」變成一件可以被驗證的事。
2. **讓創作可被引導，而非被賭。** 單一輸出等於把選擇權交給隨機性；多 Candidate + Confidence 讓創作者在生成前就能介入方向。
3. **讓每個作品都能回答「你為什麼這樣寫」。** 有 Trace，才有信任、才有除錯、才有二次創作的基礎。
4. **讓 Creator 的個性真正進入推理，而不只是進入措辭。** DNA 影響的是「先想到哪些故事」，不只是「用什麼語氣寫」。

## Design Constraints

Reasoning Layer 的設計受以下硬約束：

- **必須 Explainable。** 任何 Candidate 都要能被追問到具體 Fragment/Evidence；不允許「模型說是就是」的黑箱分數。
- **不能只靠 Prompt。** 「把四階段寫進一個大 prompt 讓 LLM 自己跑」不算實現本層——那只是把黑箱換了包裝，中間狀態依然不可觀察、不可修改、不可重算。四階段之間必須有**真實的、可被程式存取的中間產物（intermediate artifacts）**。
- **推理與生成必須分離。** Reasoning 的輸出是結構，不是散文；Generation 才把結構轉成作品。兩者混在一起就無法單獨檢視推理對錯。
- **DNA 不得越權捏造事實。** DNA 只能 reweight 與 bias，不能新增 Fragment 裡沒有的人事時地物。
- **允許非唯一解。** 系統不得假裝存在唯一正解；同一組 Fragment 的多種合理推理是特性，不是 bug。
- **可重算（Reproducible）。** 給定相同 Fragment + 相同 DNA 快照 + 相同 World Knowledge 版本，Trace 應可重現（詳見下方對 Non-determinism 的界定）。

## Engineering Notes

- **四階段建議實作成獨立步驟而非單一巨型 prompt。** 每階段獨立呼叫、獨立落地中間產物（observations / hypotheses / evidence-map / candidates），才換得到可檢視、可重跑、可局部重算。把四階段塞進一個 prompt，短期省事、長期失去本層存在的意義。
- **Confidence 要「可分解」。** 建議把分數拆成 support / conflict / missing 三個可解釋分量再合成，而不是讓 LLM 直接吐一個 0.87。否則 Explainable 只是嘴上說說。
- **Trace 要能被人讀，也要能被機器重放。** 存結構化 JSON（fragment_ids、hypotheses、evidence links、eliminations、scoring），不要只存一段自然語言摘要。
- **快取要以「Fragment 集合 + DNA 快照版本」為 key。** DNA 會演化（見 evolve），舊 Trace 必須綁定當時的 DNA 版本，否則重算會偷偷變成另一個結果、破壞 Reproducible。
- **注意 Reproducible 與 Non-deterministic 的張力**（見 Trade-offs）：解法是「固定隨機種子 + 記錄模型版本 + 落地 Trace」，讓「同輸入可重放」與「允許多種敘事」並存——重放的是**同一次推理的軌跡**，不是強迫每次推理只能有一種輸出。

**⟢ AI 島現況對照**

- **已實作（可作為 Reasoning 的原料層）：** `ci_fragments`（含 `embedding vector(1536)`）提供 Fragment 與相似度檢索；`ci_surprising_pairs`（意外配對）與 `ci_related_fragments` 提供關聯線索，近似 Stage 2 的「發散」燃料；`ci_creator_dna`（`analyzeDNA`）提供 Creator DNA 先驗；`synthesize / evolve / compose / transcreate` 等 agent 已能凝聚與編織；`ci_memories` 已能把記憶注入 prompt；`ci_agent_runs` 是 Reasoning Trace 的雛形（有執行記錄，但不是結構化的假設—證據—淘汰軌跡）。
- **尚缺（本章描述的理想化能力）：** 正式、獨立的 Reasoning Layer（目前理解仍多半隱含在各 agent 的單次 prompt 裡）；四階段 Observation→Hypothesis→Evidence→Candidate 的顯式中間產物；多 Candidate + 可分解 Confidence 排序；完整可重放的 Reasoning Trace；Missing Fragment 偵測；以及 Familiar / Adjacent / Exploratory 三種推理模式的區分。換言之，AI 島今天已有 Reasoning 的**素材與雛形**，但尚未有 Reasoning 這一**層**。

## Failure Cases

Reasoning 不是萬能的，以下情況它應**誠實地失敗**，而非強行生成：

- **Fragment 過少。** 只有「夏天」一個碎片，無法支撐任何高可信度 Hypothesis。
- **Fragment 互相矛盾。** 例如同時出現「宜蘭」與「我從沒去過宜蘭」，Evidence 階段會發現無法有一個 Hypothesis 同時解釋兩者。
- **Creator Context / DNA 不足。** 新創作者、無歷史母題，排序退化成通用常識、失去個性。
- **全部 Candidate 都低分且彼此接近。** 沒有任何方向明顯勝出，可能性空間過於平坦。

此時系統的正確行為是回傳「**目前無法形成高可信度推理**」，並主動提示**缺哪些 Fragment**（引導創作者補料），而不是硬湊一個故事。這些情境需要人工介入：補碎片、修正矛盾、或由創作者手動選定方向。

## Trade-offs

- **Prompt-only vs Fragment-based Reasoning。** 純 prompt 快、便宜、零基礎設施，但不可觀察、不可重算、DNA 只能影響措辭。FIE 選 Fragment-based：接受更高的工程與延遲成本，換取 Explainable 與可介入。
- **Graph vs Tree（Fragment 關係結構）。** Tree 簡單、易排序，但強迫單一父子層級，無法表達「一個 Fragment 同時支持多個 Hypothesis」。FIE 選 **Graph**：Fragment 與 Hypothesis 之間是多對多的支持/衝突關係，代價是排序與可視化更複雜。
- **Single vs Multiple Candidate。** 單一輸出乾脆，但等於替創作者做了不可見的決定。FIE 選 **Multiple**：把選擇權還給人，代價是 UI/生成端要處理排序與取捨。
- **Memory vs Stateless。** 無狀態推理可重現、易測試，但每次都從零理解、無法沉澱 Creator DNA。FIE 選 **Memory（有狀態）**：以 DNA 與 `ci_memories` 承載歷史，代價是要處理版本、快取失效與「舊 Trace 綁舊 DNA」的一致性問題。
- **速度 vs 深度。** 四階段 + Trace 明顯拉長推理時間、增加資料結構與計算成本。FIE 明確選擇**犧牲部分速度換取創作深度與可解釋性**——這是本層存在的前提，不是可調的旋鈕。

## Examples

**Example 1 — 主軸判定與權重（Fragment Weight）。** Fragment：`高中 / 夏天 / 我們 / 宜蘭`。Observation 標註四者角色後，Evidence 階段發現「我們」是所有高分 Hypothesis 的共同支點（群體記憶），「宜蘭」則多為背景。Reasoning 輸出 `Weight(我們) > Weight(高中) > Weight(夏天) > Weight(宜蘭)`，並據此讓 Generation 以「群體」為敘事重心，而非以地點開場。

**Example 2 — DNA 改寫排序（reweighting by Creator DNA）。** 同一組 `高中 / 夏天 / 我們 / 宜蘭`：對慣寫青春的 Creator A，Candidate 排序為「青春成長 87% → 初戀 79%」；對慣寫懸疑的 Creator B，同樣的 Fragment 讓「多年後重返（某件當年沒說清楚的事）」被 DNA 上調到最前。**Fragment 沒變、Evidence 沒變，只有先驗變了，排序就變了**——這正是 `Reasoning = Fragment + Creator DNA + World Knowledge` 的具體展現。

**Example 3 — Missing Fragment 偵測與失敗回傳。** Fragment 只有 `夏天 / 宜蘭`。Hypothesis 階段生成「初戀 / 畢業旅行」等假設，但 Evidence 階段對每個假設都標出關鍵缺口：缺「人物（我們？）」、缺「事件」。所有 Candidate 的 Confidence 皆低於門檻，系統回傳「無法形成高可信度推理」，並輸出 `Missing Fragment = {人物, 具體事件}`，提示創作者補料——而不是硬生成一個空洞的夏天故事。

**Example 4 — Trace 支撐二次創作。** 創作者選了 Candidate C（多年後重逢，66%），但覺得結局太淡。因為 Trace 記錄了「C 是在『高中』的過去式時態暗示 + 淘汰了 H1 畢業旅行」而來，創作者可以直接回到 Stage 3，手動補一個 Fragment「同學會邀請函」，重算後 C 的 Confidence 升到 82% 並生出更明確的重逢高潮。**沒有 Trace，這種精準的局部介入不可能發生。**

## Counter Example

不用 FIE，一般 AI 的做法是：

```
使用者貼上：高中 夏天 我們 宜蘭
        │
        ▼
     單次 LLM 呼叫（黑箱）
        │
        ▼
     直接輸出一首歌
```

它會很快給你一首「還不錯」的青春歌。但：

- **你問不出「為什麼是青春、不是重逢」**——沒有 Hypothesis、沒有 Evidence、沒有排序，只有一個既成事實。
- **你改不動中間**——不滿意只能重 roll 整首，或在 prompt 裡加形容詞碰運氣，無法回到某個推理節點局部修正。
- **它不會告訴你缺什麼**——碎片太少時它照樣硬寫，用泛泛常識填滿，而不是提示你「缺人物、缺事件」。
- **你的個性只進到措辭**——換個創作者，除非重寫 prompt，否則同樣四個字得到幾乎一樣的故事骨架。

差別一句話：**一般 AI 直接生成，FIE 先理解再生成；一般 AI 給你結果，FIE 給你結果加上它為什麼是這個結果。** Reasoning Layer 之所以是 FIE 的核心，不是因為它會寫故事，而是因為它決定了故事**如何誕生**——而且這個過程，看得見、改得動、算得回來。

---

# Chapter 4　Fragment Intelligence（碎片智能）

Fragment Intelligence 是 FIE 的知識核心層：它決定 AI 對 Fragment 的理解深度，而非生成數量。本章定義「讓 Fragment 從靜態資料變成可推理節點」所需的五種能力，以及維繫這些能力的閉環（Fragment Intelligence Loop）。

## 定位（Positioning）

Fragment Intelligence 位於 Fragment（資料）與 Reasoning Layer（推理）之間，是被前兩章預設卻尚未被命名的一層。它不回答「這個 Fragment 是什麼」，而回答「這個 Fragment 與哪些 Fragment 有關、為什麼有關、此刻有多重要」。沒有這一層，Reasoning 只能對裸資料做 one-shot 聯想；有了這一層，Reasoning 才有可累積、可解釋的地基。

## 核心命題：Fragment 是 Node，不是 Row（Core Thesis）

一般資料庫把 Fragment 當成資料列：

```
Fragment (row)
├── id
├── title
├── content
└── tags
```

FIE 把每個 Fragment 當成知識圖中的節點（Node）——它持續與其他節點建立、修剪、重估連線，並主動參與推理，而非被動等待被搜尋。

```
一般系統：   Collect → Store → Search
FIE：        Collect → Represent → Understand → Connect → Reason
```

差別不在「有沒有找到 Fragment」，而在「有沒有理解 Fragment」。以全書主軸四碎片為例：

```
高中    夏天    我們    宜蘭
```

淺層 AI 會各自向外聯想（高中→青春、夏天→陽光、宜蘭→稻田、我們→回憶）——這是「增加聯想（association）」。Fragment Intelligence 要做的相反：把注意力收斂到這四者「彼此之間」的 Relationship——這是「增加關聯（relation）」。聯想向外發散、關聯向內收斂，後者才是創作者 Creator DNA 的所在。

## 五能力（Five Core Abilities）

| 能力 | 回答的問題 | 沒有它會怎樣 | 主要產物 |
|---|---|---|---|
| **Context Awareness** | 這個 Fragment 在「這裡」是什麼意思？ | 同名 Fragment 被當成同一個意思 | 情境化的 Representation |
| **Relationship Discovery** | 哪些 Fragment 共現／因果／矛盾？ | 只剩相似度、無結構 | 帶類型的 Edge |
| **Dynamic Weight** | 此刻這個 Fragment 有多重要？ | 用寫死權重、換題材就失準 | 情境相依的 Weight |
| **Evolution** | 新碎片進來後，舊碎片還是原意嗎？ | 理解停在第一次寫入的時刻 | 重估後的 Representation／Edge |
| **Explainability** | 為什麼建立這條關聯？ | 黑盒排序、無法被創作者信任或修正 | Evidence + Reasoning Trace 片段 |

### 1. Context Awareness（上下文感知）

同一個字面 Fragment，意義由 Context 決定。「奶茶」可能是早餐店、深夜加班、某個人、某段回憶；「夏天」在「高中／宜蘭／我們」的 Context 下，指向的是一段共同經歷，而非氣象季節。Context Awareness 的職責是：Representation 不能只綁字面，必須綁「與哪些 Fragment 一起出現、在誰的 Creator Context 中」。

### 2. Relationship Discovery（關聯發現）

AI 必須持續回答三種關係，而不只是「像不像」：

- **共現（co-occurrence）**：高中 × 夏天 × 我們 × 宜蘭 反覆一起出現。
- **因果（causal）**：因為那年夏天去了宜蘭，才有了「我們」這段。
- **矛盾（contradiction）**：某則新碎片說「其實我們高中沒去過宜蘭，是畢業後」——與既有關聯衝突，必須被標記而非被平均掉。

關聯是有類型的 Edge，且會隨新證據演化。

### 3. Dynamic Weight（動態權重）

Weight 不是 Fragment 的固定屬性，而是「在某個 Reasoning 情境下」的函數。「宜蘭」在一篇懷舊散文裡是核心（高 Weight），在一篇談程式學習的文章裡幾乎為零。Weight 必須由 Reasoning 動態決定，寫死權重等於假設所有故事都一樣重視同一批碎片。

### 4. Evolution（演化）

Fragment 的意義不凍結在寫入當下。當創作者後來補入「大學後我們就散了」，先前「我們」這個 Fragment 的情感基調、以及它與「夏天」的關聯強度都應被重估。Intelligence 因此是持續重新理解的過程，而不是一次性索引。

### 5. Explainability（可解釋性）

每一次關聯建立都必須能回答「為什麼」。系統不能只輸出「桂花 → 老照片，score 0.87」，而要能指出：

```
桂花 ── 老照片
理由：兩者共同出現在三段回憶（M-12、M-40、M-73）
      且皆帶「祖母」Context
```

Explainability 不是事後裝飾，而是讓創作者能「信任、修正、否決」關聯的前提——這是 Fragment Intelligence 與黑盒 embedding 排序的分水嶺。

## Fragment Intelligence Loop（碎片智能閉環）

五能力靠一個閉環維繫。Generation 不是終點，每次創作都要回饋 Intelligence：

```
        ┌────────────────────────────────────────────┐
        │                                            │
    Collect → Represent → Understand → Connect → Reason → Generate
        │          │           │          │        │        │
     原始碎片   分層表徵     情境化       建 Edge   多      產出
                (向量+       釐清歧義    /改權重  Candidate 內容
                 結構+                            +排序
                 Context)                                    │
        ▲                                                    │
        │                                                    ▼
   Update Intelligence  ◄──────────────  Feedback（採用/改寫/否決）
```

- **Represent** 獨立於 Collect：同一次收集的碎片，表徵會隨後續碎片被重算。
- **Feedback** 是唯一讓系統「越用越懂這個創作者」的通道：創作者採用了哪個 Candidate、否決了哪條關聯，都要回寫 Weight 與 Edge。
- **Update Intelligence** 讓下一輪的 Understand／Connect 站在更新後的知識上，而非每次從零開始。

## Design Goals

本章存在的理由，是回答「Reasoning Layer 到底站在什麼之上」這個被前三章懸置的問題。具體要達成：

- **把理解變成可累積的資產**：FIE 真正沉澱的不是 Prompt，而是 Fragment 之間被驗證過的 Relationship 與 Weight。這一章定義那份資產的形狀。
- **讓關聯優先於聯想**：把系統的優化目標從「產生更多相關聯想」改成「發現更少但更真的關聯」。
- **為 Reasoning 提供可解釋的輸入**：Reasoning 的每個 Candidate 都應能追溯到 Fragment Intelligence 提供的 Evidence，否則 Reasoning Trace 是空的。
- **讓系統隨創作者演化**：透過 Loop 的 Feedback，使同一批碎片對不同創作者產生不同的 Weight 與 Edge。

## Design Constraints

- **Reasoning 必須 Explainable，不能只靠 Prompt**：任何關聯都要能給出 Evidence（哪些碎片、哪些記憶、哪個 Context）。「模型覺得像」不是理由。
- **Weight 不得寫死**：不得在 schema 中存一個全域固定的 importance；Weight 只在給定 Reasoning 情境時才有定義。
- **Representation 必須分層**：不能只有一個 embedding vector。字面／語義向量／結構關係／Context 標註要可分別被讀取與更新，否則 Evolution 無法只重估其中一層。
- **Edge 必須帶類型與證據**：共現、因果、矛盾不可被壓成單一「相關度」。矛盾尤其不能被相似度平均掉。
- **Incremental，not rebuild**：新碎片進來只能增量更新受影響的節點與邊，不得每次全量重算——否則無法長期累積、也撐不住規模。
- **Low Coupling**：Intelligence 層不得直接依賴 Generation 的實作；兩者只透過 Candidate + Evidence 的介面往來。

## Engineering Notes

- **Represent 要分層，不要塞進單一向量**：實務上建議至少三層——(a) semantic embedding（相似度召回）、(b) 結構層（typed edges，共現/因果/矛盾）、(c) Context 標註（此碎片屬於哪段記憶／哪個 Creator Context）。用 embedding 做召回、用結構層做推理與解釋，兩者分工。
- **共現統計是最便宜的第一版 Relationship Discovery**：先用「在同一則記憶／同一次創作中一起出現的次數」建 co-occurrence edge，成本低、天然可解釋（Evidence 就是那幾則記憶 id）。因果與矛盾再交給 LLM 判定並要求它附證據。
- **Dynamic Weight 別存成欄位，存成函數的輸入**：把 Weight 設計成 `weight(fragment, reasoning_context)` 的計算結果，快取但可失效；一旦寫成 `fragments.weight` 欄位就注定失準。
- **Evolution 需要觸發器與預算**：新碎片進來要決定「重估哪些鄰居」。全圖重估太貴，建議只沿 edge 傳播 N 跳、並對高 Weight 節點優先。
- **Feedback 一定要落庫**：採用／否決若不回寫，Loop 只是圖示。至少記錄 (candidate_id, 創作者動作, 受影響的 edges)。
- **可解釋性要一路帶著走**：Evidence 不能只在 UI 臨時拼，要從 Connect 階段就掛在 edge 上，Reasoning Trace 才引用得到。

**⟢ AI 島現況對照**

- **已實作**：`ci_fragments`（含 `embedding vector(1536)`）＝ Represent 的語義層；`ci_surprising_pairs`（意外配對）＋`ci_related_fragments`＝ Relationship Discovery 的雛形；`analyzeDNA → ci_creator_dna`＝ Creator DNA / Creator Context 的初步沉澱；`ci_memories`（記憶注入 prompt）承載部分 Context Awareness；synthesize（凝聚）/ evolve（演化）/ compose（編織）/ transcreate 等 agents 已對應 Loop 的 Connect→Reason→Generate；`ci_agent_runs` 是 Reasoning Trace 的雛形。
- **尚缺**：Representation 仍以「單一 embedding + 少量關聯表」為主，缺正式的**分層表徵**（結構層／Context 層未與向量層分離）；Relationship 尚未區分**共現／因果／矛盾**的 typed edge，也未普遍附 Evidence；**Dynamic Weight** 尚未情境化（沒有 `weight(fragment, context)`）；Evolution 目前偏 agent 觸發，缺自動的鄰居重估與**Missing Fragment 偵測**；Feedback→Update Intelligence 的**回寫閉環**尚未成形（採用/否決未系統性回饋 Weight/Edge）；完整 Reasoning Trace 與三種推理模式（Familiar/Adjacent/Exploratory）待建。

## Failure Cases

- **稀疏冷啟動**：新創作者只有三五個碎片，共現統計不足，Relationship Discovery 幾乎只能退回 embedding 相似度，關聯品質低——此時應誠實標記「Evidence 不足」，並邀創作者手動連線，而非硬湊。
- **矛盾碎片**：「我們高中去過宜蘭」與「其實是畢業後才去」同時存在。若系統把兩者平均，會產出時間錯亂的內容。需人工介入裁決哪一則為準，或標為未決 Context。
- **語義漂移未被察覺**：創作者用「夏天」從指季節逐漸轉為指某個人，若 Evolution 未觸發重估，舊 edge 會持續誤導。
- **反饋噪音**：創作者為趕稿全部點「採用」，Feedback 訊號失真，Weight 學歪。需要區分「主動採用」與「懶得改」。
- **過度連線**：碎片一多，任兩者都能找到微弱相似度，圖變成全連通、Weight 失去鑑別度。需要剪枝閾值與人工把關核心 edge。

以上情況 FIE 不應假裝萬能：正確行為是「標記低 Confidence／請求人工裁決」，而不是輸出一個自信的錯誤關聯。

## Trade-offs

- **Graph vs Tree**：選 Graph。碎片間的關係是多對多、可迴路（宜蘭↔夏天↔我們互相加權），Tree 的單一父節點會逼迫我們丟棄真實關聯。代價是 Graph 難排序、易全連通，須靠 typed edge + 剪枝控制。
- **Fragment-centric vs Prompt-centric**：選 Fragment。Prompt 工程把知識塞進一次性字串、用完即棄；Fragment Intelligence 讓知識沉澱在節點與邊上，可跨創作累積。代價是基礎設施更重。
- **Multiple Candidate vs Single**：選 Multiple + Confidence 排序。單一答案掩蓋了推理的不確定性，也讓 Explainability 無從比較；多 Candidate 讓創作者看見「還有哪條路」。代價是 UI 與計算成本上升。
- **Memory vs Stateless**：選 Memory。Stateless 每次從零聯想，永遠學不會這個創作者；有狀態才有 Evolution 與 Feedback。代價是要處理漂移、噪音與遺忘策略。
- **Dynamic Weight vs Static Weight**：選 Dynamic。靜態權重實作簡單但換題材即失準；動態權重須快取與失效管理，複雜但正確。

## Examples

**Example 1 — Context Awareness 消歧**
碎片「夏天」。在 Context {高中, 我們, 宜蘭} 下，Representation 綁定的是「那一段共同經歷」；同一創作者另一組 Context {冷氣, 電費, 加班} 下，「夏天」指向季節苦悶。兩者字面相同、Representation 不同，因此不會被錯誤合併。

**Example 2 — Relationship Discovery 的三種邊**
- 共現：高中 × 夏天 × 我們 × 宜蘭 在 5 則記憶中同框 → 高強度 co-occurrence edge，Evidence = 那 5 則 id。
- 因果：「因為那年夏天蹺課去宜蘭，我們才變熟」→ 建 causal edge（夏天→我們）。
- 矛盾：後來補入「其實高中不熟，是畢業後才要好」→ 對前一條 causal edge 掛 contradiction 標記，交人工裁決。

**Example 3 — Dynamic Weight 隨情境翻轉**
同一組四碎片：
- 寫「青春散文」時：Weight(我們)=高、Weight(宜蘭)=中、Weight(高中)=中。
- 寫「地方旅遊介紹」時：Weight(宜蘭)=高、Weight(我們)=低。
Weight 由 Reasoning 情境算出，沒有任何一個值被寫死在碎片上。

**Example 4 — Evolution + Feedback 閉環**
創作者採用了「夏天→老照片」這條 Candidate，並改寫了句子；系統回寫：edge(夏天, 老照片) Weight +Δ、記錄採用。三個月後新增碎片「翻到那本相簿」→ Evolution 觸發，沿 edge 重估，「老照片」Weight 上升並被納入下一輪 Candidate。

## Counter Example

若不使用 FIE，一般 AI（含裸 RAG）的做法是：

```
四碎片 → 各自向量化 → 相似度召回 top-k → 塞進一個 Prompt → 一次生成
```

差異在四處：

1. **無關係、只有相似度**：它知道「宜蘭 ≈ 稻田」，但不知道「宜蘭 因為 那年夏天 才對 我們 有意義」。共現/因果/矛盾全被壓成一個 cosine 分數。
2. **權重靜態或無**：召回排序由相似度決定，換題材不會改變哪個碎片重要。
3. **無記憶、無演化**：這次生成不會讓下一次更懂這個創作者；新碎片進來，舊理解不更新。
4. **不可解釋**：它給不出「為什麼是這兩個碎片相關」，只能給一個排序分數，創作者無法信任也無法修正。

結論：一般 AI 產出的是「四個碎片的合理聯想拼盤」；FIE 產出的是「這四個碎片對這位創作者而言、彼此為何有關」的理解——前者可被任何模型複製，後者是隨創作者累積、無法被空降複製的資產。FIE 累積的從來不是 Prompt，而是理解能力。

---

# Chapter 5　Fragment Representation（碎片表示模型）

本章定義 FIE 中 Reasoning Layer 真正閱讀的對象。Reasoning 從不直接讀取原始 Fragment，它讀取的是 Fragment 的 **Representation**——一種把「創作者留下的文字」轉譯成「AI 可推理的語意結構」的分層模型。

---

## 為什麼 Representation 是引擎的支點（Representation as the Load-Bearing Layer）

一個常見的誤解是：AI 能不能推理，取決於模型有多大。實際上，在 FIE 的架構裡，推理品質的上限由 **Fragment 如何被表示** 決定，而不是由模型參數量決定。同一顆模型，餵給它一個裸字串，和餵給它一個帶 Semantic / Context / Relations / Weight 的結構化物件，得到的推理深度是兩個量級。

考慮主軸範例的其中一片碎片：

```
宜蘭
```

若 Fragment 僅為一段文字，AI 無從判斷它到底代表：

- 一個地點（geo）
- 一次高中畢旅（event）
- 一段初戀回憶（emotion）
- 創作者反覆書寫的故鄉意象（recurring motif）

這四種讀法會導出四種完全不同的故事。缺乏 Representation 時，模型只能靠 Prompt 當下猜測，且每次猜的結果不穩定、無法被解釋、也無法累積。Representation 的職責，就是把「宜蘭」從一個**字串**升級成一個**可推理物件（reasoning object）**。

> Representation 不描述「碎片是什麼」，而描述「AI 應該如何理解這個碎片」。

這是本章唯一需要記住的一句話。前者是資料庫思維（storage），後者是推理思維（inference）。FIE 選後者。

---

## 五層表示模型（The Five Representation Layers）

每個 Fragment 至少由五層資訊構成。層與層之間是**由淺到深、由客觀到推理**的階梯：Layer 1–2 幾乎是事實，Layer 3–4 是關係，Layer 5 是給 Reasoning 用的判斷依據。

```
┌─────────────────────────────────────────────────────────────┐
│ Fragment Representation：宜蘭                                 │
├───────────────┬─────────────────────────────────────────────┤
│ L1 Literal    │ "宜蘭"                     ← 原始內容（不可改）│
│ L2 Semantic   │ type=place; subtype=hometown/travel-dest    │
│ L3 Context    │ ["高中畢旅", "夏天的海邊", "現居城市"]        │
│ L4 Relations  │ 夏天 · 高中 · 我們 · 海邊 · 火車              │
│ L5 Inference  │ Weight, Confidence, Creator Relevance,       │
│    Metadata   │ Last Updated, Evidence Count                 │
└───────────────┴─────────────────────────────────────────────┘
        淺 / 客觀 ──────────────────────────────► 深 / 推理用
```

### Layer 1 — Literal（原始層）

創作者留下的原字串本體，例如 `宜蘭`。這一層是不可變的（immutable）：無論上層如何重算，Literal 永遠保留創作者的原始輸入，作為所有推理的最終 ground truth。任何時候都能回溯「AI 到底是從哪個字推出來的」。

### Layer 2 — Semantic（語意層）

對碎片做語意分類：地點 / 人物 / 事件 / 物件 / 情緒 / 時間。以四碎片主軸為例：

| Fragment | Semantic type |
|---|---|
| 高中 | time-period（人生階段）|
| 夏天 | time / season |
| 我們 | person（關係群體）|
| 宜蘭 | place |

Semantic 層讓 Reasoning 能問出結構化問題，例如「這四片是否構成一個 time + person + place 的完整場景骨架？」——答案是接近完整（缺一個明確 event），這個判斷後面 Missing Fragment 偵測會用到。

### Layer 3 — Context（上下文層）

同一個 Fragment 可同時存在於**多個 Context**。「宜蘭」可以是「高中畢旅」、「夏天的海邊」、也可以是「現居城市」。Context 不是唯一的，它是一組候選語境。這一層直接決定了 Reasoning 在不同故事裡如何解讀同一片碎片——同樣是「宜蘭」，在懷舊故事裡讀成畢旅，在日常故事裡讀成現居地。

### Layer 4 — Relations（關係層）

碎片與其他碎片的連結。Representation 保存的是**關聯，不是故事**：

```
宜蘭
├── 夏天   （co-occurrence）
├── 高中   （temporal proximity）
├── 我們   （shared scene）
└── 海邊   （spatial containment）
```

關鍵區別：Graph 不儲存「高中夏天我們在宜蘭海邊的那個故事」，Graph 只儲存「這幾片碎片之間存在關聯」。故事是 Reasoning 在推理當下、從這些關聯裡**臨時編織**出來的，而不是預先寫死的。這讓同一組碎片能在不同推理裡長出不同的故事。

### Layer 5 — Inference Metadata（推理中繼層）

不直接顯示給使用者，只供 Reasoning Layer 判斷用：

| 欄位 | 意義 |
|---|---|
| **Weight** | 此碎片在**當前推理**中的重要性（動態）|
| **Confidence** | AI 對自己理解此碎片的信心 |
| **Creator Relevance** | 此碎片對這位創作者的長期重要程度（跨故事）|
| **Last Updated** | 上次重算時間 |
| **Evidence Count** | 支撐此表示的證據數量 |

注意 **Weight** 與 **Creator Relevance** 的分工：前者是「此刻這個故事有多需要它」，後者是「這位創作者長期有多在乎它」。兩者刻意分離，避免把「一時的推理焦點」誤記成「創作者的核心 DNA」。

---

## Weight 是推理狀態，不是熱門度（Weight Is Reasoning State, Not Popularity）

Weight 最容易被誤解為「出現次數 / 熱門程度」。它不是。Weight 的定義是：

> 這個碎片，在**目前這一次推理**中的重要性。

因此 Weight 是隨故事重算的。同一組四碎片，在不同的敘事意圖下會得到不同的 Weight 分佈：

```
故事 A：懷舊青春            故事 B：一次夏日小旅行
─────────────────          ─────────────────
高中   0.95                夏天   0.93
我們   0.91                宜蘭   0.88
宜蘭   0.74                我們   0.55
夏天   0.42                高中   0.30
```

故事 A 的 Weight 分佈告訴 Reasoning：這其實是「**高中的我們**」的故事，宜蘭與夏天只是背景。故事 B 則相反，主軸變成「夏天去宜蘭」。Weight 不變，故事就無法轉向——這就是為什麼 Weight 必須是**動態、每次推理重算**的欄位，而不是一次寫死的靜態分數。

Representation 是動態的（Dynamic）也源於此：每當創作者新增一片碎片（例如補上「海邊」），都可能反向改寫既有碎片的 Representation——「海邊」的加入會提升「宜蘭」在夏日語境下的 Relations 密度與 Weight。Representation 是持續演化的活結構，不是一次建立、永久使用的死資料。

---

## Design Goals（設計目標）

本章存在，是為了回答一個工程問題：**Reasoning Layer 該讀什麼？**

- **把「可搜尋」升級為「可推理」。** 傳統 `{content, tags}` 足以做關鍵字檢索與向量相似度搜尋，但不足以推理——它答不出「重要程度、情緒、與其他碎片的關係、是否為創作者反覆出現的意象」。Representation 補上的正是這四類推理必需的資訊。
- **把 Fragment 與 Reasoning 解耦。** Representation 是兩者之間唯一的橋樑（bridge）。有了它，Reasoning 不必碰原始資料格式；改資料來源不會震動推理層。
- **讓推理可累積、可重複利用。** 一旦「宜蘭」被表示好，它可被無數次推理重複使用，而不必每次都從裸字串重新理解。
- **消除對 Prompt 的過度依賴。** 沒有 Representation，推理只能把所有理解塞進 Prompt 當下臨時生成；有了 Representation，理解被固化成結構、可被檢查、可被解釋。

---

## Design Constraints（設計限制）

- **Explainable（可解釋）優先於 clever。** 每個 Weight / Confidence 值都必須能回答「為什麼是這個數字」，並可經 Layer 1 的 Literal 與 Layer 5 的 Evidence Count 回溯。不允許出現無法解釋來源的分數。
- **不得只靠 Prompt。** Representation 必須是持久化的結構化資料，而非「每次呼叫 LLM 現算」。Prompt 只能消費 Representation，不能取代它。
- **Machine-readable 且 Human-understandable 並存。** 欄位要能被程式讀，也要能被人理解——因為當推理出錯時，需要人來稽核 Representation。
- **Extensible 但有紀律。** 任何新增欄位都必須**提升推理能力**，而不是單純增加資料複雜度。加欄位前要問：Reasoning 會用它嗎？不會就不加。
- **Context-aware。** 同一 Fragment 必須容許多重 Context 並存，不得強制單一解讀。
- **Literal 不可變。** 上層可任意重算，Layer 1 永遠是創作者原話的真相錨點。

---

## Engineering Notes（工程備註）

- **五層不必同時算滿。** Layer 1–2 可在 Fragment 建立當下同步生成（成本低）；Layer 4 Relations 與 Layer 5 Weight 建議 lazy / async 重算，尤其 Weight 應在**推理時**依故事意圖計算，而非寫入時固定。把 Weight 存成靜態欄位是最常見的設計錯誤。
- **Relations 用 Graph 存，別用故事樹存。** 若一開始就把碎片組成一棵「故事樹」，等於提前把故事寫死，後續就無法讓同組碎片長出不同敘事（見 Trade-offs）。存成無向 / 帶權關聯圖，把「編織成樹」的動作留給 Reasoning。
- **Confidence 與 Weight 不要混用同一個數。** 一片碎片可以「AI 很確定它是地點（高 Confidence）」但「在這個故事裡不重要（低 Weight）」。混用會讓推理排序失真。
- **Evidence Count 是防幻覺的錨。** 當 Weight / Relevance 偏高但 Evidence Count 偏低，應觸發警訊——這通常代表 AI 在**腦補**而非**根據證據**。
- **重算要有邊界。** Representation 動態演化，但新增一片碎片不該觸發全庫重算。用局部傳播（只重算受影響的鄰居節點）控制成本。

⟢ **AI 島現況對照**

- **已實作：** `ci_fragments` 已具備 Layer 1（原始內容）與部分 Layer 2 語意，並帶 `embedding vector(1536)`（向量表示可視為 Semantic 的一種實作）。Layer 4 Relations 已有雛形——`ci_related_fragments`（一般關聯）與 `ci_surprising_pairs`（意外配對）。Creator Relevance 的精神由 `analyzeDNA → ci_creator_dna` 承接。`ci_agent_runs` 記錄了執行 trace 的雛形。
- **尚缺：** 正式的**五層分層 Representation 尚未落地**——目前是「fragment + embedding + 關聯表」的扁平結構，而非明確的 L1–L5 物件。**Layer 5 Inference Metadata（尤其動態 Weight、Confidence、Evidence Count）尚未系統化**；Weight 隨故事重算的機制、以及 Context 多重語境的正式欄位皆未實作。目前碎片理解仍偏向「embedding 檢索 + prompt 現算」，離「持久化、可解釋、可稽核的 Representation」還有一段距離。

---

## Failure Cases（失效情境）

FIE 的 Representation 不是萬能，以下情境需人工介入或降級處理：

- **極短 / 極歧義碎片。** 單字「我們」若無任何其他碎片或 Context 佐證，Semantic 只能標到 person 這一層，Relations 為空，Weight 無從計算。此時 Representation 幾乎退化成裸字串，Confidence 應誠實給低分並提示創作者補充。
- **反諷 / 私人暗語 / 圈內梗。** 「宜蘭」對某位創作者若是分手地點的代稱，AI 無外部證據可推出這層私人語意，會誤標成中性地點。這類**個人化隱義**需創作者手動修正 Representation。
- **Context 衝突且無法排序。** 當「宜蘭」同時強關聯到「快樂畢旅」與「痛苦告別」兩個對立 Context、而證據勢均力敵時，Reasoning 無法自動決定該讀哪個，需人工指定敘事意圖。
- **證據稀薄卻被高權重。** 冷啟動階段碎片少，Weight / Relevance 容易被少量證據放大成假訊號（overfitting to sparse evidence）。此時應壓低整體 Confidence，避免系統過早「自信地」推錯。
- **創作者 DNA 漂移。** 創作者風格隨時間改變，舊碎片的 Creator Relevance 若不重估，會用過時的自我理解去推理新作品。需要定期 re-evaluate，而非一次算定。

---

## Trade-offs（取捨）

- **Graph vs Tree（關係圖 vs 故事樹）。** 選 Graph。Tree 提前把碎片組織成單一故事結構，效率高但**扼殺多重敘事**——同組碎片只能長出一個故事。Graph 保留所有關聯、把編織延後到推理當下，代價是查詢與遍歷成本較高。FIE 用成本換敘事自由度。
- **Fragment Representation vs Prompt（結構化表示 vs 全靠提示）。** 選 Representation。純 Prompt 方案零建置成本、即開即用，但理解無法持久、無法解釋、每次都重猜。Representation 需前期建置與維護成本，換來可累積、可稽核、跨故事複用的理解。
- **Rich vs Lean Representation（完整 vs 精簡表示）。** 選偏 Rich，但有紀律。表示越完整 → 推理品質越高、Candidate 越穩定、越可重用；代價是建立成本、更新成本、關聯維護複雜度全部上升。FIE 明確選擇**增加 Representation 成本，換取長期推理能力**，但用「每個欄位都要對推理有用」這條 Constraint 防止無限膨脹。
- **Static vs Dynamic Weight（靜態 vs 動態權重）。** 選 Dynamic。靜態 Weight 可預算、可快取，但無法讓同組碎片在不同故事間轉向；動態 Weight 每次推理重算，成本高但這正是「高中的我們」與「夏天去宜蘭」能從同四片碎片分岔的前提。
- **Memory vs Stateless（記憶 vs 無狀態）。** 選 Memory。無狀態系統每次從零理解、乾淨但無累積；帶記憶（Representation 持久化 + 演化）能讓 AI 越用越懂這位創作者，代價是要處理陳舊、漂移與一致性維護。

---

## Examples（範例）

**範例一｜同一碎片、多重 Context（宜蘭）。**
Literal `宜蘭` → Semantic `place` → Context 同時掛 `["高中畢旅", "夏天的海邊", "現居城市"]`。在懷舊故事裡 Reasoning 選 `高中畢旅` 讀法、Weight 拉到 0.74；在日常隨筆裡改選 `現居城市`、Weight 掉到 0.30。同一份 Representation，不同推理、不同讀法——這是 Layer 3 存在的理由。

**範例二｜Weight 隨故事重算（四碎片轉向）。**
輸入固定為「高中 / 夏天 / 我們 / 宜蘭」。
- 敘事意圖＝青春回憶 → Weight：高中 0.95、我們 0.91、宜蘭 0.74、夏天 0.42 → 故事圍繞「高中的我們」。
- 敘事意圖＝夏日小旅行 → Weight：夏天 0.93、宜蘭 0.88、我們 0.55、高中 0.30 → 故事圍繞「夏天去宜蘭」。
Representation 沒變、Weight 變了，故事就轉了向。

**範例三｜新碎片反向改寫舊 Representation（海邊加入）。**
創作者補上一片 `海邊`。Relations 傳播：`海邊` 與既有的 `宜蘭`、`夏天` 建立連結 → `宜蘭` 的 Layer 4 關係密度上升 → 在夏日語境下 `宜蘭` 的 Weight 被上調、`夏天` 的 Weight 也被強化。這演示 Representation Is Dynamic：一次新增觸發局部重算，而非全庫重算。

**範例四｜Confidence 與 Weight 分離（我們）。**
`我們` 的 Semantic＝person，AI 很確定它是「一個關係群體」（Confidence 0.9），但在一篇寫景散文裡它幾乎沒戲份（Weight 0.15）。兩個數字必須分開存，否則排序時會把「確定」誤當成「重要」。

---

## Counter Example（反例：不用 FIE，一般 AI 怎麼做）

把同樣四個詞交給一顆沒有 Representation 層的通用 LLM，典型做法是：

```
Prompt: 用「高中、夏天、我們、宜蘭」寫一個故事。
```

模型會在**這一次生成**裡，隱式地、當下地決定每個詞的意義、重要性與關係，然後直接吐出文字。差別在於：

| | 一般 AI（Prompt-only） | FIE（Representation-based）|
|---|---|---|
| 碎片理解 | 生成當下臨時猜 | 持久化五層結構，可複用 |
| 重要性（Weight）| 藏在模型內部、看不到、不可控 | 顯式欄位、隨故事重算、可調 |
| 關係 | 無法檢查 | Layer 4 Graph，可稽核 |
| 可解釋性 | 「為什麼這樣寫」無法回答 | 可回溯到 Literal 與 Evidence |
| 換故事 | 重寫 Prompt、結果不穩 | 改 Weight / Context，同碎片轉向 |
| 累積 | 每次從零開始 | 越用越懂這位創作者 |

一般 AI 不是不能寫出故事——它寫得出來，而且很快。它做不到的是：**告訴你它為什麼這樣理解「宜蘭」、讓你調整這個理解、並在下一篇作品裡記得這個調整。** Fragment 本身只是創作者留下的證據（Evidence）；Representation 才是 AI 理解這份證據的方式。沒有 Representation，Fragment 只是文字；有了 Representation，Fragment 才能進入推理流程。

---

# Chapter 6　Reasoning Pipeline（推理流程）

Chapter 4 定義了 AI「如何理解一個碎片」，Chapter 5 定義了碎片「被表徵成什麼」。本章定義最後一件事——**AI 依照什麼順序把一組碎片推理成可創作的結果**。Reasoning Pipeline 不是生成流程，而是生成之前那條「可觀察、可重現、可驗證」的思考路徑。

---

## 定位（Chapter Role）

Fragment Intelligence 回答的是「單顆碎片的意義」，Reasoning Pipeline 回答的是「一組碎片之間的推理如何逐步收斂」。

本章的核心主張只有一句：

> 推理不是一次模型輸出，而是一連串「逐步縮小可能性」的離散步驟；每一步的輸入、輸出、依據都必須能被單獨取出、檢查與替換。

Pipeline 的輸出**永遠不是作品**。它的輸出是一份結構化的推理結果（Reasoning Result），交給下一個階段（Generation）使用。作品只是這份推理結果的一種下游應用。

---

## Pipeline 架構（Pipeline Architecture）

v0.3 概念稿有兩版 Pipeline：初版（Relationship Analysis → Weight Calculation → …）與 Frozen 版（Observation → Hypothesis → Evidence → …）。v1.0 將兩者融合為一條八階段主流程——Frozen 版的「假設—證據」骨架為主軸，初版的 Weight / Relationship 併入 Representation 與 Evidence 階段。

```
                 ┌─────────────────────────┐
   Fragments ───▶│  0. Fragment Collection │  收集：一組已存在的 Fragment
                 └────────────┬────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │  1. Representation       │  轉成可推理表徵（見 Ch.5）
                 └────────────┬────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │  2. Observation          │  只建立事實，不推測
                 └────────────┬────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │  3. Hypothesis Gen.      │  發散：多個 Hypothesis
                 └────────────┬────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │  4. Evidence Validation  │  支持 / 缺失 / 矛盾
                 └────────────┬────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │  5. Missing Fragment     │  指出推理的不確定性
                 └────────────┬────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │  6. Candidate Ranking    │  收斂：Confidence 排序
                 └────────────┬────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │  7. Creator Context      │  依 Creator DNA 重排序
                 │     Alignment            │
                 └────────────┬────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │  8. Generation           │  下游：直接使用推理結果
                 └─────────────────────────┘
```

整條 pipeline 有一個貫穿的節奏：**Observation 收斂事實 → Hypothesis 發散可能 → Evidence/Ranking 再度收斂**。發散與收斂交替，是為了避免「過早收斂扼殺創意」與「永遠發散無法輸出」兩個極端。

### 各階段職責

| 階段 | 輸入 | 輸出 | 一句話職責 |
|---|---|---|---|
| 1 Representation | 原始 Fragment | 分層表徵（Surface/Semantic/Emotional/Relational） | 讓碎片變成可被推理的資料 |
| 2 Observation | 表徵 | 事實集合（時間/地點/人物/關係未知） | 只陳述、不解釋 |
| 3 Hypothesis | 事實集合 | 多個 Hypothesis | 追求覆蓋率，不追求正確率 |
| 4 Evidence | Hypothesis + Fragments | 每個假設的 support / missing / conflict | 提高可信度，不裁定真相 |
| 5 Missing Fragment | Evidence | 缺口清單 | 讓不確定性顯性化 |
| 6 Candidate Ranking | 假設 + 證據 | 帶 Confidence 的排序 | 建立探索順序，非唯一答案 |
| 7 Creator Alignment | 排序 + Creator DNA | 重排序 | 從「正確」轉向「像這位創作者」 |
| 8 Generation | Reasoning Result | 作品草稿 | 使用推理，不重新分析 |

### 主軸範例：四碎片走完全程

以全書主軸範例 `高中 / 夏天 / 我們 / 宜蘭` 走一遍：

```
[2] Observation
    時間 = 夏天（季節，非日期）
    地點 = 宜蘭（具體地名）
    人物 = 我們（複數，關係未知）
    語境 = 高中（人生階段）
    → 明確標記：人物關係「未知」，不假設是情侶或同學

[3] Hypothesis（發散，不裁定）
    H1 畢業旅行      H2 初戀
    H3 社團活動      H4 多年後重返舊地

[4] Evidence（逐一驗證）
    H1 support:{高中,我們,夏天}  missing:{事件}     conflict:{}
    H2 support:{高中,夏天}       missing:{兩人,情感} conflict:{我們=複數}
    H4 support:{高中,宜蘭}       missing:{時間跨度}  conflict:{「我們」現在式語感}

[5] Missing Fragment
    共同缺口 = 關鍵事件 / 衝突 / 結局
    → 回報給創作者，而非自行幻想補上

[6] Candidate Ranking（Confidence）
    H1 0.72  →  H3 0.55  →  H4 0.41  →  H2 0.33

[7] Creator Context Alignment（依 DNA 重排）
    某創作者 DNA = 偏好「時間跨度 / 遺憾」
    → 重排後 H4 升至第一，H1 降為第二
```

同一組 Fragment、同樣的證據，**不同創作者得到不同排序**——這正是 Creator Context Alignment 存在的意義。

---

## Reasoning Result（Pipeline 的輸出）

Pipeline 最終不輸出文字，而輸出一份結構化物件。Generation Engine 不再重新分析，直接消費它：

```
ReasoningResult {
  fragmentSummary : [...]              # 參與推理的碎片
  graph           : { nodes, edges }   # 關係圖
  timeline        : [...]              # 時間軸
  theme           : "..."              # 主題推測
  emotionCurve    : [...]              # 情緒曲線
  candidates      : [ { hypothesis, confidence,
                        usedFragments, missingFragments,
                        evidence } , ... ]
  missingFragment : [...]              # 全域缺口
  reasoningTrace  : [ step, input, output, reason ]  # 逐步追蹤
}
```

`reasoningTrace` 是本章與一般 LLM 生成最根本的差異：**推理過程本身被保存成第一級資料**，可被回放、稽核、diff。在 FIE 中，真正可累積的資產不是 Prompt，而是這條 trace。

---

## Design Goals

本章存在，是為了解決「AI 的理解無法被檢查、也無法被改進」這個根本問題。具體而言：

- **把「理解」從黑箱變成流程。** 一次性模型輸出無法回答「你為什麼這樣寫」；拆成八個離散步驟後，每一步都可被單獨質問。
- **讓推理成為獨立能力，而非生成的附屬品。** Pipeline 的產物（Reasoning Result）可被多個下游使用——生成、推薦、缺口提示、創作者分析——生成只是其中之一。
- **用多假設對抗過早收斂。** 若第一步就跳到「這是畢業旅行」，所有其他可能性都被扼殺。Hypothesis 階段刻意先擴大再收斂。
- **把不確定性顯性化。** Missing Fragment Detection 讓 AI 主動說「我還缺什麼」，而不是用幻想填補空白。
- **讓推理結果依創作者而異。** 同一組事實，經 Creator Context Alignment 後，對不同創作者呈現不同的探索順序。

---

## Design Constraints

Pipeline 的設計必須守住五條硬約束，否則它會退化回「換皮的一次性 Prompt」：

- **Deterministic Steps。** 每一階段對同一輸入，在同一組模型/參數下應產生可重現的輸出。隨機性只允許存在於明確標記的探索性節點，且必須記錄 seed。
- **Explainable Decisions。** 每個 Candidate 必須攜帶 `usedFragments` / `missingFragments` / `evidence`。無法解釋的候選不得進入排序。
- **不能只靠 Prompt。** 推理邏輯（Observation 與 Hypothesis 的界線、Evidence 的判準）必須以流程與資料結構固化，而非全塞進一段自然語言指令。Prompt 可作為某一步的實作，但不得成為唯一的推理載體。
- **Reproducible + Incremental。** 新增一顆 Fragment 應能增量更新推理，而非整條 pipeline 重跑；trace 必須可回放至任一中間狀態。
- **Replaceable Components。** 任一階段（例如把 Hypothesis 從 LLM 換成規則引擎，或把 Ranking 換成學習到的排序器）必須能在不改動相鄰階段介面的前提下被替換。

---

## Engineering Notes

- **階段介面先於階段實作。** 先凍結每一步的輸入/輸出 schema（尤其 `candidate` 與 `evidence` 的欄位），再談內部怎麼算。schema 一旦穩定，各階段就能各自用 LLM、規則或檢索實作並獨立測試。
- **Observation 與 Hypothesis 的污染是頭號陷阱。** 工程上最容易出錯的地方，是讓 Observation 步驟「順便」推測出「這是畢業旅行」。實作時應強制 Observation 的輸出 schema **只允許事實欄位**（time/place/person/relation=unknown），從結構上禁止它寫入假設。
- **Confidence 不要用單一模型自評分。** 建議 `confidence = f(evidenceCount, missingCount, conflictCount, creatorRelevance)`，各因子可獨立觀察、獨立調權；純靠 LLM 自報信心分數不可重現也不可稽核。
- **Weight 是動態的。** v0.3 初版的 Weight Calculation 併入 Evidence 階段：某顆 Fragment 是主線還是背景，應隨當前 Hypothesis 改變，而非永久固定（「宜蘭」在 H1 是背景、在 H4「重返舊地」是主線）。
- **Missing Fragment 是提示不是強制。** 缺口偵測的輸出是「回報給創作者的建議」，絕不能變成阻擋生成的必填欄位——否則 pipeline 會卡死在等待補件。
- **Reasoning Trace 要能 diff。** 把 trace 存成可比對的結構，讓「改了一顆 Fragment 後推理如何改變」變成一次 diff，這是後續調參與回歸測試的基礎。

⟢ **AI 島現況對照**

- **已實作（部分承載本章職責）：** `ci_fragments`（含 `embedding vector(1536)`）提供 Representation 的原料；`ci_related_fragments` / `ci_surprising_pairs` 承擔了初版「Relationship Analysis」的一部分；`analyzeDNA → ci_creator_dna` 對應 Stage 7 Creator Context Alignment 的資料基礎；synthesize / evolve / compose / transcreate 這幾個 agent 大致對應 Stage 8 Generation；`ci_agent_runs` 是 Reasoning Trace 的**雛形**（記錄了執行，但非逐步 step-level trace）。
- **尚缺：** 目前**沒有正式的八階段 Reasoning Pipeline**——Observation / Hypothesis / Evidence Validation 三個中間階段尚未拆分，實務上是「碎片 + 記憶（`ci_memories`）注入 prompt 後由 agent 一次性輸出」。因此 **多 Candidate + Confidence 排序、Missing Fragment 偵測、完整 step-level Reasoning Trace、Deterministic Steps 的可重現保證** 皆尚未落地。換言之，AI 島現況接近「Representation → Generation」直連，本章描述的中段推理骨架是 v1.0 的目標架構，而非既有實作。

---

## Failure Cases

FIE 的 Reasoning Pipeline 不是萬能的，以下情況會做不好、需要人工介入：

- **碎片過少或全為抽象詞。** 若輸入只有 `夏天` 一顆，Observation 幾乎無事實可建、Hypothesis 淪為亂猜，Confidence 全面偏低。此時應退回「請創作者補碎片」，而非強行生成。
- **碎片彼此無任何關聯。** 例如 `量子力學 / 宜蘭 / 童年 / 報稅`，Evidence 階段找不到共同支持，所有 Candidate 都是低信心的牽強連接。這類「真正無關」與 Ch.4 追求的「意外連接」不同，需人工判斷是否為有意的荒謬創作。
- **Creator DNA 樣本不足。** 新創作者尚無足夠歷史，Stage 7 的重排序退化為近乎預設排序，pipeline 無法個人化。
- **矛盾證據勢均力敵。** 當兩個 Hypothesis 的 support/conflict 幾乎對稱（如 H1 畢業旅行 vs H4 多年後重返），排序沒有明確贏家，應把「這是一個分岔」如實呈現給創作者，而不是硬選一個。
- **創作者刻意要「反邏輯」。** Pipeline 本質在收斂到「最合理」的推理；若創作意圖正是超現實、反因果，過強的 Evidence Validation 反而會壓抑創意，需要人工調降收斂強度。

---

## Trade-offs

- **Graph vs Tree（關係結構）。** 選 Graph：碎片關係是網狀的（宜蘭同時連接地點、回憶、同伴），Tree 會強迫單一父子階層而遺失交叉關係。代價是 Graph 的推理與去環更複雜、可視化更難。
- **Multiple Candidate vs Single Answer。** 選 Multiple：單一答案等於過早收斂，扼殺 Hypothesis 階段辛苦建立的覆蓋率。代價是下游必須處理排序與呈現多候選的複雜度、算力上升。
- **Fragment-driven vs Prompt-driven。** 選 Fragment：推理依據存在結構化資料裡，可稽核、可增量、可替換；純 Prompt 把邏輯藏在自然語言中，不可重現。代價是前期工程成本高得多。
- **Stateful（Memory）vs Stateless。** 選 Stateful：Creator Context Alignment 與增量更新都需要跨次記憶（`ci_memories` 的方向）。代價是狀態管理、隱私邊界、以及「舊記憶污染新推理」的風險。
- **Deterministic vs Creative Randomness。** 選以 Deterministic 為預設、把隨機性隔離在明確標記的探索性節點。代價是純確定性會讓輸出偏保守，需在受控處注入可記錄 seed 的隨機。

---

## Examples

**Example 1｜主軸四碎片（收斂型）**
輸入 `高中 / 夏天 / 我們 / 宜蘭`。Observation 建立四項事實並標記「關係未知」；Hypothesis 產出 {畢業旅行, 初戀, 社團, 重返舊地}；Evidence 判定「我們=複數」與「初戀（兩人）」矛盾，H2 降權；Ranking 得 H1 0.72 居首；Creator DNA 偏好「時間跨度」時，Stage 7 把 H4 拉到第一。Reasoning Trace 完整記錄這八步。

**Example 2｜缺口驅動（Missing Fragment 主導）**
輸入 `高中 / 夏天 / 宜蘭`（去掉「我們」）。Observation 發現**人物完全缺失**；Hypothesis 仍能生成場景假設，但 Evidence 對每一個假設都回報 `missing:{人物, 衝突, 結局}`。Missing Fragment Detection 回報「補一個人物可將最高 Confidence 從 0.48 提升」，交由創作者決定是否補碎片——AI 不自行虛構主角。

**Example 3｜同碎片不同創作者（Alignment 主導）**
兩位創作者輸入同一組 `高中 / 夏天 / 我們 / 宜蘭`。創作者 A 的 DNA 偏「青春喜劇」→ 排序 H1 畢業旅行、H3 社團在前；創作者 B 的 DNA 偏「懷舊遺憾」→ 同一份 Evidence 下 H4 多年後重返被拉到首位。**Stages 1–6 完全相同，只有 Stage 7 不同**，證明 Alignment 是可獨立替換的一層。

**Example 4｜意外連接（發散型）**
輸入 `宜蘭 / 演算法 / 外婆`。Evidence 找不到強共同支持，但 `ci_surprising_pairs` 式的意外配對讓 Hypothesis 生成「用演算法重建外婆在宜蘭的一天」這種低機率高新意的候選；Confidence 偏低但標記為「探索性」，交創作者判斷——展示 pipeline 如何在不硬收斂的情況下保留意外性。

---

## Counter Example

**若不使用 FIE，一般 AI 會怎麼做？**

把四個詞塞進一個 Prompt——`「用『高中、夏天、我們、宜蘭』寫一個故事」`——模型一次性直接輸出一篇文字。差異在於：

| 面向 | 一般 LLM 一次性生成 | FIE Reasoning Pipeline |
|---|---|---|
| 過程 | 黑箱，一步到位 | 八個離散、可觀察的步驟 |
| 假設 | 隱式選定一種（通常是最常見的「畢業旅行」） | 顯式列出多個 Hypothesis 並保留 |
| 依據 | 無，問「為何這樣寫」答不出 | 每個 Candidate 帶 usedFragments/evidence |
| 缺口 | 直接幻想補上缺失的人物/事件 | 主動回報 Missing Fragment，交創作者決定 |
| 個人化 | 靠 Prompt 硬塞風格描述 | 靠 Creator DNA 在 Stage 7 重排序 |
| 可累積資產 | Prompt 本身 | Reasoning Trace（推理流程） |
| 可重現/可稽核 | 換次數就變 | Deterministic Steps + Trace 可回放 |

一般 AI 的輸出是「一個看起來合理的答案」；FIE 的輸出是「一組可解釋、可排序、可修改的推理，外加一個下游生成」。前者無法回答「為什麼」，也無法在不重寫 Prompt 的情況下改進；後者把「理解」變成一個可以長期演進、且不綁死單一模型的獨立能力。

---

# Chapter 7　Multiple Narratives（多重敘事）

本章定義 Reasoning Layer 的輸出契約：面對一組 Fragment，FIE 不收斂到單一 Best Answer，而是建立一個由多個 Candidate 組成、可持續演化的 **Candidate Space（可能性空間）**。這是 FIE 與一般生成式 AI 在系統層級最根本的分野。

---

## 核心內容（Core）

### 從 Best Answer 到 Candidate Space

一般生成流程是一次性收斂：

```
Prompt ──▶ Decode ──▶ Best Answer（單一輸出）
```

創作場景的真實需求不是「正確答案」，而是「值得探索的可能」。Reasoning Layer 因此改為發散式輸出：

```
Fragments ──▶ Divergent Reasoning ──▶ Candidate Space
                                        ├─ Candidate A（Hypothesis + Trace）
                                        ├─ Candidate B
                                        ├─ Candidate C
                                        └─ …（各自可再推理、可合併、可淘汰）
```

關鍵語意差異：Best Answer 是**終點**；Candidate 是**中間成果（半成品故事）**，可被創作者選取、合併、修改或整批捨棄後重新推理。

### Divergent Thinking（發散思考模型）

FIE 模擬創作者的真實思路，而非一次收斂：

```
一個起點 ──▶ 展開多種可能 ──▶ 淘汰 ──▶ 修改 ──▶ 重組 ──▶ 作品
             （FIE 負責這段）        （創作者主導這段）
```

系統的責任邊界很清楚：AI 負責**擴大合理可能的集合**，創作者負責**決定哪個世界值得繼續探索**。FIE 不追求取代創作者，而是擴大其選擇空間。

### 主軸範例：四碎片的 Candidate Space

輸入 Fragment：

```
高中 · 夏天 · 我們 · 宜蘭
```

一般 AI 會直接回傳「一趟宜蘭畢業旅行的散文」。FIE 則建立一組平行 Candidate：

| Candidate | Hypothesis | Theme | Confidence | Creator Fitness |
|-----------|-----------|-------|-----------|-----------------|
| A | 畢業旅行的最後一夜 | 青春 / 離別 | 0.88 | 0.83 |
| B | 那年夏天沒說出口的初戀 | 初戀 / 遺憾 | 0.81 | 0.90 |
| C | 「我們」中有人不會再來的最後相聚 | 失去 / 追憶 | 0.76 | 0.71 |
| D | 多年後獨自重返宜蘭舊地 | 時間 / 物是人非 | 0.69 | 0.78 |
| E | 平行時空裡的另一種夏天 | 假設 / 重逢 | 0.52 | 0.60 |

這些 Candidate **並非互斥**，而是同一組 Fragment 的不同推理方向。`Confidence` 衡量「推理鏈的成立程度」，`Creator Fitness` 衡量「與此創作者 Creator DNA 的契合度」——兩者刻意分離：一個合理但不像你的故事，與一個略牽強但深合你風格的故事，應由創作者而非分數自行取捨。

### Candidate 結構（Candidate Structure）

每個 Candidate 至少承載以下欄位，構成一個可再編輯、可追溯的結構化物件：

| 欄位 | 意義 |
|------|------|
| `Hypothesis` | 這條敘事的核心假設（如「B：夏天的暗戀最終未說出口」） |
| `Supporting Evidence` | 支撐此假設的 Fragment 與其貢獻（「我們」→ 群體中的個人視角） |
| `Missing Fragment` | 使此敘事更成立、但目前缺席的碎片（如「B」缺少一個「對象」Fragment） |
| `Timeline` | 敘事的時間骨架（夏初 → 盛夏 → 離別前夕） |
| `Emotion Curve` | 情緒隨時間的曲線（悸動 ↗ 猶豫 → 遺憾 ↘） |
| `Theme` | 抽象主題標籤 |
| `Confidence` | 推理鏈成立程度（0–1） |
| `Creator Fitness` | 與 Creator DNA 的契合度（0–1） |
| `Reasoning Trace` | 從 Fragment 到 Hypothesis 的可解釋推理路徑 |

`Missing Fragment` 是本章與 Ch06 Reasoning Pipeline 的接點：它讓 Candidate 不只是「現在能推出什麼」，還能主動指出「補上什麼碎片，這條路會更強」。

### Candidate Evolution（候選演化）

Candidate 不是一次性排序的靜態清單，而是隨 Fragment Pool 變化而重排的動態集合。當創作者新增一個 Fragment：

```
新增 Fragment：「畢業紀念冊」
        │
        ▼
Re-score 所有 Candidate
        │
        ▼
原本排第五的 E（平行時空）confidence 0.52 → 0.41（更被邊緣化）
原本排第四的 D（多年後重返）0.69 → 0.86（紀念冊強化「回望」語意，躍升第一）
```

因此系統必須支援**持續演化（Continuous Evolution）**而非一次排序：任何 Fragment Pool 的增減都應觸發整個 Candidate Space 的重估。

### Candidate Merge（候選合併）

Candidate 之間可分離、也可合併。創作者可將 B（初戀）的 `Emotion Curve` 與 D（多年後重返）的 `Timeline` 合併，產生新 Candidate B+D：

```
Merge(B, D)
  Timeline   ← D（跨越十年的雙時間軸）
  EmotionCurve ← B（悸動→遺憾）疊加於 D 的回望框架
  Hypothesis ← 「多年後重返宜蘭，才敢承認那年夏天的暗戀」
  Trace      ← 保留 B 與 D 各自的來源 Trace（可追溯合併決策）
```

Merge 必須是**可追溯**的：合併後的 Candidate 保留兩條母 Trace，讓創作者知道每個元素從哪條敘事而來。

---

## Design Goals（設計目標）

本章存在的理由，是回答一個系統性問題：**當創作沒有唯一正解時，AI 的輸出契約應該長什麼樣？**

- **把「找答案」重新定義為「建立可能性空間」。** 創作者尋找的是靈感而非標準答案；單一 Best Answer 在結構上就無法服務這個需求。
- **讓輸出成為可操作的中間物，而非終點。** Candidate 是半成品故事，必須可選、可改、可合、可棄。
- **把「機率高」與「像你」拆開。** 透過 `Confidence` 與 `Creator Fitness` 兩個獨立維度，避免用單一分數替創作者做主觀決定。
- **讓可能性隨創作過程生長。** 新增一個 Fragment 就該重塑整個空間，使創作是一段對話而非一次查詢。

---

## Design Constraints（設計限制）

- **Reasoning 必須 Explainable。** 每個 Candidate 都要附 `Reasoning Trace`；沒有 Trace 的 Candidate 視為無效輸出，不得進入 Candidate Space。
- **不能只靠 Prompt 一次生成多篇。** 「叫 LLM 給我五個版本」產出的是五段平行文字，彼此無共享狀態、無法被獨立 re-score、無法 merge。多重敘事要求的是**多條有結構、可演化的推理路徑**，不是多份成品。
- **Candidate 必須是結構化物件，不是純文字。** 沒有 `Timeline` / `Emotion Curve` / `Missing Fragment` 等欄位，就無法演化、無法合併、無法解釋。
- **Confidence 與 Creator Fitness 必須可分離計算。** 兩者混為一個總分會讓系統僭越創作者的品味決定。
- **AI 不得替創作者做最終選擇。** 系統只排序與呈現，選定、合併、捨棄的動作權保留給創作者。

---

## Engineering Notes（工程實作要點）

- **Candidate 應建模為獨立、可持久化的實體**，而非某次生成回應的臨時欄位。它需要穩定 ID、版本、來源 Fragment 引用與 Trace，才能支援 Evolution 與 Merge。
- **Re-score 要增量而非全量重跑。** Fragment Pool 每次變動都全量重新推理成本過高；應快取每個 Candidate 的 Evidence 綁定，只重算受新 Fragment 影響的部分。
- **Candidate 數量要設閘門。** 發散不等於無限；建議上限（如 5–8 個進入 Space），其餘壓入「潛在候選」池，避免創作者被淹沒（見 Failure Cases）。
- **Merge 要做語意去重與衝突偵測。** 兩個 Candidate 的 `Timeline` 若矛盾（一個是「當下」、一個是「十年後」），合併時要顯性標記衝突而非默默拼接。
- **Trace 要可序列化並與 Candidate 一起儲存**，否則演化幾輪後就無法回答「這個 Candidate 為什麼在這」。
- **取捨提示：** `Creator Fitness` 依賴 Creator DNA，冷啟動（新創作者、DNA 稀薄）時該維度不可靠，此時應調降其權重、避免用一個近乎隨機的 Fitness 誤導排序。

⟢ **AI 島現況對照**

- **已實作（近似 Candidate 的雛形）：** `ci_surprising_pairs`（意外配對）與 `ci_related_fragments` 提供了「同一組 Fragment 可通往不同方向」的資料基礎；`ci_fragments.embedding vector(1536)` 支撐相似度推理；synthesize / evolve / compose / transcreate 四個 AI agent 已能對 Fragment 做凝聚、演化與編織，等於零散地做了「產生一種敘事」的動作；`analyzeDNA → ci_creator_dna` 為 `Creator Fitness` 準備了資料源；`ci_agent_runs` 是 `Reasoning Trace` 的雛形。
- **尚缺：** 正式的 **Candidate 實體**（目前 agent 輸出是單一結果，不是多個可並存、可持久化的結構化 Candidate）；**多 Candidate + Confidence／Creator Fitness 雙維排序**；完整可序列化的 **Reasoning Trace**；**Missing Fragment 偵測**；**Candidate Evolution（增量 re-score）**與 **Merge** 機制。現況是「一次產一種」，尚未形成可探索、可演化的 Candidate Space。

---

## Failure Cases（失效情境，需人工介入）

- **Fragment 過少或過發散。** 只有「夏天」一個 Fragment 時，Candidate Space 會退化成泛泛主題清單，Confidence 普遍偏低且彼此高度相似——此時系統應誠實回報「碎片不足以支撐有區隔的敘事」，而非硬湊五個。
- **Candidate 同質化。** 五個 Candidate 其實是同一個故事的措辭變體（A/B/C 都是「畢業旅行」換句話說）。需要語意去重與最小差異度閘門；退化時應收斂數量並提示創作者補入異質 Fragment。
- **Creator DNA 稀薄導致 Fitness 失真。** 新創作者的 `Creator Fitness` 近乎噪音，排序不可信，需降權或暫時隱藏該維度。
- **Merge 產生語意矛盾。** 合併兩個時間軸/情緒曲線衝突的 Candidate，生成不自洽的故事；系統應標記衝突並要求創作者裁決，而非自動輸出。
- **選擇過載。** 呈現過多 Candidate 反而癱瘓創作者決策——這是產品層問題，工程上需靠數量閘門與清楚的維度呈現緩解，但最終仍需人工判斷。

---

## Trade-offs（取捨）

- **Single vs Multiple Candidate。** 選 Multiple。單一輸出對創作場景是結構性錯誤——它假設存在唯一正解。代價是排序、儲存、演化的複雜度大增，且引入「選擇過載」風險；我們接受這個代價，因為它換來的是創作空間而非答案。
- **Prompt「一次多版」 vs Fragment 驅動的結構化 Candidate。** 選後者。Prompt 多版本便宜但拋棄式：無共享狀態、無法 re-score、無法 merge、無 Trace。Fragment 驅動貴，但每個 Candidate 是可演化、可解釋、可組合的實體。
- **Graph vs Tree（Candidate 組織結構）。** 選 Graph。Tree 假設 Candidate 只會分岔不會匯流，但 Merge 需要不同分支重新交會，這是 Graph 的語意。代價是遍歷與去環成本較高。
- **Continuous Evolution（Memory）vs Stateless Re-generation。** 選有狀態的演化。每次新增 Fragment 就整批重新生成，會丟失 Candidate 的身分與歷史，創作者無法「持續培養某條敘事」。代價是需維護 Candidate 狀態與增量 re-score 邏輯。
- **Confidence 與 Creator Fitness 分離 vs 合併為單一總分。** 選分離。合併省事、排序直觀，但等於用一個標量替創作者做了品味決定；分離才守得住「AI 提供可能、創作者保留創造力」的邊界。

---

## Examples（範例）

**Example 1 — 主軸四碎片的 Candidate Space（發散）**
輸入「高中 / 夏天 / 我們 / 宜蘭」。FIE 不回傳單篇畢業旅行散文，而是建立 A（畢業旅行）0.88、B（未說出口的初戀）0.81 且 Fitness 最高 0.90、C（最後一次相聚）0.76、D（多年後重返）0.69、E（平行時空重逢）0.52 五條並存路徑。創作者一眼看見「B 最像我」而非只拿到系統認為機率最高的 A。

**Example 2 — 新增 Fragment 觸發 Evolution（重排）**
在上例中加入 Fragment「畢業紀念冊」。系統增量 re-score：D 的 Confidence 從 0.69 升到 0.86（紀念冊強化「回望/物是人非」語意）躍居第一，E 從 0.52 降到 0.41 被邊緣化。Candidate Space 隨創作者持續投餵碎片而生長，而非每次重問。

**Example 3 — Candidate Merge（合併）**
創作者選 B 與 D 執行 Merge。系統取 D 的雙時間軸 `Timeline`、疊加 B 的「悸動→遺憾」`Emotion Curve`，生成 B+D：「多年後重返宜蘭，才敢承認那年夏天的暗戀」，並保留 B、D 兩條母 `Reasoning Trace`。這是一條原本不在初始五個 Candidate 中、由創作者與 FIE 共同長出的新敘事。

**Example 4 — Missing Fragment 提示（補洞）**
Candidate B（初戀）的 `Missing Fragment` 欄位標記「缺少一個明確的『對象』Fragment」。系統提示：若補入如「轉學生」或「同社團的她」這類碎片，B 的 Confidence 可望自 0.81 提升。FIE 不只回答「現在能推出什麼」，還指出「補什麼碎片這條路會更成立」。

---

## Counter Example（對照：不用 FIE 的一般 AI 怎麼做）

給一般聊天式 AI 同樣的「高中 / 夏天 / 我們 / 宜蘭」：

```
Prompt ──▶ LLM ──▶ 「一篇溫暖的宜蘭畢業旅行回憶散文」（單一成品）
```

即使追加要求「給我五個版本」，得到的是五段平行文字：

- 彼此**無共享狀態**——你無法對其中一段獨立補 Fragment 再讓它重排；
- **無結構**——沒有 `Timeline` / `Emotion Curve` / `Missing Fragment`，無法演化也無法合併；
- **無 Trace**——你不知道「初戀版本」是怎麼從這四個詞推出來的，也無從追問；
- **無 Creator Fitness**——系統不知道哪個版本「像你」，只能給你它認為最通順的那個。

差別的本質：一般 AI 交付的是**答案（終點）**；FIE 交付的是**可能性空間（可持續探索、可演化、可解釋、可組合的中間物）**。前者結束了創作，後者才剛把創作的入口交還給創作者。

---

# Chapter 8　Creator Context（創作者上下文）

本章定義 Creator Context：讓 FIE 的 Reasoning 不只理解「有哪些 Fragment」，還理解「這些 Fragment 是誰留下的」，並在「更懂創作者」與「不把創作者困在過去」之間取得可控的平衡。

---

## 8.1　為什麼 Fragment 不能脫離創作者被推理（Fragments Are Not Context-Free）

Fragment 本身沒有絕對意義。同一組 Fragment，交給不同創作者，不應得到完全相同的 Reasoning 結果。

以本書貫穿的四碎片為例：

```
高中  夏天  我們  宜蘭
```

若只依賴大眾語料（general corpus prior），FIE 會推理出一組「大眾合理」的 Hypothesis：

```
畢業旅行 / 青春回憶 / 友情 / 初戀
```

這些不是錯的。問題在於——它們對「任何人」都成立，因此對「這位創作者」都不夠準。當某位創作者的長期作品裡反覆出現 `已讀`、`腳尖`、`凌晨三點`、`捷運站`、`奶茶`，那麼同樣這四個 Fragment，更貼近他的 Hypothesis 可能是：

> 多年後想起一段沒有說出口的喜歡。

Creator Context 的職責，就是把 Reasoning 從 **plausible-in-general**（大眾合理）推向 **plausible-for-this-creator**（對此人合理）。缺少這一層，FIE 會退化成一台語意搜尋引擎——能連結 Fragment，卻讀不懂 Fragment 的主人。

---

## 8.2　Creator Context ≠ 個人資料（Creation Habits, Not Identity）

這是本章最容易被誤解、也最重要的一條分界線。Creator Context 描述的是**創作者如何創作**，不是**創作者是誰**。

| 不屬於 Creator Context（Identity） | 屬於 Creator Context（Creation Habit） |
|---|---|
| 年齡 / 性別 / 職業 | 常見主題（common themes） |
| 真實姓名 / 地址 | 常見情緒與 Emotion Curve |
| 帳號 / 裝置 / 定位 | 常見意象（common images） |
| 消費紀錄 / 社交關係 | 常見敘事節奏與人物關係 |
| 任何用於辨識「本人」的欄位 | 常用 Fragment 群組 / 常接受或否決的 Candidate |

換句話說，Creator Context 是一份 **Reasoning Context**，不是一份 **User Profile**。它的存在不是為了辨識個人、也不是為了投放，而是為了讓 Reasoning Layer（Chapter 3）在為候選 Hypothesis 打分時，有一個「這位創作者傾向」的先驗可以參照。這條界線決定了整套系統是「創作助手」還是「監控檔案」，不容模糊。

---

## 8.3　Creator DNA（長期累積的創作傾向）

當 Creator Context 隨時間累積、且從離散的 Fragment 提煉成穩定的傾向向量後，就形成 **Creator DNA**。

Creator DNA 不是單一標籤，而是一組**推理方向（reasoning directions）**。例如某位創作者長期使用：

```
早餐店奶茶  捷運站  已讀  凌晨三點  腳尖  宜蘭  夏天
```

FIE 不應只記住這些字詞（那只是 Fragment 快取），而應理解它們反覆共現時傾向凝結出的創作傾向：

```
Fragments (surface)              Creator DNA (distilled tendency)
─────────────────                ───────────────────────────────
奶茶 / 捷運站 / 凌晨三點     →     都市日常、微物承載巨大情感
已讀 / 腳尖             →     暗戀、等待、錯過
夏天 / 宜蘭             →     溫柔但帶刺、日常場景裡的心理轉折
```

關鍵原則：**Creator DNA 提供的是推理方向，不是創作限制。** 它讓 AI 更快進入創作者的語境，而不是預先決定創作者只能寫什麼。DNA 是一個「起手偏好」，永遠可被當下的 Fragment 與所選推理模式覆寫。

---

## 8.4　Creator Context 如何參與推理（Where It Enters the Pipeline）

Creator Context 不直接改寫故事，也不直接生成 Fragment。它作為一組權重與偏好，注入 Reasoning Pipeline 的評分與排序階段：

```
Fragments ──▶ Representation ──▶ Candidate Hypotheses ──┐
                                                        │  影響：
Creator Context ────────────────────────────────────────┤  • Candidate 排序（re-ranking）
                                                        │  • Theme 偏好
                                                        │  • Emotion Curve
                                                        │  • Missing Fragment 建議
                                                        │  • Generation Tone
                                                        └▶ • Exploration Level
```

它**改變 Fragment 被推理的方向，而不是創造 Fragment**。同一組四碎片 `高中 / 夏天 / 我們 / 宜蘭`，在不同 Creator Context 下，Candidate 排序（同一批候選、不同 Confidence）會不同：

| 排序 | Creator A（青春校園取向） | Creator B（都市遺憾取向） | Creator C（懸疑奇幻取向） |
|---|---|---|---|
| 1 | 畢業旅行 | 多年後重返宜蘭 | 那年夏天有一個人被大家遺忘 |
| 2 | 友情 | 沒說出口的初戀 | 宜蘭旅行後時間線改變 |
| 3 | 初戀 | 畢業前最後一次見面 | 高中同學多年後收到同一張照片 |
| 4 | 多年後重逢 | 友情 | 畢業旅行 |

三位創作者拿到的是**同一批候選 Hypothesis**，Creator Context 只重排了它們的 Confidence——這正是「不創造、只導向」的體現。

---

## 8.5　三種推理模式（Familiar / Adjacent / Exploratory）

若 FIE 永遠依 Creator DNA 排序，創作者會越寫越像自己。為了讓「懂創作者」不等於「困住創作者」，Reasoning Layer 必須顯式提供三種模式，並**明確標示每個 Candidate 屬於哪一種**：

```
        離創作者慣性的距離 ───────────────────────▶
   Familiar            Adjacent               Exploratory
   ┌────────┐          ┌────────┐             ┌────────┐
   │ 沿用   │          │ 鄰近   │             │ 刻意   │
   │ 既有   │          │ 擴張   │             │ 偏離   │
   │ 風格   │          │ 探索   │             │ 慣性   │
   └────────┘          └────────┘             └────────┘
```

**1. Familiar Mode** — 依創作者既有風格推理。適合維持品牌一致性、系列作品、商業穩定輸出。風險：創作舒適圈。

**2. Adjacent Mode** — 在熟悉風格的鄰域探索。一位常寫「青春遺憾」的創作者可被引導到青春懸疑、青春奇幻、多年後重逢、校園群像。**這是最適合長期創作成長的模式**：既沒完全離開核心，也沒停在原地。

**3. Exploratory Mode** — 刻意遠離慣性，用於突破卡關、嘗試新題材、建立新世界觀。風險：輸出可能不符合當下期待，因此 **Exploratory 的 Candidate 必須清楚標示為 Exploratory，不能偽裝成「最推薦」**。誠實標示模式，是這一節的硬性契約。

---

## 8.6　回音室效應與 Consistency vs Expansion（The Echo Chamber Problem）

若 AI 長期只依 Creator DNA 推理，會產生**創作回音室效應（Creative Echo Chamber）**：AI 越懂創作者，越只給創作者「已經會寫的東西」。這看似貼心，實則危險——創作不是重複自己，也需要偏離、冒險與更新。

因此 Creator Context 必須同時保存兩股相互拉扯的力量：

```
  Consistency  ◀──────── tension ────────▶  Expansion
  保持辨識度                                 推動往外探索
  (Familiar 傾向)                            (Exploratory 傾向)
```

FIE 的價值不能只是「更懂你」，它必須在恰當時機主動問：

> 你要不要試試另一條路？

這股張力不該被「調成一個最佳值」永久固定，而應由創作者透過模式選擇與下一節的 Feedback Loop 持續校準。

---

## 8.7　Creator Feedback Loop（從行為更新，而非從宣稱更新）

Creator Context 不應只靠 AI 推測，也不應只靠創作者一次性填問卷。它必須從創作者的**實際行為**中更新——因為行為比宣稱更誠實：

- 選了哪個 Candidate？刪掉哪個？
- 哪個 Missing Fragment 被補上？
- 生成後手動修改了哪些句子？
- 哪些作品被保存、哪些被發布？
- 哪些風格被反覆使用？

更新來源的資料流：

```
Fragment Usage
      ↓
Candidate Selection
      ↓
Manual Edits
      ↓
Saved Works
      ↓
Published Works
      ↓
Feedback (implicit + explicit)
      ↓
Creator DNA Update
```

原則：**單次 Prompt 的權重應低於重複、被保存、被發布的行為。** 一時的實驗性輸入不該立刻改寫 DNA；被反覆選用並最終發布的模式，才值得沉澱為長期傾向。

---

## 8.8　隱私與控制（Privacy and Control）

Creator Context 涉及長期創作記憶，必須以**創作者控制**為前提。基本原則：

1. 創作者**可查看** Creator Context 的完整內容。
2. 創作者**可修改**錯誤的推理（例如刪掉一個被誤判的 theme）。
3. 創作者**可刪除**不想保留的記憶。
4. 創作者**可關閉**特定 Context 對推理的影響（暫時停用，而非永久刪除）。
5. 系統**必須區分**「創作偏好」與「敏感個人資訊」，後者根本不該進入 Context。

一句話收束：**Creator Context 的目標是協助創作，不是收集人生。** 這五條不是產品功能列表，而是 §8.2「非個人資料」界線在系統層的強制落實。

---

## 8.9　Creator Context 資料範例（Reference Schema）

一個最小可行、但已足以驅動 Reasoning 的 Creator Context：

```json
{
  "creatorId": "creator_001",
  "commonThemes": ["青春", "遺憾", "都市日常"],
  "commonImages": ["奶茶", "捷運站", "凌晨三點", "腳尖", "已讀"],
  "preferredNarrativeModes": ["回憶", "內心獨白", "慢節奏"],
  "emotionTendency": ["溫柔", "隱忍", "帶刺"],
  "candidatePreferences": {
    "familiar": 0.5,
    "adjacent": 0.35,
    "exploratory": 0.15
  },
  "negativePatterns": ["過度雞湯", "模板化青春"],
  "control": {
    "visible": true,
    "editable": true,
    "influenceEnabled": true
  }
}
```

`candidatePreferences` 是三種推理模式的預設混合比例（§8.5），`negativePatterns` 是創作者反覆否決的模式（Feedback Loop 的產物），`control` 對應 §8.8 的可查看／可修改／可關閉。這份結構不需一開始就完美——重點是讓 Reasoning Layer 能「參考創作者脈絡」，而不是每次推理都像第一次見面。

---

## Design Goals

本章存在，是為了回答一個 Fragment 與 Reasoning 兩層都無法回答的問題：

> 對**這位**創作者而言，哪些 Hypothesis 更值得探索？

- **消除大眾偏見（de-bias toward general prior）**：讓 Reasoning 不再退化成對誰都一樣的語意搜尋，而能反映特定創作者的語境。
- **把離散 Fragment 沉澱為可用的長期傾向**：Creator DNA 讓系統「記得」創作者，而非每次冷啟動。
- **在懂與不困之間提供可控旋鈕**：透過三模式 + Consistency/Expansion 張力，讓「更懂你」不等於「把你鎖在過去」。
- **讓上下文可被解釋、可被修正、可被關閉**：Context 是創作者能掌控的資產，不是系統的黑箱檔案。

三層的分工可濃縮為：Fragment 回答「有哪些線索」，Reasoning 回答「這些線索能形成哪些故事」，Creator Context 回答「對這位創作者，哪些故事更值得寫」。

---

## Design Constraints

- **Reasoning 必須 Explainable**：Creator Context 對排序的影響必須可回溯——「這個 Candidate 排第一，是因為 theme=遺憾 + image=捷運站 命中你的 DNA」，而不能是一個無法解釋的黑箱分數。
- **不能只靠 Prompt 硬塞**：把整份 Creator Context 塞進 system prompt 只是最粗糙的近似。Context 應作為**結構化評分輸入**參與 re-ranking，而非只當成一段自然語言背景。
- **不得越界成 Identity**：任何欄位若能用於辨識「本人」而非描述「創作習慣」，就違反 §8.2，不得進入 Context。
- **Exploratory 不得偽裝為最推薦**：模式標籤是誠實契約，違反即等同欺騙創作者對自己風格邊界的認知。
- **更新必須有慣性（inertia）**：DNA 不能被單次輸入劇烈改寫，避免一次實驗污染長期傾向。
- **創作者控制優先於系統偏好**：當創作者手動關閉某 Context 影響，系統的推理便利性必須讓位。

---

## Engineering Notes

- **Context 注入的層級**：優先在 candidate re-ranking 階段以特徵權重注入（theme/image/emotion 命中度 → 加權分數），把「塞進 prompt」當成 fallback 而非主路徑。純 prompt 注入無法被審計、也無法給出 §Design Constraints 要求的可解釋排序。
- **DNA 的衰減與慣性**：實作 Feedback Loop 時，對「發布 > 保存 > 選用 > 一次性 prompt」給遞減權重；並考慮時間衰減（近半年的傾向權重高於三年前），否則早期風格會永久壓制當下轉型。
- **冷啟動**：新創作者沒有 DNA，此時 `candidatePreferences` 應退回中性預設、並提高 Adjacent 比例，用前幾次選擇快速探測傾向，而非強行套用大眾模板。
- **負面模式（negativePatterns）同等重要**：「這位創作者討厭什麼」往往比「喜歡什麼」更能收斂排序，別只記正向偏好。
- **模式標籤要一路傳到 UI**：Familiar/Adjacent/Exploratory 必須隨每個 Candidate 傳遞到最終呈現，讓創作者知道自己正在「延伸」還是「冒險」。

**⟢ AI 島現況對照**

- **已實作**：Creator DNA 的雛形存在——`analyzeDNA → ci_creator_dna` 會從創作者的 Fragment 累積出傾向；`ci_memories` 已能把長期記憶注入 prompt，形成「更懂創作者」的第一步；`ci_agent_runs` 記錄了執行過程，可作為 Feedback 的原始訊號來源。
- **尚缺**：目前 Context 主要以 **prompt 注入**方式影響生成（正是本章 Design Constraints 警告的粗糙近似），尚無結構化的 candidate re-ranking；**三種推理模式（Familiar/Adjacent/Exploratory）尚未落地**，也沒有把模式標籤傳到 UI；Consistency vs Expansion 的可控旋鈕、以及「發布 > 選用 > prompt」加權 + 時間衰減的正式 Feedback Loop 都還沒有；§8.8 的查看／修改／關閉控制面板亦尚未提供。換言之，AI 島已有「記得創作者」，還缺「能解釋、能控制、能刻意跳出」的完整 Creator Context 機制。

---

## Failure Cases

FIE 的 Creator Context 在以下情況會做不好，需要人工介入或明確降級：

- **資料稀疏的新創作者**：DNA 尚未成形，任何排序都近似猜測。此時強行套用會給出「假裝很懂」的偏差結果，應誠實退回中性模式。
- **風格正在轉型的創作者**：一位長期寫青春遺憾、正嘗試轉寫硬科幻的人，舊 DNA 會**主動抵抗**新方向，把 Exploratory 候選壓到底。若無時間衰減與人工「重置傾向」入口，系統會拖住創作者。
- **多重人格／多筆名創作者**：同一帳號寫兩種截然不同的風格，單一 DNA 會被平均成一團模糊的中間值，兩邊都不像。需要 Creator Persona 分流，而這仍是 Open Question。
- **回音室已然成形**：若 Exploration 比例被長期壓低，創作者可能已在不自覺中越寫越窄。系統偵測不到「創作者其實想突破」，需人工提示或外部信號。
- **Feedback 訊號被誤讀**：創作者刪掉某 Candidate 可能是「這次不要」而非「永遠討厭」。把單次否決當成永久 negativePattern 會過度學習，需要人工校正入口（§8.8 第 2 條）。

---

## Trade-offs

- **Context-aware re-ranking vs Stateless generation**：無狀態每次都公平、可複現、無隱私負擔，但永遠像第一次見面；有狀態能陪伴成長，代價是記憶治理與回音室風險。FIE 選有狀態，並用 §8.8 的控制權與三模式來抵銷代價。
- **結構化評分 vs Prompt 注入**：Prompt 注入實作最快、但不可審計、不可解釋；結構化 re-ranking 工程量大、但滿足 Explainable 約束。本章選結構化為主路徑，prompt 僅為 fallback。
- **Single blended preference vs Explicit three modes**：把 familiar/adjacent/exploratory 混成一個「最佳值」對使用者最省事，但會隱藏「你正在冒險」這個關鍵資訊。FIE 選顯式三模式並強制標籤，寧可多一次選擇，也不欺騙創作者對自身邊界的認知。
- **Fast-adapting DNA vs Inertial DNA**：快速適應能立刻反映新意圖，但一次實驗就可能污染長期傾向；慣性 DNA 穩定、但轉型時遲鈍。FIE 選慣性為底、輔以人工重置入口。
- **Consistency vs Expansion**：偏 Consistency 產出穩定、辨識度高，卻走向回音室；偏 Expansion 帶來成長，卻可能偏離當下期待。這不是二選一，而是由創作者透過模式比例持續調節的張力。

---

## Examples

**Example 1｜同一組四碎片，三種 Creator Context（排序差異）**
輸入 `高中 / 夏天 / 我們 / 宜蘭`。Creator A（青春校園）首選「畢業旅行」；Creator B（都市遺憾）首選「多年後重返宜蘭 / 沒說出口的初戀」；Creator C（懸疑奇幻）首選「那年夏天有一個人被大家遺忘」。**候選相同，Confidence 排序被 Creator Context 重排**——這是「不創造、只導向」的最直接示範。

**Example 2｜同一創作者，三種推理模式（同輸入、不同距離）**
仍是 `高中 / 夏天 / 我們 / 宜蘭`，對都市遺憾取向的 Creator B：
- *Familiar*：「多年後想起那個夏天沒說出口的喜歡」——完全沿用其 DNA。
- *Adjacent*：「多年後重返宜蘭，發現當年的『我們』對那個夏天記憶完全不同」——鄰域擴張，加入視角錯位。
- *Exploratory*（明確標示）：「那個夏天之後，宜蘭的『我們』裡有一個人，所有人都不記得曾經存在」——刻意跳出慣性，帶入懸疑。三者並列呈現，模式標籤清楚。

**Example 3｜Feedback Loop 更新 DNA**
Creator B 連續三次選了帶「視角錯位」的 Adjacent 候選，並將其中一篇**發布**。系統據此微調：`commonThemes` 補入「記憶不對稱」，`candidatePreferences.adjacent` 由 0.35 緩升至 0.42。注意——因為有慣性，單次選擇不會立刻改寫，是「重複 + 發布」才觸發沉澱。

**Example 4｜回音室偵測與主動提問**
Creator B 過去二十篇皆為 Familiar，Exploration 實際佔比趨近 0。系統偵測到多樣性坍縮，主動提示：「你最近的作品都很『你』——要不要試一條 Exploratory 的路？」並附上一個明確標示為 Exploratory 的候選。這是 §8.6「你要不要試試另一條路？」的具體落地。

---

## Counter Example

**若不使用 FIE，一般 AI 怎麼做？**

給一般 LLM 輸入 `高中 / 夏天 / 我們 / 宜蘭`，它會產出一個統計上最可能、對**所有人都一樣**的故事：畢業旅行、青春、友情、初戀。它的行為特徵是：

- **無創作者記憶**：每次都是冷啟動，昨天陪你寫了二十篇「都市遺憾」，今天仍給你大眾版青春校園。
- **偏好隱形且不可調**：模型有它自己的訓練分布偏好，但你既看不到、也關不掉、更無法區分「這是我的風格」還是「這是模型的慣性」。
- **無模式概念**：你無法要求它「這次刻意偏離我的習慣」，也不會被告知某個建議究竟是延伸還是冒險。
- **回音室無法察覺、也無法反制**：它不知道你越寫越窄，因為它根本不記得你寫過什麼。

FIE 的差別不在「生成得更漂亮」，而在於它把**創作者脈絡變成一等公民（first-class）**：可查看、可修改、可關閉、可分模式、可從行為更新。一般 AI 給的是「大眾合理」的一個答案；FIE 給的是「對這位創作者合理」的一組**已標示模式、可解釋、可控制**的答案。這正是 Creator Context 之所以不是附加功能，而是 FIE 能否長期陪伴創作者成長的關鍵。

---

# Chapter 9　Case Study（案例研究）

前八章確立了 FIE 的世界觀、架構與各層職責；本章把它們合流成一次可完整追蹤的推理，用同一組四碎片走完 Observation 到 Generation，證明「Fragment 不是直接變成作品，而是先被推理」這個核心主張在具體案例上成立。

## 案例設定（Case Setup）

本章的唯一輸入是四個 Fragment：

```
高中
夏天
我們
宜蘭
```

刻意保持資訊不足，因為真實創作者的記憶輸入永遠是不完整的。本案例的目的不是「猜對創作者原本想寫什麼」——那是無法驗證的——而是展示 FIE 如何在**資訊不足時仍能做出可解釋、可調整、可演化的推理**，而非在資訊不足時假裝資訊充足、直接生成。

整條 pipeline 的形狀是把 Generation 放到最後，而不是第一步：

```
Raw Fragment
      ↓
Representation      ── 把四個字變成有 Type 的結構
      ↓
Observation         ── 只記錄事實、不推測故事
      ↓
Hypothesis (A–E)    ── 平行展開多條可能性
      ↓
Evidence            ── 每條假設附 Confidence
      ↓
Missing Fragment    ── 指出「補什麼會讓推理更可信」
      ↓
Candidate Ranking   ── 依 Creator Context 排序（不同 Creator 不同序）
      ↓
Generation          ── 依 Reasoning Result 生成，而非依 Fragment 生成
```

## Stage 1　Representation

第一步不是理解「這是什麼故事」，而是把四個裸字（Raw Fragment）變成有 Type、有初步理解的結構物。

| Fragment | Type | 初步理解（Representation） |
|----------|------|--------------------------|
| 高中 | Time / Life-Stage | 人生階段，帶「青春／過去」語意 |
| 夏天 | Time / Season | 季節，暗示暑假、戶外、熱 |
| 我們 | People | 至少兩人以上的群體關係，關係性質未定 |
| 宜蘭 | Place | 具體地點，帶「非日常／旅行目的地」語意 |

這一步刻意**不形成故事**。此時若直接生成，就等於跳過推理。Representation 的產物是「結構化的事實」，不是「敘事」。

## Stage 2　Observation

Observation 進一步把 Representation 收斂為**只含事實、不含推測**的陳述，作為後續所有 Hypothesis 的共同地基：

- 高中：一個人生階段，非當下。
- 夏天：一個季節，與「高中」疊加後指向某個特定暑假。
- 我們：複數人物，關係未知（可能是朋友、情侶、同學）。
- 宜蘭：一個離開日常的地點。

關鍵原則：Observation 不寫「他們去畢業旅行」——那是 Hypothesis。Observation 只寫「有複數人、在某個高中的夏天、在宜蘭」。把「事實層」與「假設層」分開，是後面能追蹤推理的前提。

## Stage 3　Hypothesis（假設生成，A–E）

Reasoning Layer 平行展開多條假設。重點不是選答案，而是**建立可能性空間**：

- **Hypothesis A — 畢業旅行**：高中結束前的集體出遊。
- **Hypothesis B — 初戀旅行**：「我們」是兩人，一段夏天的曖昧或戀情。
- **Hypothesis C — 校外教學**：制度性、非自主的集體行程。
- **Hypothesis D — 多年後重返舊地**：現在的「我們」回到高中夏天去過的宜蘭。
- **Hypothesis E — 平行時空回憶**：非寫實框架下對那個夏天的重構。

此時沒有「正確答案」，五條假設同時存活。這正是 FIE 與傳統生成的第一個分岔：傳統模型在此刻已經替創作者把可能性壓成一條。

## Stage 4　Evidence（證據與 Confidence）

每條假設接受同一組 Fragment 的檢驗：哪些 Fragment 支持它（✔）、缺什麼（Missing）、據此給出 Confidence。

**Hypothesis A（畢業旅行）**
- Evidence：高中 ✔、夏天 ✔、宜蘭 ✔
- Missing：具體事件、人物關係性質
- Confidence：**0.73**（三個 Fragment 直接支持，但缺事件核心）

**Hypothesis B（初戀旅行）**
- Evidence：夏天 ✔、我們 ✔（讀作兩人）、宜蘭 ✔
- Missing：一句對話 / 情感訊號來確認「我們＝兩人且有情感」
- Confidence：**0.69**（高度依賴「我們＝兩人」這個未證實假設）

**Hypothesis C（校外教學）**
- Evidence：高中 ✔、我們 ✔
- Missing：季節通常不符（校外教學多非盛夏）、缺制度訊號
- Confidence：**0.55**

**Hypothesis D（多年後重返舊地）**
- Evidence：宜蘭 ✔、我們 ✔
- Missing：時間跨度證據（沒有任何 Fragment 指向「現在 vs 過去」的對照）
- Confidence：**0.59**

**Hypothesis E（平行時空）**
- Evidence：無寫實 Fragment 直接支持
- Missing：整個非寫實框架都缺 Fragment 支撐
- Confidence：**0.31**（在寫實 Creator Context 下極低）

Confidence 的意義是「這條假設被現有 Evidence 支持的程度」，而非「這件事發生的機率」。它是**推理完整度的度量**，不是真相的度量。

## Stage 5　Missing Fragment（缺失偵測）

系統不幻想缺失資訊、也不用流暢文字掩蓋空洞，而是明確指出「補什麼、哪條假設會被推高多少」：

| 若新增 Fragment | 受益假設 | 預期 Confidence 變化 |
|----------------|----------|---------------------|
| 一句對話（如「你以後還會記得嗎」） | B 初戀 | 0.69 → ~0.85 |
| 一件物品（如車票、合照） | A 畢業旅行 | 0.73 → ~0.84 |
| 一段時間對照（如「十年後」） | D 重返舊地 | 0.59 → ~0.80 |
| 一段衝突 / 分離事件 | A、B 皆升 | — |

Missing Fragment 不是錯誤訊息，而是**推理尚未完成的誠實報告**。這一步把「AI 應該替你腦補」翻轉成「AI 告訴你補哪一塊最有價值」，讓創作者保有敘事主權。

## Stage 6　Candidate Ranking（依 Creator Context 排序）

到此為止的 Confidence 是「與 Creator 無關」的證據強度。Candidate Ranking 把 Creator Context / Creator DNA 疊加上去——**同一組 Evidence，不同 Creator，得到不同排序**：

**Creator DNA 偏好「青春遺憾 / 寫實抒情」**

| 排名 | Candidate | 綜合考量 |
|------|-----------|----------|
| 1 | 沒說出口的初戀（B） | Evidence 0.69，但 DNA 加權高 |
| 2 | 畢業旅行（A） | Evidence 最高 0.73，DNA 中等 |
| 3 | 多年後重逢（D） | 遺憾感契合，但缺時間跨度證據 |

**Creator DNA 偏好「奇幻 / 非線性」**

| 排名 | Candidate | 綜合考量 |
|------|-----------|----------|
| 1 | 平行時空的那個夏天（E） | Evidence 僅 0.31，但 DNA 強加權 |
| 2 | 時間循環重返宜蘭（D 變體） | 契合「重來」母題 |
| 3 | 青春成長（A） | 作為寫實錨點 |

排序依據**全程公開**：創作者看得到「為什麼 B 排在 A 前面（是 DNA 加權，不是 Evidence 更強）」，並可手動覆寫。排序是建議，不是判決。

## Stage 7　Generation

直到這一步，Generation Engine 才開始生成歌詞、小說、劇本或其他作品。關鍵差異：

> Generation 不再直接依賴 Fragment，而是依賴 **Reasoning Result**。

因此產出的是**被推理過的故事**——它能回答「為什麼去宜蘭」「我們是誰」「夏天為何重要」——而不是把四個字擴寫成一段流暢但空心的文字。

## Traditional AI vs FIE（對照）

同樣四個 Fragment，傳統流程是：

```
Prompt → LLM → 歌詞
```

常見輸出：青春、陽光、稻田、未來。文字流暢，但沒有回答任何一個「為什麼」。整體對照：

| 傳統 AI | FIE |
|---------|-----|
| 立即生成 | 先理解再生成 |
| 單一路徑 | 多 Candidate（A–E）平行 |
| 黑盒（不知為何這樣寫） | 可追蹤（每步有 Evidence / Confidence） |
| Prompt 驅動 | Fragment + Reasoning 驅動 |
| 缺資訊時腦補 | 缺資訊時報 Missing Fragment |
| 與作者無關的通用輸出 | 依 Creator Context 排序 |
| 一次完成 | 持續演化（可回補、重排） |

## Design Goals

本章存在的理由，不是「再示範一次功能」，而是回答一個前八章無法單靠論述回答的問題：**當 Fragment 資訊不足時，一個推理系統與一個生成系統的行為差異，具體長什麼樣？**

- **把抽象架構落到可觀察的行為上。** Reasoning Layer、Representation、Confidence 這些概念，只有走完一個端到端案例才能被檢驗是否自洽。本章是全書的 integration test。
- **證明「延後 Generation」是可行且有價值的。** 全書最違反直覺的主張是「生成放最後」。本章用 A–E 五條假設與 Confidence 排序，展示延後生成換來的是可解釋性與 Creator 分化，而非只是更慢。
- **建立一個可重複引用的 canonical example。** 讓後續討論（評測、演化、Creator Context）都能回指「高中/夏天/我們/宜蘭」這組共同語言，避免每章各自舉例造成語意漂移。

## Design Constraints

- **Reasoning 必須 Explainable。** 每個 Confidence 都要能追溯到具體 Evidence（哪些 Fragment ✔、缺什麼）。不允許出現「模型覺得是 0.73」這種無法拆解的黑箱數字。
- **不能只靠 Prompt。** 若整條 pipeline 其實只是一個很長的 prompt 讓 LLM 自己「假裝」分階段，就違背了本章的目的。Observation / Hypothesis / Evidence 應是**可被外部檢查與覆寫的結構化中間產物**，而非模型自述。
- **事實層與假設層必須分離。** Observation 不得混入 Hypothesis；否則 Evidence 會拿假設當證據，形成循環論證。
- **Confidence 是證據強度、不是真相機率。** 約束系統與 UI 都不得把 Confidence 呈現為「這件事有 73% 真的發生」。
- **Creator Context 只在 Ranking 疊加、不得污染 Evidence。** Evidence 必須 Creator-agnostic，否則「同樣證據、不同排序」的可解釋性會崩塌。

## Engineering Notes

- **中間產物要落表、可回放。** Representation / Observation / Hypothesis / Evidence / Candidate 應各自持久化並綁定一次 run，否則無法向創作者解釋排序，也無法做回歸測試。
- **Confidence 不要用單一 float 硬編。** 建議拆成 `{supported_fragments, missing_fields, coverage}` 再聚合成分數，讓數字可拆解、可 A/B、可換聚合公式而不改上游。
- **Hypothesis 數量要設上限與去重。** 讓 LLM 自由展開假設容易產生語意重疊（如「畢業旅行」與「校外教學」高度相似）。需要 embedding 去重與 top-k 截斷，否則 Ranking 階段被近義項灌爆。
- **Missing Fragment 的預期增益是估計值，別當承諾。** 「0.69→0.85」是啟發式提示，不應寫死；真正補了對話後要**重跑 Evidence**、以實際結果為準。
- **Creator Context 加權要與 Evidence 分開儲存、分開展示。** 混在一起算完只輸出一個總分，就失去「為什麼 B 贏 A」的解釋力。

**⟢ AI 島現況對照**

- **已實作**：`ci_fragments`（含 `embedding vector(1536)`）已能承載 Representation 的雛形；`ci_surprising_pairs` / `ci_related_fragments` 提供跨 Fragment 關聯的原料；Creator DNA（`analyzeDNA → ci_creator_dna`）已能表達本章 Stage 6 的「不同 Creator 不同排序」偏好；synthesize / evolve / compose / transcreate agents 已能做 Stage 7 的多形態 Generation；`ci_agent_runs` 是 Reasoning Trace 的雛形。
- **尚缺**：本章 Stage 3–6 幾乎都還沒有正式管線——沒有結構化的 Hypothesis A–E 生成、沒有帶 Confidence 的 Evidence 表、沒有 Missing Fragment 偵測、沒有「Evidence 與 Creator 加權分離」的 Candidate Ranking。目前實作偏向「Fragment → agent → 直接生成」，本章描述的中間層（Observation/Hypothesis/Evidence）尚屬理想化設計。

## Failure Cases

- **Fragment 過於同質。** 若四個 Fragment 全是地點（宜蘭、羅東、頭城、礁溪），Hypothesis 之間缺乏張力，五條假設會塌成一條，Confidence 難以分化，此時需人工提示補入其他 Type。
- **創作者原意是反常識連結。** 若「宜蘭」其實是一隻貓的名字、「高中」是一家店，Observation 的 Type 判斷會系統性錯誤，整條推理建在錯地基上。此類語義非常規只能靠人工標註 Fragment 或補 Creator 註記解決。
- **Confidence 全體偏低且接近。** 當所有假設 Confidence 都落在 0.3–0.4 且彼此差距 < 0.05，Ranking 事實上失去意義，系統應停在 Missing Fragment 階段請求人工輸入，而非硬排序、硬生成。
- **Creator DNA 尚未建立或過稀。** 新創作者沒有足夠歷史 Fragment，Stage 6 退化為只用 Evidence 排序，此時「同樣 Fragment、不同 Creator」的價值主張暫時無法兌現。

## Trade-offs

- **Multiple Candidate vs Single Answer。** 選前者。多假設帶來計算成本與「不夠果斷」的體感，但單一答案會在資訊不足時把系統的錯誤偽裝成確定性——這正是 FIE 要消除的傳統 AI 病灶。
- **Fragment-driven vs Prompt-driven。** 選 Fragment 驅動。Prompt 驅動起步快、工程輕，但中間狀態不可追蹤、無法在 Stage 5 誠實報告 Missing。可解釋性優先於便利性。
- **Explicit intermediate state vs End-to-end LLM。** 選顯式中間狀態。讓單一大模型端到端「內部推理」看似更省事，但 Observation/Evidence 無法被外部覆寫，就無法滿足 Design Constraints 的 Explainable 要求。
- **Creator-aware Ranking vs Neutral Ranking。** 選 Creator-aware。中立排序更「客觀」，但會抹平創作者差異，讓 FIE 退化成通用生成器；代價是必須嚴格保持 Evidence 與加權分離，以免客觀性被完全侵蝕。
- **Memory vs Stateless。** Ranking 階段選 Memory（引用 Creator 歷史 Fragment 與 DNA）；Evidence 階段選 Stateless（Creator-agnostic）。兩者刻意分屬不同層，是為了兼顧「個人化」與「證據可信」。

## Examples

**Example 1 — 補一句對話後的重推理**
創作者在 Missing Fragment 提示後補入「你以後還會記得今天嗎」。系統重跑 Evidence：Hypothesis B（初戀）的「我們＝兩人且有情感」由未證實變為被支持，Confidence 0.69 → 0.86，在寫實 DNA 下躍居第一。示範了 Missing Fragment → 回補 → 重排的閉環，且排序變動全程可解釋。

**Example 2 — 同碎片、兩個 Creator、兩種作品**
Creator α（青春遺憾 DNA）拿到的第一 Candidate 是「沒說出口的初戀」，Generation 產出一首壓抑抒情的歌；Creator β（奇幻 DNA）拿到的第一 Candidate 是「平行時空的那個夏天」，Generation 產出一段非線性短篇。Evidence 完全相同、Ranking 因 Creator Context 而分歧——這是本章對「不同 Creator 不同推理」最直接的驗證。

**Example 3 — 系統拒絕生成並要求人工介入**
創作者只給「高中、夏天」兩個 Fragment。系統展開假設後發現所有 Confidence 落在 0.28–0.36 且彼此差距極小，Candidate Ranking 判定為不可信排序，於是停在 Stage 5，回覆「目前證據不足以區分候選，建議補入一個 People 或 Place Fragment」，而不是硬生成一段空泛青春文字。示範了 FIE 有能力說「我還不知道」。

## Counter Example

若不使用 FIE，一般 AI 的路徑是：把「高中／夏天／我們／宜蘭」塞進 prompt，LLM 一次輸出「青春、陽光、稻田、未來」。它流暢、快、零等待，但：**它沒有 Hypothesis（只有一條路徑）、沒有 Evidence（無從解釋為何這樣寫）、缺資訊時用漂亮詞彙掩蓋而非報 Missing、對每個創作者輸出幾乎相同的通用內容、且無法演化（不能回補一句對話再重排）。**

差別不在文字好壞，而在**這段文字能不能回答「為什麼」**。傳統 AI 給的是一個生成器的輸出；FIE 給的是一條可追蹤、可覆寫、可演化、且因人而異的創作思考流程。FIE 建立的不是另一個生成器，而是一個推理過程——Generation 只是它最後的、且可被替換的一步。

---

# Chapter 10　Implementation（實作架構）

本章回答一個工程問題：如果今天從零開始（greenfield）開發 FIE，架構應該如何切分，才能讓「不同 LLM、不同資料庫、不同前端」共用同一套 Fragment → Representation → Reasoning 流程。這裡定義的是**架構契約**，而不是特定模型或特定 code。

---

## 五層模組化架構（Modular Five-Layer Architecture）

FIE 的實作核心主張只有一句：**推理不是一個大 Prompt，而是一條可拆解的管線（pipeline）。** 每一層有明確的輸入 / 輸出契約，可獨立替換、獨立測試、獨立版本化。

```
┌─────────────────────────────────────────────────────────┐
│  1. Fragment Store         保存 Fragment + 版本，不推理     │
│         │  out: Fragment{ id, raw, version }              │
│         ▼                                                  │
│  2. Representation Engine  把 Fragment 建成可推理結構        │
│         │  out: Representation{ semantic, context,        │
│         │        relations, metadata }                    │
│         ▼                                                  │
│  3. Reasoning Engine       Observation→Hypothesis→        │
│         │                  Evidence→Ranking               │
│         │  out: Candidate[] + Reasoning Trace +           │
│         │        Confidence + Missing Fragment            │
│         ▼                                                  │
│  4. Creator Context Engine 用 Creator DNA / 偏好 對齊排序    │
│         │  out: Aligned Candidate[] (re-ranked)           │
│         ▼                                                  │
│  5. Generation Engine      只吃 Candidate + Reasoning，     │
│                            不碰原始 Fragment → 產出作品      │
└─────────────────────────────────────────────────────────┘
```

**關鍵不變式（invariant）**：Generation Engine 永遠**不直接接觸原始 Fragment**，它只接收推理後的結果（Candidate + Reasoning Result + Final Prompt）。這條界線是整個架構的分水嶺——它強制「理解」與「生成」分離，讓推理成為可稽核的第一級公民（first-class citizen），而不是藏在生成 Prompt 裡的黑盒。

### 各層職責契約

| Layer | 唯一職責 | 輸入 | 輸出 | 明確**不做**的事 |
|---|---|---|---|---|
| Fragment Store | 持久化 + 版本 | raw fragment | `Fragment{id, raw, version, embedding?}` | 不推理、不排序 |
| Representation Engine | 建立可推理結構 | `Fragment[]` | `Representation{semantic, context, relations, metadata}` | 不下結論 |
| Reasoning Engine | 產生並排序假設 | `Representation[]` + Mode | `Candidate[]`、Trace、Confidence、Missing | 不生成文案 |
| Creator Context Engine | 用創作者取向重排 | `Candidate[]` + Creator DNA | Re-ranked `Candidate[]` | 不發明新 Candidate |
| Generation Engine | 把 Candidate 變作品 | Aligned Candidate + Trace | 作品 | 不重新解讀 Fragment |

### Data Flow + Feedback Loop

```
User → Fragment Store → Representation → Reasoning → Candidate
                                                        │
                                          Creator Context Alignment
                                                        │
                                                    Generation
                                                        │
                                                     Feedback  ──┐
                                                        │        │
                                                 Update Context ─┘
                                          （回灌，影響「後續」推理，非只修本次）
```

Feedback 的語意很重要：使用者採納 / 否決某個 Candidate，不只是評分這一次生成，而是**更新 Creator Context**，改變下一次 Reasoning Engine 的 Ranking 先驗。這使 FIE 從無記憶的 stateless 工具，變成會隨創作者長期演化的 stateful 系統。

### Extensibility（可替換性）

FIE 關心的是**流程**，不是特定模型。每個 Engine 都以介面（interface）定義、以實作注入：

- **LLM 可換**：Reasoning / Generation 背後的模型可替換，介面契約不變。
- **Embedding 可換**：Representation 的 semantic 向量來源可換（維度不同時走 adapter）。
- **Graph DB 可換**：relations 的儲存可以是關聯式、圖資料庫、或向量近鄰。
- **Ranking 可換**：Reasoning Engine 的排序策略是策略物件（strategy），可插拔（規則式 / 學習式 / 混合）。

### MVP Roadmap（Phase 1–3）

```
Phase 1  地基（能跑就好，人工補推理）
  ├ Fragment Store（含版本）
  ├ Representation Engine（semantic + metadata）
  └ Candidate 產生 + 人工選擇 Candidate + 產出 Generation Prompt

Phase 2  推理可見（讓機器解釋自己）
  ├ Reasoning Trace（Observation→Hypothesis→Evidence）
  ├ Confidence 排序（多 Candidate）
  └ Creator Context Engine（Creator DNA 對齊）

Phase 3  自我演化（閉環）
  ├ Feedback Loop（回灌 Context）
  ├ Dynamic Learning（Ranking 隨採納率調整）
  └ Multiple Reasoning Strategies（Familiar / Adjacent / Exploratory）
```

Roadmap 的順序本身就是設計主張：**先把資料流打通、再讓推理可見、最後才閉環演化。** 不先追求「聰明」，先追求「可觀察、可替換」。

---

## Design Goals

這章存在，是為了回答「FIE 為什麼不是一個大 Prompt」。若不切分，整個系統會退化成一次性的 prompt engineering——換模型要重寫、想測推理只能靠人眼、想解釋為什麼這樣連結卻無跡可尋。本章的目標：

- **讓推理成為架構元件，而非 Prompt 裡的副作用**：把 Representation 與 Reasoning 抽成獨立層，使「理解」可被儲存、比較、測試。
- **模型與流程解耦**：LLM 是可替換的零件；`Fragment → Representation → Reasoning` 的骨幹在模型更新後仍不變。
- **可漸進演進**：透過 Phase 1–3，讓 MVP 能先上線、再逐層加深，而不是一次做完才有價值。
- **可稽核**：每個 Candidate 都能回溯到它的 Reasoning Trace 與 Evidence。

---

## Design Constraints

- **Reasoning 必須 Explainable**：任何 Candidate 都必須附帶 Reasoning Trace（哪些 Fragment、哪條 relation、什麼 Hypothesis），不能只回「因為 LLM 覺得好」。
- **不能只靠 Prompt**：連結邏輯不可全部塞進單一生成 Prompt；Representation 與 Candidate 必須是系統中可檢視的資料物件。
- **層間契約穩定**：可換實作，但輸入 / 輸出 schema 是契約，破壞契約等於破壞整條管線。
- **Versionable Reasoning**：Fragment 有版本，推理結果也應可對應到「當時的 Representation 版本」，否則無法重現。
- **Testable Components**：推理必須能被單元測試（給定 Representation，斷言 Candidate / Confidence），而不是只能人工驗證。
- **Generation 不得旁路（no bypass）**：禁止 Generation 直接讀原始 Fragment 抄捷徑——那會讓推理層形同虛設。

---

## Engineering Notes

- **層界線要用型別鎖死**：Representation / Candidate / Trace 應是明確的資料型別，不是自由格式字串。字串一鬆，各層就會偷偷互相依賴內部格式，模組化名存實亡。
- **Reasoning Engine 別跟 LLM 綁死**：把「產生 Hypothesis」與「呼叫哪個模型」分開。Ranking 應能在**沒有 LLM** 的情況下用規則跑一遍（回歸測試用），確保排序邏輯本身可測。
- **Confidence 要有來源**：Confidence 不該是模型隨口給的數字，最好由 Evidence 數量 / relation 強度 / embedding 距離等**可解釋因子**組成，否則排序無法除錯。
- **Missing Fragment 是一級輸出**：Reasoning Engine 應主動回報「這個 Hypothesis 缺一塊」，而不是硬湊。把「缺口」當輸出，是 FIE 與一般生成器最大的工程差異之一。
- **Feedback 寫入要非同步且可追溯**：回灌 Context 不應阻塞本次生成；且每次 Context 變更要留痕，方便日後解釋「為什麼系統現在偏好這種連結」。
- **取捨提醒**：Phase 1 允許「人工選 Candidate」是刻意的——先驗證資料流，別在推理還沒可觀察前就急著自動化排序。

⟢ **AI 島現況對照**
- **已實作（對應本章哪些層）**：Fragment Store 這層在 AI 島已具雛形——`ci_fragments`（含 `embedding vector(1536)`）、`ci_related_fragments`、`ci_surprising_pairs`（意外配對）承擔了 Representation 的 relations / semantic 部分；Creator Context Engine 有 `analyzeDNA → ci_creator_dna` 與 `ci_memories`（記憶注入 prompt）；Generation 這端有 AI agents（`synthesize` 凝聚 / `evolve` 演化 / `compose` 編織 / `transcreate`）；`ci_agent_runs` 是 Reasoning Trace 的**雛形**（記錄執行，但尚非結構化推理軌跡）。
- **尚缺（本章理想 vs 現況落差）**：現況並沒有一個**獨立、可測的 Reasoning Engine 層**——連結邏輯目前主要藏在 agent 的 prompt 裡，正是本章 Design Constraint 要避免的「只靠 Prompt」。也缺：分層的 Fragment Representation（semantic/context/relations/metadata 尚未形式化為契約）、多 Candidate + Confidence 排序、完整可回溯的 Reasoning Trace、Missing Fragment 偵測、三種推理模式（Familiar / Adjacent / Exploratory）。換言之，AI 島目前是「Store + Context + Generation 三層較實、Representation 半實、Reasoning 尚虛」。

---

## Failure Cases

- **Fragment 太少或太同質**：Reasoning Engine 找不到有張力的 Hypothesis，Candidate 平庸。此時應觸發 Missing Fragment 提示，請創作者補料，而非硬生成。
- **Creator DNA 尚未建立（cold start）**：Creator Context Engine 無先驗可對齊，re-ranking 退化為原始 Confidence 排序，需人工介入挑選。
- **Confidence 全體偏低且接近**：代表沒有明顯勝出的連結，系統應誠實呈現「多個並列、皆不確定」，交人工決斷，而不是強行選第一名。
- **回饋訊號矛盾**：創作者行為前後不一致（一下要 Familiar、一下要 Exploratory），Feedback Loop 可能學到雜訊，需要人工重設或分模式記錄。
- **跨模型語意漂移**：更換 LLM / Embedding 後，舊 Representation 版本的推理不再可重現——需版本標記 + 重建 Representation，屬需人工排程的維運事件。

---

## Trade-offs

- **Graph vs Tree（關係結構）**：選 **Graph**。Fragment 之間是多對多、可成環的聯想網（「宜蘭」同時牽「夏天」與「我們」），Tree 的單一父節點會強行砍掉橫向張力，正是意外連結的來源。代價是查詢與排序更貴。
- **Prompt vs Fragment（連結邏輯放哪）**：選 **Fragment（結構化資料）**。把連結存成可檢視的 Representation / Candidate，而非塞進 Prompt。代價是前期工程量大，但換來可測、可解釋、可版本化。
- **Single vs Multiple Candidate**：選 **Multiple + Confidence**。單一答案看似俐落，卻抹掉了創作最珍貴的「岔路」。多 Candidate 讓創作者看見選擇空間，代價是 UI / 排序複雜度上升。
- **Memory vs Stateless**：選 **Memory（有狀態）**。FIE 的價值來自隨創作者長期演化的 Creator Context；stateless 每次從零開始、學不到取向。代價是狀態管理、隱私、可重現性的額外負擔。
- **一次到位 vs 漸進 Roadmap**：選 **漸進**。Phase 1 甚至允許人工補推理，是刻意用「先可觀察、後自動化」換取早期可驗證，代價是完整能力延後。

---

## Examples

**例一——四碎片主軸貫穿全管線（高中 / 夏天 / 我們 / 宜蘭）**
1. *Fragment Store*：存入四個 Fragment，各帶 version 與 embedding。
2. *Representation*：抽出 semantic（青春、季節、群體、地點）、relations（宜蘭↔夏天：場景；我們↔高中：關係）。
3. *Reasoning*：Hypothesis A =「一場高中夏天在宜蘭的集體回憶」（Evidence：四碎片全連通，Confidence 高）；Hypothesis B =「多年後重返宜蘭，只剩『我們』還在」（Evidence：時間張力，Confidence 中）。輸出兩個 Candidate。
4. *Creator Context*：若 Creator DNA 偏「淡淡懷舊」，B 被上調至第一。
5. *Generation*：只依 Candidate B + Trace 生成，不重讀原始四碎片。

**例二——Missing Fragment 觸發人工補料**
只給「高中 / 宜蘭」兩碎片。Reasoning Engine 產生 Hypothesis「青春場景」但偵測到**缺乏『人物關係』與『時間』**（無「我們」「夏天」）。輸出 Missing Fragment 提示：「補一個人物或季節碎片，可讓連結成形。」——系統選擇不硬生成，而是回報缺口。

**例三——換 Embedding 不動流程（Extensibility 實測）**
把 Representation Engine 的 embedding 供應者從 1536 維換成另一模型。因層間契約是 `Representation{semantic, context, relations, metadata}` 而非具體向量，Reasoning / Candidate / Generation 三層程式碼**零改動**，只需為新舊 Representation 打上版本標記以維持可重現性。

---

## Counter Example

**不用 FIE、一般 AI 怎麼做？** 把四個詞直接丟進一個生成 Prompt：「請用『高中、夏天、我們、宜蘭』寫一段文字。」

差別在哪：
- **沒有 Representation**：模型內部隱式理解，外部看不到、存不下、比不了。
- **沒有多 Candidate**：一次吐一個答案，創作者看不到「本來還有哪些連結方向」（例二的 B 路線直接消失）。
- **沒有 Reasoning Trace**：無法回答「為什麼是這個連結」，改一版就得整段重寫 Prompt。
- **沒有 Missing Fragment**：碎片不足時它照樣硬湊出通順但空洞的文字，不會叫你補料。
- **沒有 Memory / Feedback**：這次採納或否決，對下一次毫無影響，永遠 cold start。
- **不可替換**：連結邏輯焊死在 Prompt 裡，換模型＝重寫，換 Embedding / Graph DB 無從談起。

一般 AI 把「理解」與「生成」壓成單一不可觀察的動作；FIE 的實作架構刻意把它拆成五層可稽核、可替換、可演進的管線——這正是本章存在的理由。

---

# Chapter 11　Future（未來方向）

本章界定 FIE 的長期演進路線：它不是一個歌詞生成器的功能藍圖，而是一條從「理解碎片」走向「與創作者共同推理」的能力階梯。這一章存在的意義，是把前十章的架構放進時間軸，說明每一層 Reasoning 能力累積之後會長出什麼。

## 章節定位（Positioning）

前面各章描述 FIE「現在如何從 Fragment 推理到 Generation」。本章描述的是「這套推理機制若持續累積，會演化成什麼」，以及它為什麼可以跨出歌詞、進入任何以碎片為起點的創作領域。它是路線圖，不是承諾；是能力邊界的推演，不是產品清單。

## 核心內容（Core）

### 從一次性生成到持續演化的創作循環

當今多數 AI 創作系統的心智模型是一條單向管線：

```
Input ──▶ Output
```

Prompt 進、成品出，過程不留痕跡。下一次創作從零開始，AI 不記得上一次為什麼那樣寫。FIE 主張的模型是一個閉環：

```
   Experience（經驗）
        │
        ▼
   Fragment（碎片：經驗留下的證據）
        │
        ▼
   Knowledge（碎片間累積的關聯）
        │
        ▼
   Reasoning（假設 → 驗證 → 探索）
        │
        ▼
   Creation（推理完成後的一種輸出）
        │
        ▼
   Experience（作品成為新的經驗，回灌）
        ▲
        └──────────────────────────┘
```

差別的關鍵字是 **回灌（feedback）**。作品不是終點，而是下一輪 Fragment 的來源。以主軸範例四碎片「高中 / 夏天 / 我們 / 宜蘭」為例：這四片先被推理成一首歌詞，歌詞被創作者採用、修改、否決某個 Candidate——這些「採用與否決」本身又成為新的 Fragment（例如「創作者偏好把『我們』收束成群體記憶，而非兩人愛情」），下一次相同碎片再進來時，Reasoning 的起點已經不同。

### 四階段能力階梯（Four-Phase Evolution）

FIE 的演化不是功能加法，而是「理解對象」的逐層放大：從理解一片碎片，到理解一個世界，到理解一個人的創作歷程。

| Phase | 名稱 | 理解對象 | 需要的核心能力 | 主軸範例對應 |
|---|---|---|---|---|
| 1 | Fragment Intelligence | 單一碎片與碎片間關聯 | Representation 分層、Surprising Pair、基本 Reasoning | 看懂「宜蘭」不只是地名，而是「我們」的容器 |
| 2 | Creator Intelligence | 創作者的長期脈絡與偏好 | Creator DNA、Creator Context、跨作品 Weight | 知道這位創作者的「夏天」總是帶著離別 |
| 3 | World Intelligence | 角色、設定、世界觀、跨作品關聯 | 世界狀態模型、伏筆/矛盾偵測、跨作品 Fragment 追蹤 | 「高中的我們」跨三首歌成為同一組角色的成長線 |
| 4 | Collaborative Intelligence | 創作者與 AI 的共同推理 | Explainable Reasoning Trace、Hypothesis 提案、Human In The Loop | AI 主動指出「這次的宜蘭和上次矛盾，是刻意的嗎？」 |

四個階段不是四個版本號，而是**同一套 Fragment → Reasoning → Generation 機制在不同資料密度下的表現**。Phase 1 只有幾十片碎片時，它就是配對推理；Phase 3 累積上千片、跨十幾部作品時，同一套機制自然浮現出「世界觀」這個層次。沒有新的核心理念被加入，只是碎片夠多、Reasoning 夠深之後，能力自己長出來。

### 跨領域：共同核心是 Fragment 與 Reasoning，不是內容類型

FIE 可跨出歌詞的理由不是「它很通用」這種空話，而是這些領域**共享同一個結構**：都從零散的碎片起步，都需要在碎片之間建立假設，都不能靠一次 Prompt 直接生成完整成品。

```
歌詞      小說      劇本      遊戲世界觀   品牌企劃   教材設計   研究筆記
  │        │        │          │           │          │          │
  └────────┴────────┴──────────┴───────────┴──────────┴──────────┘
                              ▼
              Fragment → Representation → Reasoning → Candidate → Creation
```

歌詞的碎片是意象，小說的碎片是場景與人物動機，劇本的碎片是衝突與轉折，遊戲世界觀的碎片是設定條目與地理，品牌的碎片是價值主張與情緒關鍵字，教材的碎片是知識點與誤解點，研究筆記的碎片是觀察與引用。**生成類型不同，推理骨架相同。** 這是 FIE 能跨領域的唯一正當理由。

### Human In The Loop：AI 擴大可能性，人類決定價值

FIE 不追求全自動化。這不是技術謙虛，而是設計原則：創作的價值判斷不可外包。分工邊界固定如下：

| 環節 | AI 負責 | 人類保留 |
|---|---|---|
| Fragment 建立 | 建議可能的碎片 | 最終決定哪些算數 |
| Candidate 產生 | 生成多個候選推理 | 選擇 / 否決 |
| Reasoning | 提出假設、標記矛盾 | 修改推理方向 |
| 方向 | 擴大探索空間 | 定義什麼是「對」 |

AI 的職責是把可能性攤開（廣度），人類的職責是收斂（價值）。這條線在 Phase 4 尤其重要：當 AI 開始「共同推理」時，它提假設、指矛盾、提醒伏筆，但**永遠是提案者、不是裁決者**。

### Long-term Vision：累積的是創作歷程，不是資料

理想狀態下，FIE 記得的不只是成品，而是：

- 創作者如何思考（推理偏好）
- 為何做出某個選擇（被採用 Candidate 背後的理由）
- 哪些故事曾被放棄（否決的 Candidate 也是知識）
- 哪些 Fragment 持續跨作品發酵（長期 Weight 高的核心意象）

值得累積的不是 Prompt，而是理解。一個只存 Prompt 的系統，換個模型就歸零；一個累積創作歷程的系統，模型會換，但對這位創作者的理解會沉澱下來。這是 FIE 與「更快的生成器」在目標上的根本分歧。

## Design Goals

本章存在，是為了回答一個容易被誤解的問題：**FIE 到底在往哪裡走？** 沒有這一章，讀者會把 FIE 誤讀成「一個功能更多的歌詞工具」，然後質疑「為什麼要搞這麼複雜的 Reasoning，直接 Prompt 不就好了」。

- **把架構放進時間軸**：前十章是靜態架構，本章說明這套架構隨資料累積會演化出四個能力層次，證明複雜度是為了未來能力、不是過度設計。
- **界定領域邊界的正當性**：明確指出跨領域的依據是「共享推理骨架」而非「通用性」，避免無限擴張的空頭承諾。
- **釘死人機分工**：在系統還沒強大到會侵蝕創作者主權之前，先把「AI 擴大、人類決定」寫進設計目標，而不是事後補救。
- **定義成功指標**：成功不是「生成更快」，而是「對創作者的理解是否隨時間加深」。這決定了整套系統的優化方向。

## Design Constraints

未來演進不是空白支票，受以下硬約束：

- **能力必須階梯式解鎖，不能跳級**：Phase 3 的 World Intelligence 依賴 Phase 2 累積的 Creator Context；沒有足夠的長期碎片密度，強行宣稱「世界觀理解」就是灌水。每一階段的能力必須由前一階段的資料自然支撐。
- **Reasoning 必須 Explainable**：Phase 4 的「共同推理」若不可解釋，就退化成一個更會唬人的黑箱。AI 提出的每個假設、每次「這裡有矛盾」都必須附 Reasoning Trace，否則創作者無法信任、也無法否決。
- **不能只靠 Prompt 堆疊**：跨領域不等於「換個 system prompt」。若小說模式只是把歌詞 prompt 改幾個字，那就沒有 Fragment 分層與 Reasoning，只是換皮，違背本章的核心主張。
- **人類否決權不可被優化掉**：任何「提升自動化率」的優化都不得侵蝕 Human In The Loop 的四個保留環節。自動化是手段，不是目標。
- **回灌不得污染來源**：作品回灌成新 Fragment 時，必須可區分「創作者原生碎片」與「AI 生成後被採用的碎片」，否則多輪之後系統會把自己的輸出當成創作者的意圖，形成回音室。

## Engineering Notes

- **四階段是資料密度的函數，不是排期表**：不要把 Phase 1–4 當成 Q1–Q4 的產品排程。它們是「當某類碎片累積到某密度、某種推理才有意義」的觸發條件。實作上應以資料量與關聯度作為階段解鎖的判斷，而非日期。
- **回灌循環要防無限自我強化**：Experience → Fragment 的回灌若不設閘門，AI 採用自己的 Candidate → 變成 Fragment → 下次更傾向同一方向，會收斂成單調。工程上需給 AI 生成的回灌碎片較低的初始 Weight，並要求人工確認才升權。
- **跨領域共用推理核心、分離 Representation schema**：正確的抽象是「一個 Reasoning engine + 每領域一套 Fragment Representation schema」。錯誤的做法是每個領域一套獨立 pipeline（維護爆炸）或全部塞進同一 prompt（喪失分層）。
- **World Intelligence 的矛盾偵測是重點也是陷阱**：跨作品的伏筆/矛盾偵測需要維護一個顯式的世界狀態模型，不能靠把所有文本塞進 context window 讓模型「自己記得」——那在作品變多後必然截斷失憶（呼應全書一致的 1000 筆截斷類陷阱：任何「一次撈全部」都會默默漏東西）。
- **取捨誠實化**：Phase 4 的「AI 提假設」極容易滑向「AI 幫你做決定」。實作時要刻意把 AI 輸出定位為「待確認提案」的 UI 狀態，而非直接寫入。

⟢ **AI 島現況對照**：目前 Creator Island 大致落在 **Phase 1 完成、Phase 2 成形中**。已實作：`ci_fragments`（含 `embedding vector(1536)`）撐起 Fragment Intelligence 的基礎；`ci_surprising_pairs` 與 `ci_related_fragments` 提供碎片關聯；`analyzeDNA → ci_creator_dna` 已是 Creator Intelligence 的雛形；AI agents（`synthesize` 凝聚 / `evolve` 演化 / `compose` 編織 / `transcreate`）與 `ci_memories`（記憶注入 prompt）讓「記得創作者」初步成立；`ci_agent_runs` 是執行 trace 的雛形。**尚缺**：Phase 3 World Intelligence 完全未起步（沒有世界狀態模型、沒有跨作品伏筆/矛盾偵測）；Phase 4 的共同推理僅止於 agent 輸出，缺正式的 Hypothesis 提案 + 可否決 UI；回灌循環（作品成為新 Fragment）尚無防自我強化的 Weight 閘門；三種推理模式（Familiar / Adjacent / Exploratory）與完整 Reasoning Trace 也還沒有。換言之，四階段的「地基」在、「上層樓」還是圖紙。

## Failure Cases

FIE 不是萬能的，以下情況會做不好、需人工介入：

1. **冷啟動（碎片太少）**：新創作者只有三五片碎片時，Phase 2 以上的能力全部失效。Creator DNA 無從分析，任何「理解你的偏好」都是幻覺。此時 FIE 應誠實退化為 Phase 1，而非假裝懂創作者。
2. **創作者刻意的自我矛盾**：Phase 3 的矛盾偵測會把「創作者故意讓這次的宜蘭與上次相反（表達成長/幻滅）」誤報為 bug。系統無法區分「失誤矛盾」與「刻意矛盾」，必須由人回答「這是刻意的嗎」。
3. **跨領域遷移的隱性語意差**：把歌詞的 Representation schema 直接套到研究筆記，「意象聯想」的推理在需要「邏輯嚴謹」的領域會產生好聽但錯誤的關聯。領域切換初期需人工校準推理權重。
4. **回灌回音室**：長期只採用 AI 提案、少注入原生經驗的創作者，碎片庫會逐漸被 AI 的口味同化，輸出趨同。系統偵測不到「風格坍縮」，需創作者主動注入新經驗打破。
5. **價值判斷題**：「這首歌該不該這樣結尾」本質是價值問題，FIE 能攤開選項但無法替創作者判斷「哪個更真誠」。這是 Human In The Loop 的存在理由，不是缺陷。

## Trade-offs

- **World Model 用 Graph 還是 Tree？** 選 **Graph**。世界觀中「高中 / 夏天 / 我們 / 宜蘭」彼此多對多關聯（宜蘭連著我們、也連著夏天），Tree 的單一父節點結構會強行砍斷交叉關聯。代價是 Graph 的遍歷成本高、矛盾偵測演算法更複雜，但這是世界觀的本質形狀，不能為省事而扭曲。
- **Prompt 還是 Fragment 作為累積單位？** 選 **Fragment**。Prompt 綁定當下措辭與模型，換模型即失憶；Fragment 是結構化證據，可跨模型沉澱。代價是前期要建 Representation 分層，比堆 prompt 慢很多——但這正是「累積創作歷程 vs 累積 Prompt」的分歧點。
- **Single 還是 Multiple Candidate？** 選 **Multiple + Confidence 排序**。單一候選等於 AI 替創作者做了收斂決定，違反人機分工。多候選讓 AI 負責廣度、人類負責選擇。代價是要維護 Candidate 間的差異度與 Confidence 標定，計算與 UI 成本上升。
- **Memory 還是 Stateless？** 選 **Memory**，但要付「防污染」的稅。Stateless 每次乾淨、無回音室風險，卻永遠學不會創作者；Memory 能累積理解，代價是必須處理回灌自我強化與來源污染。FIE 的整個立論建立在「值得累積理解」，因此 Memory 是不可退讓的選擇。
- **自動化程度：更全自動 vs 保留人類否決？** 選 **保留否決權**。全自動生成快、指標好看，但會侵蝕創作者主權並製造回音室。FIE 明確接受「慢一點、但創作者始終是裁決者」。

## Examples

**例 1：主軸四碎片的跨階段演化（Phase 1 → 4）**
「高中 / 夏天 / 我們 / 宜蘭」第一次進系統（Phase 1），FIE 只能做配對推理，發現「宜蘭」是「我們」的容器，生成幾個 Candidate。半年後這位創作者累積了三十首作品（Phase 2），FIE 從 Creator DNA 得知他的「夏天」總帶離別，於是新的 Candidate 自動偏向「宜蘭的夏天是最後一個夏天」。再後來（Phase 3），「高中的我們」已在多首歌中成為固定角色群，FIE 把這次的宜蘭接進既有時間線，並提醒「這組『我們』上次是四個人，這次只寫了三個，是誰離開了嗎？」——這是同一組碎片，在資料密度提升後長出的不同能力。

**例 2：跨領域遷移——同骨架、不同 Representation**
同一位創作者想寫一部以宜蘭夏天為背景的小說。FIE 不重寫引擎，只切換 Representation schema：歌詞模式下「宜蘭」是意象，小說模式下「宜蘭」被拆成「場景 + 人物動機 + 衝突種子」。Reasoning 骨架（Fragment → 假設 → Candidate）完全不變，AI 提出「高中的我們在宜蘭經歷了什麼，值得在成年後回去」作為敘事假設。證明跨領域靠的是共享推理、不是換 prompt。

**例 3：Phase 4 共同推理——AI 當提案者而非裁決者**
創作者寫到第三首續作，把「宜蘭」設定成「我們再也沒回去的地方」。FIE 的 World Intelligence 偵測到這與第一首「我們約好每年夏天回宜蘭」矛盾，於是彈出一則**待確認提案**：「偵測到與《第一首》的伏筆矛盾——(a) 這是刻意的幻滅轉折？(b) 需要我補一段解釋為何回不去？(c) 忽略。」附上 Reasoning Trace 指向兩處原文。創作者選 (a)，這個「刻意矛盾」被記為新 Fragment，之後不再誤報。AI 擴大了可能性，人類做了價值決定。

## Counter Example

若不用 FIE，一般 AI 面對同一組「高中 / 夏天 / 我們 / 宜蘭」會怎麼做？它把四個詞塞進一個 prompt：「用這四個關鍵字寫一首歌詞。」模型一次生成一版成品，聽起來通順，然後結束。

差別在哪：

- **無記憶**：下一首歌、換一組碎片，AI 完全不記得上次為什麼把「我們」寫成群體而非愛情。理解無法累積，每次從零。
- **無階段**：不管你用它三天還是三年，它的能力不會成長——它永遠停在 Phase 0，因為它累積的是聊天紀錄，不是結構化的 Fragment。
- **無跨作品世界觀**：第三首續作的「宜蘭」與第一首矛盾，它不會發現，因為它從不維護世界狀態，只在單次 context 內「臨時記得」，作品一多就截斷失憶。
- **無人機分工**：它直接給你一個成品（替你收斂），而不是攤開多個帶 Confidence 的 Candidate 讓你選。它悄悄做了本該屬於創作者的價值判斷。
- **累積的是 Prompt，不是理解**：換一個模型，你和它的全部關係歸零。

一般 AI 讓你「更快寫完一首歌」；FIE 讓 AI「隨時間更深地理解你這個創作者」。前者是工具的終點，後者是夥伴的起點——這正是本章四階段路線圖要走向的地方。

---

# 附錄（Appendices）

# Appendix A — Glossary（術語辭典）

本附錄為 Fragment Intelligence Engine（FIE）白皮書所用核心術語提供正式定義。定義以「理想化 greenfield 設計」為準，供工程師與研究者於引用時對齊語意。術語依概念層次而非字母排列。條目採「英文詞（繁中譯名）」形式；若 AI 島現況與定義有落差，以本書 Engineering Notes 各章的「⟢ AI 島現況對照」為準。

---

**Fragment（碎片）**
創作者所留存的最小語意單位——一則被明確標記、可被系統獨立指涉與檢索的觀念、記憶、感受或素材。Fragment 是 FIE 一切運算的原子；系統不直接推理「創作者」，只推理其 Fragment 的集合與關係。範例主軸的四碎片為「高中」「夏天」「我們」「宜蘭」。

**Representation（表徵）**
Fragment 在系統內的多層編碼形式，將單一 Fragment 展開為可供不同運算消費的視圖，典型包含文字表層（surface text）、語意向量（embedding）、情緒標記（emotion）、以及結構化屬性（時間、地點、關係）。Representation Layer 是「Fragment 是什麼」與「Reasoning 如何使用它」之間的解耦介面。

**Reasoning（推理）**
在 Fragment 的 Representation 之上，選擇、組合、對照並評估碎片以產生 Candidate 的運算過程。Reasoning 不創造新語意內容，而是在既有 Fragment 之間建立此前未被言明的連結（例如將「夏天」與「宜蘭」在「我們」的關係下對照）。Reasoning Layer 是 FIE 相對於單純檢索或生成的核心區分。

**Candidate（候選）**
Reasoning 針對某一輸入（prompt、缺口或探索目標）所產出的一個可能結果，附帶其 Confidence 與可回溯的 Reasoning Trace。系統對單一輸入通常同時維持多個 Candidate，並以 Confidence 排序而非只保留單一輸出。

**Evidence（證據）**
支撐某一 Candidate 或 Hypothesis 的具體 Fragment 或 Fragment 間關係。Evidence 使 Reasoning 的結論可稽核：每個 Candidate 都應能追溯至其所依據的 Evidence 集合，而非僅為模型的隱式產物。

**Hypothesis（假設）**
Reasoning 過程中提出、但尚未被 Evidence 充分支撐或確認的暫定連結或結論。Hypothesis 是 Candidate 的前驅狀態；當累積足夠 Evidence 且 Confidence 越過門檻，Hypothesis 方晉升為 Candidate。

**Creator Context（創作者脈絡）**
一次推理當下所載入的、與該創作者相關的 Fragment、關係與記憶的集合，構成 Reasoning 的作用範圍。Creator Context 界定了「系統此刻在誰的碎片宇宙中推理」，是實現個人化推理而非通用生成的邊界。

**Creator DNA（創作者基因）**
由創作者全體 Fragment 經萃取（analyze）而得的穩定風格與傾向畫像，描述其偏好的主題、語調、情緒基調與慣常連結方式。Creator DNA 是 Creator Context 中相對長期、跨作品持存的部分，供 Reasoning 校準 Candidate 是否「像這位創作者」。

**Reasoning Trace（推理軌跡）**
一次 Reasoning 從輸入到 Candidate 的完整、可回溯記錄，涵蓋所選 Fragment、所用 Representation、中間 Hypothesis、援引之 Evidence，以及 Confidence 的計算依據。Reasoning Trace 使 FIE 的產出可解釋、可稽核、可重現。

**Confidence（信心度）**
系統對某一 Candidate 或 Hypothesis 為「良好結果」的量化估計，通常為 [0, 1] 區間之標量，作為多 Candidate 排序與門檻裁決的依據。Confidence 反映 Evidence 的強度與一致性，而非結果的絕對真值。

**Weight（權重）**
Reasoning 中賦予某一 Fragment、關係或 Evidence 的相對影響力係數，用以調節其對 Candidate 生成與 Confidence 計算的貢獻。Weight 可源自 Creator DNA、近期性、情緒強度或碎片間連結強度。

**Missing Fragment（缺失碎片）**
在某一 Fragment 組合或推理脈絡中，被結構或共現模式所預示、但在 Creator Context 中尚不存在的碎片。偵測 Missing Fragment 使 FIE 能主動指出「這裡似乎還缺一塊」（例如在「高中／夏天／宜蘭」之間預示一個尚未言明的「我們」），是探索式推理的起點。

**Fragment Graph（碎片圖）**
以 Fragment 為節點、以其間關係為邊的結構化圖表示，是 Reasoning 遍歷與 Missing Fragment 偵測的運算基底。Fragment Graph 強調「顯式、可查詢的拓撲結構」。

**Fragment Network（碎片網絡）**
創作者全體 Fragment 及其連結所構成的整體關聯體，是 Fragment Graph 所欲刻畫的概念對象。相對於 Fragment Graph 指涉具體資料結構，Fragment Network 指涉此網絡作為一個湧現整體的性質（如密度、聚簇、意外配對）。

**Emotion Curve（情緒曲線）**
一組 Fragment 依序（時間、敘事或組合順序）排列時，其情緒 Representation 所呈現的變化軌跡。Emotion Curve 供 Reasoning 評估某一 Candidate 的情緒起伏是否連貫，或刻意製造張力（如「夏天」的明亮向「我們」的懷舊過渡）。

**Familiar / Adjacent / Exploratory Mode（熟悉／鄰近／探索模式）**
Reasoning 的三種作用範圍設定：Familiar Mode 僅在創作者高 Confidence、常用的 Fragment 連結內推理；Adjacent Mode 延伸至一階鄰近但尚未慣常組合的 Fragment；Exploratory Mode 則主動引入低共現或 Missing Fragment 以產生意外連結。三者以 Confidence 與新穎性之間的權衡區分。

**Co-occurrence Completion（共現補全）**
基於 Fragment 在既有語料中的共同出現模式，推斷某一不完整組合最可能缺少或接續之 Fragment 的機制。Co-occurrence Completion 是 Missing Fragment 偵測的主要實作手段之一（例如由「高中／夏天／宜蘭」之高共現推得「我們」）。

**Generation Engine（生成引擎）**
FIE 中負責將已排序的 Candidate 與其 Reasoning Trace 轉譯為最終自然語言或創作產物的下游模組。Generation Engine 消費 Reasoning 的結果而不重新進行推理，兩者的分離確保「推什麼」與「怎麼寫出來」可各自演進。

---

# Appendix B — Architecture Diagram（架構圖）

本附錄以單張 ASCII 圖呈現 Fragment Intelligence Engine（FIE）的資料流主幹：從 User 的碎片輸入，經過七層引擎的線性推理管線，產出 Candidate 並收集 Feedback，最後回灌 Fragment Intelligence 形成閉環。管線本身是理想化 greenfield 設計，各層職責與正文章節對應。

---

## B.1 主資料流（Primary Data Flow）

```
                                  ┌──────────────────────────────────────────┐
                                  │              U S E R                       │
                                  │  投入 / 標記 / 回饋 Fragment               │
                                  │  例：高中 · 夏天 · 我們 · 宜蘭             │
                                  └──────────────────────┬───────────────────┘
                                                         │  raw fragments
                                                         ▼
                                  ┌──────────────────────────────────────────┐
                            ┌────►│         [1] Fragment Store                │
                            │     │  持久化每一顆 Fragment 與其原始語境；      │
                            │     │  是唯一的事實來源（source of truth）。     │
                            │     └──────────────────────┬───────────────────┘
                            │                            │  fragment records
                            │                            ▼
                            │     ┌──────────────────────────────────────────┐
                            │     │       [2] Representation Engine           │
                            │     │  把 Fragment 展開成分層 Representation     │
                            │     │  （表層 / 語義 / 情感 / 關係），供推理引用。│
                            │     └──────────────────────┬───────────────────┘
                            │                            │  layered representations
                            │                            ▼
                            │     ┌──────────────────────────────────────────┐
                            │     │        [3] Reasoning Engine               │
                            │     │  在 Representation 上建立 Hypothesis 與   │
                            │     │  Evidence，決定 Familiar/Adjacent/        │
                            │     │  Exploratory 三種推理模式並輸出 Trace。    │
                            │     └──────────────────────┬───────────────────┘
                            │                            │  hypotheses + reasoning trace
                            │                            ▼
                            │     ┌──────────────────────────────────────────┐
                            │     │        [4] Candidate Engine               │
                            │     │  將 Hypothesis 具體化為多個 Candidate，    │
                            │     │  依 Evidence 計算 Confidence 並排序。      │
                            │     └──────────────────────┬───────────────────┘
                            │                            │  ranked candidates
                            │                            ▼
                            │     ┌──────────────────────────────────────────┐
                            │     │     [5] Creator Context Engine            │
                            │     │  用 Creator Context / Creator DNA 對       │
                            │     │  Candidate 做個人化重加權（re-weight）。   │
                            │     └──────────────────────┬───────────────────┘
                            │                            │  personalized candidates
                            │                            ▼
                            │     ┌──────────────────────────────────────────┐
                            │     │        [6] Generation Engine              │
                            │     │  把選定 Candidate 連同 Reasoning Trace     │
                            │     │  編織成可讀輸出（作品 / 解釋 / 提案）。    │
                            │     └──────────────────────┬───────────────────┘
                            │                            │  generated artifact + trace
                            │                            ▼
                            │     ┌──────────────────────────────────────────┐
                            │     │           [7] Feedback                    │
                            │     │  收集 User 對輸出與 Candidate 的採納 /     │
                            │     │  修正 / 拒絕訊號，轉為結構化回饋。         │
                            │     └──────────────────────┬───────────────────┘
                            │                            │  feedback signals
                            │                            ▼
                            │     ┌──────────────────────────────────────────┐
                            │     │      Fragment Intelligence (loop)         │
                            │     │  用 Feedback 更新 Weight / Confidence /   │
                            │     │  Creator DNA，並偵測 Missing Fragment。   │
                            │     └──────────────────────┬───────────────────┘
                            │                            │
                            └────────────────────────────┘
                               回灌 Store／Representation／Context
                               （持續學習閉環 · continuous loop）
```

---

## B.2 組件職責索引（Component Responsibility Index）

| # | 組件（Component） | 一句職責 | 關鍵術語 |
|---|---|---|---|
| 1 | **Fragment Store** | 持久化每一顆 Fragment 與原始語境，是唯一事實來源。 | Fragment |
| 2 | **Representation Engine** | 把 Fragment 展開成分層 Representation 供推理引用。 | Representation |
| 3 | **Reasoning Engine** | 建立 Hypothesis／Evidence，選定推理模式並輸出 Reasoning Trace。 | Reasoning · Hypothesis · Evidence |
| 4 | **Candidate Engine** | 將 Hypothesis 具體化為多個 Candidate 並依 Confidence 排序。 | Candidate · Confidence |
| 5 | **Creator Context Engine** | 用 Creator Context／Creator DNA 對 Candidate 個人化重加權。 | Creator Context · Creator DNA · Weight |
| 6 | **Generation Engine** | 將選定 Candidate 與 Reasoning Trace 編織成可讀輸出。 | Reasoning Trace |
| 7 | **Feedback** | 收集採納／修正／拒絕訊號並轉為結構化回饋。 | Feedback |
| ↺ | **Fragment Intelligence (loop)** | 用 Feedback 更新 Weight／Confidence／Creator DNA 並偵測 Missing Fragment。 | Weight · Missing Fragment |

---

## B.3 圖例說明（Legend）

- `▼` 主管線資料流：由 User 輸入的 Fragment 沿 [1]→[7] 單向前進，各層只消費上游輸出、產出下游輸入。
- 左側 `◄──` 回饋邊：`Fragment Intelligence (loop)` 將學習結果回灌至 Fragment Store、Representation Engine 與 Creator Context Engine，構成持續學習閉環；此回灌是非同步的，不阻塞當前一次推理。
- **貫穿範例**：四碎片「高中 · 夏天 · 我們 · 宜蘭」自 Fragment Store 進入，於 Reasoning Engine 產生「一段共同記憶」等 Hypothesis，於 Candidate Engine 展開為多個敘事 Candidate，經 Creator Context Engine 依該 Creator 的 DNA 重加權後生成輸出，其採納與否再沿 Feedback 邊回饋。

---

## Engineering Notes

- 圖中七層為**邏輯層（logical layers）**而非強制的部署邊界；實作上相鄰層可合併於同一服務，惟層間契約（輸入／輸出型別）須維持穩定，以保證 Reasoning Trace 可端到端追溯。
- 回饋邊刻意畫為單一匯流節點（Fragment Intelligence loop）而非多條散射線，強調「所有學習訊號集中治理」的設計原則：Weight 與 Confidence 的更新只允許發生在此節點，避免各層各自漂移。

**⟢ AI 島現況對照**

- **已具備閉環雛形**：目前 Creator Island 已有 `ci_fragments`（含 `embedding vector(1536)`）作為 Fragment Store，`analyzeDNA → ci_creator_dna` 對應 Creator Context Engine，`synthesize / evolve / compose / transcreate` 等 AI agents 對應 Generation 與部分 Reasoning 行為，`ci_agent_runs` 則是 Reasoning Trace 的雛形，整體已能跑出「碎片進 → 作品出」的粗管線。
- **尚未分層／未閉環的部分**：現況並無獨立的 **Representation Engine**（分層 Representation）、**Reasoning Engine**（三種推理模式與正式 Hypothesis/Evidence）、以及 **Candidate Engine**（多 Candidate + Confidence 排序）——目前多為單一輸出直出。`ci_surprising_pairs`／`ci_related_fragments`／`ci_memories` 提供了關聯與記憶素材，但尚未收斂成圖中集中的 **Fragment Intelligence (loop)**：Feedback 回灌、Weight/Confidence 更新與 **Missing Fragment 偵測**目前仍缺，是本圖相對於現況的主要待建區塊。

---

# Appendix C — Sequence Diagram（序列圖）

本附錄以 ASCII sequence diagram 描述**一次完整創作請求**的端到端時序：從使用者送出四個 Fragment，經 Representation、Reasoning（Observation → Hypothesis → Evidence）、Candidate 生成與 Select，到 Generation、Save Feedback，最後回寫 Creator DNA。範例沿用全書主軸四碎片 **「高中 / 夏天 / 我們 / 宜蘭」**。

每一次互動皆標註 **輸入（→ 送出的資料）** 與 **輸出（⇠ 回傳的資料）**，以呈現各層之間的契約（contract）。虛線回傳箭頭（`⇠`）代表回應，實線箭頭（`→`）代表請求。

---

## C.1 Participants（參與者）

```
┌────────────┬──────────────────────────────────────────────────────────┐
│ 代號        │ 元件（Component）                                          │
├────────────┼──────────────────────────────────────────────────────────┤
│ U          │ User / Creator（發起創作請求的人）                          │
│ API        │ Create Endpoint（請求入口、orchestration）                  │
│ REP        │ Representation Layer（Fragment → 多層表徵）                  │
│ RSN        │ Reasoning Layer（Observation / Hypothesis / Evidence）      │
│ STORE      │ Fragment Store（ci_fragments + embedding / pairs / DNA）    │
│ GEN        │ Generation Layer（依 selected Candidate 產出成品）           │
│ DNA        │ Creator DNA Updater（回寫創作者風格模型）                   │
└────────────┴──────────────────────────────────────────────────────────┘
```

---

## C.2 Full Sequence（完整時序）

```
 U        API        REP        RSN       STORE       GEN        DNA
 │         │          │          │          │          │          │
 │ (1) POST /create   │          │          │          │          │
 │  fragments=[       │          │          │          │          │
 │   "高中","夏天",   │          │          │          │          │
 │   "我們","宜蘭"]   │          │          │          │          │
 │  intent="短篇散文" │          │          │          │          │
 ├────────►│          │          │          │          │          │
 │         │          │          │          │          │          │
 │         │ (2) createFragments(text[])    │          │          │
 │         ├─────────────────────────────►  │          │          │
 │         │          │          │  persist rows +      │          │
 │         │          │          │  embed(text)→vec1536 │          │
 │         │ ⇠ fragment_ids=[f1..f4]         │          │          │
 │         │◄─────────────────────────────  │          │          │
 │         │          │          │          │          │          │
 │         │ (3) represent(fragment_ids)     │          │          │
 │         ├────────►│          │          │          │          │
 │         │         │ per fragment build:   │          │          │
 │         │         │  · Surface（原字面）  │          │          │
 │         │         │  · Semantic（embedding vec1536）  │          │
 │         │         │  · Associative（related / pairs） │          │
 │         │         │  · Affective（情緒 / 溫度 tag）   │          │
 │         │         │ (3a) fetch neighbors  │          │          │
 │         │         ├──────────────────────►│          │          │
 │         │         │ ⇠ related_fragments,   │          │          │
 │         │         │   surprising_pairs     │          │          │
 │         │         │◄──────────────────────│          │          │
 │         │ ⇠ Representation[4]（四層表徵）  │          │          │
 │         │◄────────│          │          │          │          │
 │         │          │          │          │          │          │
 │         │ (4) reason(representations, intent)         │          │
 │         ├───────────────────►│          │          │          │
 │         │          │  ┌───────────────────────────┐  │          │
 │         │          │  │ (4a) Observation           │  │          │
 │         │          │  │  「高中+夏天」→ 青春時序   │  │          │
 │         │          │  │  「我們+宜蘭」→ 群體+地方  │  │          │
 │         │          │  ├───────────────────────────┤  │          │
 │         │          │  │ (4b) Hypothesis（多個）    │  │          │
 │         │          │  │  H1 懷舊回望敘事           │  │          │
 │         │          │  │  H2 濕熱感官地誌           │  │          │
 │         │          │  │  H3 離別 / 未竟之約        │  │          │
 │         │          │  ├───────────────────────────┤  │          │
 │         │          │  │ (4c) Evidence 檢索          │  │          │
 │         │          ├─────────────────────►│         │          │
 │         │          │  │  ⇠ 支持/反對各 Hypothesis │  │          │
 │         │          │  │    的 fragment 佐證        │  │          │
 │         │          │◄─────────────────────│         │          │
 │         │          │  │ (4d) score → Confidence    │  │          │
 │         │          │  │  H1=0.72 H2=0.65 H3=0.48   │  │          │
 │         │          │  └───────────────────────────┘  │          │
 │         │ ⇠ Hypotheses[] + Reasoning Trace + Confidence          │
 │         │◄───────────────────│          │          │          │
 │         │          │          │          │          │          │
 │         │ (5) buildCandidates(hypotheses)  ← 每個 H → 1 Candidate│
 │         │  ┌──────────────────────────────────────┐  │          │
 │         │  │ C1←H1  conf=0.72  angle=懷舊回望      │  │          │
 │         │  │ C2←H2  conf=0.65  angle=感官地誌      │  │          │
 │         │  │ C3←H3  conf=0.48  angle=未竟之約      │  │          │
 │         │  └──────────────────────────────────────┘  │          │
 │         │          │          │          │          │          │
 │         │ (6) select(candidates, mode)     │          │          │
 │         │   mode=Familiar → argmax(conf)   │          │          │
 │         │   ⇒ selected=C1（0.72）          │          │          │
 │         │          │          │          │          │          │
 │         │ (7) generate(selected_candidate, representations)      │
 │         ├──────────────────────────────────────────►│          │
 │         │          │          │   compose 成品：     │          │
 │         │          │          │   短篇散文（依 C1）  │          │
 │         │ ⇠ artifact_text + reasoning_trace_ref      │          │
 │         │◄──────────────────────────────────────────│          │
 │         │          │          │          │          │          │
 │ (8) 200 OK：artifact + trace + candidates[]（可切換）  │          │
 │◄────────┤          │          │          │          │          │
 │         │          │          │          │          │          │
 │ (9) feedback（採用 / 換角度 / 評分）        │          │          │
 │  accepted=true, rating=+1, chosen=C1       │          │          │
 ├────────►│          │          │          │          │          │
 │         │ (10) saveFeedback(run_id, signal)│          │          │
 │         ├─────────────────────────────►    │          │          │
 │         │          │  persist ci_agent_runs + feedback │          │
 │         │ ⇠ ok                             │          │          │
 │         │◄─────────────────────────────    │          │          │
 │         │          │          │          │          │          │
 │         │ (11) updateCreatorDNA(feedback, trace)      │          │
 │         ├───────────────────────────────────────────────────►│  │
 │         │          │          │          │   adjust weights：   │
 │         │          │          │          │    懷舊角度 ↑        │
 │         │          │          │          │    Familiar mode ↑   │
 │         │ ⇠ dna_version++                             │          │
 │         │◄───────────────────────────────────────────────────│  │
 │         │          │          │          │          │          │
 │ (12) ack（DNA 已更新，下次排序生效）        │          │          │
 │◄────────┤          │          │          │          │          │
 │         │          │          │          │          │          │
```

---

## C.3 Step Contracts（各步驟輸入 / 輸出契約）

```
┌────┬──────────────────────┬──────────────────────────┬────────────────────────────┐
│ #  │ Step                 │ Input（輸入）             │ Output（輸出）              │
├────┼──────────────────────┼──────────────────────────┼────────────────────────────┤
│ 1  │ Create Request       │ fragments[4]（文字）+     │ —（進入 pipeline）          │
│    │                      │ intent                    │                            │
│ 2  │ Create Fragment      │ text[]                    │ fragment_ids[] + embedding  │
│ 3  │ Representation        │ fragment_ids             │ Representation[]（四層）     │
│ 3a │  · neighbor lookup   │ embedding / id           │ related + surprising_pairs  │
│ 4a │ Observation          │ Representation[]          │ 觀察組（碎片間關係）         │
│ 4b │ Hypothesis           │ observations + intent     │ Hypotheses[]（多個假設）     │
│ 4c │ Evidence             │ hypotheses               │ 支持/反對佐證 fragments      │
│ 4d │ Confidence Scoring   │ hypotheses + evidence     │ Confidence[]（每個 H 一分）  │
│ 5  │ Candidate            │ hypotheses + confidence   │ Candidates[]（角度 + conf）  │
│ 6  │ Select               │ candidates + mode         │ selected_candidate          │
│ 7  │ Generation           │ selected + Representation  │ artifact + trace_ref        │
│ 8  │ Response             │ artifact + trace + cands  │ 使用者可見成品 + 可切換角度  │
│ 9  │ User Feedback        │ accepted / rating / chosen│ feedback signal             │
│ 10 │ Save Feedback        │ run_id + signal           │ ci_agent_runs 落盤          │
│ 11 │ Update Creator DNA   │ feedback + Reasoning Trace│ 調整 weights + dna_version++ │
│ 12 │ Ack                  │ dna_version               │ 確認（下輪排序生效）         │
└────┴──────────────────────┴──────────────────────────┴────────────────────────────┘
```

---

## C.4 Notes（時序備註）

- **步驟 4c ↔ STORE 的往返是 Reasoning 的核心迴路**：Hypothesis 不是一次生成即定案，而是必須向 Fragment Store 拉取 Evidence 後才被賦予 Confidence。若某 Hypothesis 找不到任何支持性 fragment，其 Confidence 應趨近 0 而非被丟棄——這正是 **Missing Fragment** 偵測的觸發點（見正文 Reasoning Layer）。
- **步驟 6 的 `mode` 決定選取策略**：`Familiar` 取 `argmax(Confidence)`；`Adjacent` 取次高且與主軸有一定語義距離者；`Exploratory` 刻意偏向低 Confidence / 高 surprising_pairs 的 Candidate。故同一組 Hypotheses[] 可依 mode 產生不同的 `selected`。
- **步驟 8 回傳的 `candidates[]` 不只回傳被選中者**：未被選中的 C2 / C3 一併回傳，使 User 可在不重跑 Reasoning 的情況下切換角度（步驟 9 的 `chosen` 即記錄此選擇）。
- **步驟 11 的回寫是唯一有狀態副作用的收斂點**：Reasoning Trace 與 feedback 一起進入 DNA Updater，使「使用者實際採用的角度 / mode」成為下一次 Candidate 排序的先驗（prior）。

---

## Engineering Notes

- 本序列圖的 request/response 契約以**同步 orchestration** 呈現（API 逐層等待回傳）；實作上步驟 3a / 4c 的 Store 往返可批次化或並行化，但 4d 的 Confidence scoring 必須在 Evidence 全部回傳後才可進行，構成一個硬性 barrier。
- Reasoning Trace（步驟 4 產出、貫穿至 7 與 11）是全流程唯一橫跨「生成」與「學習」兩端的資料物件，建議以獨立 `trace_id` 貫穿落盤，避免只存最終 artifact 而遺失可解釋性。

⟢ **AI 島現況對照**

- **已對應**：步驟 2（`ci_fragments` + `embedding vector(1536)`）、步驟 3a（`ci_related_fragments` / `ci_surprising_pairs`）、步驟 7（`synthesize` / `compose` / `evolve` / `transcreate` agents）、步驟 10（`ci_agent_runs` 執行 trace 雛形）、步驟 11（`analyzeDNA → ci_creator_dna`）皆已有對應實作。
- **尚缺**：目前流程中步驟 **3（四層 Representation 分層）**、步驟 **4b–4d（多 Hypothesis + Evidence 檢索 + Confidence 排序）**、步驟 **5–6（多 Candidate 與依 mode 的 Select）** 尚未成形——現況多為「單一路徑直出」，缺少可切換角度的 `candidates[]` 與完整可回放的 Reasoning Trace。步驟 6 的三種模式（Familiar / Adjacent / Exploratory）與 4c 觸發的 Missing Fragment 偵測目前皆為缺口，是本設計相對於現有 Creator Island 的主要增量。

---

# Appendix D — Data Model（資料模型 JSON Schema）

本附錄以 [JSON Schema Draft 2020-12](https://json-schema.org/) 定義 FIE 四個核心資料結構的**理想化 greenfield schema**：`Fragment`、`Candidate`、`CreatorContext`、`ReasoningTrace`。這些 schema 描述的是 Reasoning Layer 在記憶體 / API 邊界上流動的資料形狀，**不等同於**任何一張實體資料表——落地時如何切表、如何分頁、如何加索引屬於實作決策（見結尾的「AI 島現況對照」）。

慣例：

- 所有 `id` 為 UUID v4 字串。
- 所有時間戳為 RFC 3339（UTC）。
- `embedding` 一律 1536 維 `float32` 向量（對齊現行 embedding model 維度）。
- `confidence` / `weight` / `similarity` 一律落在 `[0, 1]` 閉區間。
- 貫穿全書的範例四碎片為 **高中 / 夏天 / 我們 / 宜蘭**；以下 examples 沿用此主軸。

---

## D.1 Fragment

Fragment 是系統中最小的、不可再分的創作原料單位。理想 schema 將 Fragment 明確分為三層 **Representation**：`surface`（作者原話）、`semantic`（機器可算的語意層）、`provenance`（來源與生成血緣）。這是本白皮書 Fragment Representation 章的直接落地。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai-island/schemas/fragment.json",
  "title": "Fragment",
  "type": "object",
  "required": ["id", "workspace_id", "surface", "semantic", "provenance", "created_at"],
  "additionalProperties": false,
  "properties": {
    "id":            { "type": "string", "format": "uuid" },
    "workspace_id":  { "type": "string", "format": "uuid",
                       "description": "Fragment 歸屬的 workspace（隔離邊界）" },
    "created_by":    { "type": ["string", "null"], "format": "uuid" },

    "surface": {
      "type": "object",
      "description": "Surface Representation — 作者原話，永不被機器改寫",
      "required": ["title", "content"],
      "additionalProperties": false,
      "properties": {
        "title":    { "type": "string", "minLength": 1, "maxLength": 200,
                      "examples": ["宜蘭"] },
        "content":  { "type": "string", "default": "",
                      "description": "碎片正文；可為空（僅標題型碎片）" },
        "language": { "type": ["string", "null"], "description": "BCP-47，如 zh-Hant" }
      }
    },

    "semantic": {
      "type": "object",
      "description": "Semantic Representation — 機器可算的語意層",
      "required": ["embedding"],
      "additionalProperties": false,
      "properties": {
        "embedding": {
          "type": "array", "items": { "type": "number" },
          "minItems": 1536, "maxItems": 1536,
          "description": "1536 維語意向量"
        },
        "tags":     { "type": "array", "items": { "type": "string" },
                      "examples": [["青春", "地方", "記憶"]] },
        "mood":     { "type": ["string", "null"], "examples": ["懷舊"] },
        "category": { "type": ["string", "null"], "examples": ["place"] },
        "ai_summary": { "type": ["string", "null"],
                        "description": "AI 生成之語意摘要，供人審閱，非 surface" },
        "concept_axes": {
          "type": "object",
          "description": "選填的可解釋語意座標（理想層；用於 Adjacent 推理的方向判斷）",
          "additionalProperties": { "type": "number" },
          "examples": [{ "temporality": 0.8, "collectivity": 0.6, "locality": 0.9 }]
        }
      }
    },

    "provenance": {
      "type": "object",
      "description": "Provenance Representation — 來源與生成血緣",
      "required": ["source_type"],
      "additionalProperties": false,
      "properties": {
        "source_type": {
          "type": "string",
          "enum": ["human_original", "ai_generated", "ai_assisted",
                   "human_selected", "work_recycled", "transcreated", "market_imported"],
          "description": "碎片如何進入系統"
        },
        "derived_from": {
          "type": "array",
          "description": "上游 Fragment 血緣（DAG 邊）",
          "items": {
            "type": "object",
            "required": ["fragment_id", "relation"],
            "properties": {
              "fragment_id": { "type": "string", "format": "uuid" },
              "relation": {
                "type": "string",
                "enum": ["evolved_from", "condensed_from", "recycled_from",
                         "transcreated_from", "inspired_by", "remixed_from"]
              }
            }
          }
        },
        "reasoning_trace_id": {
          "type": ["string", "null"], "format": "uuid",
          "description": "若此碎片由某次推理產生，指回產生它的 ReasoningTrace"
        }
      }
    },

    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": ["string", "null"], "format": "date-time" }
  }
}
```

**設計說明**：三層分離是刻意的。`surface` 是不可變的作者聲音；`semantic` 可隨 embedding model 升級而重算；`provenance` 讓每個碎片都可回溯到其創作史。這使得「宜蘭」這一碎片既是原始輸入，也可能是某次 `transcreate` 的輸出——由 `source_type` 與 `derived_from` 區分，而不需要兩張表。

---

## D.2 Candidate

Candidate 是 Reasoning Layer 針對一次查詢輸出的**單一候選答案**。核心設計是：推理輸出**永遠是一組排序過的 Candidate 陣列**，而非單一結果。每個 Candidate 自帶 `confidence`、支撐它的 `evidence`、以及它所屬的 `reasoning_mode`。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai-island/schemas/candidate.json",
  "title": "Candidate",
  "type": "object",
  "required": ["id", "reasoning_mode", "confidence", "evidence", "payload"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "string", "format": "uuid" },

    "reasoning_mode": {
      "type": "string",
      "enum": ["familiar", "adjacent", "exploratory"],
      "description": "產生此候選的推理模式；決定它在排序中的先驗權重"
    },

    "confidence": {
      "type": "number", "minimum": 0, "maximum": 1,
      "description": "系統對此候選的自評信心；非機率、為可比較的排序分數"
    },

    "payload": {
      "type": "object",
      "description": "候選的實際內容（依查詢型別而異）",
      "required": ["kind"],
      "properties": {
        "kind": {
          "type": "string",
          "enum": ["fragment_combination", "new_fragment", "hypothesis", "answer"]
        },
        "fragment_ids": {
          "type": "array", "items": { "type": "string", "format": "uuid" },
          "description": "此候選所組合 / 引用的碎片",
          "examples": [["<高中>", "<夏天>", "<我們>", "<宜蘭>"]]
        },
        "text": { "type": ["string", "null"],
                  "description": "候選的自然語言表述或生成產物" }
      }
    },

    "evidence": {
      "type": "array",
      "description": "支撐此候選的 Evidence 清單；每筆可正可負",
      "items": {
        "type": "object",
        "required": ["type", "weight"],
        "additionalProperties": false,
        "properties": {
          "type": {
            "type": "string",
            "enum": ["semantic_similarity", "surprising_pair", "creator_dna_match",
                     "memory_recall", "co_occurrence", "missing_fragment"],
            "description": "證據來源；missing_fragment 表示反向證據（缺口）"
          },
          "fragment_ids": {
            "type": "array", "items": { "type": "string", "format": "uuid" }
          },
          "weight": {
            "type": "number", "minimum": 0, "maximum": 1,
            "description": "此證據對 confidence 的貢獻權重"
          },
          "detail": { "type": ["string", "null"],
                      "examples": ["宜蘭↔夏天 similarity=0.41，落在 surprising 區間"] }
        }
      }
    },

    "hypothesis": {
      "type": ["object", "null"],
      "description": "Exploratory 模式下的可證偽假設（若適用）",
      "properties": {
        "statement": { "type": "string",
                       "examples": ["把『宜蘭』當作時間而非地點，可撐起一首夏日敘事"] },
        "falsifiable_by": { "type": "string",
                            "description": "什麼樣的證據會推翻此假設" }
      }
    },

    "rank": { "type": ["integer", "null"], "minimum": 1,
              "description": "在同一次推理輸出陣列中的最終名次（1 為最佳）" }
  }
}
```

**設計說明**：`evidence[].type = "missing_fragment"` 是關鍵設計——系統不只回報「有什麼支撐」，也回報「缺什麼」。若「高中 / 夏天 / 我們」高度指向一段共同記憶，但缺一個**地點**碎片，`missing_fragment` 證據會壓低純組合候選的 confidence，同時可觸發一個 `kind = "new_fragment"` 的候選去補上「宜蘭」。

---

## D.3 CreatorContext

CreatorContext 是推理時注入的**創作者狀態快照**：包含 Creator DNA（長期風格畫像）、當前 workspace 的碎片池摘要、以及被召回的 memories。它是 Reasoning Layer 的「讀者側」輸入，決定同一組碎片對不同創作者會產生不同排序。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai-island/schemas/creator-context.json",
  "title": "CreatorContext",
  "type": "object",
  "required": ["user_id", "workspace_id", "creator_dna", "assembled_at"],
  "additionalProperties": false,
  "properties": {
    "user_id":      { "type": "string", "format": "uuid" },
    "workspace_id": { "type": "string", "format": "uuid" },
    "assembled_at": { "type": "string", "format": "date-time",
                      "description": "此 context 快照的組裝時間（推理當下）" },

    "creator_dna": {
      "type": "object",
      "description": "Creator DNA — 長期風格畫像",
      "required": ["traits", "confidence"],
      "additionalProperties": false,
      "properties": {
        "traits": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "imagery":    { "type": "array", "items": { "type": "string" },
                            "examples": [["海", "舊照片", "腳踏車"]] },
            "tone":       { "type": ["string", "null"], "examples": ["溫柔而克制"] },
            "strengths":  { "type": "array", "items": { "type": "string" } },
            "weaknesses": { "type": "array", "items": { "type": "string" } },
            "formats":    { "type": "array", "items": { "type": "string" },
                            "examples": [["散文", "歌詞"]] }
          }
        },
        "confidence": {
          "type": "number", "minimum": 0, "maximum": 1,
          "description": "DNA 畫像本身的可信度（樣本越多越高）"
        },
        "updated_at": { "type": ["string", "null"], "format": "date-time" }
      }
    },

    "fragment_pool": {
      "type": "object",
      "description": "當前 workspace 碎片池的推理摘要（非全量搬運）",
      "additionalProperties": false,
      "properties": {
        "total_count": { "type": "integer", "minimum": 0 },
        "focus_fragment_ids": {
          "type": "array", "items": { "type": "string", "format": "uuid" },
          "description": "本次推理聚焦的碎片",
          "examples": [["<高中>", "<夏天>", "<我們>", "<宜蘭>"]]
        }
      }
    },

    "recalled_memories": {
      "type": "array",
      "description": "本次推理召回並注入 prompt 的 memories",
      "items": {
        "type": "object",
        "required": ["memory_id", "text", "confidence"],
        "properties": {
          "memory_id":  { "type": "string", "format": "uuid" },
          "scope":      { "type": "string",
                          "enum": ["personal", "workspace", "project", "session"] },
          "kind":       { "type": "string",
                          "examples": ["style", "tone", "motif", "rule", "note"] },
          "text":       { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    }
  }
}
```

**設計說明**：CreatorContext 不夾帶整個碎片池，只帶 `focus_fragment_ids` 與 pool 摘要——推理層需要碎片內容時再依 id 拉取。`recalled_memories` 明確列出**哪些**記憶被注入，這是可稽核性的前提：任何一個 Candidate 若受某條 memory 影響，都能在 ReasoningTrace 中回指到這裡。

---

## D.4 ReasoningTrace

ReasoningTrace 是一次完整推理的**可稽核記錄**：從輸入的碎片與 context，經過哪些推理步驟（steps），召回哪些 evidence，產出哪些 Candidate，最終如何排序。它是本白皮書「Reasoning Trace」章的資料落地，也是把 FIE 與黑箱生成器區別開來的核心產物。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai-island/schemas/reasoning-trace.json",
  "title": "ReasoningTrace",
  "type": "object",
  "required": ["id", "workspace_id", "query", "steps", "candidates", "status", "started_at"],
  "additionalProperties": false,
  "properties": {
    "id":           { "type": "string", "format": "uuid" },
    "workspace_id": { "type": "string", "format": "uuid" },
    "user_id":      { "type": ["string", "null"], "format": "uuid" },

    "query": {
      "type": "object",
      "description": "觸發此次推理的請求",
      "required": ["intent", "input_fragment_ids"],
      "properties": {
        "intent": {
          "type": "string",
          "enum": ["synthesize", "evolve", "compose", "transcreate", "explore", "explain"],
          "description": "推理意圖（對齊 AI agent 動作）"
        },
        "input_fragment_ids": {
          "type": "array", "items": { "type": "string", "format": "uuid" },
          "examples": [["<高中>", "<夏天>", "<我們>", "<宜蘭>"]]
        },
        "context_ref": { "type": ["string", "null"],
                         "description": "所用 CreatorContext 快照的參照（或內嵌 hash）" }
      }
    },

    "steps": {
      "type": "array",
      "description": "推理步驟序列，依時間排序；每步可產生 evidence 或收斂候選",
      "items": {
        "type": "object",
        "required": ["index", "phase", "summary"],
        "additionalProperties": false,
        "properties": {
          "index": { "type": "integer", "minimum": 0 },
          "phase": {
            "type": "string",
            "enum": ["retrieve", "associate", "hypothesize", "evaluate", "rank"],
            "description": "推理階段"
          },
          "reasoning_mode": {
            "type": ["string", "null"],
            "enum": ["familiar", "adjacent", "exploratory", null]
          },
          "summary": { "type": "string",
                       "examples": ["發現『宜蘭↔夏天』為 surprising pair，開啟 adjacent 分支"] },
          "evidence_produced": {
            "type": "array", "items": { "type": "string", "format": "uuid" },
            "description": "此步產生的 evidence（回指 candidate.evidence）"
          },
          "detected_missing": {
            "type": "array", "items": { "type": "string" },
            "description": "此步偵測到的 Missing Fragment（概念缺口描述）",
            "examples": [["缺一個具體感官細節碎片以錨定『夏天』"]]
          }
        }
      }
    },

    "candidates": {
      "type": "array",
      "description": "此次推理產出的候選（已排序）",
      "items": { "$ref": "https://ai-island/schemas/candidate.json" },
      "minItems": 0
    },

    "selected_candidate_id": {
      "type": ["string", "null"], "format": "uuid",
      "description": "最終被採用的候選（若有人在回路中選擇）"
    },

    "status": {
      "type": "string",
      "enum": ["running", "succeeded", "failed"],
      "description": "推理狀態"
    },
    "error": { "type": ["string", "null"] },

    "cost": {
      "type": "object",
      "description": "資源計量（內部分析用）",
      "properties": {
        "provider":      { "type": ["string", "null"] },
        "model":         { "type": ["string", "null"] },
        "tokens_input":  { "type": "integer", "minimum": 0 },
        "tokens_output": { "type": "integer", "minimum": 0 }
      }
    },

    "started_at":  { "type": "string", "format": "date-time" },
    "finished_at": { "type": ["string", "null"], "format": "date-time" }
  }
}
```

**設計說明**：`steps` 是 ReasoningTrace 與現行「只記 input/output 的 run log」最本質的差異——它記錄推理**如何**從輸入走到輸出，包含中途開啟的 adjacent 分支、偵測到的 missing fragment、以及每個 candidate 的收斂路徑。`candidates` 直接以 `$ref` 內嵌 D.2 的 Candidate schema，使 trace 成為自足的可回放單位。

---

## ⟢ AI 島現況對照

以下逐一對照理想 schema 與真實資料表（`ci_fragments` / `ci_creator_dna` / `ci_agent_runs` / `ci_memories`）的落差。原則：**現況能對應的欄位據實列出，理想層多出的部分誠實標為尚缺。**

### Fragment：已有原料，尚無分層

`ci_fragments` 已相當接近，但**未做三層 Representation 的顯性切分**：

| 理想 schema | `ci_fragments` 現況 | 差異 |
|---|---|---|
| `surface.title` / `surface.content` / `surface.language` | `title` / `content`（`language` 在 `ci_works` 有、fragment 無） | 已實作；未分層，與 semantic 平鋪在同一列 |
| `semantic.embedding` | `embedding vector(1536)` | 已實作 |
| `semantic.tags` / `mood` / `category` / `ai_summary` | `tags` / `mood` / `category` / `ai_summary` | 已實作，但概念上屬 semantic，現況未分層 |
| `semantic.concept_axes` | 無 | **尚缺**：目前只有黑箱 embedding，無可解釋語意座標 |
| `provenance.source_type` | `source_type`（enum 幾乎一致） | 已實作 |
| `provenance.derived_from` | 存在於**獨立表** `ci_asset_relations`（多型血緣） | 已實作，但血緣不在 fragment 列上，需 JOIN |
| `provenance.reasoning_trace_id` | 無 | **尚缺**：碎片無法回指產生它的推理 |

結論：surface / semantic 的**內容**都在，但攤平在一張表；provenance 靠 `ci_asset_relations` 側表達成。**分層是概念缺口，不是資料缺口。**

### Candidate：完全尚缺

現況**沒有 Candidate 這個結構**。`agents.ts` 的 `synthesize` / `evolve` / `compose` / `transcreate` 直接產出**單一結果**寫回 `ci_fragments` / `ci_works`，不產出多候選、無 `confidence` 排序、無 `evidence` 清單。

- `ci_surprising_pairs()`（意外配對 RPC，similarity 落在 0.28–0.55 區間）已提供**未來 `evidence.type = "surprising_pair"` 的原料**，但目前只餵給生成 prompt，不會被結構化成 evidence。
- 三種推理模式（Familiar / Adjacent / Exploratory）、`hypothesis`、`missing_fragment` 反向證據——**全部尚缺**。

### CreatorContext：DNA 與 memory 已有，未組裝成快照

- `creator_dna`：`ci_creator_dna` 已實作，欄位幾乎**逐一對應**——`traits JSONB`（`{imagery[], tone, strengths[], weaknesses[], formats[]}`，與理想 traits 一致）、`confidence NUMERIC(4,3)`、`updated_at`。這是對照最緊的一塊。
- `recalled_memories`：`ci_memories` 已實作（`scope` / `kind` / `text` / `embedding` / `confidence` / `status`），且 `ci_memory_usage` 已記錄「哪些記憶被注入哪個 run」——**理想 schema 的 `recalled_memories` 現況已有等價落地**。
- `fragment_pool` 摘要：**尚缺**顯性結構；目前推理時是臨時撈碎片、不組成一份可參照的 context 快照。
- 差異總結：CreatorContext 的**成分**（DNA、memory、碎片）都在，但**尚缺「把它們組裝成一份帶時間戳、可被 trace 回指的 context 物件」**這一層。

### ReasoningTrace：只有 run 雛形，尚無 steps

`ci_agent_runs` 是**執行 trace 的雛形**，可對應到 ReasoningTrace 的外層：

| 理想 schema | `ci_agent_runs` 現況 | 差異 |
|---|---|---|
| `query.intent` | `agent_type` | 已實作（synthesize/evolve/…） |
| `query.input_fragment_ids` | `input JSONB`（半結構化） | 有 input，但未規格化為 fragment id 陣列 |
| `candidates` | `output JSONB`（單一產物） | **尚缺**：output 是單結果，非排序候選陣列 |
| `steps` | 無 | **尚缺**：這是最大缺口——**沒有推理步驟序列**，無法回放「怎麼想到的」 |
| `selected_candidate_id` | `created_assets TEXT[]` | 有「產出了什麼」，但無「從幾個候選中選了哪個」 |
| `status` / `error` | `status`（running/succeeded/failed）/ `error` | 已實作 |
| `cost` | `provider` / `model` / `tokens_input` / `tokens_output` / `cost_usd` / `z_charged` | 已實作，且比理想 schema 更細（含計費） |

結論：`ci_agent_runs` 記的是**「一次呼叫的帳」（誰、花多少、成功否、產出什麼）**，而 ReasoningTrace 要記的是**「一次推理的思路」（steps、evidence、candidates、排序）**。前者是後者的外殼，**核心的 `steps` 與 `candidates` 兩層完全尚缺**——這正是從 v0.3 走向正式 Reasoning Layer 最需要補的資料結構。

---

# Appendix E — REST API Draft（API 草案）

本附錄以 RFC 風格定義 FIE 對外的 HTTP 介面。**本節僅定義介面契約（interface contract），不描述後端實作。** 所有端點以 `application/json` 為 request/response media type，路徑前綴省略（實務上位於 `/v1` 之下）。範例統一沿用四碎片主軸：`高中`、`夏天`、`我們`、`宜蘭`。

---

## E.0 共通約定（Conventions）

**認證**：所有端點需帶 `Authorization: Bearer <token>`。Creator Context 由 token 所屬 creator 決定，request body 不再重複 `creatorId`。

**資源識別**：ID 一律為 ULID 字串（時序可排序）。`fragmentId` / `candidateId` / `traceId` 各自命名空間獨立。

**時間**：所有時間戳為 RFC 3339 UTC（`2026-07-05T09:12:00Z`）。

**Confidence 與 Weight**：皆為 `[0.0, 1.0]` 的浮點數；`null` 表示「尚未評估」，`0.0` 表示「已評估且為零」，兩者語意不同。

**錯誤格式**（所有非 2xx 共用）：

```json
{
  "error": {
    "code": "missing_fragment",
    "message": "Reasoning aborted: required bridging Fragment not found.",
    "details": { "gap": "季節→地點 的橋接 Fragment 缺席" }
  }
}
```

常見 `error.code`：`validation`、`not_found`、`forbidden`、`missing_fragment`、`low_confidence`、`trace_expired`、`rate_limited`。

**冪等**：所有 `POST` 接受選填 `Idempotency-Key` header；相同 key 於 24h 內回傳首次結果。

---

## E.1 `POST /fragment` — 建立 Fragment

登錄一則新的 Fragment 至 Creator Context。伺服端負責產生其 Representation（多層向量 / 標籤 / 情緒訊號），Response 僅回傳可觀測的表層欄位。

**Request**

```json
{
  "content": "高中",
  "modality": "text",
  "tags": ["階段", "青春"],
  "sourceType": "manual",
  "capturedAt": "2026-07-05T09:00:00Z"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `content` | string | ✔ | Fragment 的原始素材 |
| `modality` | enum(`text`,`image`,`audio`,`link`) | | 預設 `text` |
| `tags` | string[] | | Creator 手動標註 |
| `sourceType` | enum(`manual`,`import`,`derived`) | | 來源型別 |
| `capturedAt` | string(RFC3339) | | 素材被捕捉的時間，缺省用 server 時間 |

**Response** `201 Created`

```json
{
  "fragment": {
    "id": "frg_01J8...HS",
    "content": "高中",
    "modality": "text",
    "tags": ["階段", "青春"],
    "representation": {
      "layers": ["semantic", "affective", "temporal"],
      "embeddingDim": 1536,
      "affect": { "valence": 0.42, "arousal": 0.55 }
    },
    "createdAt": "2026-07-05T09:00:03Z"
  }
}
```

> `representation.layers` 只回傳「有哪些層」與可解讀的摘要（如 `affect`），**不回傳原始向量**；向量取用另循 `GET /fragment/{id}?include=vectors`。

---

## E.2 `POST /reason` — 觸發一次 Reasoning

輸入一組 Fragment，要求 FIE 執行推理並回傳 Candidate 列表。**這是唯一會產生 Reasoning Trace 的端點。**

**Request**

```json
{
  "fragments": ["高中", "夏天", "我們", "宜蘭"],
  "mode": "adjacent",
  "maxCandidates": 5,
  "minConfidence": 0.5,
  "explain": true
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `fragments` | string[] \| id[] | ✔ | 原文或既有 `fragmentId`；混填允許 |
| `mode` | enum(`familiar`,`adjacent`,`exploratory`) | | 推理模式，預設 `adjacent` |
| `maxCandidates` | int | | 回傳上限，預設 5 |
| `minConfidence` | float | | 低於此值的 Candidate 不回傳 |
| `explain` | bool | | `true` 時同步回傳精簡 Reasoning Trace 摘要 |

**Response** `200 OK`

```json
{
  "traceId": "trc_01J8...QW",
  "mode": "adjacent",
  "candidates": [
    {
      "id": "cnd_01J8...A1",
      "summary": "一段關於『再也回不去的那個夏天』的宜蘭返鄉敘事",
      "confidence": 0.88,
      "evidence": [
        { "fragmentId": "frg_...高中", "weight": 0.31, "role": "anchor" },
        { "fragmentId": "frg_...夏天", "weight": 0.34, "role": "anchor" },
        { "fragmentId": "frg_...我們", "weight": 0.22, "role": "bridge" },
        { "fragmentId": "frg_...宜蘭", "weight": 0.13, "role": "setting" }
      ],
      "missingFragments": [
        { "hypothesis": "缺一個具體『離別事件』的 Fragment", "impactOnConfidence": 0.09 }
      ]
    }
  ],
  "traceSummary": {
    "steps": 4,
    "prunedCandidates": 11,
    "elapsedMs": 812
  }
}
```

> `candidates` 依 `confidence` 遞減排序。`missingFragments` 為 FIE 主動偵測的缺口，`impactOnConfidence` 表示「若補上此 Fragment，Confidence 預估可回升的幅度」。

---

## E.3 `POST /candidate` — 直接構造 Candidate（繞過推理）

用於 Creator 手動指定一組 Evidence 與立場，要求 FIE 只做「評估與補全」而非「發散生成」。適合 human-in-the-loop 微調。

**Request**

```json
{
  "hypothesis": "把『我們』設為敘事者複數第一人稱，夏天為主軸時態",
  "evidence": [
    { "fragmentId": "frg_...夏天", "role": "anchor" },
    { "fragmentId": "frg_...宜蘭", "role": "setting" }
  ],
  "requestConfidence": true
}
```

**Response** `201 Created`

```json
{
  "candidate": {
    "id": "cnd_01J8...B7",
    "hypothesis": "把『我們』設為敘事者複數第一人稱，夏天為主軸時態",
    "confidence": 0.71,
    "evidence": [
      { "fragmentId": "frg_...夏天", "weight": 0.5, "role": "anchor" },
      { "fragmentId": "frg_...宜蘭", "weight": 0.5, "role": "setting" }
    ],
    "missingFragments": [
      { "hypothesis": "缺『高中』時間錨點，敘事時態易漂移", "impactOnConfidence": 0.14 }
    ]
  }
}
```

---

## E.4 `POST /generate` — 由 Candidate 產出成品

將一個已存在的 Candidate 具現化為可讀成品（文章 / 圖像 prompt / 大綱）。**本端點不做推理**，只做 realization。

**Request**

```json
{
  "candidateId": "cnd_01J8...A1",
  "format": "prose",
  "targetLength": "medium",
  "voice": "creator-dna"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `candidateId` | string | ✔ | 來源 Candidate |
| `format` | enum(`prose`,`outline`,`image_prompt`,`dialogue`) | | 產出型別 |
| `targetLength` | enum(`short`,`medium`,`long`) | | 長度提示 |
| `voice` | enum(`neutral`,`creator-dna`) | | `creator-dna` 時套用 Creator DNA 風格向量 |

**Response** `200 OK`

```json
{
  "output": {
    "format": "prose",
    "text": "那年夏天的宜蘭...",
    "wordCount": 640
  },
  "derivedFrom": {
    "candidateId": "cnd_01J8...A1",
    "traceId": "trc_01J8...QW"
  },
  "appliedVoice": {
    "creatorDnaVersion": "dna_2026_06",
    "styleMatch": 0.83
  }
}
```

> `derivedFrom` 建立成品到 Candidate、再到 Trace 的完整血緣鏈，任何成品皆可反查其推理根據。

---

## E.5 `GET /trace/{id}` — 取回完整 Reasoning Trace

回傳一次推理的可稽核步驟序列，包含被剪枝的 Candidate（供事後檢視「為什麼不是它」）。

**Response** `200 OK`

```json
{
  "trace": {
    "id": "trc_01J8...QW",
    "mode": "adjacent",
    "inputFragments": ["frg_...高中", "frg_...夏天", "frg_...我們", "frg_...宜蘭"],
    "steps": [
      { "n": 1, "op": "representation-align", "note": "四 Fragment 對齊至共同語義空間" },
      { "n": 2, "op": "pair-surprise", "note": "『夏天×宜蘭』意外度 0.62，優先探索" },
      { "n": 3, "op": "candidate-expand", "produced": 12 },
      { "n": 4, "op": "confidence-prune", "kept": 1, "pruned": 11 }
    ],
    "candidates": [
      { "id": "cnd_01J8...A1", "confidence": 0.88, "status": "kept" },
      { "id": "cnd_01J8...C3", "confidence": 0.41, "status": "pruned", "reason": "below minConfidence" }
    ],
    "createdAt": "2026-07-05T09:12:00Z",
    "expiresAt": "2026-10-05T09:12:00Z"
  }
}
```

> Trace 具保存期限（`expiresAt`）；過期後 `GET` 回 `410 Gone` 且 `error.code = trace_expired`。保存策略詳見正文 Reasoning Trace 章節。

---

## E.6 `GET /creator-context` — 讀取 Creator Context 摘要

回傳目前 creator 的 Context 概觀：Fragment 統計、Creator DNA 版本、活躍主題聚類。**不回傳全部 Fragment**（分頁另循 `GET /fragment`）。

**Query 參數**：`?include=dna,clusters,stats`（逗號分隔，預設全含）。

**Response** `200 OK`

```json
{
  "creatorContext": {
    "fragmentCount": 1832,
    "creatorDna": {
      "version": "dna_2026_06",
      "traits": [
        { "axis": "懷舊↔前瞻", "value": -0.4 },
        { "axis": "具象↔抽象", "value": 0.2 }
      ],
      "updatedAt": "2026-06-30T00:00:00Z"
    },
    "clusters": [
      { "label": "青春/校園", "size": 214, "exemplars": ["高中", "我們"] },
      { "label": "地方/宜蘭", "size": 96, "exemplars": ["宜蘭", "夏天"] }
    ],
    "stats": { "avgFragmentAgeDays": 173, "surprisingPairs": 58 }
  }
}
```

---

## E.7 `DELETE /fragment/{id}` — 刪除 Fragment

自 Creator Context 移除一則 Fragment。因 Fragment 可能已是既有 Trace 的 Evidence，刪除採「軟性去識別」而非物理刪除，以維持 Trace 可稽核性。

**Query 參數**：`?mode=soft|purge`（預設 `soft`）。

- `soft`：Fragment 從所有主動查詢與推理輸入中移除，但既有 Trace 內仍以 tombstone 形式保留其 `id` 與 role。
- `purge`：連同 Trace 內引用一併抹除（需 `X-Confirm-Purge: true` header，否則回 `403`）。

**Response** `200 OK`

```json
{
  "deleted": {
    "id": "frg_01J8...HS",
    "mode": "soft",
    "affectedTraces": 3,
    "removedFromReasoningAt": "2026-07-05T10:00:00Z"
  }
}
```

---

## E.8 `PATCH /candidate/{id}` — 修訂 Candidate

Creator 對 Candidate 做增量修訂：調整 Evidence 權重、增刪 Evidence、覆寫 hypothesis，或標記採納/否決。修訂會使 `confidence` 重新評估，並在對應 Trace 追加一個 `candidate-revised` 步驟。

**Request**（所有欄位皆選填，僅送要改的）

```json
{
  "hypothesis": "改以『我們』為單數懷舊視角",
  "evidence": {
    "add": [{ "fragmentId": "frg_...高中", "role": "anchor" }],
    "remove": ["frg_...宜蘭"],
    "reweight": [{ "fragmentId": "frg_...夏天", "weight": 0.6 }]
  },
  "decision": "accepted"
}
```

| 欄位 | 型別 | 說明 |
|---|---|---|
| `hypothesis` | string | 覆寫立場敘述 |
| `evidence.add` | object[] | 新增 Evidence |
| `evidence.remove` | string[] | 移除 Evidence（by fragmentId） |
| `evidence.reweight` | object[] | 調整既有 Evidence 權重 |
| `decision` | enum(`pending`,`accepted`,`rejected`) | Creator 對此 Candidate 的裁決 |

**Response** `200 OK`

```json
{
  "candidate": {
    "id": "cnd_01J8...A1",
    "hypothesis": "改以『我們』為單數懷舊視角",
    "confidence": 0.82,
    "confidenceDelta": -0.06,
    "decision": "accepted",
    "revisedAt": "2026-07-05T10:20:00Z"
  }
}
```

> `confidenceDelta` 讓 Creator 立即看見「這次修訂讓 FIE 的信心升或降」，形成推理層面的即時回饋。

---

## E.9 端點總覽

| Method | Path | 職責 | 產生 Trace |
|---|---|---|---|
| `POST` | `/fragment` | 登錄 Fragment，建立 Representation | — |
| `POST` | `/reason` | 執行推理，回傳排序後 Candidates | ✔ |
| `POST` | `/candidate` | 手動構造並評估單一 Candidate | 追加 |
| `POST` | `/generate` | 由 Candidate 具現化成品 | — |
| `GET` | `/trace/{id}` | 取回完整可稽核 Reasoning Trace | — |
| `GET` | `/creator-context` | Creator Context 摘要 | — |
| `DELETE` | `/fragment/{id}` | 移除 Fragment（soft / purge） | — |
| `PATCH` | `/candidate/{id}` | 修訂 Candidate、重估 Confidence | 追加 |

---

## ⟢ AI 島現況對照

本附錄為理想化契約；對照目前 Creator Island 於 `/api/creator-island/*` 的實作，落差如下：

**已具雛形（可對應）**
- `POST /fragment` ≈ 現有 `POST /api/creator-island/fragments`。現況 body 為 `{ workspaceId, title, content?, tags?, sourceType?, derivedFrom?, relationType? }`，並已寫入 `ci_fragments`（含 `embedding vector(1536)`）。**差異**：現況以 `workspaceId` 顯式帶入而非由 token 推導；Response 僅回 `{ fragment }`，**尚未回傳 `representation` 分層**（無 `layers` / `affect` 摘要）。
- `GET /creator-context` 的內容分散在多個端點：Creator DNA 對應 `GET /api/creator-island/growth/dna`（`analyzeDNA → ci_creator_dna`）、意外配對對應 `fragments/pairs`（`ci_surprising_pairs`）、關聯對應 `fragments/related`（`ci_related_fragments`）。**尚缺單一聚合的 `/creator-context` 摘要端點**與 `clusters` 主題聚類。
- `POST /generate` 的能力散落於 AI agents：`ai/synthesize`（凝聚）、`ai/evolve`（演化）、`ai/compose`（編織）、`ai/transcreate`。這些已能產出成品並透過 `derivedFrom` + `relationType` 寫入 `ci_asset_relations` 血緣。**差異**：現況直接「碎片→成品」，中間**沒有顯式 Candidate 資源**可供 `candidateId` 指涉。
- `GET /trace/{id}` 有雛形：`ci_agent_runs` + `GET /api/creator-island/ai/runs` 記錄了 agent 執行。**差異**：現況是「執行日誌」，**尚非結構化的 Reasoning Trace**（無 `steps[].op`、無 `pruned` Candidate、無 `expiresAt` 生命週期）。
- `ci_memories` 與 `GET/DELETE /api/creator-island/memory[/{id}]` 提供記憶注入 prompt，可視為 Creator Context 的一部分。

**尚缺（本附錄新增，現況無對應端點）**
- `POST /reason`：**無獨立 Reasoning 端點**。現況無 `mode`（Familiar / Adjacent / Exploratory）參數、無 `maxCandidates` / `minConfidence` 排序，也不回傳多 Candidate + `confidence`。
- `POST /candidate`、`PATCH /candidate/{id}`：**Candidate 尚非一級資源**，無法手動構造、修訂 Evidence 權重、或裁決 `accepted/rejected`，亦無 `confidenceDelta` 回饋。
- `missingFragments` 偵測：現況任何端點皆**未回傳 Missing Fragment 假說**。
- `DELETE /fragment/{id}`：現有 `fragments/[id]` 具刪除路由，但**無 `soft` / `purge` 的 Trace tombstone 語意**（因 Trace 本身尚未成形）。
- Confidence / Weight / Evidence role 等欄位在現有 API response 中**尚未成為穩定契約**。

小結：現況已具備 Fragment 儲存、向量、意外配對、Creator DNA、多種生成 agent 與執行日誌等「素材與生成」骨架，但**推理層（Reasoning）、Candidate 資源化、結構化 Trace 與 Missing Fragment 偵測**尚未落地，正是本 API 草案相對現況的主要缺口。

---

# Appendix F — Future Research（未解問題）

本附錄彙整 FIE 目前**尚未解決**的研究問題。這些問題不是工程排期上的「待辦」，而是設計層面仍缺乏定論、需要進一步研究或實驗才能收斂的開放課題。列出它們的目的，是讓後續研究者能在明確的邊界上接手，而不是誤以為 FIE 已經是一個封閉、完備的系統。

每一節的結構為：**問題陳述 → 為什麼難 → 開放問題（Open Questions）**，並在相關處附一段 `⟢ AI 島現況對照`，誠實標示該方向在目前 Creator Island 實作中的位置。

貫穿全書的四碎片範例——**高中 / 夏天 / 我們 / 宜蘭**——在本附錄中繼續作為討論的具體對象。

---

## F.1 Multi-agent Reasoning（多 Agent 協同推理）

**問題陳述。** 目前 FIE 的推理由單一 Reasoning Layer 對 Fragment Graph 做一次性搜尋與排序。但「凝聚（synthesize）／演化（evolve）／編織（compose）」等操作在認知上其實是**不同視角**：一個 agent 擅長找 Adjacent 連結、一個擅長做 Exploratory 跳躍、一個負責審查 Consistency。將它們建模為多個具備不同 Reasoning 傾向的 agent、再讓其協商出 Candidate，理論上比單一 pipeline 更能兼顧「像創作者」與「超出創作者」。

**為什麼難。** 多 agent 一旦引入，就要面對三個尚無標準答案的問題：(1) **收斂性**——agent 之間如何避免無限來回或彼此抵銷；(2) **權責歸屬**——最終 Candidate 的 Confidence 該由誰負責、如何合併多個 agent 的 Weight；(3) **Reasoning Trace 的可讀性**——多 agent 的協商過程若原封不動記錄，Trace 會膨脹到創作者無法回看。

**開放問題。**
- 協商應採「投票／加權平均」還是「辯論（debate）後仲裁」？何者在創作情境下更能保留有價值的少數意見（例如把「高中×宜蘭」這種冷門但有味道的配對推上檯面）？
- 是否需要一個獨立的 **critic agent** 專門挑戰其他 agent 的 Candidate，以對抗 F.9 的 Echo Chamber？
- 多 agent 的邊際效益從第幾個 agent 開始遞減？

> `⟢ AI 島現況對照`
> **已實作**：synthesize / evolve / compose / transcreate 四個 AI agent 已存在，且各自對應不同的創作操作。
> **尚缺**：它們目前是**依序被呼叫的獨立函式**，彼此之間沒有協商、沒有共享中間狀態、也沒有 critic 角色。真正的 multi-agent reasoning（互相讀對方輸出、協商出單一 Candidate 集合）尚未實作。

---

## F.2 Graph Neural Network for Fragment Graph（Fragment 圖的 GNN）

**問題陳述。** Fragment Graph 是一張以 Fragment 為節點、以 Related / Surprising 關係為邊的圖。目前的關聯計算主要靠 embedding 的向量相似度與人工規則。一個自然的研究方向是：用 **Graph Neural Network** 直接在圖結構上學習節點表示（node representation），讓「高中」這個 Fragment 的向量不只反映它的字面語義，還反映它在**整張圖裡的位置**——它連到「夏天」「我們」，而這些又連到「宜蘭」。

**為什麼難。** (1) **資料稀疏**——單一創作者的 Fragment Graph 節點數可能只有數百，遠低於 GNN 訓練的常見規模；(2) **標註缺乏**——沒有 ground-truth 告訴模型哪條邊是「好的意外配對」；(3) **冷啟動**——新創作者幾乎沒有圖，GNN 無從學起。

**開放問題。**
- 該用單一創作者的小圖做 per-user GNN，還是跨創作者共享 GNN、只把 Creator DNA 當作條件輸入？
- Surprising pair（低相似但高價值）本質上是圖中的**弱連結或跨社群邊**——GNN 的訊息傳遞（message passing）反而傾向抹平這種邊。如何設計不會「越傳越平庸」的聚合函式？
- GNN 學到的表示能否反哺 F.7 的 Confidence Calibration？

> `⟢ AI 島現況對照`
> **已實作**：`ci_fragments` 具備 `embedding vector(1536)`，`ci_related_fragments` 與 `ci_surprising_pairs` 已把圖的**邊**物化在資料表裡。
> **尚缺**：關聯目前是**向量相似度 + 規則**算出來的，沒有任何在圖結構上學習的模型。Fragment Graph 尚未被當成「可訓練的圖」看待。

---

## F.3 Knowledge Graph 整合（外部知識接地）

**問題陳述。** Fragment 目前是**創作者私有**的語義單位。但「宜蘭」在外部世界有豐富的公共知識（地理、氣候、文化、與「夏天」的季節關聯）。若能把私有 Fragment Graph 對接到外部 Knowledge Graph，FIE 就能在缺乏創作者素材時，用外部知識**補足 Adjacent 空間**，而不必幻想。

**為什麼難。** 核心張力在於：外部知識是**公共且客觀**的，Fragment 是**私人且主觀**的。「宜蘭」對某位創作者可能等於「外婆家的夏天」，這層私人語義不在任何公共 Knowledge Graph 裡。粗暴接地會讓 Candidate 變得像百科全書，失去創作者的味道。

**開放問題。**
- 外部知識應該進到 Reasoning 的哪一層？只在 Missing Fragment 偵測時提供**線索**，還是允許它成為 Candidate 的一部分？
- 如何標記一個 Candidate 中「哪些來自創作者、哪些來自外部」，以維持 Evidence 的可追溯性？
- 接地是否應該是**可關閉**的？（純私人創作 vs 需要事實正確的創作，需求相反。）

> `⟢ AI 島現況對照`
> **尚缺**：目前完全沒有外部 Knowledge Graph 整合。所有推理都封閉在創作者自己的 `ci_fragments` 內。這是一塊完全未開墾的方向。

---

## F.4 Memory Compression（記憶壓縮）

**問題陳述。** 創作者的 Fragment 與 memory 會隨時間單調增長。注入 prompt 的上下文長度有限，不可能把所有記憶塞進去。因此需要一套**壓縮**機制：把大量 Fragment / memory 濃縮成能代表創作者當前狀態的緊湊表示，同時**不丟失罕見但關鍵**的碎片（例如那個只出現過一次、卻定義了創作者風格的「高中」記憶）。

**為什麼難。** 壓縮的目標函式與創作直覺衝突：一般壓縮傾向保留**高頻、代表性**的資訊，但創作的靈魂往往在**低頻、離群**的碎片裡。天真的壓縮會系統性地磨掉創作者最獨特的部分。

**開放問題。**
- 壓縮該以「重建誤差最小」為目標，還是以「保留最大 surprising 潛力」為目標？
- 應該壓縮成**更少的 Fragment**，還是壓縮成**分層摘要**（近期原始、久遠摘要）？
- 被壓縮掉的原始碎片要不要保留可還原的冷儲存，以便 Reasoning Trace 回溯？

> `⟢ AI 島現況對照`
> **已實作**：`ci_memories` 已能把記憶注入 prompt。
> **尚缺**：注入採**選取（retrieval）**而非**壓縮（compression）**——挑幾條相關記憶放進去，但沒有任何濃縮或分層摘要機制。當 memory 規模增長時的壓縮策略尚未設計。

---

## F.5 Automatic Fragment Clustering（自動碎片分群）

**問題陳述。** 目前 Fragment 是扁平的集合。但「高中／夏天／我們／宜蘭」在語義上顯然可以聚成主題（青春、季節、關係、地方）。自動分群能為 Reasoning 提供**中層結構**：推理時先在 cluster 層面選方向，再下鑽到具體 Fragment，能同時提升效率與可解釋性。

**為什麼難。** (1) **分群數未知**——創作者的主題會隨時間增生，不是固定的 k；(2) **重疊性**——「夏天」同時屬於「季節」與「青春」，硬分群會割裂它；(3) **穩定性**——新增一個 Fragment 不該讓整個分群結構劇烈重排，否則 Reasoning Trace 無法跨時間比較。

**開放問題。**
- 該用硬分群、軟分群（soft / overlapping），還是階層式（hierarchical）？
- Cluster 本身是否應成為一種可被推理、可被 Weight 的**高階 Fragment**？
- 分群結果如何與 Creator DNA 對齊——cluster 是否就是 DNA 的可觀測投影？

> `⟢ AI 島現況對照`
> **尚缺**：`ci_fragments` 目前沒有 cluster 欄位或分群流程。Creator DNA（`analyzeDNA → ci_creator_dna`）算是**創作者層級**的濃縮，但它不是 Fragment 層級的分群，兩者不可互相取代。

---

## F.6 Cross-modal Fragment（跨模態碎片）

**問題陳述。** 目前 Fragment 主要是**文字**。但創作者的素材天然是多模態的：一張宜蘭夏天的照片、一段環境錄音、一幅手稿。Cross-modal Fragment 指的是讓不同模態的碎片進入**同一個 Representation 空間**，使「一張照片」與「高中」這個詞能出現在同一張 Fragment Graph 上、被同一套 Reasoning 處理。

**為什麼難。** (1) **對齊**——文字 embedding 與影像 embedding 不在同一空間，需要跨模態對齊；(2) **Evidence 語義不對稱**——一張照片能支撐的 Candidate 與一句話能支撐的不同，Confidence 的意義也不同；(3) **Surprising pair 跨模態時更難判定**——「這張照片 × 這句話」是有意思的意外，還是純粹的不相關？

**開放問題。**
- 跨模態碎片應共用單一 embedding 空間，還是各自為政、只在 Reasoning 層做晚期融合（late fusion）？
- 輸出也要跨模態嗎（文字 Fragment 生成影像 Candidate）？若是，Reasoning Trace 如何呈現跨模態的推理路徑？

> `⟢ AI 島現況對照`
> **尚缺**：目前 Fragment 與 embedding 皆以文字為主，沒有影像／音訊 Fragment，也沒有跨模態對齊。這是尚未起步的方向。

---

## F.7 Confidence Calibration（Confidence 校準）

**問題陳述。** FIE 的每個 Candidate 都應附一個 Confidence。但**未經校準的 Confidence 是有害的**：如果模型說 0.9 的 Candidate 實際只有六成被創作者採用，這個數字就是誤導。Confidence Calibration 研究的是：如何讓 FIE 輸出的 Confidence 在統計上**言行一致**——標 0.8 的一批 Candidate，長期採用率就該接近 80%。

**為什麼難。** (1) **標準模糊**——創作沒有唯一正解，「被採用」是否等於「Confidence 該高」本身可議；(2) **回饋稀疏且有偏**——創作者只對看到的 Candidate 給回饋，沒被選上的不代表不好；(3) **分佈漂移**——創作者的品味會變，昨天校準好的今天又偏了。

**開放問題。**
- Confidence 應該表達「像創作者的程度」還是「作品品質」？這兩者有時相反（一個很棒但不像你的 Candidate 該標高還是標低？）。
- 適合用哪種校準法——temperature scaling、isotonic regression，還是基於 Creator Feedback Loop 的線上校準？
- Confidence 是否該拆成多維（Consistency confidence / Novelty confidence）而非單一純量？

> `⟢ AI 島現況對照`
> **尚缺**：目前系統不輸出多 Candidate 的排序，也沒有 Confidence 分數，遑論校準。這是 Reasoning Layer 正式化之後才會浮現的問題，屬於較後期的研究。

---

## F.8 Reasoning Trace 儲存與檢索（Trace Storage & Retrieval）

**問題陳述。** Reasoning Trace 記錄「這個 Candidate 是怎麼從高中／夏天／我們／宜蘭推出來的」。理想上它應被**完整保存並可檢索**，讓創作者回看每次創作決策。但 Trace 的資料量會隨使用爆炸性增長，且大多數 Trace 從此不會再被看。這就產生了**保存政策**與**檢索介面**兩個未解問題。

**為什麼難。** (1) **保存期限**——Trace 要永久保存、還是分層過期？（原文亦反覆提出「Reasoning Trace 要保存多久？」這個未決問題。）(2) **粒度**——記錄到每一步搜尋，還是只記關鍵決策點？(3) **檢索方式**——創作者是用時間、用作品、還是用「哪個 Fragment 起的頭」來找回一段 Trace？

**開放問題。**
- Trace 該用結構化事件流（event log）儲存，還是可回放的快照（snapshot）？
- 是否需要對 Trace 本身做摘要索引（見 F.4 的壓縮），讓久遠的 Trace 以摘要形式可檢索、必要時再展開？
- Trace 的擁有權與可攜性——它屬於創作者資產的一部分嗎？

> `⟢ AI 島現況對照`
> **已實作**：`ci_agent_runs` 已記錄 agent 執行的**雛形 trace**（哪個 agent、輸入輸出概況）。
> **尚缺**：這距離「完整、分層、可依 Fragment 檢索、可回放」的 Reasoning Trace 還很遠。保存期限、檢索介面、與壓縮策略都尚未設計。

---

## F.9 Echo Chamber 量化（創作回音室的度量）

**問題陳述。** 正文指出：AI 越懂創作者，就越可能只回饋創作者**已經會寫**的東西，形成 Creative Echo Chamber。Creator Context 因此需同時保存 Consistency 與 Expansion 兩股力量。但要真正對抗回音室，第一步是**能量化它**——需要一個指標，能持續衡量 FIE 的產出是「在原地打轉」還是「有在把創作者往外推」。

**為什麼難。** 回音室與「風格穩定」在表面上難以區分：兩者都表現為「產出很像創作者」。差別在**時間維度上的多樣性收斂速度**，而這需要跨越多次創作、對照 Creator Feedback Loop 才觀察得到，無法從單次輸出判定。過度追求多樣性又會傷害創作者辨識度——指標必須能表達這個權衡，而非單邊最大化。

**開放問題。**
- 用什麼度量：Candidate 集合在 Representation 空間的**覆蓋範圍**？Surprising pair 被採用的**比率**？創作者在 F.7 校準下**主動偏離**的頻率？
- 「健康的偏離量」是否因創作者而異、甚至因創作階段而異（探索期 vs 收斂期需求不同）？
- 系統偵測到回音室後應如何介入——正文提出的那句「你要不要試試另一條路？」該由誰、在何時觸發，且不流於打擾？

> `⟢ AI 島現況對照`
> **已實作**：`ci_surprising_pairs` 提供了**對抗回音室的原料**（刻意保留低相似高價值的配對）。
> **尚缺**：沒有任何 Echo Chamber 的量化指標，也沒有基於 Creator Feedback Loop 的偏離度追蹤或主動介入機制。目前只有「意外配對」這個素材，缺少「衡量與調節多樣性」的閉環。

---

## F.10 小結

上述九個方向並非彼此獨立：F.2（GNN）產生的表示會影響 F.7（Confidence）；F.4（壓縮）與 F.8（Trace 儲存）共用同一套分層摘要思路；F.9（Echo Chamber 量化）則需要 F.5（分群）與 F.7（校準）作為觀測基礎。FIE v1.0 的定位是把**問題的邊界**描述清楚，而非宣稱已解。這些未解問題之所以列在附錄而非正文，正是為了與正文的理想化設計切割開來——**理想化的是架構，誠實面對的是研究現況。**

---

# Appendix G — Comparison（與現有技術比較）

本附錄將 FIE 放進當前主流的生成式技術脈絡中，逐項對照 Prompt、RAG、Knowledge Graph、Agent 與 FIE 的結構性差異。比較的目的不是宣稱 FIE「取代」上述任何一種技術——事實上 FIE 在工程實作上大量複用 embedding retrieval 與 agent orchestration——而是釐清 FIE 在**表徵層級、推理形態與演化能力**上處於哪個位置。

以下表格以本白皮書的主軸範例（四個 Fragment：**高中 / 夏天 / 我們 / 宜蘭**）作為對照情境：一位 Creator 想從這四個碎片生成一段有記憶、有觀點的內容。

## G.1 對照表

| 項目 | Prompt | RAG | Knowledge Graph | Agent | FIE |
|---|---|---|---|---|---|
| **最小單位** | Token（提示字串） | Chunk（切片文本 + embedding） | Triple（實體–關係–實體） | Tool call / Step（工具呼叫） | **Fragment**（帶 Representation 分層的意義單位） |
| **是否推理** | 否；一次性條件生成 | 否；檢索→拼接→生成，retrieval 不含推理 | 部分；限於圖上的關係遍歷/查詢 | 是；但推理綁在「完成任務」的行動鏈上 | **是**；以 Fragment 間關係為對象的顯式 Reasoning Layer（Familiar / Adjacent / Exploratory 三模式） |
| **是否保留 Candidate** | 否；只有單一輸出 | 否；top-k 檢索後即坍縮為一個 prompt | 否；查詢回傳確定結果集 | 少；通常取單一 best action，分支被丟棄 | **是**；產生多個 Candidate 並以 Confidence + Weight + Evidence 排序、保留而非丟棄 |
| **Creator Context** | 無；靠人手動塞進提示 | 弱；語料是通用知識，非創作者個人語境 | 無；圖描述客觀事實，不描述「誰的意義」 | 弱；context 多為任務狀態，非創作者長期身分 | **強**；Creator Context 與 Creator DNA 是一等公民，Fragment 的意義相對於創作者而定義 |
| **Reasoning Trace** | 無 | 無（僅能列出被檢索的 chunk） | 部分（可回放查詢路徑） | 部分（可列出 step，但常缺推理理由） | **完整**；每個 Candidate 附 Reasoning Trace，記錄用了哪些 Fragment、走哪條 Hypothesis、為何取捨 |
| **可持續演化** | 否；每次呼叫無狀態 | 有限；靠重新索引語料，模型本身不變 | 有限；靠人工/管線增修 triple | 有限；記憶多為 session 級，跨任務不累積意義 | **是**；Fragment、關係與 Weight 隨使用被 synthesize / evolve，形成長期演化 |
| **可解釋性** | 低；輸出即黑箱 | 中；可指出「引用了哪段」，但不解釋為何這樣組合 | 高；圖結構本身可讀 | 中；可看行動序列，難看推理動機 | **高**；解釋不只在「用了什麼」，更在「為何這樣連、為何選這個 Candidate」 |
| **記憶累積** | 無 | 語料級（外部知識庫），非創作者語意記憶 | 事實級（客觀圖譜） | Session 級（易失） | **創作者語意級**；ci_memories 式的長期記憶回注推理，記的是「這個人的意義結構」 |

## G.2 FIE 與 RAG 差在哪

RAG 與 FIE 最容易被混為一談，因為兩者都用 embedding 與相似度檢索——**FIE 的工程底層確實包含一個 retrieval 環節**。差別在於：RAG 的檢索終點是「把相關 chunk 塞進 prompt」，retrieval 之後意義空間立刻**坍縮**成一條字串，交給 LLM 一次性生成；被檢索到的多個候選之間的**張力**（誰跟誰矛盾、誰跟誰意外呼應）在拼接的瞬間就被抹平了。FIE 把這個張力當成資產：`高中` 與 `宜蘭` 的相似度也許不高，但兩者對這位 Creator 而言可能構成一個 surprising pair，這種「不相似卻有意義」的關係正是 RAG 的 cosine 相似度會主動過濾掉、而 FIE 會顯式保留並送入 Reasoning Layer 的東西。簡言之：**RAG 檢索「相似的內容」，FIE 推理「Fragment 之間的關係」**；RAG 回答「找到什麼」，FIE 回答「為什麼把這幾個放在一起會產生新意義」。

## G.3 FIE 與 Knowledge Graph 差在哪

Knowledge Graph 的最小單位是 triple（實體–關係–實體），它擅長表達**客觀、可查詢、對所有人一致**的事實：「宜蘭 位於 台灣」。FIE 的 Fragment 恰恰相反——它是**主觀、相對於創作者、承載個人意義**的單位：對這位 Creator，`宜蘭` 不是一個地理實體，而是「夏天、我們、某段高中記憶」交會的一個意義結點，其 Weight 與關聯會隨這個人的創作歷程演化。KG 的邊是被人工或抽取管線「確定」下來的；FIE 的關係是被推理**提出（Hypothesis）並帶著 Confidence**的，可以錯、可以被後續 Evidence 修正。因此 KG 給你一張穩定的事實地圖，FIE 給你一個會生長、會產生新連結的語意場。兩者可以互補（KG 可作為 Fragment 的事實錨點），但 FIE 的核心價值——保留 Candidate、顯式推理、Creator DNA——不在 KG 的設計目標之內。

## G.4 FIE 與 Agent 差在哪

Agent 與 FIE 都有「多步驟、有推理、可調用工具」的外觀，實作上 FIE 的凝聚 / 演化 / 編織等動作也的確以 agent 形態落地。關鍵差異在**推理的對象與目的**：Agent 的推理是**目標導向（task-completion）**的——它把推理當成達成某個外部目標的手段，一旦選定 best action，其餘分支即被丟棄，記憶多半停在 session 層、跨任務不沉澱為「這個人的意義結構」。FIE 的推理是**意義導向（meaning-formation）**的——它的產物不是「完成了某件事」，而是一組帶 Reasoning Trace 的 Candidate、一次 Fragment 關係網的演化、以及回注長期記憶的語意增量。Agent 問「下一步該做什麼」，FIE 問「這些碎片之間還能長出什麼」。

## G.5 小結：FIE 的差異化定位

上述三者可以濃縮成一句話：**RAG 停在檢索、KG 停在客觀事實、Agent 停在完成任務，三者都在「意義該如何被推理與保留」這一層留白，而 FIE 正是把這一層補上的架構**——以 Fragment 為最小意義單位、以 Creator Context 為推理座標、以多 Candidate + Confidence + Reasoning Trace 為推理產物、以持續演化的記憶為長期資產。

> ⟢ **AI 島現況對照**：本附錄的比較採理想化 greenfield 立場，與目前 Creator Island 實作有落差。**已具備**對照表右欄的部分能力——`ci_fragments`（含 `embedding vector(1536)`）已是意義單位而非純 chunk、`ci_surprising_pairs` 已實作「不相似卻有意義」的關係、Creator DNA（`analyzeDNA → ci_creator_dna`）已使 Creator Context 成為一等公民、`ci_memories` 已做到記憶回注 prompt、`ci_agent_runs` 已是 Reasoning Trace 的雛形。**尚缺**表中被標為 FIE 強項的幾項：正式的 Reasoning Layer、Fragment Representation 分層、多 Candidate + Confidence 排序、完整（而非雛形）的 Reasoning Trace，以及 Familiar / Adjacent / Exploratory 三種推理模式。因此在當前實作中，FIE 相對 RAG/Agent 的差異化偏向「**已在資料與關係層兌現、尚未在推理層完全兌現**」，本表右欄應讀作目標態而非現況。
