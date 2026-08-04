# 競品技術戰略分析：OpenClaw × NVIDIA NemoClaw × 分身島

> 2026-08-05 · 資料來源見文末（已用 WebFetch/WebSearch 逐一查證，非臆測）。
> 目的：解析 OpenClaw / NemoClaw 的技術，做 SWOT，並規劃「站在他們肩上做更好」的路線。管理後台頁面：`/admin/strategy`。

---

## 一、三方是什麼（先定位，別打錯對手）

| | 是什麼 | 定位 |
|---|---|---|
| **OpenClaw**（前身 Clawdbot／Moltbot，作者 Peter Steinberger） | 開源**個人 AI 代理框架**，Node/TS，跑在你自己機器上的背景服務。~60 天衝上 25 萬+ GitHub star（史上最快之一） | **直接對手**——概念幾乎等於我們的分身島 Agent |
| **NVIDIA NemoClaw** | 開源**安全沙盒/營運參考堆疊**，讓 AI 代理（含 OpenClaw、Hermes、LangChain Deep Agents）**安全地跑在 NVIDIA OpenShell 沙盒裡**。本身不是代理 | **不是對手、是「基礎設施層」**——可為我所用（enterprise 沙盒） |
| **分身島（AI 島 Agent）** | **托管式**（Next.js + Supabase，使用者只要登入、零架設）、繁中、綁在教育/創作/大眾工具站上的多租戶 AI 代理 | 我們 |

> 關鍵：OpenClaw 是「自架、單人、技術宅、全球英文、無變現」；分身島是「托管、零架設、繁中大眾、教育+變現漏斗、多租戶安全」。**同一個概念、完全不同的市場切法**。

---

## 二、OpenClaw 技術深度解析（他們的底）

- **Gateway 單一長駐 Node 程序＝控制平面**，五個子系統：
  1. **Channel adapters**（WhatsApp 用 Baileys、Telegram 用 grammY…）把各平台訊息正規化成共同格式
  2. **Session manager**（依寄件者/工作區隔離對話、群組獨立）
  3. **Queue**（每 session 串行化 run、處理併發訊息）
  4. **Agent runtime**：從設定檔（`AGENTS.md`/`SOUL.md`/`TOOLS.md`/`MEMORY.md`/每日 log/對話史）組 context → 迴圈 model→工具→回饋→直到完成
  5. **Control plane**：WebSocket API（port 18789）給 CLI/web/mobile 連
- **記憶＝本機純 Markdown/YAML 檔**（`~/.openclaw`）：可用文字編輯器看、git 版控、grep 搜——**透明、可攜、不鎖廠商**
- **技能＝`SKILL.md`**（YAML frontmatter + 自然語言），透過 **ClawHub 技能市集**散布（13,700+ 技能），格式相容 Claude Code/Cursor
- **自主＝背景 daemon**（systemd/LaunchAgent）+ **心跳**（預設 30 分/每小時）讀 `HEARTBEAT.md` 清單決定要不要動；外部觸發（webhook/cron）
- **模型不可知**（`openclaw.json`）：Anthropic/OpenAI/Google/xAI/Mistral/DeepSeek/Ollama 本機
- **自架**：2–4GB RAM、$5 VPS 即可；成本 $18–540/月
- **⚠️ 安全是他們最大的痛**：
  - **CVE-2026-25253（CVSS 8.8）**：cross-site WebSocket hijacking → 一個惡意連結就能偷 token 拿 RCE；揭露時**2.1 萬個 instance 曝露在公網**、很多還是 HTTP
  - **技能供應鏈**：Cisco 分析**26% 社群技能至少一個漏洞**；ClawHub 出現過惡意技能（prompt injection/資料外洩）排到第一名
  - **自主執行責任**：曾在無人核准下自動寄保險申訴、談車價——**不可逆動作沒有把關**
- **弱點**（vs LangChain/CrewAI/AutoGen）：Markdown 技能**失去程式語言的表達力**（複雜分支/錯誤處理難）；**不適合嵌進既有產品**；非 cloud-native；架設門檻（OAuth/API key）；「權限面過廣」（Palo Alto 點名）

## 三、NVIDIA NemoClaw 技術解析（可為我所用的層）

- **開源參考堆疊**：把代理放進 **NVIDIA OpenShell 沙盒**安全執行——managed inference、network policy、**egress 控制**、snapshots、生命週期、憑證處理、沙盒硬化
- 支援代理：OpenClaw（預設）/Hermes/LangChain Deep Agents Code
- TypeScript/Node + Docker + CLI，Apache 2.0，22k star
- **對我們的意義**：這是「代理與推論之間的安全/營運層」。我們要打 enterprise 時，**可考慮讓分身島代理跑在 NemoClaw/OpenShell 沙盒裡**，或借鏡它的 egress/snapshot/network policy 設計。

---

## 四、分身島 SWOT

