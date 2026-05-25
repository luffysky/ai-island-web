"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, RefreshCw, Code2, Atom, Server, Box, Zap, Globe } from "lucide-react";
import { CodeEditor, loadEditorValue } from "@/components/ui/CodeEditor";

type FW = "react" | "vue" | "next" | "nest";

const FW_META = {
  react: { label: "React", icon: Atom, color: "text-cyan-400", lang: "jsx" as const },
  vue: { label: "Vue 3", icon: Box, color: "text-emerald-400", lang: "javascript" as const },
  next: { label: "Next.js", icon: Zap, color: "text-fg", lang: "tsx" as const },
  nest: { label: "NestJS", icon: Server, color: "text-red-400", lang: "typescript" as const },
};

// ============ React Examples (live preview via Babel CDN) ============
const REACT_EXAMPLES = [
  {
    name: "🧮 Counter Hook",
    code: `function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <div style={{padding:24, textAlign:"center", fontFamily:"sans-serif"}}>
      <h1 style={{color:"#22d3ee"}}>計數器：{count}</h1>
      <button onClick={() => setCount(count + 1)} style={btnStyle}>+1</button>
      <button onClick={() => setCount(0)} style={{...btnStyle, background:"#374151"}}>重設</button>
    </div>
  );
}
const btnStyle = {margin:8,padding:"8px 16px",fontSize:16,background:"#06b6d4",color:"white",border:0,borderRadius:8,cursor:"pointer"};
ReactDOM.createRoot(document.getElementById("root")).render(<Counter />);`,
  },
  {
    name: "📝 Todo + useReducer",
    code: `function reducer(state, action) {
  switch (action.type) {
    case "ADD": return [...state, {id: Date.now(), text: action.text, done: false}];
    case "TOGGLE": return state.map(t => t.id === action.id ? {...t, done: !t.done} : t);
    case "DEL": return state.filter(t => t.id !== action.id);
    default: return state;
  }
}

function TodoApp() {
  const [todos, dispatch] = React.useReducer(reducer, []);
  const [text, setText] = React.useState("");
  return (
    <div style={{maxWidth:400, margin:"40px auto", fontFamily:"sans-serif"}}>
      <h2>📋 Todo</h2>
      <div style={{display:"flex",gap:8}}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="新任務" style={{flex:1,padding:8}} />
        <button onClick={() => { if(text.trim()) { dispatch({type:"ADD",text}); setText(""); } }}>+</button>
      </div>
      <ul>
        {todos.map(t => (
          <li key={t.id} style={{listStyle:"none",padding:8,display:"flex",gap:8,alignItems:"center"}}>
            <input type="checkbox" checked={t.done} onChange={() => dispatch({type:"TOGGLE",id:t.id})} />
            <span style={{flex:1,textDecoration:t.done?"line-through":"none"}}>{t.text}</span>
            <button onClick={() => dispatch({type:"DEL",id:t.id})}>✕</button>
          </li>
        ))}
      </ul>
      <p style={{color:"#888",fontSize:12}}>{todos.filter(t=>!t.done).length} 未完成</p>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<TodoApp />);`,
  },
  {
    name: "🌐 useEffect + fetch",
    code: `function PostList() {
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    fetch("https://jsonplaceholder.typicode.com/posts?_limit=5")
      .then(r => r.json())
      .then(d => { setPosts(d); setLoading(false); });
  }, []);
  if (loading) return <p>載入中...</p>;
  return (
    <div style={{maxWidth:600, margin:"24px auto", fontFamily:"sans-serif"}}>
      <h2>最新文章</h2>
      {posts.map(p => (
        <article key={p.id} style={{padding:12,background:"#f5f5f5",margin:"8px 0",borderRadius:8}}>
          <h3 style={{margin:"0 0 6px"}}>{p.title}</h3>
          <p style={{margin:0,fontSize:13,color:"#555"}}>{p.body.slice(0,80)}...</p>
        </article>
      ))}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<PostList />);`,
  },
];

