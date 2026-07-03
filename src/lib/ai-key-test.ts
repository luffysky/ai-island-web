// 共用：驗證某 provider 的 API key 是否有效（admin 測 key + 使用者 BYOK 測 key 共用）。
// 各家打一個最小請求 / 列模型端點、回 { ok, status, body }。
export type KeyTestResult = { ok: boolean; status?: number; body?: string };

async function timed(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
}

export async function testProviderKey(
  provider: string,
  key: string,
  opts?: { baseUrl?: string; model?: string },
): Promise<KeyTestResult> {
  try {
    if (provider === "custom") {
      // OpenAI 相容端點：用使用者給的 base URL 打 /models（或 chat）驗證 key。
      const base = (opts?.baseUrl || "").replace(/\/+$/, "");
      if (!base) return { ok: false, body: "自訂端點缺 base URL" };
      const res = await timed(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
      return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
    }
    if (provider === "anthropic") {
      const res = await timed("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 5, messages: [{ role: "user", content: "hi" }] }),
      });
      return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
    }
    if (provider === "openai") {
      const res = await timed("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
    }
    if (provider === "google") {
      const res = await timed(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {});
      return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
    }
    if (provider === "groq") {
      const res = await timed("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
    }
    if (provider === "openrouter") {
      const res = await timed("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` } });
      return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
    }
    return { ok: false, body: `unknown provider: ${provider}` };
  } catch (e: any) {
    return { ok: false, body: `連線失敗：${e?.message ?? "unknown"}` };
  }
}

/**
 * 各家「取得 key」連結 + key 格式提示 + 範例可用模型（給 BYOK 頁顯示、格式參照後台管理設模型）。
 * - prefix：key 開頭（用來畫格式提示）
 * - placeholder：輸入框 placeholder（完整範例格式）
 * - hint：一句話講這把 key 長怎樣
 * - custom：OpenAI 相容自訂端點、需另填 base URL + model（存 metadata）
 */
export const BYOK_PROVIDERS = [
  { value: "anthropic", label: "Anthropic Claude", url: "https://console.anthropic.com/settings/keys", prefix: "sk-ant-", placeholder: "sk-ant-api03-...", hint: "以 sk-ant- 開頭的一長串", custom: false, models: ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-8"] },
  { value: "openai", label: "OpenAI GPT", url: "https://platform.openai.com/api-keys", prefix: "sk-", placeholder: "sk-... 或 sk-proj-...", hint: "以 sk- / sk-proj- 開頭", custom: false, models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1"] },
  { value: "google", label: "Google Gemini", url: "https://aistudio.google.com/apikey", prefix: "AIza", placeholder: "AIza...", hint: "以 AIza 開頭的一串", custom: false, models: ["gemini-2.5-flash", "gemini-2.5-pro"] },
  { value: "groq", label: "Groq（Llama 等，免費）", url: "https://console.groq.com/keys", prefix: "gsk_", placeholder: "gsk_...", hint: "以 gsk_ 開頭", custom: false, models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
  { value: "openrouter", label: "OpenRouter（一把通多家）", url: "https://openrouter.ai/keys", prefix: "sk-or-", placeholder: "sk-or-...", hint: "以 sk-or- 開頭", custom: false, models: ["deepseek/deepseek-r1:free", "meta-llama/llama-3.3-70b-instruct"] },
  { value: "custom", label: "自訂端點（OpenAI 相容）", url: "", prefix: "", placeholder: "貼上該服務的 API key", hint: "任何 OpenAI 相容服務（本地 Ollama / vLLM / 自架代理…）、需另填 Base URL 與模型名", custom: true, models: ["（由你填的模型名決定）"] },
] as const;
