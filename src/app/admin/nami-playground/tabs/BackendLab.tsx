"use client";

import { useState } from "react";
import { Play, Loader2, Zap, Server, Database, Download, Globe } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { AskAI } from "@/components/nami/AskAI";

type BackendExample = {
  id: string;
  framework: "FastAPI" | "Flask" | "SQLite" | "asyncio";
  icon: any;
  name: string;
  desc: string;
  code: string;
  explain?: string;
};

const EXAMPLES: BackendExample[] = [
  // ============ FastAPI ============
  {
    id: "fastapi-hello",
    framework: "FastAPI",
    icon: Zap,
    name: "FastAPI Hello + path / query 參數",
    desc: "業界最熱門的 Python web framework、async 原生支援",
    code: `# FastAPI 最簡單範例：3 個 endpoint + path/query 參數
# Pyodide 限制：用 httpx.AsyncClient + ASGITransport 走純 ASGI 模擬請求
# 業界正式做法：TestClient(app) (但 TestClient 內部依賴 wasm 跑不順的 sync httpx)
import micropip
await micropip.install(["fastapi==0.99.1", "pydantic<2", "httpx"], keep_going=True)

from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

app = FastAPI(title="Nami's API")

@app.get("/")
def root():
    return {"hello": "world", "tech": "FastAPI"}

@app.get("/users/{user_id}")
def get_user(user_id: int):
    return {"user_id": user_id, "name": f"User {user_id}"}

@app.get("/search")
def search(q: str = "", limit: int = 10):
    return {"query": q, "limit": limit, "results": [f"result_{i}" for i in range(limit)]}

# 用 ASGITransport 走純 ASGI 不開 socket、Pyodide / wasm 都能跑
transport = ASGITransport(app=app)
async with AsyncClient(transport=transport, base_url="http://test") as client:
    # 測試 1: 根 endpoint
    r1 = await client.get("/")
    print(f"GET /  → {r1.status_code}  {r1.json()}")

    # 測試 2: path 參數
    r2 = await client.get("/users/42")
    print(f"GET /users/42  → {r2.status_code}  {r2.json()}")

    # 測試 3: query 參數
    r3 = await client.get("/search?q=python&limit=3")
    print(f"GET /search?q=python  → {r3.status_code}  {r3.json()}")
`,
  },
  {
    id: "fastapi-pydantic",
    framework: "FastAPI",
    icon: Zap,
    name: "Pydantic 資料驗證 + POST 收 body",
    desc: "業界寫 API 必用：型別檢查 + 自動 422 錯誤回應",
    code: `# Pyodide 用 httpx.AsyncClient + ASGITransport 取代 TestClient
import micropip
await micropip.install(["fastapi==0.99.1", "pydantic<2", "httpx"], keep_going=True)

from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI()

# Pydantic schema = 自動驗證 + 自動 OpenAPI doc
class User(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    age: int = Field(..., ge=0, le=120)
    email: str
    bio: Optional[str] = None

@app.post("/users")
def create_user(user: User):
    return {"created": True, "user": user.dict()}  # pydantic v1: .dict() / v2: .model_dump()

transport = ASGITransport(app=app)
async with AsyncClient(transport=transport, base_url="http://test") as client:
    # 1. 正常資料 → 200
    r1 = await client.post("/users", json={
        "name": "Nami",
        "age": 25,
        "email": "nami@example.com",
        "bio": "Loves Python"
    })
    print(f"正常 → {r1.status_code}")
    print(f"  {r1.json()}\\n")

    # 2. age=-5 違反 ge=0 → 422 (自動驗證錯誤)
    r2 = await client.post("/users", json={
        "name": "X",
        "age": -5,
        "email": "x@x.com"
    })
    print(f"age=-5 違反 ge=0 → {r2.status_code}")
    print(f"  錯誤訊息：{r2.json()['detail'][0]['msg']}\\n")

    # 3. 缺欄位 → 422
    r3 = await client.post("/users", json={"name": "X"})
    print(f"缺 age/email → {r3.status_code}")
    print(f"  錯誤訊息：{[e['msg'] for e in r3.json()['detail']]}")
`,
  },
  {
    id: "fastapi-deps",
    framework: "FastAPI",
    icon: Zap,
    name: "Dependency Injection — auth + DB",
    desc: "業界用：複用 auth 邏輯、單元測試容易 mock",
    code: `# Pyodide 用 httpx.AsyncClient + ASGITransport 走純 ASGI
import micropip
await micropip.install(["fastapi==0.99.1", "pydantic<2", "httpx"], keep_going=True)

from fastapi import FastAPI, Depends, HTTPException, Header
from httpx import AsyncClient, ASGITransport
from typing import Annotated

app = FastAPI()

# 模擬 DB
USERS_DB = {
    "tok-abc": {"id": 1, "name": "Alice", "role": "admin"},
    "tok-xyz": {"id": 2, "name": "Bob",   "role": "user"},
}

# Dependency 1: 驗 token 拿 user
def get_current_user(authorization: Annotated[str, Header()] = ""):
    token = authorization.replace("Bearer ", "")
    user = USERS_DB.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="無效的 token")
    return user

# Dependency 2: 確認是 admin
def require_admin(user: Annotated[dict, Depends(get_current_user)]):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要 admin 權限")
    return user

@app.get("/me")
def me(user: Annotated[dict, Depends(get_current_user)]):
    return {"you": user}

@app.delete("/users/{user_id}")
def delete_user(user_id: int, admin: Annotated[dict, Depends(require_admin)]):
    return {"deleted": user_id, "by_admin": admin["name"]}

transport = ASGITransport(app=app)
async with AsyncClient(transport=transport, base_url="http://test") as client:
    # 1. 沒 token → 401
    r1 = await client.get("/me")
    print(f"沒 token → {r1.status_code}  {r1.json()}\\n")

    # 2. admin token → 200
    r2 = await client.get("/me", headers={"Authorization": "Bearer tok-abc"})
    print(f"admin token → {r2.status_code}  {r2.json()}\\n")

    # 3. user 試刪別人 → 403
    r3 = await client.delete("/users/99", headers={"Authorization": "Bearer tok-xyz"})
    print(f"非 admin 試刪 → {r3.status_code}  {r3.json()}\\n")

    # 4. admin 刪 → 200
    r4 = await client.delete("/users/99", headers={"Authorization": "Bearer tok-abc"})
    print(f"admin 刪 → {r4.status_code}  {r4.json()}")
`,
  },

  // ============ Flask ============
  {
    id: "flask-hello",
    framework: "Flask",
    icon: Server,
    name: "Flask 經典 REST + 表單處理",
    desc: "最老牌的 Python web framework、語法直覺",
    code: `import micropip
await micropip.install(["flask"])

from flask import Flask, request, jsonify

app = Flask(__name__)
posts = []  # 模擬 DB

@app.route("/posts", methods=["GET"])
def list_posts():
    return jsonify(posts)

@app.route("/posts", methods=["POST"])
def create_post():
    data = request.get_json()
    if not data or "title" not in data:
        return jsonify({"error": "missing title"}), 400
    post = {"id": len(posts) + 1, **data}
    posts.append(post)
    return jsonify(post), 201

@app.route("/posts/<int:post_id>", methods=["GET"])
def get_post(post_id):
    for p in posts:
        if p["id"] == post_id:
            return jsonify(p)
    return jsonify({"error": "not found"}), 404

# Flask 內建 test_client
with app.test_client() as client:
    # 1. 列出（空）
    r = client.get("/posts")
    print(f"GET /posts (空) → {r.status_code}  {r.get_json()}")

    # 2. 建一篇
    r = client.post("/posts", json={"title": "Hello Flask", "content": "first!"})
    print(f"POST /posts → {r.status_code}  {r.get_json()}")

    # 3. 再建一篇
    r = client.post("/posts", json={"title": "Second"})
    print(f"POST /posts → {r.status_code}  {r.get_json()}")

    # 4. 列出
    r = client.get("/posts")
    print(f"GET /posts → {r.status_code} 共 {len(r.get_json())} 篇")

    # 5. 拿單一
    r = client.get("/posts/1")
    print(f"GET /posts/1 → {r.status_code}  {r.get_json()}")

    # 6. 找不到
    r = client.get("/posts/999")
    print(f"GET /posts/999 → {r.status_code}  {r.get_json()}")
`,
  },

  // ============ SQLite ============
  {
    id: "sqlite-crud",
    framework: "SQLite",
    icon: Database,
    name: "SQLite CRUD (Python 內建)",
    desc: "業界：本地測試 DB / 嵌入式 app / Python 自帶",
    code: `# SQLite 是 Python 內建、不用裝、最常用的學習 / 測試 DB
import sqlite3

# 在記憶體建 DB (不寫檔)
conn = sqlite3.connect(":memory:")
c = conn.cursor()

# CREATE
c.execute("""
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    email TEXT UNIQUE
)
""")
c.execute("CREATE INDEX idx_age ON users(age)")

# INSERT (參數化 防 SQL injection)
users = [
    ("Alice", 28, "alice@ex.com"),
    ("Bob",   35, "bob@ex.com"),
    ("Carol", 24, "carol@ex.com"),
    ("Dave",  41, "dave@ex.com"),
]
c.executemany("INSERT INTO users (name, age, email) VALUES (?, ?, ?)", users)
conn.commit()
print(f"建立 {c.rowcount} 筆\\n")

# SELECT
print("=== 全部 user ===")
for row in c.execute("SELECT id, name, age, email FROM users ORDER BY age"):
    print(f"  {row[0]:>2}. {row[1]:<8} {row[2]:>3}歲  {row[3]}")

# JOIN 範例
c.execute("""
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    product TEXT,
    amount INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
""")
c.executemany("INSERT INTO orders (user_id, product, amount) VALUES (?, ?, ?)", [
    (1, "iPhone", 30000),
    (1, "AirPods", 5000),
    (2, "MacBook", 50000),
    (3, "iPad", 18000),
    (4, "Watch", 12000),
])

print("\\n=== JOIN: 每個 user 的訂單統計 ===")
c.execute("""
    SELECT u.name, COUNT(o.id) AS n_orders, COALESCE(SUM(o.amount), 0) AS total
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id
    ORDER BY total DESC
""")
for row in c:
    print(f"  {row[0]:<8} {row[1]} 筆  NT$ {row[2]:>8,}")

# UPDATE
c.execute("UPDATE users SET age = age + 1 WHERE name = ?", ("Alice",))
conn.commit()

# DELETE
c.execute("DELETE FROM users WHERE age > 40")
conn.commit()

print(f"\\n刪除 age > 40 後剩 {c.execute('SELECT COUNT(*) FROM users').fetchone()[0]} 人")
conn.close()
`,
  },

  // ============ asyncio ============
  {
    id: "asyncio-gather",
    framework: "asyncio",
    icon: Globe,
    name: "asyncio 並行 IO — 同時抓 5 個 API",
    desc: "業界：並行打 API 大幅減少總時間",
    code: `# asyncio 並行：同時抓 5 個 API、總時間 = 最慢的那個、不是相加
import asyncio
import time
import json
from js import fetch, encodeURIComponent

async def fetch_url(name, url):
    t0 = time.time()
    resp = await fetch("/api/admin/playground/scrape?url=" + encodeURIComponent(url))
    data = (await resp.json()).to_py()
    elapsed = (time.time() - t0) * 1000
    return {"name": name, "ms": int(elapsed), "size": data.get("bytes", 0)}

urls = [
    ("HN top",         "https://hacker-news.firebaseio.com/v0/topstories.json"),
    ("Books",          "https://books.toscrape.com"),
    ("Quotes",         "https://quotes.toscrape.com"),
    ("CoinGecko BTC",  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=1"),
    ("Wikipedia",      "https://en.wikipedia.org/api/rest_v1/page/summary/Python"),
]

# 序列版（一個接一個）
print("--- 序列版 ---")
t0 = time.time()
seq_results = []
for name, url in urls:
    r = await fetch_url(name, url)
    seq_results.append(r)
    print(f"  {r['name']:<18} {r['ms']:>5} ms")
print(f"序列總時間: {int((time.time() - t0) * 1000)} ms\\n")

# 並行版（asyncio.gather）
print("--- 並行版 (asyncio.gather) ---")
t0 = time.time()
parallel_results = await asyncio.gather(*[fetch_url(n, u) for n, u in urls])
for r in parallel_results:
    print(f"  {r['name']:<18} {r['ms']:>5} ms")
print(f"並行總時間: {int((time.time() - t0) * 1000)} ms\\n")

print(f"省了 {int((time.time() - t0) * 1000)} ms 對比序列、加速 ~5x")
`,
  },
];