// ============ Vue Examples (live preview via Vue CDN) ============
const VUE_EXAMPLES = [
  {
    name: "🧮 Vue Counter",
    code: `const { createApp, ref } = Vue;

createApp({
  setup() {
    const count = ref(0);
    const increment = () => count.value++;
    const reset = () => count.value = 0;
    return { count, increment, reset };
  },
  template: \`
    <div style="padding:24px;text-align:center;font-family:sans-serif">
      <h1 style="color:#10b981">Vue 計數器：{{ count }}</h1>
      <button @click="increment" style="margin:8px;padding:8px 16px;background:#10b981;color:white;border:0;border-radius:8px;cursor:pointer">+1</button>
      <button @click="reset" style="margin:8px;padding:8px 16px;background:#374151;color:white;border:0;border-radius:8px;cursor:pointer">重設</button>
    </div>
  \`
}).mount("#app");`,
  },
  {
    name: "📝 Vue Todo (computed)",
    code: `const { createApp, ref, computed } = Vue;

createApp({
  setup() {
    const todos = ref([]);
    const text = ref("");
    const add = () => {
      if (text.value.trim()) {
        todos.value.push({ id: Date.now(), text: text.value, done: false });
        text.value = "";
      }
    };
    const remaining = computed(() => todos.value.filter(t => !t.done).length);
    return { todos, text, add, remaining };
  },
  template: \`
    <div style="max-width:400px;margin:40px auto;font-family:sans-serif">
      <h2>📋 Vue Todo</h2>
      <div style="display:flex;gap:8px">
        <input v-model="text" @keyup.enter="add" placeholder="新任務" style="flex:1;padding:8px">
        <button @click="add">+</button>
      </div>
      <ul style="list-style:none;padding:0;margin-top:12px">
        <li v-for="t in todos" :key="t.id" style="padding:8px;display:flex;gap:8px;align-items:center">
          <input type="checkbox" v-model="t.done">
          <span :style="{flex:1,textDecoration:t.done?'line-through':'none'}">{{ t.text }}</span>
        </li>
      </ul>
      <p style="color:#888;font-size:12px">{{ remaining }} 未完成</p>
    </div>
  \`
}).mount("#app");`,
  },
  {
    name: "🌐 Vue Composition + fetch",
    code: `const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const posts = ref([]);
    const loading = ref(true);
    onMounted(async () => {
      const r = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
      posts.value = await r.json();
      loading.value = false;
    });
    return { posts, loading };
  },
  template: \`
    <div style="max-width:600px;margin:24px auto;font-family:sans-serif">
      <h2>Vue 抓 API</h2>
      <p v-if="loading">載入中...</p>
      <article v-for="p in posts" :key="p.id" style="padding:12px;background:#f5f5f5;margin:8px 0;border-radius:8px">
        <h3 style="margin:0 0 6px">{{ p.title }}</h3>
        <p style="margin:0;font-size:13px;color:#555">{{ p.body.slice(0, 80) }}...</p>
      </article>
    </div>
  \`
}).mount("#app");`,
  },
];

// ============ Next.js Examples (concept + code、不 live、SSR 跑不了) ============
const NEXT_EXAMPLES = [
  {
    name: "📄 App Router page",
    code: `// app/page.tsx — Next.js 15 App Router 首頁
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">歡迎來到 AI 島</h1>
      <Link href="/chapters" className="text-blue-500 hover:underline">
        查看章節 →
      </Link>
    </main>
  );
}

// 自動：SSR、SEO、code splitting
// 路徑：app/page.tsx → /
// 路徑：app/chapters/page.tsx → /chapters`,
    explain: "Next.js App Router 是 file-system based routing。`app/` 內每個 page.tsx 就是一個路由。Server Component 預設、可選 'use client' 變 client。",
  },
  {
    name: "🌐 Server Action",
    code: `// app/posts/actions.ts
"use server";
import { createSupabaseServer } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const supabase = await createSupabaseServer();
  await supabase.from("posts").insert({ title });
  revalidatePath("/posts");  // 自動 invalidate cache
}

// app/posts/new/page.tsx
import { createPost } from "../actions";

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <button type="submit">建立</button>
    </form>
  );
}`,
    explain: "Server Action 是 Next.js 14+ 的功能、直接在 form action 寫後端 function、不用建 API endpoint。",
  },
  {
    name: "📡 API Route",
    code: `// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 用 supabase / Prisma 查 DB
  const user = { id, name: "Alice" };
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  // 更新 DB
  return NextResponse.json({ ok: true });
}`,
    explain: "Next.js 15 API Route 用 file-system routing。`route.ts` 內 export GET / POST / PATCH / DELETE function 就是不同 method。",
  },
];

