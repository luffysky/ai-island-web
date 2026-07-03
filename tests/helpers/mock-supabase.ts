import { vi } from "vitest";

/**
 * 極簡 PostgREST query-builder 模擬。
 * - 每個鏈式方法（select/eq/order/limit…）回同一個 builder（可續鏈）。
 * - builder 本身是 thenable：`await admin.from(x).update(y).eq(z)` 會 resolve 佇列的下一筆。
 * - `.single()` / `.maybeSingle()` 也從同一個 FIFO 佇列取下一筆。
 * responses 依「程式碼 await 的先後順序」排好即可。
 */
export type Canned = { data?: any; error?: any; count?: number };

export function makeMockAdmin(responses: Canned[] = []) {
  const queue = [...responses];
  const next = (): Canned => (queue.length ? (queue.shift() as Canned) : { data: null, error: null });
  const calls = { insert: [] as any[], update: [] as any[], from: [] as string[] };

  const builder: any = {};
  for (const m of ["select", "eq", "neq", "lte", "gte", "lt", "gt", "order", "limit", "contains", "range", "in", "is"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.insert = vi.fn((p: any) => {
    calls.insert.push(p);
    return builder;
  });
  builder.update = vi.fn((p: any) => {
    calls.update.push(p);
    return builder;
  });
  builder.single = vi.fn(() => Promise.resolve(next()));
  builder.maybeSingle = vi.fn(() => Promise.resolve(next()));
  builder.then = (res: any, rej: any) => Promise.resolve(next()).then(res, rej);

  const admin = {
    from: vi.fn((t: string) => {
      calls.from.push(t);
      return builder;
    }),
  };
  return { admin, calls };
}
