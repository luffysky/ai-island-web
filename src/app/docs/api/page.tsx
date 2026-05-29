import Link from "next/link";

export const metadata = {
  title: "📖 API 文件 · AI 島",
  description: "用 aii_xxx API key 在你 app 呼叫雪鑰 — POST /api/v1/chat",
};

export default function ApiDocsPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📖 AI 島 API 文件</h1>
        <p className="text-sm text-fg-muted">
          用 aii_xxx API key 在你自己的 app 呼叫雪鑰、每 key 每月 100 calls free
        </p>
      </header>

      <section className="bg-bg-card border border-border rounded-xl p-5 mb-4">
        <h2 className="font-bold text-xl mb-2">🔑 拿 API Key</h2>
        <p className="text-sm mb-3">
          登入後到 <Link href="/me/api-keys" className="text-accent hover:underline">/me/api-keys</Link> 生成 key、
          長這樣：<code className="bg-bg px-2 py-0.5 rounded text-xs">aii_abc123xxx</code>
        </p>
        <p className="text-xs text-fg-muted">⚠️ Key 只在建立當下顯示一次、立刻複製存好、之後拿不到。</p>
      </section>

      <section className="bg-bg-card border border-border rounded-xl p-5 mb-4">
        <h2 className="font-bold text-xl mb-3">💬 POST /api/v1/chat</h2>
        <p className="text-sm mb-3">送一段對話、雪鑰回應。</p>

        <h3 className="font-semibold mb-2">Request</h3>
        <pre className="bg-bg-elevated rounded p-3 text-xs overflow-x-auto mb-3"><code>{`POST https://ai-island-web.snowrealm.pet/api/v1/chat
Authorization: Bearer aii_xxxxxxxxxxxx
Content-Type: application/json

{
  "messages": [
    { "role": "system", "content": "你是有耐心的程式導師" },
    { "role": "user", "content": "解釋 closure" }
  ],
  "temperature": 0.7,
  "max_tokens": 800
}`}</code></pre>

        <h3 className="font-semibold mb-2">Response (200)</h3>
        <pre className="bg-bg-elevated rounded p-3 text-xs overflow-x-auto mb-3"><code>{`{
  "ok": true,
  "reply": "Closure 就是...",
  "model": "claude-haiku-4-5-20251001",
  "usage": { "used": 5, "quota": 100 }
}`}</code></pre>

        <h3 className="font-semibold mb-2">錯誤碼</h3>
        <ul className="text-sm space-y-1 list-disc ml-5">
          <li><code className="bg-bg px-1.5 py-0.5 rounded text-xs">401</code> 沒帶 / 格式錯 Authorization header</li>
          <li><code className="bg-bg px-1.5 py-0.5 rounded text-xs">401</code> invalid api key（key 錯或不存在）</li>
          <li><code className="bg-bg px-1.5 py-0.5 rounded text-xs">403</code> key 已停用</li>
          <li><code className="bg-bg px-1.5 py-0.5 rounded text-xs">429</code> 本月 quota 已用完（next month auto reset）</li>
          <li><code className="bg-bg px-1.5 py-0.5 rounded text-xs">503</code> 後端 AI provider 暫時不可用</li>
        </ul>
      </section>

      <section className="bg-bg-card border border-border rounded-xl p-5 mb-4">
        <h2 className="font-bold text-xl mb-3">📦 Code 範例</h2>

        <h3 className="font-semibold mb-2">JavaScript / fetch</h3>
        <pre className="bg-bg-elevated rounded p-3 text-xs overflow-x-auto mb-4"><code>{`const res = await fetch("https://ai-island-web.snowrealm.pet/api/v1/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer aii_xxxxxxxxxxxx",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "嗨" }]
  })
});
const j = await res.json();
console.log(j.reply);`}</code></pre>

        <h3 className="font-semibold mb-2">Python / requests</h3>
        <pre className="bg-bg-elevated rounded p-3 text-xs overflow-x-auto mb-4"><code>{`import requests

r = requests.post(
    "https://ai-island-web.snowrealm.pet/api/v1/chat",
    headers={"Authorization": "Bearer aii_xxxxxxxxxxxx"},
    json={"messages": [{"role": "user", "content": "嗨"}]}
)
print(r.json()["reply"])`}</code></pre>

        <h3 className="font-semibold mb-2">curl</h3>
        <pre className="bg-bg-elevated rounded p-3 text-xs overflow-x-auto"><code>{`curl -X POST https://ai-island-web.snowrealm.pet/api/v1/chat \\
  -H "Authorization: Bearer aii_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"嗨"}]}'`}</code></pre>
      </section>

      <section className="bg-bg-card border border-border rounded-xl p-5">
        <h2 className="font-bold text-xl mb-3">💰 Pricing</h2>
        <ul className="text-sm space-y-2">
          <li><strong>Free tier</strong>：每 key 每月 100 calls、用完隔月 reset</li>
          <li><strong>Pro (即將開放)</strong>：1000 calls / 月、不會跳 429、SLA 99.9%</li>
          <li><strong>Enterprise</strong>：客製 quota / SLA / Webhook / 月結、聯絡 luffysky00@gmail.com</li>
        </ul>
      </section>
    </div>
  );
}
