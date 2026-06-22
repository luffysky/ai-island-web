// 多 provider AI 統一介面
// 支援：OpenAI / Anthropic / Google Gemini / Groq (Llama)
// + streaming（SSE 格式給前端）

// 多模態內容 block（Anthropic + OpenAI 都支援、Gemini / Groq 純文字 fallback）
export type AIContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: string; data: string };  // data = base64 (不含 data:image/... prefix)

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | AIContentBlock[];
}

// 內部 helper：把 string | AIContentBlock[] 轉純文字（Gemini / Groq 用、image 忽略）
function contentToText(content: string | AIContentBlock[]): string {
  if (typeof content === "string") return stripLoneSurrogates(content);
  return stripLoneSurrogates(content.filter((b) => b.type === "text").map((b) => (b as any).text).join("\n"));
}

// 內部 helper：判斷 content 有沒有 image
function hasImage(content: string | AIContentBlock[]): boolean {
  if (typeof content === "string") return false;
  return content.some((b) => b.type === "image");
}

export interface AICompletionRequest {
  provider: string;
  model: string;
  apiKey: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AICompletionResponse {
  text: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  raw?: any;
}

export interface StreamChunk {
  type: "text" | "done" | "error";
  text?: string;
  tokensInput?: number;
  tokensOutput?: number;
  error?: string;
}

const TIMEOUT_MS = 60_000;

async function fetchWithTimeout(url: string, opts: RequestInit, timeout = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ============ OpenAI ============
function toOpenAIMessages(messages: AIMessage[]): any[] {
  return messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    // multimodal: 轉 OpenAI 格式
    return {
      role: m.role,
      content: m.content.map((b) =>
        b.type === "text"
          ? { type: "text", text: b.text }
          : { type: "image_url", image_url: { url: `data:${b.mediaType};base64,${b.data}` } },
      ),
    };
  });
}

// OpenAI 相容 endpoint base（OpenAI / Groq / OpenRouter 共用 chat/completions 格式）
function openAiLikeUrl(provider: string): string {
  if (provider === "groq") return "https://api.groq.com/openai/v1/chat/completions";
  if (provider === "openrouter") return "https://openrouter.ai/api/v1/chat/completions";
  return "https://api.openai.com/v1/chat/completions";
}

async function callOpenAI(req: AICompletionRequest): Promise<AICompletionResponse> {
  const t0 = Date.now();
  const res = await fetchWithTimeout(openAiLikeUrl(req.provider), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages: toOpenAIMessages(req.messages),
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${req.provider} error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.choices[0]?.message?.content ?? "",
    tokensInput: data.usage?.prompt_tokens ?? 0,
    tokensOutput: data.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - t0,
    raw: data,
  };
}

// ============ Anthropic Claude ============
/**
 * 移除「落單的 UTF-16 surrogate」（半個 emoji）。
 * 來源通常是 someStr.slice(0, N) 剛好切在 emoji 的代理對中間 → 落單 surrogate
 * → JSON.stringify 後變成不合法 JSON → Anthropic 回 400「no low surrogate in string」
 * → 整個 AI 請求炸掉（學員 LINE 注入筆記時最常踩、因為筆記被 slice(0,250)）。
 */
export function stripLoneSurrogates(s: string): string {
  if (!s) return s;
  return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

function toAnthropicMessages(messages: AIMessage[]): any[] {
  return messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: stripLoneSurrogates(m.content) };
    // multimodal: 轉 Anthropic 格式
    return {
      role: m.role,
      content: m.content.map((b) =>
        b.type === "text"
          ? { type: "text", text: stripLoneSurrogates(b.text) }
          : { type: "image", source: { type: "base64", media_type: b.mediaType, data: b.data } },
      ),
    };
  });
}

/**
 * Prompt cache 邊界標記（4 個零寬空格、肉眼/語意都無感、極不可能自然出現）。
 * buildTutorSystemPrompt 用它把「全站共用的穩定前綴（課程結構 + persona + 規則）」
 * 跟「每位使用者不同的後綴（記憶 / 學習狀態 / owner / 當前章節）」切開。
 * Anthropic 端把前綴設成獨立 cache block → 同 persona/tone 的所有使用者「共用同一份快取」、
 * 不只單一對話內、跨使用者跨對話都命中（課程結構是最大塊、省最多）。
 */
export const PROMPT_CACHE_MARKER = "​​​​";

