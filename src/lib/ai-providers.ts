// 多 provider AI 統一介面
// 支援：OpenAI / Anthropic / Google Gemini / Groq (Llama)
// + streaming（SSE 格式給前端）

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
async function callOpenAI(req: AICompletionRequest): Promise<AICompletionResponse> {
  const t0 = Date.now();
  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
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
async function callAnthropic(req: AICompletionRequest): Promise<AICompletionResponse> {
  const t0 = Date.now();

  // 分離 system message
  const systemMsg = req.messages.find((m) => m.role === "system");
  const nonSystem = req.messages.filter((m) => m.role !== "system");

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: req.model,
      messages: nonSystem,
      system: systemMsg?.content,
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
  };
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
      contents: nonSystem.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
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
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
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
  const url = req.provider === "openai"
    ? "https://api.openai.com/v1/chat/completions"
    : "https://api.groq.com/openai/v1/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: req.model,
      messages: nonSystem,
      system: systemMsg?.content,
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
      contents: nonSystem.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
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
