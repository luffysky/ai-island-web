import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

// 程式碼沙盒（多語言）。三個後端、依序嘗試、前一個失敗自動退下一個：
//  1. 自架 Piston（設 PISTON_BASE_URL）— 最快、可裝 runtime。
//  2. Judge0（設 JUDGE0_KEY）— UTF-8 乾淨、品質好（RapidAPI 或自架）。
//  3. Wandbox（免費、免 key）— 永遠墊底的保底後端。
// 公開 Piston（emkc.org）2026-02-15 起白名單化、不再預設指向。
// Python/JS/HTML 在前端走 Pyodide / iframe、通常不會打到這支。
const PISTON_BASE = process.env.PISTON_BASE_URL?.replace(/\/$/, "");
const WANDBOX_URL = "https://wandbox.org/api/compile.json";
const JUDGE0_URL = process.env.JUDGE0_URL?.replace(/\/$/, "") || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_KEY;          // RapidAPI key（或自架 token）
const JUDGE0_HOST = process.env.JUDGE0_HOST;        // RapidAPI 才需要、例 judge0-ce.p.rapidapi.com

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
  bash: "bash", python: "cpython-3.14.0", "c++": "gcc-13.2.0", c: "gcc-13.2.0-c",
  go: "go-1.23.2", rust: "rust-1.82.0", java: "openjdk-jdk-21+35", csharp: "mono-6.12.0.199",
  ruby: "ruby-3.4.9", php: "php-8.3.12", typescript: "typescript-5.6.2", lua: "lua-5.4.7",
};

// piston 正規語言名 → Judge0 CE language_id
const JUDGE0_LANG: Record<string, number> = {
  bash: 46, python: 71, "c++": 54, c: 50, go: 60, rust: 73, java: 62, csharp: 51,
  ruby: 72, php: 68, typescript: 74, lua: 64, sqlite3: 82, kotlin: 78, swift: 83, scala: 81, r: 80,
};

type RunOut = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  compile: { stdout: string; stderr: string; code: number } | null;
  via: string;
};

// C# (mono) 預設把非 ASCII（中文）輸出成「?」——stdout 被導向時 console encoding 退回 ASCII。
// 改寫 Console.Out 成 UTF-8 StreamWriter（不能用 Console.OutputEncoding、導向時會丟例外）。
function fixCsharpUtf8(code: string): string {
  if (/OpenStandardOutput|OutputEncoding/.test(code)) return code;
  const inject = "System.Console.SetOut(new System.IO.StreamWriter(System.Console.OpenStandardOutput(), new System.Text.UTF8Encoding(false)){AutoFlush=true});";
  const re = /(static\s+(?:async\s+)?(?:void|int|Task|Task<int>|System\.Threading\.Tasks\.Task(?:<int>)?)\s+Main\s*\([^)]*\)\s*\{)/;
  return re.test(code) ? code.replace(re, `$1 ${inject}`) : code;
}

// 決定檔名：使用者給的優先；Java 一定要對齊 public class 名（不然 Piston 編不過）。
function resolveFilename(piston: string, ext: string, code: string, provided?: string): string {
  if (piston === "java") {
    const m = code.match(/public\s+(?:final\s+|abstract\s+)?class\s+([A-Za-z_]\w*)/);
    return `${m ? m[1] : "Main"}.java`;
  }
  if (provided && /^[\w.\-]{1,40}$/.test(provided)) return provided;
  return `main.${ext}`;
}

async function fetchTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

