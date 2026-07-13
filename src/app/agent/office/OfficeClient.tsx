"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Laptop, LaptopMinimal, ArrowRight, Store, ChevronLeft, Sparkles, CheckCircle2, Loader2, Clock, XCircle } from "lucide-react";

interface SkillItem { id: string; name: string; description?: string; emoji: string; category: string; is_builtin: boolean; installed: boolean; }
interface DeviceItem { id: string; name: string; platform: string; online: boolean; last_seen_at?: string | null; }
interface TaskItem { id: string; goal: string; status: string; step_count: number; created_at: string; }

const STATUS: Record<string, { label: string; cls: string; Icon: any }> = {
  planning: { label: "規劃中", cls: "text-sky-500", Icon: Loader2 },
  running: { label: "執行中", cls: "text-sky-500", Icon: Loader2 },
  awaiting_approval: { label: "等你確認", cls: "text-amber-500", Icon: Clock },
  awaiting_device: { label: "等電腦上線", cls: "text-amber-500", Icon: Clock },
  succeeded: { label: "完成", cls: "text-emerald-500", Icon: CheckCircle2 },
  failed: { label: "失敗", cls: "text-rose-500", Icon: XCircle },
  cancelled: { label: "已取消", cls: "text-black/40 dark:text-white/40", Icon: XCircle },
};

// 熱門任務（對標 Genspark「熱門任務」）——用預填、讓使用者看過再送出，不自動燒 API。
// 需電腦的任務（本機檔案）標 needsDevice。
const QUICK_TASKS: { emoji: string; title: string; hint: string; goal: string; needsDevice?: boolean }[] = [
  { emoji: "📚", title: "查資料做摘要", hint: "讀多個來源、白話摘要附出處", goal: "幫我查「（在這裡填主題）」的最新重點，讀 2–3 個來源後用白話摘要，並附上出處連結。" },
  { emoji: "🔍", title: "找機會 / 比賽 / 補助", hint: "列名稱、截止日、獎金、來源", goal: "幫我找適合我的免費競賽或補助，列出名稱、截止日、獎金和來源連結，優先近期截止的。" },
  { emoji: "✍️", title: "寫貼文 / 文案", hint: "口語有 hook、附標籤", goal: "幫我把「（在這裡填主題）」寫成一則社群貼文草稿，口語、開頭有 hook，最後附 3 個標籤。（先給我看過再決定要不要發）" },
  { emoji: "📖", title: "解釋程式術語", hint: "白話＋生活比喻＋小範例", goal: "用白話加一個生活比喻解釋「（在這裡填術語）」，並給一個超簡單的小範例。" },
  { emoji: "🌐", title: "讀網頁重點", hint: "抓一個網址整理成重點", goal: "抓（在這裡貼上網址）的主要內容，整理成 5 個重點給我。" },
  { emoji: "🎓", title: "找適合我的課", hint: "依你的程度推薦下一步", goal: "根據我的學習程度，推薦我接下來該學哪幾節課，並簡短說明每一節為什麼適合我。" },
  { emoji: "🗂️", title: "整理本機檔案", hint: "先列清單、不直接動手", goal: "幫我看（在這裡填資料夾路徑）裡的檔案，列出可以整理或刪除的清單。先別動手，列給我看再說。", needsDevice: true },
];