// ============ NestJS Examples ============
const NEST_EXAMPLES = [
  {
    name: "🎮 Controller + Service",
    code: `// src/users/users.controller.ts
import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.users.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }
}

// src/users/users.service.ts
import { Injectable } from "@nestjs/common";

@Injectable()
export class UsersService {
  private users = [{id: 1, name: "Alice"}];
  findAll() { return this.users; }
  findOne(id: number) { return this.users.find(u => u.id === id); }
  create(dto: any) { const u = {id: Date.now(), ...dto}; this.users.push(u); return u; }
}`,
    explain: "NestJS 用 decorator 跟 Angular 風格的 DI。Controller 接 request、Service 做 business logic、各自單檔解耦。",
  },
  {
    name: "🔐 Auth Guard + JWT",
    code: `// src/auth/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException();
    const token = auth.slice(7);
    try {
      const payload = await this.jwt.verifyAsync(token);
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}

// 使用：
@Get("me")
@UseGuards(JwtAuthGuard)
getMe(@Req() req) {
  return req.user;
}`,
    explain: "NestJS Guard 在 Controller method 前面執行、可擋下未授權 request。比手寫 middleware 更模組化。",
  },
  {
    name: "🗄️ TypeORM + Repository",
    code: `// src/posts/post.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column("text", { default: "" })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}

// src/posts/posts.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Post } from "./post.entity";

@Injectable()
export class PostsService {
  constructor(@InjectRepository(Post) private posts: Repository<Post>) {}

  findAll() { return this.posts.find(); }
  findOne(id: number) { return this.posts.findOneBy({ id }); }
  create(data: Partial<Post>) { return this.posts.save(data); }
}`,
    explain: "NestJS 跟 TypeORM 整合最常見、@Entity 定義表、@InjectRepository 拿 repo、不用手寫 SQL。",
  },
];

