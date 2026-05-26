"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Loader2, Database, Table, Layers, Cloud, FileText, Send } from "lucide-react";
import { usePyodide } from "@/hooks/usePyodide";
import { CodeEditor, loadEditorValue } from "@/components/ui/CodeEditor";
import { AskAI } from "@/components/nami/AskAI";

type DB = "sqlite" | "postgresql" | "mysql" | "mongodb" | "supabase";

const DB_META: Record<DB, { name: string; icon: any; color: string; live: boolean; lang: "python" | "sql" }> = {
  sqlite:     { name: "SQLite",     icon: Database, color: "text-orange-400", live: true,  lang: "python" },
  postgresql: { name: "PostgreSQL", icon: Layers,   color: "text-blue-400",   live: false, lang: "sql" },
  mysql:      { name: "MySQL",      icon: Table,    color: "text-cyan-400",   live: false, lang: "sql" },
  mongodb:    { name: "MongoDB",    icon: FileText, color: "text-emerald-400", live: true, lang: "python" },
  supabase:   { name: "Supabase",   icon: Cloud,    color: "text-purple-400", live: false, lang: "python" },
};

// ============ SQLite Live (Pyodide 真跑) ============
const SQLITE_EXAMPLES = [
  {
    name: "🚀 CREATE + INSERT + SELECT",
    code: `import sqlite3
conn = sqlite3.connect(":memory:")
c = conn.cursor()

# 建表
c.execute('''CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    age INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)''')

# Insert 多筆 (參數化、防 SQL injection)
users = [
    ("Alice", "alice@ex.com", 25),
    ("Bob",   "bob@ex.com",   30),
    ("Carol", "carol@ex.com", 28),
]
c.executemany("INSERT INTO users (name, email, age) VALUES (?, ?, ?)", users)
conn.commit()

# Select
print("=== 全部 user ===")
for row in c.execute("SELECT id, name, email, age FROM users ORDER BY age"):
    print(f"  {row[0]}. {row[1]:<8} ({row[2]}) - {row[3]}歲")

print(f"\\n共 {c.execute('SELECT COUNT(*) FROM users').fetchone()[0]} 人")
conn.close()`,
  },
  {
    name: "🔗 JOIN + GROUP BY",
    code: `import sqlite3
conn = sqlite3.connect(":memory:")
c = conn.cursor()

# 建兩張表 + FK
c.executescript('''
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT, city TEXT
);
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    product TEXT, amount INTEGER,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
INSERT INTO customers VALUES
    (1, 'Alice', 'TPE'),
    (2, 'Bob',   'KHH'),
    (3, 'Carol', 'TPE');
INSERT INTO orders VALUES
    (1, 1, 'iPhone',  30000),
    (2, 1, 'AirPods',  5000),
    (3, 2, 'MacBook', 50000),
    (4, 3, 'iPad',    18000),
    (5, 1, 'Watch',   12000);
''')

# JOIN：每個 user 的訂單統計
print("=== 客戶訂單分析 ===")
c.execute('''
    SELECT c.name, c.city,
           COUNT(o.id) AS orders,
           COALESCE(SUM(o.amount), 0) AS revenue
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id
    ORDER BY revenue DESC
''')
for row in c:
    print(f"  {row[0]:<8} ({row[1]})  {row[2]} 筆  NT$ {row[3]:>7,}")

# 城市別統計
print("\\n=== 城市別總營收 ===")
c.execute('''
    SELECT c.city, SUM(o.amount) AS total
    FROM customers c JOIN orders o ON o.customer_id = c.id
    GROUP BY c.city ORDER BY total DESC
''')
for row in c:
    print(f"  {row[0]}: NT$ {row[1]:,}")

conn.close()`,
  },
  {
    name: "🪟 Window Functions (進階)",
    code: `# Window functions: ROW_NUMBER / RANK / LAG / LEAD
# 業界做 leaderboard / 比上一期成長 用這套
import sqlite3
conn = sqlite3.connect(":memory:")
c = conn.cursor()

c.executescript('''
CREATE TABLE sales (
    id INTEGER PRIMARY KEY,
    salesperson TEXT,
    month TEXT,
    amount INTEGER
);
INSERT INTO sales (salesperson, month, amount) VALUES
    ('Amy', '2026-01', 50000), ('Amy', '2026-02', 65000), ('Amy', '2026-03', 80000),
    ('Bob', '2026-01', 70000), ('Bob', '2026-02', 60000), ('Bob', '2026-03', 90000),
    ('Cathy', '2026-01', 40000), ('Cathy', '2026-02', 55000), ('Cathy', '2026-03', 70000);
''')

# 每月銷售 Top 1 (用 RANK)
print("=== 每月業務 Top 1 ===")
c.execute('''
    SELECT month, salesperson, amount
    FROM (
        SELECT *, RANK() OVER (PARTITION BY month ORDER BY amount DESC) AS rk
        FROM sales
    )
    WHERE rk = 1
    ORDER BY month
''')
for r in c: print(f"  {r[0]}: {r[1]} (NT$ {r[2]:,})")

# 每人月成長率 (用 LAG)
print("\\n=== 月成長率 ===")
c.execute('''
    SELECT salesperson, month, amount,
           LAG(amount) OVER (PARTITION BY salesperson ORDER BY month) AS prev_month
    FROM sales
    ORDER BY salesperson, month
''')
for r in c:
    if r[3]:
        growth = (r[2] - r[3]) / r[3] * 100
        print(f"  {r[0]} {r[1]}: {r[2]:,} (vs 上月 {growth:+.1f}%)")
    else:
        print(f"  {r[0]} {r[1]}: {r[2]:,} (起始)")

conn.close()`,
  },
];

