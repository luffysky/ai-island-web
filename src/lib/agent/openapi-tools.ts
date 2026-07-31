/**
 * 2.1.6 工具自動發現（OpenAPI → tools）——把一份 OpenAPI 3 spec 的每個 operation 自動變成一個 AgentTool，
 * 讓分身島 Agent 不用手刻就能呼叫外部 API。與 MCP 動態工具（mcp.ts）並列為「動態工具來源」。
 * 安全：GET/HEAD=read（自動執行）、其餘=write/dangerous（走既有審批流）；SSRF 擋內網/私有 IP；逾時 + 回應大小上限。
 * 純函式 `openApiOperations` 可單元測試；`parseOpenApiToTools` 包上 execute（實際打 HTTP）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { AgentTool, RiskLevel, ToolResult } from "./tools";

export interface OpenApiSource { id: string; name: string; spec_url: string; base_url?: string | null; auth_header?: string | null; }

type Method = "get" | "post" | "put" | "patch" | "delete" | "head";
const METHODS: Method[] = ["get", "post", "put", "patch", "delete", "head"];

export interface OpApi {
  name: string;               // 工具名（namespace.operation）
  method: Method;
  pathTemplate: string;       // 如 /users/{id}
  risk: RiskLevel;
  args: Record<string, string>;   // 參數名→說明
  pathParams: string[];
  queryParams: string[];
  hasBody: boolean;
  description: string;
}

function slug(s: string): string {
  return String(s || "").replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "op";
}
function riskOf(m: Method): RiskLevel {
  if (m === "get" || m === "head") return "read";
  if (m === "delete") return "dangerous";
  return "write";
}

/**
 * 純函式：把 OpenAPI spec 物件解析成 operation 清單（可測、不打網路）。
 * namespace = 工具名前綴（來源顯示名 slug），避免多來源撞名。
 */
export function openApiOperations(spec: any, namespace = "api"): OpApi[] {
  const ns = slug(namespace);
  const out: OpApi[] = [];
  const paths = spec?.paths;
  if (!paths || typeof paths !== "object") return out;
  for (const [p, item] of Object.entries<any>(paths)) {
    if (!item || typeof item !== "object") continue;
    const commonParams: any[] = Array.isArray(item.parameters) ? item.parameters : [];
    for (const m of METHODS) {
      const op = item[m];
      if (!op || typeof op !== "object") continue;
      const params: any[] = [...commonParams, ...(Array.isArray(op.parameters) ? op.parameters : [])];
      const pathParams: string[] = [];
      const queryParams: string[] = [];
      const args: Record<string, string> = {};
      for (const prm of params) {
        const nm = String(prm?.name ?? "");
        if (!nm) continue;
        const desc = String(prm?.description ?? prm?.schema?.type ?? "").slice(0, 80);
        if (prm.in === "path") { pathParams.push(nm); args[nm] = `${desc}（路徑參數，必填）`; }
        else if (prm.in === "query") { queryParams.push(nm); args[nm] = `${desc}${prm.required ? "（必填）" : "（選填）"}`; }
      }
      const hasBody = !!op.requestBody;
      if (hasBody) args["body"] = "請求主體（JSON 字串）";
      const opId = op.operationId ? slug(op.operationId) : `${m}_${slug(p)}`;
      out.push({
        name: `${ns}.${opId}`.slice(0, 60),
        method: m,
        pathTemplate: p,
        risk: riskOf(m),
        args,
        pathParams,
        queryParams,
        hasBody,
        description: `${(op.summary || op.description || `${m.toUpperCase()} ${p}`).toString().slice(0, 140)}（${m.toUpperCase()} ${p}）`,
      });
    }
  }
  return out;
}