/**
 * 把 system text 包成 Anthropic system block 格式、長 prompt 自動加 ephemeral cache。
 * - cache_control: { type: "ephemeral" } 走 5 分鐘 TTL
 * - cache write 第 1 次 1.25x cost、之後 cache read 只算 0.1x
 * - 最低 1024 token (Haiku 2048) 才會 cache、低於不影響、Anthropic 自動忽略
 * - 有 PROMPT_CACHE_MARKER → 切成 [穩定前綴(cache) , 個人化後綴(不cache)]、跨使用者共用前綴快取
 */
function buildAnthropicSystem(systemText: string): string | any[] {
  if (!systemText) return "";
  systemText = stripLoneSurrogates(systemText);
  const mi = systemText.indexOf(PROMPT_CACHE_MARKER);
  if (mi >= 0) {
    const prefix = systemText.slice(0, mi);
    const suffix = systemText.slice(mi + PROMPT_CACHE_MARKER.length);
    const blocks: any[] = [];
    // 穩定前綴設 cache breakpoint（太短時 Anthropic 自動忽略、無害）
    if (prefix) blocks.push({ type: "text", text: prefix, cache_control: { type: "ephemeral" } });
    if (suffix.trim()) blocks.push({ type: "text", text: suffix });
    return blocks.length ? blocks : "";
  }
  // 無 marker（其他呼叫端）：維持原本「夠長才整塊 cache」
  if (systemText.length < 3000) return systemText;
  return [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }];
}

async function callAnthropic(req: AICompletionRequest): Promise<AICompletionResponse> {
  const t0 = Date.now();

  // 分離 system message
  const systemMsg = req.messages.find((m) => m.role === "system");
  const nonSystem = req.messages.filter((m) => m.role !== "system");
  const systemText = typeof systemMsg?.content === "string" ? systemMsg.content : contentToText(systemMsg?.content ?? "");

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model: req.model,
      messages: toAnthropicMessages(nonSystem),
      system: buildAnthropicSystem(systemText),
      max_tokens: req.maxTokens ?? 2000,
      temperature: req.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  return {
    text,
    tokensInput: data.usage?.input_tokens ?? 0,
    tokensOutput: data.usage?.output_tokens ?? 0,
    latencyMs: Date.now() - t0,
    raw: data,
    // 帶 cache 資訊讓 caller 看實際省了多少
    ...(data.usage?.cache_creation_input_tokens || data.usage?.cache_read_input_tokens
      ? { cache: { write: data.usage.cache_creation_input_tokens ?? 0, read: data.usage.cache_read_input_tokens ?? 0 } }
      : {}),
  } as any;
}

// ============ Google Gemini ============
async function callGoogle(req: AICompletionRequest): Promise<AICompletionResponse> {
  const t0 = Date.now();
  const systemMsg = req.messages.find((m) => m.role === "system");
  const nonSystem = req.messages.filter((m) => m.role !== "system");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${req.apiKey}`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: nonSystem.map((m) => {
        // Gemini multimodal: parts 可含 text + inline_data (image)
        if (typeof m.content === "string") {
          return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
        }
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: m.content.map((b) =>
            b.type === "text"
              ? { text: b.text }
              : { inline_data: { mime_type: b.mediaType, data: b.data } },
          ),
        };
      }),
      systemInstruction: systemMsg ? { parts: [{ text: contentToText(systemMsg.content) }] } : undefined,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 2000,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return {
    text,
    tokensInput: data.usageMetadata?.promptTokenCount ?? 0,
    tokensOutput: data.usageMetadata?.candidatesTokenCount ?? 0,
    latencyMs: Date.now() - t0,
    raw: data,
  };
}

// ============ Groq (Llama) ============
async function callGroq(req: AICompletionRequest): Promise<AICompletionResponse> {
  const t0 = Date.now();
  // Groq 大部分 model 不支援 image、強制轉純文字 + 警告
  const messages = req.messages.map((m) => ({ role: m.role, content: contentToText(m.content) }));
  if (req.messages.some((m) => hasImage(m.content))) {
    console.warn("[ai-providers] Groq 不支援 image、已忽略");
  }
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.choices[0]?.message?.content ?? "",
    tokensInput: data.usage?.prompt_tokens ?? 0,
    tokensOutput: data.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - t0,
    raw: data,
  };
}

// ============ Dispatcher ============
export async function callAI(req: AICompletionRequest): Promise<AICompletionResponse> {
  switch (req.provider) {
    case "openai":
    case "openrouter":  // OpenAI 相容
      return callOpenAI(req);
    case "anthropic":
      return callAnthropic(req);
    case "google":
      return callGoogle(req);
    case "groq":
    case "meta":  // alias
      return callGroq(req);
    default:
      throw new Error(`Unsupported provider: ${req.provider}`);
  }
}

// ============ Streaming ============
// 各 provider 都有 SSE 格式、但語法略不同、統一輸出 AsyncIterable<StreamChunk>

export async function* streamAI(req: AICompletionRequest): AsyncGenerator<StreamChunk> {
  switch (req.provider) {
    case "openai":
    case "groq":
    case "meta":
    case "openrouter":
      yield* streamOpenAILike(req);
      break;
    case "anthropic":
      yield* streamAnthropic(req);
      break;
    case "google":
      yield* streamGoogle(req);
      break;
    default:
      yield { type: "error", error: `Stream not supported for ${req.provider}` };
  }
}

// OpenAI / Groq SSE（一樣格式）
async function* streamOpenAILike(req: AICompletionRequest): AsyncGenerator<StreamChunk> {
  const url = openAiLikeUrl(req.provider);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      // groq 不支援 image、強制純文字；openai / openrouter 用 multimodal 格式
      messages: req.provider === "groq"
        ? req.messages.map((m) => ({ role: m.role, content: contentToText(m.content) }))
        : toOpenAIMessages(req.messages),
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 2000,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    yield { type: "error", error: `${req.provider} error ${res.status}: ${err}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let tokensInput = 0;
  let tokensOutput = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield { type: "text", text: delta };
        if (json.usage) {
          tokensInput = json.usage.prompt_tokens ?? 0;
          tokensOutput = json.usage.completion_tokens ?? 0;
        }
      } catch {}
    }
  }

  yield { type: "done", tokensInput, tokensOutput };
}