// ============ PostgreSQL 概念 ============
const POSTGRES_EXAMPLES = [
  {
    name: "📖 進階型別 + JSONB",
    explain: "PostgreSQL 比 MySQL 強的地方：原生 JSONB / Array / 自訂型別 / window function 完整 / partial index。業界做後端必學。",
    code: `-- PostgreSQL 強項：JSONB 欄位 + 自訂查詢
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2),
    tags TEXT[],                  -- 陣列原生支援
    meta JSONB,                   -- JSON 二進位、可索引、可查
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert (JSONB)
INSERT INTO products (name, price, tags, meta) VALUES
    ('iPhone 15', 30000, ARRAY['phone', 'apple'],
     '{"storage": "256GB", "color": "natural", "battery_mah": 3274}'),
    ('AirPods', 5000, ARRAY['audio', 'apple'],
     '{"version": "3rd-gen", "noise_cancellation": true}');

-- JSONB 查詢 (-> 取欄位、->> 取字串、@> 包含)
SELECT name, meta->>'storage' AS storage
FROM products WHERE meta @> '{"color": "natural"}';

-- 陣列查詢 (ANY)
SELECT name FROM products WHERE 'apple' = ANY(tags);

-- 索引 JSONB 欄位
CREATE INDEX idx_meta ON products USING GIN (meta);
-- 索引特定 JSONB key
CREATE INDEX idx_storage ON products ((meta->>'storage'));

-- Window function: 排名
SELECT name, price,
       RANK() OVER (ORDER BY price DESC) AS price_rank,
       LAG(price) OVER (ORDER BY price) AS prev_price
FROM products;`,
  },
  {
    name: "🔒 Row Level Security (RLS)",
    explain: "Supabase / 多租戶 SaaS 必用。policy 直接寫在 DB、確保 user A 拿不到 user B 的資料、不靠應用層擋。",
    code: `-- 開 RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy：user 只能讀自己的 post
CREATE POLICY "posts_own_select" ON posts
    FOR SELECT USING (auth.uid() = user_id);

-- Policy：user 可寫自己的、admin 可改任何
CREATE POLICY "posts_modify" ON posts
    FOR ALL
    USING (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 業界血淚史：FOR ALL policy 必加 WITH CHECK、不然 INSERT 在某些 client 會被擋。`,
  },
  {
    name: "🔍 Full-text Search",
    explain: "PostgreSQL 內建全文搜尋、不用 Elasticsearch 中小型應用足夠。tsvector + GIN index 是組合。",
    code: `-- 加 tsvector 欄位 + 自動同步
ALTER TABLE articles ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION articles_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('chinese', NEW.title || ' ' || COALESCE(NEW.content, ''));
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tr_articles_search
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION articles_search_update();

-- 索引 (GIN = Generalized Inverted Index、全文搜尋專用)
CREATE INDEX idx_search ON articles USING GIN (search_vector);

-- 搜尋
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('chinese', 'AI & 學習') query
WHERE search_vector @@ query
ORDER BY rank DESC LIMIT 10;`,
  },
];

