import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DebugMiddlewarePage() {
  const h = await headers();
  const slug = process.env.ADMIN_SLUG || "(not set, using fallback)";
  const publicSlug = process.env.NEXT_PUBLIC_ADMIN_SLUG || "(not set)";

  return (
    <div style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Middleware Debug</h1>

      <h2>環境變數</h2>
      <pre style={{ background: "#222", padding: 12, borderRadius: 6 }}>
        ADMIN_SLUG = {slug.length > 0 ? `${slug.slice(0, 3)}...${slug.slice(-3)} (len=${slug.length})` : "(empty)"}
        {"\n"}
        NEXT_PUBLIC_ADMIN_SLUG = {publicSlug.length > 0 ? `${publicSlug.slice(0, 3)}...${publicSlug.slice(-3)} (len=${publicSlug.length})` : "(empty)"}
      </pre>

      <h2>Middleware Headers</h2>
      <pre style={{ background: "#222", padding: 12, borderRadius: 6 }}>
        x-mw-rewrite = {h.get("x-mw-rewrite") || "(none)"}
        {"\n"}
        x-mw-block = {h.get("x-mw-block") || "(none)"}
        {"\n"}
        x-mw-pass = {h.get("x-mw-pass") || "(none)"}
      </pre>

      <h2>建議測試 URL</h2>
      <ul>
        <li>
          <a href={`/${slug}/admin`}>/{slug}/admin</a> (應該 rewrite 到 /admin)
        </li>
        <li>
          <a href="/admin">/admin</a> (應該被擋成 404)
        </li>
      </ul>

      <p style={{ color: "#888", marginTop: 20 }}>
        如果 x-mw-pass 顯示 (none)、表示 middleware 沒跑、deploy 沒含到新 middleware
        <br />
        如果 ADMIN_SLUG 顯示 (not set)、Zeabur env 沒設好
      </p>
    </div>
  );
}
