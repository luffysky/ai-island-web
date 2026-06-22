import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

// Piston code execution sandbox（30+ 語言）
// - 預設用免費 emkc.org/piston（限制 5 req/sec、共享資源、偶爾掛掉）
// - 若 env PISTON_BASE_URL 有設、改用自架 Piston（建議部署到 Zeabur、無限制、穩定）
//   self-host 教學：見 docs/piston-selfhost.md
const PISTON_URL = (process.env.PISTON_BASE_URL?.replace(/\/$/, "") ?? "https://emkc.org/api/v2/piston")
  + "/execute";

// 語言版本對照（Piston 需要明確版本）
const VERSIONS: Record<string, { piston: string; version: string }> = {
  python: { piston: "python", version: "3.10.0" },
  py: { piston: "python", version: "3.10.0" },
  go: { piston: "go", version: "1.16.2" },
  rust: { piston: "rust", version: "1.68.2" },
  rs: { piston: "rust", version: "1.68.2" },
  java: { piston: "java", version: "15.0.2" },
  csharp: { piston: "csharp", version: "6.12.0" },
  "c#": { piston: "csharp", version: "6.12.0" },
  cpp: { piston: "c++", version: "10.2.0" },
  "c++": { piston: "c++", version: "10.2.0" },
  c: { piston: "c", version: "10.2.0" },
  php: { piston: "php", version: "8.2.3" },
  ruby: { piston: "ruby", version: "3.0.1" },
  rb: { piston: "ruby", version: "3.0.1" },
  kotlin: { piston: "kotlin", version: "1.8.20" },
  swift: { piston: "swift", version: "5.3.3" },
  typescript: { piston: "typescript", version: "5.0.3" },
  ts: { piston: "typescript", version: "5.0.3" },
  bash: { piston: "bash", version: "5.2.0" },
  sh: { piston: "bash", version: "5.2.0" },
  sqlite: { piston: "sqlite3", version: "3.36.0" },
  sql: { piston: "sqlite3", version: "3.36.0" },
  lua: { piston: "lua", version: "5.4.4" },
  dart: { piston: "dart", version: "2.19.6" },
  r: { piston: "r", version: "4.1.1" },
  scala: { piston: "scala", version: "3.2.2" },
};

const FILE_EXTS: Record<string, string> = {
  python: "py", go: "go", rust: "rs", java: "Main.java",
  csharp: "cs", "c++": "cpp", c: "c", php: "php", ruby: "rb",
  kotlin: "kt", swift: "swift", typescript: "ts", bash: "sh",
  sqlite3: "sql", lua: "lua", dart: "dart", r: "r", scala: "scala",
};

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  // Auth check（避免被當免費 codepen）
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  // Rate limit: 每用戶 30 次/分鐘
  const rl = rateLimit(`playground:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `太頻繁、${rl.retryAfter} 秒後再試` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { language, code, stdin } = await req.json();
  if (!language || !code) {
    return NextResponse.json({ error: "missing language or code" }, { status: 400 });
  }

  const langConfig = VERSIONS[language.toLowerCase()];
  if (!langConfig) {
    return NextResponse.json({ error: `不支援 ${language}` }, { status: 400 });
  }

  // 防止濫用：限制 code 長度
  if (code.length > 50000) {
    return NextResponse.json({ error: "Code 太長（max 50KB）" }, { status: 400 });
  }

  const filename = `main.${FILE_EXTS[langConfig.piston] ?? "txt"}`;

  try {
    const res = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langConfig.piston,
        version: langConfig.version,
        files: [{ name: filename, content: code }],
        stdin: stdin ?? "",
        compile_timeout: 10000,
        run_timeout: 5000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      // 2026-02-15 起公開 Piston（emkc.org）改白名單制、未自架會回 401 + "whitelist only"。
      // 給清楚訊息、引導設定自架 PISTON_BASE_URL（見 docs/piston-selfhost.md）。
      const usingPublic = !process.env.PISTON_BASE_URL;
      if (usingPublic && (res.status === 401 || res.status === 403 || /whitelist/i.test(txt))) {
        return NextResponse.json({
          error: "程式執行服務暫時停用中：公開 Piston 已改白名單制。管理員需自架 Piston 並設定 PISTON_BASE_URL（見 docs/piston-selfhost.md）。",
          detail: txt.slice(0, 300),
          code: "piston_whitelisted",
        }, { status: 503 });
      }
      return NextResponse.json({ error: `Piston 錯誤：${res.status}`, detail: txt }, { status: 502 });
    }

    const data = await res.json();

    // 整理輸出
    return NextResponse.json({
      stdout: data.run?.stdout ?? "",
      stderr: data.run?.stderr ?? "",
      exitCode: data.run?.code,
      compile: data.compile ? {
        stdout: data.compile.stdout,
        stderr: data.compile.stderr,
        code: data.compile.code,
      } : null,
      language: data.language,
      version: data.version,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
