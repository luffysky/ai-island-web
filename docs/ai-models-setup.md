# 後台 AI 模型設定清單（可複製貼上）

> 後台：`/[admin]/ai/models`。每家先「貼 key → 測試 → 啟用」，再用「＋新增模型」逐筆加下面的 `model_name`（**要跟供應商完全一致**）、選 tier、儲存、勾選啟用。
> ⚠️ 模型名稱會隨供應商更新；若測試/使用回錯，以該家 `/v1/models`（測試按鈕會打）或官網 catalog 的實際 ID 為準。
> tier 規則：**low/mid = 免費 & Plus 可用；high = 只有 Pro / 特權能選**（成本防護）。免費供應商建議只加 low/mid。

## 🆓 免費供應商（先設這些）

### github（GitHub Models）— 最推、免卡
Key：GitHub → Settings → Developer settings → Personal access tokens → https://github.com/settings/personal-access-tokens
| model_name | 顯示名 | tier |
|---|---|---|
| `gpt-4o-mini` | GPT-4o mini | low |
| `Llama-3.3-70B-Instruct` | Llama 3.3 70B | mid |
| `Phi-3.5-mini-instruct` | Phi-3.5 mini | low |

### groq — 最快、免卡
Key：https://console.groq.com/keys
| model_name | 顯示名 | tier |
|---|---|---|
| `llama-3.1-8b-instant` | Llama 3.1 8B (Groq) | low |
| `llama-3.3-70b-versatile` | Llama 3.3 70B (Groq) | mid |

### google（Gemini）— 免費、多模態
Key：https://aistudio.google.com/apikey
| model_name | 顯示名 | tier |
|---|---|---|
| `gemini-2.5-flash` | Gemini 2.5 Flash | low |
| `gemini-2.5-pro` | Gemini 2.5 Pro | high |

### cerebras — 免卡、約 100 萬 tok/天
Key：https://cloud.cerebras.ai/
| model_name | 顯示名 | tier |
|---|---|---|
| `llama3.1-8b` | Llama 3.1 8B (Cerebras) | low |
| `llama-3.3-70b` | Llama 3.3 70B (Cerebras) | mid |

### nvidia（NVIDIA NIM）— 免費
Key：https://build.nvidia.com/
| model_name | 顯示名 | tier |
|---|---|---|
| `meta/llama-3.1-8b-instruct` | Llama 3.1 8B (NVIDIA) | low |
| `meta/llama-3.1-70b-instruct` | Llama 3.1 70B (NVIDIA) | mid |

### mistral — Experiment 免費（key 選 Private and shared connectors）
Key：https://console.mistral.ai/api-keys
| model_name | 顯示名 | tier |
|---|---|---|
| `open-mistral-nemo` | Mistral Nemo | low |
| `mistral-small-latest` | Mistral Small | mid |

### openrouter — 有免費 :free 模型
Key：https://openrouter.ai/keys
| model_name | 顯示名 | tier |
|---|---|---|
| `qwen/qwen3-next-80b-a3b-instruct:free` | Qwen3 80B (free) | mid |
| `openai/gpt-oss-120b:free` | gpt-oss 120B (free) | mid |
| `google/gemma-4-31b-it:free` | Gemma 4 31B (free) | low |

## 💳 付費供應商（要高階品質才設；免費層不用）

### openai
Key：https://platform.openai.com/api-keys
| model_name | 顯示名 | tier |
|---|---|---|
| `gpt-4o-mini` | GPT-4o mini | low |
| `gpt-4o` | GPT-4o | high |

### anthropic
Key：https://console.anthropic.com/settings/keys
| model_name | 顯示名 | tier |
|---|---|---|
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 | mid |
| `claude-sonnet-5` | Claude Sonnet 5 | high |
| `claude-opus-4-8` | Claude Opus 4.8 | high |

## 建議
- **免費層策略**：把上面免費家的 low/mid 都加進來 + 啟用 → auto 模式自動分流、達額度自動切下一家，免費用戶幾乎無上限。
- **每家月預算**：免費的填 `0`（不用限）；付費的填你能接受的上限（如 anthropic 10、openai 10）。
- **設一個預設模型**：挑一個穩定的免費 mid（如 groq `llama-3.3-70b-versatile`）按「設預設」。