async function runViaPiston(piston: string, version: string, filename: string, code: string, stdin: string): Promise<RunOut> {
  const res = await fetchTimeout(`${PISTON_BASE}/execute`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: piston, version,
      files: [{ name: filename, content: code }],
      stdin, compile_timeout: 10000, run_timeout: 5000, compile_memory_limit: -1, run_memory_limit: -1,
    }),
  }, 9000);
  if (!res.ok) throw new Error(`piston ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const d = await res.json();
  return {
    stdout: d.run?.stdout ?? "", stderr: d.run?.stderr ?? "", exitCode: d.run?.code ?? null,
    compile: d.compile ? { stdout: d.compile.stdout, stderr: d.compile.stderr, code: d.compile.code } : null,
    via: "piston",
  };
}

async function runViaJudge0(piston: string, code: string, stdin: string): Promise<RunOut> {
  const id = JUDGE0_LANG[piston];
  if (!id) throw new Error(`judge0 不支援 ${piston}`);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (JUDGE0_HOST) { headers["X-RapidAPI-Key"] = JUDGE0_KEY!; headers["X-RapidAPI-Host"] = JUDGE0_HOST; }
  else if (JUDGE0_KEY) headers["X-Auth-Token"] = JUDGE0_KEY;
  const res = await fetchTimeout(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
    method: "POST", headers, body: JSON.stringify({ source_code: code, language_id: id, stdin }),
  }, 15000);
  if (!res.ok) throw new Error(`judge0 ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const d = await res.json();
  const compileErr = (d.compile_output ?? "").trim();
  const accepted = d.status?.id === 3;
  return {
    stdout: d.stdout ?? "",
    stderr: [d.stderr ?? "", compileErr, !accepted ? (d.message ?? "") : ""].filter((s) => s && s.trim()).join("\n"),
    exitCode: accepted ? 0 : 1,
    compile: compileErr ? { stdout: "", stderr: compileErr, code: 1 } : null,
    via: "judge0",
  };
}

async function runViaWandbox(piston: string, code: string, stdin: string): Promise<RunOut> {
  const compiler = WANDBOX_COMPILER[piston];
  if (!compiler) throw new Error(`wandbox 不支援 ${piston}`);
  const res = await fetchTimeout(WANDBOX_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ compiler, code, stdin }),
  }, 15000);
  if (!res.ok) throw new Error(`wandbox ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const d = await res.json();
  const compileErr = (d.compiler_error ?? "").trim();
  return {
    stdout: d.program_output ?? "",
    stderr: [d.program_error ?? "", compileErr].filter((s) => s && s.trim()).join("\n"),
    exitCode: d.status != null ? Number(d.status) : null,
    compile: compileErr ? { stdout: d.compiler_output ?? "", stderr: compileErr, code: 1 } : null,
    via: "wandbox",
  };
}

export const maxDuration = 25;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const rl = rateLimit(`playground:${user.id}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `太頻繁、${rl.retryAfter} 秒後再試` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  const { language, code, stdin, filename } = await req.json();
  if (!language || !code) return NextResponse.json({ error: "missing language or code" }, { status: 400 });

  const langConfig = VERSIONS[String(language).toLowerCase()];
  if (!langConfig) return NextResponse.json({ error: `不支援 ${language}` }, { status: 400 });
  if (code.length > 50000) return NextResponse.json({ error: "Code 太長（max 50KB）" }, { status: 400 });

  const ext = FILE_EXTS[langConfig.piston] ?? "txt";
  const finalCode = langConfig.piston === "csharp" ? fixCsharpUtf8(code) : code;
  const fname = resolveFilename(langConfig.piston, ext, finalCode, typeof filename === "string" ? filename : undefined);
  const st = stdin ?? "";

  // 後端鏈：Piston → Judge0 → Wandbox（依設定有哪些；Wandbox 永遠墊底）
  const chain: Array<() => Promise<RunOut>> = [];
  if (PISTON_BASE) chain.push(() => runViaPiston(langConfig.piston, langConfig.version, fname, finalCode, st));
  if (JUDGE0_KEY) chain.push(() => runViaJudge0(langConfig.piston, finalCode, st));
  chain.push(() => runViaWandbox(langConfig.piston, finalCode, st));

  const errors: string[] = [];
  for (const run of chain) {
    try {
      const out = await run();
      return NextResponse.json({
        stdout: out.stdout, stderr: out.stderr, exitCode: out.exitCode,
        compile: out.compile, language: langConfig.piston, filename: fname, via: out.via,
      });
    } catch (e: any) {
      errors.push(e?.message ?? "failed");
    }
  }
  return NextResponse.json({ error: `這個語言目前無法執行：${errors.join(" / ")}` }, { status: 502 });
}