// ============ MySQL 概念 ============
const MYSQL_EXAMPLES = [
  {
    name: "🏗️ InnoDB + Index + EXPLAIN",
    explain: "MySQL 用最廣的引擎是 InnoDB（支援交易 + FK）。索引設計是業界面試必考、EXPLAIN 看查詢計畫。",
    code: `-- 建表 (InnoDB 預設、支援交易 + FK)
CREATE TABLE orders (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10, 2),
    status ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_status (user_id, status),   -- 複合索引
    INDEX idx_created (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 查詢計畫
EXPLAIN SELECT * FROM orders WHERE user_id = 123 AND status = 'paid';
-- 看 key 欄位：應該用到 idx_user_status

-- 交易 (atomic)
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- 失敗就 ROLLBACK`,
  },
  {
    name: "📊 Aggregation + Subquery",
    explain: "業界常見：算每人最近一筆訂單金額、月度報表、Top N。",
    code: `-- 每位 user 最近一筆訂單 (correlated subquery)
SELECT u.username, o.amount, o.created_at
FROM users u
JOIN orders o ON o.id = (
    SELECT id FROM orders WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
)
ORDER BY o.created_at DESC;

-- 月銷售報表
SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    COUNT(*) AS orders,
    SUM(amount) AS revenue,
    AVG(amount) AS avg_order
FROM orders
WHERE status = 'paid' AND created_at >= '2026-01-01'
GROUP BY month
ORDER BY month;

-- 找 7 天內沒下單的 VIP
SELECT u.id, u.username, u.last_login_at
FROM users u
WHERE u.tier = 'vip'
  AND NOT EXISTS (
      SELECT 1 FROM orders
      WHERE user_id = u.id
        AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
  );`,
  },
];

// ============ MongoDB 概念 + 模擬 (用 dict + JSON 模擬) ============
const MONGO_EXAMPLES = [
  {
    name: "📦 CRUD (用 Python dict 模擬)",
    code: `# Pyodide 沒 MongoDB driver、用 dict 模擬 MongoDB 操作
# 真實環境：from pymongo import MongoClient

class MockCollection:
    """模擬 MongoDB Collection"""
    def __init__(self):
        self.docs = []
        self.next_id = 1

    def insert_one(self, doc):
        doc["_id"] = self.next_id
        self.next_id += 1
        self.docs.append(doc)
        return doc["_id"]

    def find(self, query=None, projection=None):
        for d in self.docs:
            if query is None or all(d.get(k) == v for k, v in query.items()):
                if projection:
                    yield {k: d[k] for k in projection if k in d}
                else:
                    yield d

    def update_many(self, query, update):
        n = 0
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                for k, v in update.get("$set", {}).items():
                    d[k] = v
                n += 1
        return n

    def delete_many(self, query):
        before = len(self.docs)
        self.docs = [d for d in self.docs if not all(d.get(k) == v for k, v in query.items())]
        return before - len(self.docs)

users = MockCollection()

# Insert
users.insert_one({"name": "Alice", "age": 25, "tags": ["python", "ml"]})
users.insert_one({"name": "Bob",   "age": 30, "tags": ["go", "k8s"]})
users.insert_one({"name": "Carol", "age": 28, "tags": ["python", "data"]})

# Find all
print("All users:")
for u in users.find():
    print(f"  {u}")

# Find by query
print("\\nAge 28:")
for u in users.find({"age": 28}):
    print(f"  {u}")

# Update
n = users.update_many({"age": 25}, {"$set": {"vip": True}})
print(f"\\nUpdated {n}")

# 真實 MongoDB 語法 (參考):
# client = MongoClient("mongodb://localhost:27017")
# db = client.mydb
# users.find({"age": {"$gte": 25}})       # >= 25
# users.find({"tags": "python"})           # 包含 tag
# users.aggregate([{"$group": {"_id": "$age", "count": {"$sum": 1}}}])
`,
  },
  {
    name: "🔍 Aggregation Pipeline 概念",
    explain: "MongoDB 聚合用 pipeline、跟 SQL 不同。$match (WHERE) → $group → $sort → $project。",
    code: `# MongoDB Aggregation Pipeline (語法展示、Pyodide 不能跑)
# pipeline = [
#     {"$match": {"status": "paid", "created_at": {"$gte": ISODate("2026-01-01")}}},
#     {"$group": {
#         "_id": {"month": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}}},
#         "orders": {"$sum": 1},
#         "revenue": {"$sum": "$amount"},
#         "avg_amount": {"$avg": "$amount"}
#     }},
#     {"$sort": {"_id.month": 1}},
#     {"$project": {
#         "month": "$_id.month",
#         "orders": 1,
#         "revenue": 1,
#         "_id": 0
#     }}
# ]
# result = list(db.orders.aggregate(pipeline))

# 對等的 SQL 寫法：
# SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
#        COUNT(*) AS orders,
#        SUM(amount) AS revenue,
#        AVG(amount) AS avg_amount
# FROM orders
# WHERE status = 'paid' AND created_at >= '2026-01-01'
# GROUP BY month
# ORDER BY month;

print("MongoDB 看 pipeline、SQL 看 query")
print("文件式 vs 關聯式：")
print("  - MongoDB：每筆 doc 自由 schema、適合異質資料 / 日誌")
print("  - SQL：嚴格 schema、適合穩定結構 / 多表 JOIN / 金融交易")
`,
  },
];