**S 優勢**
- **托管、零架設**：使用者登入即用，不用 VPS/systemd/OAuth（OpenClaw 最大門檻）
- **多租戶安全內建**：Supabase RLS、逐項 approval、per-agent 日預算、STEP_CAP、**伺服器端隔離沙盒跑 code**（Piston/Judge0）——正好補 OpenClaw 的致命傷（曝露 instance、技能供應鏈、無把關自主）
- **繁中大眾市場 + 教育/創作/大眾工具漏斗 + 變現內建**（Z 幣/訂閱、LINE 推播）——OpenClaw 完全沒碰
- 已有：orchestrator L1–L5、技能合成、多代理經理-專才、MCP+OpenAPI 動態工具、pgvector RAG 記憶、語音代理、桌面 bridge（filesystem/browser/system）

**W 劣勢**
- 托管＝**資料所有權/隱私不如本機**（OpenClaw 主打 privacy-first、資料在你機器）
- **通路數少**（我們 LINE 為主；OpenClaw 20+ 內建 WhatsApp/Signal/iMessage…）
- **沒有技能市集/社群網路效應**（OpenClaw 13,700+ 技能、ClawHub）
- **非開源**＝沒有社群貢獻與病毒式成長
- 單一區域、規模與品牌遠不如 OpenClaw/NVIDIA

**O 機會**
- **匯入 OpenClaw 技能生態**：支援 `SKILL.md` 格式 → 我們的技能市集能吃 ClawHub 技能；**而且我們幫他們掃描漏洞**（他們 26% 有洞）＝把對手的弱點變成我們的賣點
- **繁中/亞洲/非技術大眾**：OpenClaw 服務不到的一大塊
- **「不會架站的人的 OpenClaw」**：托管 + 中文 + 手把手
- **enterprise**：借 NemoClaw 沙盒模型做「安全托管代理」
- 透明記憶（學 OpenClaw 的檔案式）+ 可攜（匯出 AGENTS.md/MEMORY.md）＝降低鎖廠商疑慮

**T 威脅**
- OpenClaw 爆炸式成長 + NVIDIA 加持 NemoClaw；代理框架商品化
- 若 OpenClaw 推出**托管版/繁中版**，正面對撞
- 整個品類的**安全事件**（CVE、惡意技能）可能連累大眾信任

---

## 五、怎麼站在他們肩上做更好（路線）

**A. 吸收他們的好設計（為我所用）**
1. **檔案式透明記憶**：把分身記憶也能匯出成 `AGENTS.md`/`SOUL.md`/`MEMORY.md`（可攜、git 版控、降鎖廠商）——但底層仍存 DB（多租戶）
2. **`SKILL.md` 相容 + 技能市集**（對接我們規劃中的 §2.7.9）：支援匯入 ClawHub/Claude Code 格式技能；**內建安全掃描**（prompt injection/資料外洩偵測）＝解 OpenClaw 26% 漏洞痛點
3. **心跳自主**：我們已有 autonomous 排程；補「HEARTBEAT 清單」式的可讀自主策略
4. **多通路 adapter**：擴 WhatsApp/Signal/Slack（OpenClaw 用 Baileys/grammY 的路，我們照做）
5. **MCP/OpenAPI**：我們已支援，持續當「動態工具」賣點

**B. 打他們的痛點當差異化**
- **安全托管**＝我們天生贏：不曝露公網 instance、逐項 approval、預算硬上限、伺服器沙盒、RLS 多租戶。把「OpenClaw 的 CVE/惡意技能/失控自主」直接當我們的行銷對照
- **零架設 + 繁中 + 大眾漏斗 + 變現**＝他們完全沒有的市場

**C. 與 NemoClaw 互補（非對抗）**
- enterprise 版：分身島代理可選擇跑在 NemoClaw/OpenShell 沙盒（egress 控制/snapshot），主打「合規安全代理」

---

## 六、落地待辦（建議進 todo）

- [ ] 技能市集支援 `SKILL.md` 匯入 + **安全掃描**（差異化賣點）——併 §2.7.9
- [ ] 記憶可攜：匯出/匯入 `AGENTS.md`/`MEMORY.md`
- [ ] 通路 adapter 擴充：WhatsApp/Signal/Slack（承 §2.2/§2.3）
- [ ] 行銷對照頁：「托管安全 vs 自架風險」（拿 CVE-2026-25253 / 26% 技能漏洞當佐證）
- [ ] enterprise 探索：NemoClaw/OpenShell 沙盒相容評估

---

## 資料來源
- OpenClaw GitHub: https://github.com/openclaw/openclaw
- OpenClaw 官網: https://openclaw.ai/
- NVIDIA NemoClaw: https://www.nvidia.com/zh-tw/ai/nemoclaw/ · https://github.com/NVIDIA/NemoClaw
- Milvus 技術指南: https://milvus.io/blog/openclaw-formerly-clawdbot-moltbot-explained-a-complete-guide-to-the-autonomous-ai-agent.md
- SFAI Labs（vs LangChain/CrewAI/AutoGen）: https://sfailabs.com/guides/openclaw-ai-agent-framework
- Dextra Labs: https://dextralabs.com/blog/openclaw-ai-agent-frameworks/
