/**
 * Embeddings helper — 用 OpenAI text-embedding-3-small (1536 dim、便宜、品質好)
 *
 * 用途：
 *   1. 內容 indexing — 把章節 / 部落格 / 論壇主題 轉成 1536 維向量、存 content_embeddings
 *   2. 搜尋 query — 把使用者輸入轉成向量、跟 DB 跑 cosine similarity
 *
 * 成本：text-embedding-3-small 每 100 萬 token $0.02
 *       71 章 + N 篇文章一次性 indexing 約 1-3 美金 / 全站
 */

import { getProviderKey } from "./ai-crypto";
import { getModelNameForUsage } from "./ai-usage-models";

const DEFAULT_MODEL = "text-embedding-3-small";  // fallback；後台改 usage_key=embedding 即覆蓋
const DIMS = 1536;                                // 跟 small / ada-002 相符；換 model 要同步改 schema

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = await getProviderKey("openai");
  if (!apiKey) throw new Error("openai key not configured in ai_api_keys");

  const input = text.slice(0, 8000); // 安全 cap、模型限制 8191 token

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: await getModelNameForUsage("embedding", DEFAULT_MODEL),
      input,
      dimensions: DIMS,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI embedding ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const embedding = data.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== DIMS) {
    throw new Error("invalid_embedding_response");
  }
  return { embedding, tokens: data.usage?.total_tokens ?? 0 };
}

/** 批次：給多段文字、一次拿多個 embedding（API 支援、省 round-trip） */
export async function generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
  const apiKey = await getProviderKey("openai");
  if (!apiKey) throw new Error("openai key not configured in ai_api_keys");
  if (texts.length === 0) return [];
  if (texts.length > 100) throw new Error("batch_too_large_max_100");

  const inputs = texts.map((t) => t.slice(0, 8000));
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: await getModelNameForUsage("embedding", DEFAULT_MODEL),
      input: inputs,
      dimensions: DIMS,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI embedding batch ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const totalTokens = data.usage?.total_tokens ?? 0;
  const perItem = Math.floor(totalTokens / texts.length);
  return (data.data ?? []).map((d: any) => ({
    embedding: d.embedding,
    tokens: perItem,
  }));
}

/** 把 number[] 轉成 pgvector literal '[0.1,0.2,...]' 寫進 supabase */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