// Anthropic SSE
async function* streamAnthropic(req: AICompletionRequest): AsyncGenerator<StreamChunk> {
  const systemMsg = req.messages.find((m) => m.role === "system");
  const nonSystem = req.messages.filter((m) => m.role !== "system");
  const systemText = typeof systemMsg?.content === "string" ? systemMsg.content : contentToText(systemMsg?.content ?? "");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model: req.model,
      messages: toAnthropicMessages(nonSystem),
      system: buildAnthropicSystem(systemText),
      max_tokens: req.maxTokens ?? 2000,
      temperature: req.temperature ?? 0.7,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    yield { type: "error", error: `Anthropic error ${res.status}: ${err}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let tokensInput = 0;
  let tokensOutput = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const json = JSON.parse(data);
        if (json.type === "content_block_delta" && json.delta?.text) {
          yield { type: "text", text: json.delta.text };
        }
        if (json.type === "message_start" && json.message?.usage) {
          tokensInput = json.message.usage.input_tokens ?? 0;
        }
        if (json.type === "message_delta" && json.usage) {
          tokensOutput = json.usage.output_tokens ?? 0;
        }
      } catch {}
    }
  }

  yield { type: "done", tokensInput, tokensOutput };
}

// Google Gemini SSE（streamGenerateContent）
async function* streamGoogle(req: AICompletionRequest): AsyncGenerator<StreamChunk> {
  const systemMsg = req.messages.find((m) => m.role === "system");
  const nonSystem = req.messages.filter((m) => m.role !== "system");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:streamGenerateContent?alt=sse&key=${req.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: nonSystem.map((m) => {
        if (typeof m.content === "string") {
          return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
        }
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: m.content.map((b) =>
            b.type === "text"
              ? { text: b.text }
              : { inline_data: { mime_type: b.mediaType, data: b.data } },
          ),
        };
      }),
      systemInstruction: systemMsg ? { parts: [{ text: contentToText(systemMsg.content) }] } : undefined,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 2000,
      },
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    yield { type: "error", error: `Gemini error ${res.status}: ${err}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let tokensInput = 0;
  let tokensOutput = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const json = JSON.parse(data);
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield { type: "text", text };
        if (json.usageMetadata) {
          tokensInput = json.usageMetadata.promptTokenCount ?? tokensInput;
          tokensOutput = json.usageMetadata.candidatesTokenCount ?? tokensOutput;
        }
      } catch {}
    }
  }

  yield { type: "done", tokensInput, tokensOutput };
}

// 算成本
export function estimateCost(
  tokensInput: number,
  tokensOutput: number,
  costInputPer1M: number,
  costOutputPer1M: number
): number {
  return (tokensInput * costInputPer1M + tokensOutput * costOutputPer1M) / 1_000_000;
}
