import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { runCode } from "@/lib/code-runner";

// 程式碼沙盒（多語言）。實際執行邏輯抽到 @/lib/code-runner（與 agent `code.run` 工具共用）。
// Python/JS/HTML 在前端走 Pyodide / iframe、通常不會打到這支。

export const maxDuration = 25;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const rl = rateLimit(`playground:${user.id}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `太頻繁、${rl.retryAfter} 秒後再試` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  const { language, code, stdin, filename } = await req.json();
  const r = await runCode({ language, code, stdin, filename });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({
    stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode,
    compile: r.compile, language: r.language, filename: r.filename, via: r.via,
  });
}