export function FrameworkLab() {
  const [fw, setFw] = useState<FW>("react");
  return (
    <div className="space-y-3">
      <div className="flex gap-2 bg-bg-card border border-border rounded-2xl p-1.5 overflow-x-auto">
        {(Object.keys(FW_META) as FW[]).map((k) => {
          const meta = FW_META[k];
          const Icon = meta.icon;
          const active = fw === k;
          return (
            <button
              key={k}
              onClick={() => setFw(k)}
              className={`relative flex-1 min-w-fit px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition ${
                active ? "text-black" : "text-fg-muted hover:text-fg"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="fw-tab-bg"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400"
                  transition={{ duration: 0.2 }}
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                <Icon size={13} /> {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {fw === "react" && <ReactLive />}
      {fw === "vue" && <VueLive />}
      {fw === "next" && <ConceptOnly framework="Next.js" examples={NEXT_EXAMPLES} lang="tsx" />}
      {fw === "nest" && <ConceptOnly framework="NestJS" examples={NEST_EXAMPLES} lang="typescript" />}
    </div>
  );
}

function ReactLive() {
  const [example, setExample] = useState(REACT_EXAMPLES[0]);
  const [code, setCode] = useState(() => loadEditorValue("react-code", REACT_EXAMPLES[0].code));
  const [iframeKey, setIframeKey] = useState(0);
  const [auto, setAuto] = useState(true);

  const srcDoc = useMemo(() => `<!doctype html>
<html><head><meta charset="utf-8"><style>body{margin:0;background:#0d1117;color:#e6edf3}</style></head>
<body>
<div id="root"></div>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
<script type="text/babel" data-presets="react">
try {
${code}
} catch (e) {
  document.body.innerHTML = '<pre style="color:#f87171;padding:16px;background:#0d1117">' + e.message + '\\n' + e.stack + '</pre>';
}
</script>
</body></html>`, [code, iframeKey]);

  const pick = (ex: typeof REACT_EXAMPLES[number]) => {
    setExample(ex);
    setCode(ex.code);
    setIframeKey(k => k + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-fg-muted">範例：</span>
        {REACT_EXAMPLES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => pick(ex)}
            className={`px-2.5 py-1 rounded-full border transition ${
              example.name === ex.name
                ? "border-cyan-400 bg-cyan-500/10 text-cyan-300"
                : "border-border text-fg-muted hover:border-cyan-400/50"
            }`}
          >
            {ex.name}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} className="accent-accent" />
          邊改邊預覽
        </label>
        {!auto && (
          <button onClick={() => setIframeKey(k => k + 1)} className="px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-bold inline-flex items-center gap-1">
            <Play size={11} /> 重跑
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">⚛️ React JSX (Babel 即時編譯)</div>
          <CodeEditor
            value={code}
            onChange={(v) => { setCode(v); if (auto) setIframeKey(k => k + 1); }}
            lang="jsx"
            storageKey="react-code"
            height="500px"
            minHeight="500px"
          />
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">🖥️ 即時預覽</div>
          <iframe key={iframeKey} srcDoc={srcDoc} sandbox="allow-scripts allow-modals" className="w-full h-full border-0 bg-white" style={{ minHeight: 500 }} />
        </div>
      </div>
    </div>
  );
}

function VueLive() {
  const [example, setExample] = useState(VUE_EXAMPLES[0]);
  const [code, setCode] = useState(() => loadEditorValue("vue-code", VUE_EXAMPLES[0].code));
  const [iframeKey, setIframeKey] = useState(0);
  const [auto, setAuto] = useState(true);

  const srcDoc = useMemo(() => `<!doctype html>
<html><head><meta charset="utf-8"><style>body{margin:0;background:#0d1117;color:#e6edf3}</style></head>
<body>
<div id="app"></div>
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<script>
try {
${code}
} catch (e) {
  document.body.innerHTML = '<pre style="color:#f87171;padding:16px;background:#0d1117">' + e.message + '\\n' + e.stack + '</pre>';
}
</script>
</body></html>`, [code, iframeKey]);

  const pick = (ex: typeof VUE_EXAMPLES[number]) => {
    setExample(ex);
    setCode(ex.code);
    setIframeKey(k => k + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-fg-muted">範例：</span>
        {VUE_EXAMPLES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => pick(ex)}
            className={`px-2.5 py-1 rounded-full border transition ${
              example.name === ex.name
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-border text-fg-muted hover:border-emerald-400/50"
            }`}
          >
            {ex.name}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} className="accent-accent" />
          邊改邊預覽
        </label>
        {!auto && (
          <button onClick={() => setIframeKey(k => k + 1)} className="px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-bold inline-flex items-center gap-1">
            <Play size={11} /> 重跑
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">🟢 Vue 3 (CDN、Composition API)</div>
          <CodeEditor
            value={code}
            onChange={(v) => { setCode(v); if (auto) setIframeKey(k => k + 1); }}
            lang="javascript"
            storageKey="vue-code"
            height="500px"
            minHeight="500px"
          />
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">🖥️ 即時預覽</div>
          <iframe key={iframeKey} srcDoc={srcDoc} sandbox="allow-scripts allow-modals" className="w-full h-full border-0 bg-white" style={{ minHeight: 500 }} />
        </div>
      </div>
    </div>
  );
}

function ConceptOnly({ framework, examples, lang }: { framework: string; examples: any[]; lang: any }) {
  const [example, setExample] = useState(examples[0]);
  return (
    <div className="space-y-3">
      <div className="bg-bg-elevated/40 border border-border rounded-xl p-3 text-xs text-fg-muted leading-relaxed">
        💡 {framework} 在瀏覽器 sandbox 裡跑不了（需要 Node.js runtime / SSR）、這裡提供 <b className="text-fg">code + 解說</b> 模式。
        可在編輯器內改、看語法和結構。實際跑要在你的本機 / 部署環境。
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-fg-muted">範例：</span>
        {examples.map((ex) => (
          <button
            key={ex.name}
            onClick={() => setExample(ex)}
            className={`px-2.5 py-1 rounded-full border transition ${
              example.name === ex.name
                ? "border-purple-400 bg-purple-500/10 text-purple-300"
                : "border-border text-fg-muted hover:border-purple-400/50"
            }`}
          >
            {ex.name}
          </button>
        ))}
      </div>

      <div className="bg-purple-500/5 border border-purple-500/30 rounded-xl p-3 text-sm leading-relaxed">
        <div className="font-bold text-purple-300 mb-1">📖 概念</div>
        {example.explain}
      </div>

      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-bg-elevated text-xs font-mono text-fg-muted">
          📝 {framework} 程式碼
        </div>
        <CodeEditor value={example.code} onChange={() => {}} lang={lang} height="500px" minHeight="500px" readOnly />
      </div>
    </div>
  );
}