// ============ Supabase (用 supabase-js 風格、純展示) ============
const SUPABASE_EXAMPLES = [
  {
    name: "🚀 Supabase JS Client (我們網站用的)",
    explain: "Supabase = Postgres + Auth + Storage + Realtime + Edge Functions。本站後端用這套、Nami 改後端 code 都會用到。",
    code: `// supabase-js client (TypeScript)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// === SELECT ===
const { data, error } = await supabase
  .from("users")
  .select("id, name, email, posts(id, title)")  // 嵌入查詢、自動 JOIN
  .eq("role", "admin")
  .order("created_at", { ascending: false })
  .limit(10);

// === INSERT ===
const { data: newUser } = await supabase
  .from("users")
  .insert({ name: "Nami", email: "nami@example.com" })
  .select()
  .single();

// === UPDATE ===
await supabase
  .from("users")
  .update({ role: "admin" })
  .eq("id", userId);

// === UPSERT (插或改、用 conflict key) ===
await supabase
  .from("user_settings")
  .upsert(
    { user_id: userId, theme: "dark" },
    { onConflict: "user_id" }  // 衝突時 UPDATE 不是 INSERT 新筆
  );

// === RPC (call Postgres function) ===
const { data: stats } = await supabase
  .rpc("get_user_stats", { p_user_id: userId });`,
  },
  {
    name: "🔐 Supabase Auth + RLS",
    explain: "client 拿到的 session 有 JWT、RLS policy 用 auth.uid() 抓 user id、自動隔離資料。",
    code: `// Auth
const { data, error } = await supabase.auth.signUp({
  email: "nami@example.com",
  password: "secure-password",
});

// 拿當前 user
const { data: { user } } = await supabase.auth.getUser();

// 後端 server component：
import { createSupabaseServer } from "@/lib/supabase";
const supabase = await createSupabaseServer();  // 從 cookie 拿 session
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");

// RLS 自動 work：
// 上面 client 的 .from("posts").select() 會自動只回該 user 的 row
// 因為 RLS policy: USING (auth.uid() = user_id)`,
  },
  {
    name: "📡 Realtime + Storage",
    explain: "Supabase Realtime 是 Postgres LISTEN/NOTIFY 包裝、WebSocket 推到 client。Storage 是 S3 風格。",
    code: `// === Realtime: 監聽資料變化 ===
const channel = supabase
  .channel("posts-changes")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "posts" },
    (payload) => {
      console.log("新文章！", payload.new);
      // 觸發 UI 更新 / toast 通知 / etc.
    }
  )
  .subscribe();

// 記得清理
return () => supabase.removeChannel(channel);

// === Storage: 上傳檔案 ===
const file = e.target.files[0];
const { data, error } = await supabase
  .storage
  .from("avatars")
  .upload(\`\${userId}/\${file.name}\`, file, {
    cacheControl: "3600",
    upsert: false,
  });

// 拿公開 URL
const { data: { publicUrl } } = supabase.storage
  .from("avatars")
  .getPublicUrl(\`\${userId}/avatar.png\`);

// === Edge Function (Deno、serverless) ===
const { data, error } = await supabase.functions.invoke("send-email", {
  body: { to: "user@example.com", subject: "Hi" },
});`,
  },
];

const EXAMPLES_BY_DB = {
  sqlite: SQLITE_EXAMPLES,
  postgresql: POSTGRES_EXAMPLES,
  mysql: MYSQL_EXAMPLES,
  mongodb: MONGO_EXAMPLES,
  supabase: SUPABASE_EXAMPLES,
};