/** SSRF 防護：擋 localhost / 私有 / 保留 IP。只允許 http(s)。 */
export function isSafePublicUrl(u: string): boolean {
  let url: URL;
  try { url = new URL(u); } catch { return false; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const h = url.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0" || h === "[::1]") return false;
  // IPv4 私有 / 保留段
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)) return false;
  }
  if (h.endsWith(".internal") || h.endsWith(".local")) return false;
  return true;
}

const MAX_RESP = 12000;   // 回應摘要上限（給 LLM 讀）
const TIMEOUT_MS = 15000;

/** 把 spec 轉成 AgentTool[]（每個 operation 一個工具，execute 實際打 HTTP）。 */
export function parseOpenApiToTools(spec: any, opts: { namespace: string; baseUrl?: string | null; authHeader?: string | null }): AgentTool[] {
  const ops = openApiOperations(spec, opts.namespace);
  const specBase = String(spec?.servers?.[0]?.url ?? "").replace(/\/+$/, "");
  const base = String(opts.baseUrl || specBase || "").replace(/\/+$/, "");
  const tools: AgentTool[] = [];
  for (const op of ops) {
    tools.push({
      name: op.name,
      description: op.description,
      args: op.args,
      risk: op.risk,
      platforms: ["web", "server"],
      async execute(args: any, _ctx): Promise<ToolResult> {
        try {
          if (!base) return { ok: false, error: "此 API 來源沒有 base URL、無法呼叫" };
          let path = op.pathTemplate;
          for (const pp of op.pathParams) {
            const v = args?.[pp];
            if (v === undefined || v === null || v === "") return { ok: false, error: `缺路徑參數 ${pp}` };
            path = path.replace(`{${pp}}`, encodeURIComponent(String(v)));
          }
          const url = new URL(base + path);
          for (const qp of op.queryParams) {
            if (args?.[qp] !== undefined && args[qp] !== null && args[qp] !== "") url.searchParams.set(qp, String(args[qp]));
          }
          if (!isSafePublicUrl(url.toString())) return { ok: false, error: "目標網址不允許（內網/私有位址）" };
          const headers: Record<string, string> = { Accept: "application/json" };
          if (opts.authHeader) headers["Authorization"] = opts.authHeader;
          let body: string | undefined;
          if (op.hasBody && args?.body !== undefined) {
            body = typeof args.body === "string" ? args.body : JSON.stringify(args.body);
            headers["Content-Type"] = "application/json";
          }
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
          let res: Response;
          try {
            res = await fetch(url.toString(), { method: op.method.toUpperCase(), headers, body, signal: ctrl.signal, redirect: "follow" });
          } finally { clearTimeout(timer); }
          const text = (await res.text()).slice(0, MAX_RESP);
          let data: any = text;
          try { data = JSON.parse(text); } catch { /* 非 JSON 就回文字 */ }
          if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, data };
          return { ok: true, data };
        } catch (e: any) {
          return { ok: false, error: e?.name === "AbortError" ? "呼叫逾時" : (e?.message ?? "呼叫失敗") };
        }
      },
    });
  }
  return tools;
}

/** 讀使用者啟用的 OpenAPI 來源、抓 spec、轉成 AgentTool[]（給 orchestrator 併入動態工具）。 */
export async function loadUserOpenApiTools(userId: string): Promise<AgentTool[]> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_openapi_sources")
    .select("id, name, spec_url, base_url, auth_header").eq("user_id", userId).eq("enabled", true);
  const sources = (data ?? []) as OpenApiSource[];
  const out: AgentTool[] = [];
  for (const s of sources) {
    try {
      if (!isSafePublicUrl(s.spec_url)) continue;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      let spec: any;
      try {
        const r = await fetch(s.spec_url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
        spec = await r.json();
      } finally { clearTimeout(timer); }
      out.push(...parseOpenApiToTools(spec, { namespace: s.name, baseUrl: s.base_url, authHeader: s.auth_header }));
    } catch (e: any) { console.warn(`[openapi] ${s.name} 發現工具失敗：`, e?.message); }
  }
  return out;
}