function isToday(iso: string) {
  const d = new Date(iso); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function OfficeClient() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [sk, dv, tk] = await Promise.all([
        fetch("/api/agent/skills").then((r) => (r.ok ? r.json() : { skills: [] })).catch(() => ({ skills: [] })),
        fetch("/api/agent/devices").then((r) => (r.ok ? r.json() : { devices: [] })).catch(() => ({ devices: [] })),
        fetch("/api/agent/tasks").then((r) => (r.ok ? r.json() : { tasks: [] })).catch(() => ({ tasks: [] })),
      ]);
      if (!alive) return;
      setSkills(sk.skills ?? []);
      setDevices(dv.devices ?? []);
      setTasks(tk.tasks ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const employees = skills.filter((s) => s.installed);
  const onlineDevice = devices.find((d) => d.online);
  const todayTasks = tasks.filter((t) => isToday(t.created_at));
  const liveCount = tasks.filter((t) => ["planning", "running", "awaiting_approval", "awaiting_device"].includes(t.status)).length;
  const doneToday = todayTasks.filter((t) => t.status === "succeeded").length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-5">
        <Link href={"/agent" as any} className="inline-flex items-center gap-1 text-xs text-black/50 dark:text-white/50 hover:text-violet-500 mb-2">
          <ChevronLeft className="w-3.5 h-3.5" /> 回下令列
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">🏢 AI 員工辦公室</h1>
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">看每位員工的狀態、一鍵派熱門任務、看今日產出。<b>對外動作（發文/報名）一律先問過你才做。</b></p>
          </div>
          <Link href={"/agent" as any} className="inline-flex items-center gap-1.5 text-xs rounded-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-2">
            <Bot className="w-4 h-4" /> 開下令列
          </Link>
        </div>
      </div>

      {/* 狀態列（對標 Genspark 右側狀態面板）*/}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {/* 裝置狀態 */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-[11px] text-black/40 dark:text-white/40 mb-1.5">本機電腦</div>
          {onlineDevice ? (
            <div className="flex items-center gap-2">
              <Laptop className="w-5 h-5 text-emerald-500" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{onlineDevice.name}</div>
                <div className="text-[11px] text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> 已連線 · {onlineDevice.platform}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LaptopMinimal className="w-5 h-5 text-black/30 dark:text-white/30" />
                <div className="text-sm text-black/50 dark:text-white/50">未連線</div>
              </div>
              <Link href={"/agent" as any} className="text-[11px] text-violet-500 hover:underline shrink-0">去連結 →</Link>
            </div>
          )}
        </div>
        {/* 員工數 */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-[11px] text-black/40 dark:text-white/40 mb-1.5">我的 AI 員工</div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-500" />
            <div className="text-sm font-medium">{loading ? "…" : employees.length} 位在職</div>
            {liveCount > 0 && <span className="text-[11px] text-sky-500">· {liveCount} 位工作中</span>}
          </div>
        </div>
        {/* 今日產出 */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-[11px] text-black/40 dark:text-white/40 mb-1.5">今日產出</div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div className="text-sm font-medium">{loading ? "…" : `${doneToday} 件完成`}</div>
            {todayTasks.length > doneToday && <span className="text-[11px] text-black/40 dark:text-white/40">· 共 {todayTasks.length} 件</span>}
          </div>
        </div>
      </div>

      {/* 熱門任務 */}
      <section className="mb-7">
        <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-500" /> 熱門任務 <span className="text-[11px] font-normal text-black/40 dark:text-white/40">· 點一下＝預填指令，看過再送出</span></h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {QUICK_TASKS.map((q) => {
            const disabled = q.needsDevice && !onlineDevice;
            const inner = (
              <>
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl leading-none">{q.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium flex items-center gap-1.5">{q.title}{q.needsDevice && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">需電腦</span>}</div>
                    <div className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">{q.hint}</div>
                  </div>
                  {!disabled && <ArrowRight className="w-4 h-4 text-black/25 dark:text-white/25 shrink-0 mt-0.5" />}
                </div>
              </>
            );
            if (disabled) {
              return (
                <div key={q.title} title="先連結你的電腦（回下令列 → 連結電腦）" className="rounded-xl border border-black/10 dark:border-white/10 p-3 opacity-50 cursor-not-allowed">
                  {inner}
                </div>
              );
            }
            return (
              <Link key={q.title} href={`/agent?goal=${encodeURIComponent(q.goal)}` as any} className="rounded-xl border border-black/10 dark:border-white/10 p-3 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 我的 AI 員工 */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><Bot className="w-4 h-4 text-violet-500" /> 我的 AI 員工</h2>
          <Link href={"/agent" as any} className="inline-flex items-center gap-1 text-[11px] text-violet-500 hover:underline"><Store className="w-3.5 h-3.5" /> 技能商店 · 招募</Link>
        </div>
        {loading ? (
          <div className="text-xs text-black/40 dark:text-white/40 py-6 text-center">載入中…</div>
        ) : employees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 dark:border-white/15 p-6 text-center">
            <div className="text-sm text-black/60 dark:text-white/60">還沒有在職員工</div>
            <Link href={"/agent" as any} className="inline-flex items-center gap-1.5 mt-2 text-xs rounded-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5"><Store className="w-3.5 h-3.5" /> 去技能商店招募</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {employees.map((s) => (
              <Link key={s.id} href={`/agent?skill=${encodeURIComponent(s.id)}` as any} className="rounded-xl border border-black/10 dark:border-white/10 p-3 hover:border-violet-400 dark:hover:border-violet-500 transition flex flex-col">
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl leading-none">{s.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">{s.name}{!s.is_builtin && <span className="text-[9px] text-violet-500">我訓練的</span>}</div>
                    <div className="text-[11px] text-black/50 dark:text-white/50 line-clamp-2">{s.description}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-black/40 dark:text-white/40 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-black/25 dark:bg-white/25 inline-block" /> 閒置中</span>
                  <span className="text-[11px] text-violet-500 inline-flex items-center gap-0.5">派工 <ArrowRight className="w-3 h-3" /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 今日 / 最近產出 */}
      <section>
        <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" /> 最近的工作</h2>
        {loading ? (
          <div className="text-xs text-black/40 dark:text-white/40 py-6 text-center">載入中…</div>
        ) : tasks.length === 0 ? (
          <div className="text-xs text-black/40 dark:text-white/40 py-6 text-center">還沒有任務。從上面的熱門任務開始吧。</div>
        ) : (
          <div className="space-y-1.5">
            {tasks.slice(0, 8).map((t) => {
              const st = STATUS[t.status] ?? { label: t.status, cls: "text-black/40", Icon: Clock };
              const Icon = st.Icon;
              return (
                <Link key={t.id} href={`/agent?task=${t.id}` as any} className="flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
                  <Icon className={`w-4 h-4 shrink-0 ${st.cls} ${t.status === "running" || t.status === "planning" ? "animate-spin" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{t.goal}</div>
                    <div className="text-[11px] text-black/40 dark:text-white/40">{new Date(t.created_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} · {t.step_count} 步</div>
                  </div>
                  <span className={`text-[11px] shrink-0 ${st.cls}`}>{st.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
