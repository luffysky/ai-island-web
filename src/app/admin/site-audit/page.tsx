import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { AuditClient } from "./AuditClient";

export const dynamic = "force-dynamic";

export type RouteEntry = {
  path: string;
  file: string;
  type: "page" | "api";
  area: "public" | "auth" | "admin" | "api_public" | "api_admin" | "api_auth";
  is_dynamic: boolean;
};

function scanRoutes(dir: string, urlPrefix = ""): RouteEntry[] {
  const out: RouteEntry[] = [];
  let items: string[];
  try {
    items = readdirSync(dir);
  } catch {
    return [];
  }
  for (const item of items) {
    const full = join(dir, item);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      const isGroup = item.startsWith("(") && item.endsWith(")");
      const isPrivate = item.startsWith("_");
      if (isPrivate) continue;
      const nextPrefix = isGroup ? urlPrefix : `${urlPrefix}/${item}`;
      out.push(...scanRoutes(full, nextPrefix));
    } else if (item === "page.tsx" || item === "page.ts" || item === "page.jsx") {
      out.push(makeEntry(urlPrefix || "/", full, "page"));
    } else if (item === "route.ts" || item === "route.tsx" || item === "route.js") {
      out.push(makeEntry(urlPrefix || "/", full, "api"));
    }
  }
  return out;
}

function makeEntry(urlPattern: string, file: string, type: "page" | "api"): RouteEntry {
  const isDynamic = /\[[^\]]+\]/.test(urlPattern);
  const isApi = urlPattern.startsWith("/api");
  const isAdmin = urlPattern.startsWith("/admin") || urlPattern.startsWith("/api/admin");
  let area: RouteEntry["area"];
  if (isApi) {
    if (isAdmin) area = "api_admin";
    else if (urlPattern.match(/\/(user|me|settings|account)/)) area = "api_auth";
    else area = "api_public";
  } else {
    if (isAdmin) area = "admin";
    else if (urlPattern.match(/^\/(me|settings|account|onboarding|admin)/)) area = "auth";
    else area = "public";
  }
  return {
    path: urlPattern,
    file: file.replace(/.*[\\/]src[\\/]app[\\/]/, "src/app/").replace(/\\/g, "/"),
    type,
    area,
    is_dynamic: isDynamic,
  };
}

export default function AdminSiteAuditPage() {
  const appDir = join(process.cwd(), "src", "app");
  const routes = scanRoutes(appDir);

  const stats = {
    total: routes.length,
    pages: routes.filter((r) => r.type === "page").length,
    apis: routes.filter((r) => r.type === "api").length,
    dynamic: routes.filter((r) => r.is_dynamic).length,
    public: routes.filter((r) => r.area === "public").length,
    admin: routes.filter((r) => r.area === "admin").length,
    api_admin: routes.filter((r) => r.area === "api_admin").length,
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🩺 全站體檢</h1>
        <p className="text-sm text-fg-muted mt-1 leading-relaxed">
          自動掃描全站所有頁面 + API、即時 ping 確認是否回應正常。<br/>
          動態路徑（含 <code className="bg-bg px-1 rounded text-xs">[id]</code>）會跳過、需手動測。
          後台 / API_admin 路徑會回 200 或 401/403（401/403 也算 OK、代表 guard 正常擋未登入）。
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <Stat label="總數" value={stats.total} tone="accent" />
        <Stat label="頁面" value={stats.pages} />
        <Stat label="API" value={stats.apis} />
        <Stat label="公開" value={stats.public} tone="ok" />
        <Stat label="後台" value={stats.admin} tone="warning" />
        <Stat label="API/admin" value={stats.api_admin} tone="warning" />
        <Stat label="動態路徑" value={stats.dynamic} tone="muted" />
      </div>

      <AuditClient routes={routes} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "accent" | "ok" | "warning" | "muted" }) {
  const color =
    tone === "accent" ? "text-accent" :
    tone === "ok" ? "text-green-400" :
    tone === "warning" ? "text-yellow-400" :
    tone === "muted" ? "text-fg-muted" : "text-fg";
  return (
    <div className="rounded-xl bg-bg-card border border-border p-3">
      <div className="text-[10px] text-fg-muted">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