const FRAMEWORK_COLORS: Record<string, string> = {
  FastAPI: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
  Flask: "bg-blue-500/10 border-blue-500/40 text-blue-300",
  SQLite: "bg-orange-500/10 border-orange-500/40 text-orange-300",
  asyncio: "bg-purple-500/10 border-purple-500/40 text-purple-300",
};

export function BackendLab() {
  const { status, progress, error, load, run } = usePyodide();
  const [selected, setSelected] = useState(EXAMPLES[0]);
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [output, setOutput] = useState("");
  const [stderr, setStderr] = useState("");
  const [running, setRunning] = useState(false);
  const [framework, setFramework] = useState<string>("All");

  const filtered = framework === "All" ? EXAMPLES : EXAMPLES.filter((e) => e.framework === framework);

  const pick = (ex: BackendExample) => {
    setSelected(ex);
    setCode(ex.code);
    setOutput("");
    setStderr("");
  };

  const execute = async () => {
    if (running) return;
    setRunning(true);
    setOutput("");
    setStderr("");
    const r = await run(code);
    setOutput(r.stdout);
    setStderr(r.stderr);
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      {/* Framework filter */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-fg-muted">框架：</span>
        {["All", "FastAPI", "Flask", "SQLite", "asyncio"].map((fw) => (
          <button
            key={fw}
            onClick={() => setFramework(fw)}
            className={`px-2.5 py-1 rounded-full border transition ${
              framework === fw
                ? "border-purple-400 bg-purple-500/10 text-purple-300"
                : "border-border text-fg-muted hover:border-purple-400/50"
            }`}
          >
            {fw}
          </button>
        ))}
      </div>

      {/* Example list */}
      <div className="bg-bg-card border border-border rounded-2xl p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map((ex) => {
            const Icon = ex.icon;
            return (
              <button
                key={ex.id}
                onClick={() => pick(ex)}
                className={`text-left p-3 rounded-xl border transition ${
                  selected.id === ex.id
                    ? "border-purple-400 bg-purple-500/10"
                    : "border-border hover:border-purple-400/50 hover:bg-bg-elevated"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${FRAMEWORK_COLORS[ex.framework]}`}>
                    {ex.framework}
                  </span>
                  <Icon size={12} className="text-purple-400" />
                </div>
                <div className="font-bold text-sm">{ex.name}</div>
                <div className="text-[10px] text-fg-muted mt-0.5">{ex.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status + Run */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div>
          {status === "idle" && (
            <button onClick={load} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-900 dark:text-purple-100 border border-purple-500/40 inline-flex items-center gap-1">
              <Download size={11} /> 載入 Python
            </button>
          )}
          {status === "loading" && <span className="text-fg-muted inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {progress}</span>}
          {status === "ready" && <span className="text-emerald-400">● Python ready</span>}
          {status === "error" && <span className="text-red-400">⚠️ {error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <AskAI code={code} error={stderr} lang="python" context={`Backend Lab · ${selected.framework}`} />
          <button
            onClick={execute}
            disabled={running || status !== "ready"}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            跑後端範例
            <span className="text-[9px] opacity-70 ml-1">⌘↵</span>
          </button>
        </div>
      </div>

      {/* Editor + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">
            📝 {selected.framework} 程式碼（隨意改、再 Run）
          </div>
          <CodeEditor value={code} onChange={setCode} onRun={execute} lang="python" storageKey={`backend-${selected.id}`} height="460px" minHeight="460px" />
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">
            💬 模擬請求 / 回應
          </div>
          <div className="flex-1 min-h-[460px] p-3 bg-[#0d1117] overflow-y-auto font-mono text-xs">
            {!output && !stderr && (
              <div className="text-fg-muted/60">
                // FastAPI / Flask 用 <span className="text-emerald-400">TestClient</span> 模擬 HTTP request<br/>
                // 不需要真實 server、直接看 response 結果<br/>
                // 業界寫測試的標準做法
              </div>
            )}
            {output && <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>}
            {stderr && <pre className="whitespace-pre-wrap text-red-400 mt-2">{stderr}</pre>}
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="rounded-xl bg-bg-elevated/30 border border-border p-3 text-[11px] text-fg-muted leading-relaxed">
        <div className="font-bold text-fg mb-1">💡 為什麼用 TestClient 不開真 server？</div>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>瀏覽器內 Pyodide 無法 listen TCP port、所以 FastAPI / Flask 都用 TestClient 模擬 request</li>
          <li><b>業界正式做法</b>：寫 API 必配 TestClient 寫單元測試、CI 跑這些測試</li>
          <li>真實部署：用 <code>uvicorn main:app</code>（FastAPI）/ <code>gunicorn app:app</code>（Flask）開 server</li>
          <li>SQLite 完全 work、可改成 <code>sqlite3.connect(&quot;app.db&quot;)</code> 寫檔（瀏覽器存在 OPFS）</li>
        </ul>
      </div>
    </div>
  );
}
