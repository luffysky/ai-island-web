import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

// 程式碼沙盒（多語言）。兩個後端：
//  • Wandbox（https://wandbox.org）— 免費、免 key、立即可用 → 預設後端。
//  • 自架 Piston — admin 設 PISTON_BASE_URL 後優先使用（較快、可裝 runtime）；失敗自動退回 Wandbox。
// 註：公開 Piston（emkc.org）2026-02-15 起白名單化、已不可用、故不再預設指向它。
// Python/JS/HTML 在前端走 Pyodide / iframe、通常不會打到這支。
const PISTON_BASE = process.env.PISTON_BASE_URL?.replace(/\/$/, "");
const WANDBOX_URL = "https://wandbox.org/api/compile.json";

// 語言版本對照（Piston 需明確版本）
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

// piston 正規語言名 → Wandbox compiler id（取自 wandbox.org/api/list.json、可隨時更新）
const WANDBOX_COMPILER: Record<string, string> = {
  bash: "bash",
  python: "cpython-3.14.0",
  "c++": "gcc-13.2.0",
  c: "gcc-13.2.0-c",
  go: "go-1.23.2",
  rust: "rust-1.82.0",
  java: "openjdk-jdk-21+35",
  csharp: "mono-6.12.0.199",
  ruby: "ruby-3.4.9",
  php: "php-8.3.12",
  typescript: "typescript-5.6.2",
  lua: "lua-5.4.7",
};

type RunOut = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  compile: { stdout: string; stderr: string; code: number } | null;
  via: string;
};

async function runViaPiston(piston: string, version: string, filename: string, code: string, stdin: string): Promise<RunOut> {
  const res = await fetch(`${PISTON_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: piston, version,
      files: [{ name: filename, content: code }],
      stdin: stdin ?? "",
      compile_timeout: 10000, run_timeout: 5000,
      compile_memory_limit: -1, run_memory_limit: -1,
    }),
  });
  if (!res.ok) throw new Error(`piston ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const d = await res.json();
  return {
    stdout: d.run?.stdout ?? "",
    stderr: d.run?.stderr ?? "",
    exitCode: d.run?.code ?? null,
    compile: d.compile ? { stdout: d.compile.stdout, stderr: d.compile.stderr, code: d.compile.code } : null,
    via: "piston",
  };
}

async function runViaWandbox(piston: string, code: string, stdin: string): Promise<RunOut> {
  const compiler = WANDBOX_COMPILER[piston];
  if (!compiler) throw new Error(`wandbox 不支援 ${piston}`);
  const res = await fetch(WANDBOX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ compiler, code, stdin: stdin ?? "" }),
  });
  if (!res.ok) throw new Error(`wandbox ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const d = await res.json();
  const compileErr = (d.compiler_error ?? "").trim();
  return {
    stdout: d.program_output ?? "",
    // 編譯錯誤也塞進 stderr、學員才看得到
    stderr: [d.program_error ?? "", compileErr].filter((s) => s && s.trim()).join("\n"),
    exitCode: d.status != null ? Number(d.status) : null,
    compile: compileErr ? { stdout: d.compiler_output ?? "", stderr: compileErr, code: 1 } : null,
    via: "wandbox",
  };
}

export const maxDuration = 20;

export async function POST(req: NextRequest) {
  // Auth（避免被當免費 codepen）
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  // Rate limit：每用戶 30 次/分鐘
  const rl = rateLimit(`playground:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: `太頻繁、${rl.retryAfter} 秒後再試` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const { language, code, stdin } = await req.json();
  if (!language || !code) return NextResponse.json({ error: "missing language or code" }, { status: 400 });

  const langConfig = VERSIONS[String(language).toLowerCase()];
  if (!langConfig) return NextResponse.json({ error: `不支援 ${language}` }, { status: 400 });
  if (code.length > 50000) return NextResponse.json({ error: "Code 太長（max 50KB）" }, { status: 400 });

  const filename = `main.${FILE_EXTS[langConfig.piston] ?? "txt"}`;

  // 後端選擇：有自架 Piston → 先 Piston、失敗退 Wandbox；否則直接 Wandbox。
  let out: RunOut | null = null;
  let pistonErr = "";
  if (PISTON_BASE) {
    try {
      out = await runViaPiston(langConfig.piston, langConfig.version, filename, code, stdin ?? "");
    } catch (e: any) {
      pistonErr = e?.message ?? "piston failed";
    }
  }
  if (!out) {
    try {
      out = await runViaWandbox(langConfig.piston, code, stdin ?? "");
    } catch (e: any) {
      return NextResponse.json({
        error: `這個語言目前無法執行：${e?.message ?? "no backend"}${pistonErr ? `（Piston: ${pistonErr}）` : ""}`,
      }, { status: 502 });
    }
  }

  return NextResponse.json({
    stdout: out.stdout,
    stderr: out.stderr,
    exitCode: out.exitCode,
    compile: out.compile,
    language: langConfig.piston,
    via: out.via,
  });
}
