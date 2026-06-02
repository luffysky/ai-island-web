/**
 * API route 共用輸入驗證 — zod safeParse 包一層
 *
 * 取代散落各處的「直接信任 req.json()」。
 * route 端用法：
 *
 *   import { z } from "zod";
 *   import { parseBody } from "@/lib/validate";
 *
 *   const Schema = z.object({
 *     title: z.string().min(1).max(200),
 *     content: z.string().max(50_000),
 *     boardId: z.string().uuid(),
 *   });
 *
 *   export async function POST(req: NextRequest) {
 *     const parsed = await parseBody(req, Schema);
 *     if (!parsed.ok) return parsed.response;     // 400 已包好（含欄位錯誤）
 *     const { title, content, boardId } = parsed.data;   // 已型別安全
 *     // ...
 *   }
 *
 * 重點：字串欄位一律加 .max() 限長，擋超大 payload 塞爆 DB / 燒 token。
 */

import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";

export type ParseOk<T> = { ok: true; data: T };
export type ParseFail = { ok: false; response: NextResponse };
export type ParseResult<T> = ParseOk<T> | ParseFail;

/** 驗 JSON body */
export async function parseBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_json" }, { status: 400 }),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_input", details: result.error.flatten() },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: result.data };
}

/** 驗 query string（searchParams → 物件 → schema） */
export function parseQuery<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
): ParseResult<T> {
  const obj = Object.fromEntries(req.nextUrl.searchParams.entries());
  const result = schema.safeParse(obj);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_query", details: result.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}
