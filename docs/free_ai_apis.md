# 免費 / 有免費額度的 AI 模型 API（2026-06 整理）

林董參考用。重點：**這個專案的 provider 架構大多是「OpenAI 相容」**（`src/lib/ai-providers.ts` 已支援 openai / anthropic / google / groq）。
凡是「OpenAI 相容 endpoint」的服務，幾乎都能用「自訂 base URL + key」接進來、不必大改 code。

---

## ✅ 已經接好、且本身就有免費額度的（不用再做事）

| 服務 | 免費內容 | 專案現況 |
|---|---|---|
| **Groq** | 免費、超快（Llama 3.3 70B / 3.1 8B / gpt-oss）。有每分鐘/每日 rate limit | **已整合**，模型已列在 /admin/ai/models |
| **Google Gemini API** | 免費層：gemini-2.5-flash / flash-lite 有每日免費額度（超過才付費） | **已整合**（gemini-2.5/3.5 已列） |

> 想「零成本跑」→ 直接在 /admin/ai/models 把預設模型設成 **Groq Llama 3.3 70B** 或 **Gemini 2.5 Flash**，就幾乎不花錢。

---

## 🆓 可額外接、值得考慮的免費來源

| 服務 | 免費內容 | 模型例 | 接法 | 備註 |
|---|---|---|---|---|
| **OpenRouter** | 有一批 `:free` 模型完全免費 | `deepseek/deepseek-r1:free`、`meta-llama/llama-3.3-70b:free`、`google/gemini-*:free` | OpenAI 相容（base `https://openrouter.ai/api/v1`）→ 當成新 provider 或 openai 變體 | 一把 key 通吃多家、最划算的「多模型」入口 |
| **Cerebras** | 免費層、推理超快（比 Groq 還快） | `llama-3.3-70b`、`qwen-3-*` | OpenAI 相容 | 速度取向 |
| **GitHub Models** | 開發者免費（preview）：GPT-4o / o-series / Llama / Phi | `gpt-4o`、`o3-mini` 等 | OpenAI 相容（Azure endpoint + GitHub token） | 有每日 request 上限、適合內部/測試 |
| **Cloudflare Workers AI** | 每日免費額度（Neurons） | `@cf/meta/llama-3.3-70b`、`@cf/qwen/*` | 自家 REST（要寫 adapter） | 我們已用 Cloudflare R2、生態一致 |
| **Mistral La Plateforme** | 免費實驗層 | `mistral-small-latest`、`open-mixtral` | OpenAI 相容 | 歐系、隱私訴求 |
| **Together AI** | 註冊送額度 + 少數免費模型 | Llama / Qwen / DeepSeek | OpenAI 相容 | |
| **Ollama（自架）** | 完全免費（跑在自己機器/伺服器） | Llama / Qwen / Gemma / DeepSeek | OpenAI 相容（`/v1`） | 零 API 成本、但要一台有 GPU/夠 RAM 的機器；可部署到 Zeabur |

---

## 💡 建議

1. **最省力**：先把預設模型切到已接好的 **Groq / Gemini Flash**（免費額度），日常問答幾乎零成本。
2. **要更多免費模型可選**：接 **OpenRouter**（一把 key 拿到一堆 `:free` 模型，包含 DeepSeek R1）。整合成本最低、CP 值最高。
3. **完全不想付費 + 有自己的機器**：架 **Ollama**，把 base URL 指過去。
4. 接新 provider 的工，主要是在 `src/lib/ai-providers.ts` 加一個 OpenAI 相容分支（多數情況 = 改 base URL + key），再到 `ai_models` 表加幾筆、`/admin/ai/models` 開關即可。

> 要我接哪一個（OpenRouter 最推薦），跟我說，我把 provider 分支 + 模型清單 + admin 開關一起做。

---

## ⚠️ 注意
- 「免費」幾乎都有 **rate limit / 每日上限 / 資料可能被拿去訓練**。正式對外服務要看條款（尤其學員資料隱私）。
- 免費模型品質參差：DeepSeek R1、Llama 3.3 70B、Qwen3 算堪用；要高品質仍建議 Claude / GPT 付費層。
- 模型會下架（像這次 Gemini 2.0）。接哪家都要保留「在 /admin/ai/models 一鍵關掉」的能力（已具備）。