export function DatabaseLab() {
  const [db, setDb] = useState<DB>("sqlite");
  return (
    <div className="space-y-3">
      {/* DB tabs */}
      <div className="flex gap-1.5 bg-bg-card border border-border rounded-2xl p-1.5 overflow-x-auto">
        {(Object.keys(DB_META) as DB[]).map((k) => {
          const meta = DB_META[k];
          const Icon = meta.icon;
          const active = db === k;
          return (
            <button
              key={k}
              onClick={() => setDb(k)}
              className={`relative flex-1 min-w-fit px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition ${
                active
                  ? "text-black bg-gradient-to-r from-orange-400 to-purple-400"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="db-tab-bg"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-400 via-cyan-400 to-purple-400"
                  transition={{ duration: 0.2 }}
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                <Icon size={13} /> {meta.name}
                {meta.live && <span className="text-[8px] px-1 rounded bg-emerald-500/30 text-emerald-200">LIVE</span>}
              </span>
            </button>
          );
        })}
      </div>

      <DbContent db={db} />
    </div>
  );
}

function DbContent({ db }: { db: DB }) {
  const meta = DB_META[db];
  const examples = EXAMPLES_BY_DB[db];
  const [exampleIdx, setExampleIdx] = useState(0);
  const ex = examples[exampleIdx];

  // SQLite 跟 MongoDB 都用 Pyodide 跑 (Python code)
  const live = meta.live;
  const { status, progress, error, load, run } = usePyodide();
  const [code, setCode] = useState(() => loadEditorValue(`db-${db}-${exampleIdx}`, (ex as any).code));
  const [output, setOutput] = useState("");
  const [stderr, setStderr] = useState("");
  const [running, setRunning] = useState(false);

  const pickExample = (i: number) => {
    setExampleIdx(i);
    setCode((examples[i] as any).code);
    setOutput("");
    setStderr("");
  };

  const execute = async () => {
    if (!live || running) return;
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
      {/* Example picker */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-fg-muted">範例：</span>
        {examples.map((e: any, i) => (
          <button
            key={e.name}
            onClick={() => pickExample(i)}
            className={`px-2.5 py-1 rounded-full border transition ${
              exampleIdx === i
                ? "border-purple-400 bg-purple-500/10 text-purple-300"
                : "border-border text-fg-muted hover:border-purple-400/50"
            }`}
          >
            {e.name}
          </button>
        ))}
      </div>

      {/* Explain (若有) */}
      {(ex as any).explain && (
        <div className="bg-purple-500/5 border border-purple-500/30 rounded-xl p-3 text-sm">
          <div className="font-bold text-purple-300 mb-1 inline-flex items-center gap-1">
            <Send size={11} /> 概念
          </div>
          <p className="text-fg-muted leading-relaxed">{(ex as any).explain}</p>
        </div>
      )}

      {/* Live / readonly status */}
      {!live && (
        <div className="bg-bg-elevated/40 border border-border rounded-xl p-3 text-xs text-fg-muted">
          💡 {meta.name} 在瀏覽器 sandbox 跑不了（需要 server）、這裡只展示語法 + 業界用法。
          實際跑要連你本機 / 雲端 DB。
        </div>
      )}
      {live && (
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div>
            {status === "ready" && <span className="text-emerald-400">● Python ready · {meta.name} live</span>}
            {status === "loading" && <span className="text-fg-muted inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {progress}</span>}
            {status === "idle" && <button onClick={load} className="px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/40">載入 Python</button>}
          </div>
          <div className="flex items-center gap-2">
            <AskAI code={code} error={stderr} lang="python" context={`Database Lab · ${meta.name}`} />
            <button
              onClick={execute}
              disabled={running || status !== "ready"}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-400 to-purple-400 text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
            >
              {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              跑 SQL
            </button>
          </div>
        </div>
      )}

      {/* Editor + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted inline-flex items-center gap-1">
            <meta.icon size={11} className={meta.color} />
            {meta.name} · {live ? "可改可跑" : "唯讀展示"}
          </div>
          <CodeEditor
            value={code}
            onChange={live ? setCode : () => {}}
            onRun={live ? execute : undefined}
            lang={meta.lang}
            storageKey={live ? `db-${db}-${exampleIdx}` : undefined}
            height="480px"
            minHeight="480px"
            readOnly={!live}
          />
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">
            {live ? "💬 query 結果" : "📖 業界提示"}
          </div>
          <div className="flex-1 min-h-[480px] p-3 bg-[#0d1117] overflow-y-auto font-mono text-xs">
            {live && (
              <>
                {output && <pre className="whitespace-pre-wrap text-[#e6edf3]">{output}</pre>}
                {stderr && <pre className="whitespace-pre-wrap text-red-400 mt-2">{stderr}</pre>}
                {!output && !stderr && <span className="text-fg-muted/60">// 改 code、點「跑 SQL」</span>}
              </>
            )}
            {!live && (
              <div className="text-xs text-fg leading-relaxed space-y-2 font-sans">
                <p className="font-bold text-purple-300">🔧 怎麼在你本機跑：</p>
                {db === "postgresql" && (
                  <div className="space-y-1.5">
                    <p>1. <code className="bg-bg-elevated px-1 rounded text-emerald-300">docker run --name pg -e POSTGRES_PASSWORD=pass -p 5432:5432 -d postgres</code></p>
                    <p>2. <code className="bg-bg-elevated px-1 rounded text-emerald-300">psql -h localhost -U postgres</code> 進 shell</p>
                    <p>3. 貼左邊 SQL、按 Enter</p>
                    <p>4. Python 連線：<code className="bg-bg-elevated px-1 rounded text-emerald-300">psycopg2.connect(...)</code></p>
                  </div>
                )}
                {db === "mysql" && (
                  <div className="space-y-1.5">
                    <p>1. <code className="bg-bg-elevated px-1 rounded text-cyan-300">docker run --name mysql -e MYSQL_ROOT_PASSWORD=pass -p 3306:3306 -d mysql:8</code></p>
                    <p>2. <code className="bg-bg-elevated px-1 rounded text-cyan-300">mysql -h 127.0.0.1 -u root -p</code></p>
                    <p>3. Python 連線：<code className="bg-bg-elevated px-1 rounded text-cyan-300">PyMySQL</code> 或 <code className="bg-bg-elevated px-1 rounded text-cyan-300">mysql-connector-python</code></p>
                  </div>
                )}
                {db === "supabase" && (
                  <div className="space-y-1.5">
                    <p>1. 到 <a href="https://supabase.com" target="_blank" className="text-accent underline">supabase.com</a> 開帳號（免費）</p>
                    <p>2. Create Project → 拿 URL + anon key</p>
                    <p>3. 在你 Next.js 專案 <code className="bg-bg-elevated px-1 rounded text-purple-300">npm i @supabase/supabase-js</code></p>
                    <p>4. 用左邊 code 寫 query</p>
                    <p className="text-fg-muted">本站後端就是 Supabase！打開 <code className="bg-bg-elevated px-1 rounded text-purple-300">/admin/db-check</code> 看實際 schema</p>
                  </div>
                )}
                {db === "mongodb" && (
                  <div className="space-y-1.5">
                    <p>1. <code className="bg-bg-elevated px-1 rounded text-emerald-300">docker run --name mongo -p 27017:27017 -d mongo</code></p>
                    <p>2. <code className="bg-bg-elevated px-1 rounded text-emerald-300">mongosh</code> 進 shell</p>
                    <p>3. Python 連線：<code className="bg-bg-elevated px-1 rounded text-emerald-300">pip install pymongo</code></p>
                    <p>4. 或用 MongoDB Atlas (雲端、免費 tier)</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 業界 tip */}
      <div className="rounded-xl bg-bg-elevated/30 border border-border p-3 text-[11px] text-fg-muted leading-relaxed">
        <div className="font-bold text-fg mb-1">💡 業界選 DB 思路</div>
        <ul className="space-y-0.5 list-disc list-inside">
          <li><b className="text-fg">SQLite</b>：開發測試、小型 app、嵌入式（手機 app、Electron）</li>
          <li><b className="text-fg">PostgreSQL</b>：90% 業界選擇、有 JSONB / RLS / 全文搜尋、Supabase 底層</li>
          <li><b className="text-fg">MySQL</b>：老牌、穩定、雲端代管多、適合電商交易系統</li>
          <li><b className="text-fg">MongoDB</b>：日誌 / 異質 doc / 高寫入、不適合 join 多的場景</li>
          <li><b className="text-fg">Supabase</b>：本站用的 BaaS、Postgres 包好 Auth + Realtime + Storage</li>
        </ul>
      </div>
    </div>
  );
}
