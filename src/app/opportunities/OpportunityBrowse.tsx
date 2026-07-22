"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Compass, ExternalLink, Bookmark, BookmarkCheck, AlertTriangle, CalendarClock, Trophy, Sparkles, Loader2, UserCog, ChevronDown, ChevronUp, Check, Bell, X } from "lucide-react";
import { FeatureGuide } from "@/components/FeatureGuide";
import { estimatePrepEffort, PREP_META } from "@/lib/opportunity-prep";

interface Opp {
  id: string; type: string; name: string; organizer?: string; country?: string; category?: string;
  official_url?: string; prize_text?: string; prize_amount?: number | null; application_deadline?: string | null;
  is_free?: boolean; requires_demo?: boolean; requires_pitch?: boolean; requires_video?: boolean; requires_business_plan?: boolean;
  is_online?: boolean; requires_qa?: boolean; requires_team?: boolean;
  requires_student?: boolean; requires_company?: boolean; prep_effort?: string | null; tags?: string[];
  status: string; source_confidence?: string; ai_island_fit_score?: number | null;
}

// 獎金下限選項（TWD）
const PRIZE_TIERS: { label: string; value: number }[] = [
  { label: "≥ 1 萬", value: 10000 },
  { label: "≥ 10 萬", value: 100000 },
  { label: "≥ 100 萬", value: 1000000 },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "開放中", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  upcoming: { label: "即將開始", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  closed: { label: "已截止", cls: "bg-black/10 dark:bg-white/10 text-black/50 dark:text-white/50" },
};
const CATS = ["AI", "創業", "補助", "獎學金", "實習", "設計", "攝影", "文學", "影視", "動漫", "遊戲", "音樂", "黑客松", "資安", "科學", "永續", "社會創新", "廣告", "校園"];

function daysLeft(deadline?: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline + "T23:59:59").getTime() - Date.now();
  return Math.ceil(d / 86400000);
}

export function OpportunityBrowse() {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Set<string>>(new Set());   // 分類多選（OR）
  const [freeOnly, setFreeOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [noPitch, setNoPitch] = useState(false);   // 免上台
  const [online, setOnline] = useState(false);      // 全程線上
  const [urgent, setUrgent] = useState(false);      // 14 天內截止
  const [prizeOnly, setPrizeOnly] = useState(false); // 只看有獎金
  const [minPrize, setMinPrize] = useState(0);       // 獎金下限（TWD，0=不限）
  const [student, setStudent] = useState(false);     // 限學生可報
  const [company, setCompany] = useState(false);     // 限法人／公司
  const [soloOk, setSoloOk] = useState(false);       // 可個人參加（免組隊）
  const [region, setRegion] = useState<"" | "tw" | "overseas">(""); // 地區
  // AI 幫我挑（V2）
  const [recOpen, setRecOpen] = useState(false);
  const [about, setAbout] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [recResults, setRecResults] = useState<(Opp & { fit: number; reason: string })[] | null>(null);
  // 我的機會檔案（V2）：存一次、AI 工具自動帶入
  const [profOpen, setProfOpen] = useState(false);
  const [pIdentity, setPIdentity] = useState("");
  const [pAssets, setPAssets] = useState("");
  const [pStage, setPStage] = useState("");
  const [pInterests, setPInterests] = useState<Set<string>>(new Set());
  const [profSaving, setProfSaving] = useState(false);
  const [profSaved, setProfSaved] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  // 機會訂閱（V2）
  const [subs, setSubs] = useState<{ id: string; label: string }[]>([]);
  const [subBusy, setSubBusy] = useState(false);
  // 我的作品庫（V5·user_portfolio）：AI 幫我挑會自動帶入
  const [pfOpen, setPfOpen] = useState(false);
  const [portfolio, setPortfolio] = useState<{ id: string; kind: string; title: string; description?: string | null; url?: string | null }[]>([]);
  const [pfKind, setPfKind] = useState("work");
  const [pfTitle, setPfTitle] = useState("");
  const [pfDesc, setPfDesc] = useState("");
  const [pfBusy, setPfBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/opportunities/subscriptions"); if (r.ok) setSubs((await r.json()).subscriptions ?? []); } catch { /* ignore */ }
    })();
    (async () => {
      try { const r = await fetch("/api/opportunities/portfolio"); if (r.ok) setPortfolio((await r.json()).items ?? []); } catch { /* ignore */ }
    })();
  }, []);

  const PF_KINDS: Record<string, string> = { work: "作品", skill: "技能", award: "獎項", experience: "經歷" };
  const addPortfolio = async () => {
    if (!pfTitle.trim() || pfBusy) return;
    setPfBusy(true);
    try {
      const r = await fetch("/api/opportunities/portfolio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: pfKind, title: pfTitle.trim(), description: pfDesc.trim() || undefined }),
      });
      if (r.status === 401) { window.location.href = "/login?next=/opportunities"; return; }
      const d = await r.json();
      if (d.item) { setPortfolio((cur) => [d.item, ...cur]); setPfTitle(""); setPfDesc(""); }
    } catch { /* ignore */ } finally { setPfBusy(false); }
  };
  const deletePortfolio = async (id: string) => {
    setPortfolio((cur) => cur.filter((p) => p.id !== id));
    await fetch(`/api/opportunities/portfolio?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  // 從網址 ?q= 帶入初始搜尋（AI 作品分析的關鍵字連結會導到這裡）
  useEffect(() => {
    try {
      const initQ = new URLSearchParams(window.location.search).get("q");
      if (initQ) setQ(initQ);
    } catch { /* ignore */ }
  }, []);

  const subscribeCurrent = async () => {
    if (subBusy) return;
    setSubBusy(true);
    try {
      const r = await fetch("/api/opportunities/subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: q.trim() || undefined, categories: [...cats], free_only: freeOnly }),
      });
      if (r.status === 401) { window.location.href = "/login?next=/opportunities"; return; }
      const d = await r.json();
      if (r.ok && d.subscription) setSubs((cur) => [{ id: d.subscription.id, label: d.subscription.label }, ...cur]);
    } catch { /* ignore */ } finally { setSubBusy(false); }
  };
  const deleteSub = async (id: string) => {
    setSubs((cur) => cur.filter((s) => s.id !== id));
    await fetch(`/api/opportunities/subscriptions?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/opportunities/profile");
        if (!r.ok) return;
        const { profile } = await r.json();
        if (!profile) return;
        setHasProfile(true);
        setPIdentity(profile.identity ?? "");
        setPAssets(profile.assets ?? "");
        setPStage(profile.stage ?? "");
        setPInterests(new Set(profile.interests ?? []));
        if (profile.about) setAbout(profile.about);  // 預填 AI 幫我挑
      } catch { /* ignore */ }
    })();
  }, []);

  const saveProfile = async () => {
    if (profSaving) return;
    setProfSaving(true); setProfSaved(false);
    try {
      const r = await fetch("/api/opportunities/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: pIdentity, assets: pAssets, stage: pStage, interests: [...pInterests] }),
      });
      if (r.status === 401) { window.location.href = "/login?next=/opportunities"; return; }
      if (r.ok) {
        const { profile } = await r.json();
        setHasProfile(true); setProfSaved(true);
        if (profile?.about) setAbout(profile.about);
        setTimeout(() => setProfSaved(false), 2000);
      }
    } catch { /* ignore */ } finally { setProfSaving(false); }
  };

  const recommend = async () => {
    if (!about.trim() || recLoading) return;
    setRecLoading(true); setRecResults(null);
    try {
      const r = await fetch("/api/opportunities/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ about: about.trim() }) });
      const d = await r.json();
      setRecResults(d.results ?? []);
    } catch { setRecResults([]); }
    setRecLoading(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (cats.size) p.set("category", [...cats].join(","));
    if (freeOnly) p.set("free", "1");
    if (status) p.set("status", status);
    if (noPitch) p.set("noPitch", "1");
    if (online) p.set("online", "1");
    if (urgent) p.set("urgent", "1");
    if (minPrize > 0) p.set("minPrize", String(minPrize));
    if (student) p.set("student", "1");
    if (company) p.set("company", "1");
    try {
      const r = await fetch(`/api/opportunities?${p.toString()}`);
      const d = await r.json();
      setOpps(d.opportunities ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [q, cats, freeOnly, status, noPitch, online, urgent, minPrize, student, company]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/opportunities/routes");
        const d = await r.json();
        setSaved(new Set((d.routes ?? []).map((x: any) => x.opportunity_id)));
      } catch { /* ignore */ }
    })();
  }, []);

  const toggleSave = async (id: string) => {
    const has = saved.has(id);
    setSaved((prev) => { const n = new Set(prev); if (has) n.delete(id); else n.add(id); return n; });
    try {
      if (has) await fetch(`/api/opportunities/routes?id=${id}`, { method: "DELETE" });
      else {
        const r = await fetch("/api/opportunities/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityId: id }) });
        if (r.status === 401) { window.location.href = "/login?next=/opportunities"; return; }
      }
    } catch { /* ignore；下次 load 會校正 */ }
  };

  // 前端再篩：地區（台灣/海外）、有獎金、可個人參加
  const isTW = (c?: string) => !!c && /台|臺|taiwan|tw/i.test(c);
  const visibleOpps = opps.filter((o) => {
    if (prizeOnly && !(o.prize_text && o.prize_text.trim())) return false;
    if (soloOk && o.requires_team) return false;
    if (region === "tw" && !isTW(o.country)) return false;
    if (region === "overseas" && (!o.country || isTW(o.country))) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      {/* Hero */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Compass className="w-7 h-7 text-violet-500" /> 機會島</h1>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href="/opportunities/analyze" className="text-sm rounded-full px-3 py-1.5 border border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10">✨ AI 作品分析</Link>
            <Link href="/opportunities/mock-judge" className="text-sm rounded-full px-3 py-1.5 border border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10">🧑‍⚖️ 模擬評審</Link>
            <Link href="/opportunities/routes" className="text-sm rounded-full px-3 py-1.5 border border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10">🧭 我的航線</Link>
          </div>
        </div>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">競賽 · 補助 · 創投 · 徵件 —— 找到適合你的機會，加入「我的航線」追蹤截止日。</p>
        <p className="text-[11px] text-amber-600/90 dark:text-amber-400/80 mt-1 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 目前為初始資料、部分欄位「待人工核實」，實際以官網為準。</p>
      </div>

      <FeatureGuide
        id="opportunities"
        intro="機會島幫你找到適合的競賽 / 補助 / 徵件，並一路陪你追到截止、準備到報名。"
        steps={[
          { title: "找 & 篩選", desc: "用上面的搜尋和分類，配合免費 / 免上台 / 線上 / 獎金下限 / 地區 / 學生法人身分等條件，縮到適合你的。" },
          { title: "存進「我的作品庫」", desc: "把你的作品 / 技能 / 獎項填一次，之後「AI 幫我挑」會自動帶入、推薦更準。" },
          { title: "AI 幫我挑", desc: "描述你的狀況（或靠作品庫），AI 從開放中的機會挑出最適合的幾個，附符合率與原因。" },
          { title: "加入「我的航線」", desc: "看到想試的按書籤加入航線，就能追蹤截止日、更新投件進度（已收藏 / 準備中 / 已投件 / 完成）。" },
          { title: "用缺件清單追準備", desc: "在我的航線展開每個機會的「缺件清單」，一鍵帶入建議缺件、逐項打勾，準備進度一目了然。" },
          { title: "丟給分身島幫你準備", desc: "點「丟給分身島」把準備任務交給 AI 代理，它會列文件清單、整理待辦（對外動作會先問過你）。" },
        ]}
        tip="機會資料整理自公開資訊、可能過時；報名前一定要點進官網再次確認截止與資格。"
      />


      {/* 我的機會檔案（V2）：存一次、所有 AI 工具自動帶入 */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3 mb-3">
        <button onClick={() => setProfOpen((v) => !v)} className="w-full flex items-center gap-2 text-sm font-semibold">
          <UserCog className="w-4 h-4 text-violet-500" /> 我的機會檔案
          <span className="text-[11px] font-normal text-black/40 dark:text-white/40">{hasProfile ? "· 已填、AI 工具會自動帶入" : "· 填一次，AI 幫我挑/讀規則/分析就不用重打"}</span>
          <span className="ml-auto text-xs text-black/40 dark:text-white/40">{profOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>
        {profOpen && (
          <div className="mt-3 space-y-2">
            <input value={pIdentity} onChange={(e) => setPIdentity(e.target.value)} placeholder="身分（例：大二學生／獨立開發者／早期創業者）" className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500" />
            <textarea value={pAssets} onChange={(e) => setPAssets(e.target.value)} rows={2} placeholder="你有什麼（作品／Demo／技能／團隊／資源，例：一個 AI 學習網站，有 Demo 和 200 用戶）" className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500 resize-none" />
            <input value={pStage} onChange={(e) => setPStage(e.target.value)} placeholder="完成度（例：只有點子／有雛形／有 Demo／已上線／有營收）" className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500" />
            <div>
              <div className="text-[11px] text-black/50 dark:text-white/50 mb-1">想參加的類型</div>
              <div className="flex flex-wrap gap-1.5">
                {CATS.map((c) => {
                  const on = pInterests.has(c);
                  return <button key={c} onClick={() => setPInterests((prev) => { const n = new Set(prev); if (n.has(c)) n.delete(c); else n.add(c); return n; })} className={`text-xs rounded-full px-2.5 py-1 border ${on ? "bg-violet-600 border-violet-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}>{on ? "✓ " : ""}{c}</button>;
                })}
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={saveProfile} disabled={profSaving} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-3.5 py-1.5 text-sm font-medium">
                {profSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : profSaved ? <Check className="w-4 h-4" /> : null} {profSaved ? "已儲存" : "儲存檔案"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 我的作品庫（V5·user_portfolio）：AI 幫我挑會自動帶入 */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3 mb-3">
        <button onClick={() => setPfOpen((v) => !v)} className="w-full flex items-center gap-2 text-sm font-semibold">
          <Trophy className="w-4 h-4 text-amber-500" /> 我的作品庫
          <span className="text-[11px] font-normal text-black/40 dark:text-white/40">{portfolio.length ? `· ${portfolio.length} 筆，AI 幫我挑會帶入` : "· 存作品/技能/獎項，AI 幫我挑更準"}</span>
          <span className="ml-auto text-xs text-black/40 dark:text-white/40">{pfOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>
        {pfOpen && (
          <div className="mt-3 space-y-2">
            {portfolio.length > 0 && (
              <ul className="space-y-1.5">
                {portfolio.map((p) => (
                  <li key={p.id} className="flex items-start gap-2 group rounded-lg bg-black/[0.02] dark:bg-white/[0.03] px-2.5 py-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">{PF_KINDS[p.kind] ?? p.kind}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{p.title}</div>
                      {p.description && <div className="text-[11px] text-black/50 dark:text-white/50 line-clamp-2">{p.description}</div>}
                    </div>
                    <button onClick={() => deletePortfolio(p.id)} className="shrink-0 text-black/20 dark:text-white/20 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"><X className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PF_KINDS).map(([k, label]) => (
                <button key={k} onClick={() => setPfKind(k)} className={`text-xs rounded-full px-2.5 py-1 border ${pfKind === k ? "bg-amber-600 border-amber-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>{label}</button>
              ))}
            </div>
            <input value={pfTitle} onChange={(e) => setPfTitle(e.target.value)} placeholder="標題（例：AI 學習網站 / Python 資料分析 / 校內設計競賽第一名）" className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500" />
            <textarea value={pfDesc} onChange={(e) => setPfDesc(e.target.value)} rows={2} placeholder="補充說明（選填，例：有 Demo 與 200 用戶）" className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 resize-none" />
            <div className="flex justify-end">
              <button onClick={addPortfolio} disabled={!pfTitle.trim() || pfBusy} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white px-3.5 py-1.5 text-sm font-medium">
                {pfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 加入作品庫
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI 幫我挑（V2） */}
      <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-3 mb-4">
        <button onClick={() => setRecOpen((v) => !v)} className="w-full flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400">
          <Sparkles className="w-4 h-4" /> AI 幫我挑機會
          <span className="ml-auto text-xs text-black/40 dark:text-white/40">{recOpen ? "收起" : "展開"}</span>
        </button>
        {recOpen && (
          <div className="mt-3">
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3}
              placeholder="用一兩句描述你：有什麼作品/身分/目標？例：我做了一個 AI 學習網站，有 Demo，想找免費、獎金高的比賽。"
              className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl p-2.5 text-sm outline-none focus:border-violet-500 resize-none" />
            <div className="flex justify-end mt-2">
              <button onClick={recommend} disabled={!about.trim() || recLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-3.5 py-1.5 text-sm font-medium">
                {recLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 幫我挑
              </button>
            </div>
            {recResults && (
              recResults.length === 0 ? (
                <p className="text-xs text-black/50 dark:text-white/50 mt-2">目前沒有特別適合的開放機會，直接看下面清單吧。</p>
              ) : (
                <ul className="space-y-2 mt-2">
                  {recResults.map((o) => (
                    <li key={o.id} className="rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 p-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/opportunities/${o.id}`} className="font-semibold text-sm hover:text-violet-600 dark:hover:text-violet-400 min-w-0">{o.name}</Link>
                        <span className="ml-auto shrink-0 text-xs font-bold text-violet-600 dark:text-violet-400">符合 {o.fit}%</span>
                      </div>
                      {o.reason && <p className="text-xs text-black/60 dark:text-white/60 mt-1">{o.reason}</p>}
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}
      </div>

      {/* 搜尋 + 篩選 */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3 mb-5">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋競賽名稱 / 主辦 / 類別…"
            className="flex-1 bg-transparent outline-none text-sm min-w-0" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <button onClick={() => setCats(new Set())} className={`text-xs rounded-full px-2.5 py-1 border ${cats.size === 0 ? "bg-violet-600 border-violet-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>全部</button>
          {CATS.map((cName) => {
            const on = cats.has(cName);
            return (
              <button key={cName} onClick={() => setCats((prev) => { const n = new Set(prev); if (n.has(cName)) n.delete(cName); else n.add(cName); return n; })} className={`text-xs rounded-full px-2.5 py-1 border ${on ? "bg-violet-600 border-violet-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}>{on ? "✓ " : ""}{cName}</button>
            );
          })}
          <span className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
          <button onClick={() => setFreeOnly((v) => !v)} className={`text-xs rounded-full px-2.5 py-1 border ${freeOnly ? "bg-emerald-600 border-emerald-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>免報名費</button>
          <button onClick={() => setNoPitch((v) => !v)} title="初賽不用上台簡報" className={`text-xs rounded-full px-2.5 py-1 border ${noPitch ? "bg-emerald-600 border-emerald-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>🎤 免上台</button>
          <button onClick={() => setOnline((v) => !v)} title="全程線上、不用到現場" className={`text-xs rounded-full px-2.5 py-1 border ${online ? "bg-emerald-600 border-emerald-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>🌐 線上</button>
          <button onClick={() => setStatus(status === "open" ? "" : "open")} className={`text-xs rounded-full px-2.5 py-1 border ${status === "open" ? "bg-emerald-600 border-emerald-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>開放中</button>
          <button onClick={() => setUrgent((v) => !v)} title="14 天內截止" className={`text-xs rounded-full px-2.5 py-1 border ${urgent ? "bg-rose-600 border-rose-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>⏰ 快截止</button>
          <button onClick={() => setPrizeOnly((v) => !v)} title="有獎金 / 獎勵" className={`text-xs rounded-full px-2.5 py-1 border ${prizeOnly ? "bg-amber-600 border-amber-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>💰 有獎金</button>
          <button onClick={() => setSoloOk((v) => !v)} title="可個人參加、不用組隊" className={`text-xs rounded-full px-2.5 py-1 border ${soloOk ? "bg-emerald-600 border-emerald-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>🙋 可個人</button>
          <button onClick={() => setRegion((v) => (v === "tw" ? "" : "tw"))} title="台灣的機會" className={`text-xs rounded-full px-2.5 py-1 border ${region === "tw" ? "bg-sky-600 border-sky-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>🇹🇼 台灣</button>
          <button onClick={() => setRegion((v) => (v === "overseas" ? "" : "overseas"))} title="海外 / 國際的機會" className={`text-xs rounded-full px-2.5 py-1 border ${region === "overseas" ? "bg-indigo-600 border-indigo-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>🌏 海外</button>
        </div>
        {/* 獎金下限 + 身分（§3.6：獎金 / 身分篩選） */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
          <span className="text-[11px] text-black/40 dark:text-white/40 inline-flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-500" /> 獎金</span>
          {PRIZE_TIERS.map((t) => (
            <button key={t.value} onClick={() => setMinPrize((v) => (v === t.value ? 0 : t.value))} title={`獎金 ${t.label} 元`}
              className={`text-xs rounded-full px-2.5 py-1 border ${minPrize === t.value ? "bg-amber-600 border-amber-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}>{t.label}</button>
          ))}
          <span className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
          <span className="text-[11px] text-black/40 dark:text-white/40 inline-flex items-center gap-1"><UserCog className="w-3 h-3" /> 身分</span>
          <button onClick={() => setStudent((v) => !v)} title="限學生 / 在學身分可報" className={`text-xs rounded-full px-2.5 py-1 border ${student ? "bg-sky-600 border-sky-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}>🎓 限學生</button>
          <button onClick={() => setCompany((v) => !v)} title="限公司 / 法人 / 團隊報名" className={`text-xs rounded-full px-2.5 py-1 border ${company ? "bg-slate-600 border-slate-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}>🏢 限法人</button>
        </div>
      </div>

      {/* 機會訂閱（V2）：把目前篩選條件存成訂閱、有新符合的機會就推播 */}
      <div className="flex flex-wrap items-center gap-2 mb-5 -mt-2">
        <button onClick={subscribeCurrent} disabled={subBusy} title="用目前的搜尋+分類+免費條件建立訂閱"
          className="inline-flex items-center gap-1.5 text-xs rounded-full border border-violet-500/40 text-violet-600 dark:text-violet-400 px-3 py-1.5 hover:bg-violet-500/10 disabled:opacity-50">
          {subBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />} 訂閱目前條件（有新機會就通知我）
        </button>
        {subs.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 text-[11px] rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-1 text-black/60 dark:text-white/60">
            🔔 {s.label}
            <button onClick={() => deleteSub(s.id)} className="hover:text-rose-500" title="取消訂閱"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>

      {/* 清單（地區/獎金/身分＝前端再篩，資料已含 country/prize_text/requires_team） */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />)}</div>
      ) : visibleOpps.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50 text-center py-10">找不到符合的機會，換個條件試試。</p>
      ) : (
        <ul className="space-y-3">
          {visibleOpps.map((o) => {
            const dl = daysLeft(o.application_deadline);
            const st = STATUS[o.status] ?? STATUS.open;
            const isSaved = saved.has(o.id);
            return (
              <li key={o.id} className="rounded-2xl border border-black/10 dark:border-white/10 p-4 hover:border-violet-500/30 transition">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      {o.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">{o.category}</span>}
                      {o.is_free && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">免報名費</span>}
                      {!o.requires_pitch && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">🎤 免上台</span>}
                      {o.is_online && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">🌐 線上</span>}
                      {o.requires_student && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">🎓 限學生</span>}
                      {o.requires_company && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400">🏢 限法人</span>}
                      {(() => { const p = estimatePrepEffort(o); return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55" title={p.factors.join("、") || "多半填表即可"}>{PREP_META[p.level].emoji} 準備量 {p.level}</span>; })()}
                      {o.source_confidence !== "verified" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">待核實</span>}
                    </div>
                    <Link href={`/opportunities/${o.id}`} className="font-bold text-base leading-snug hover:text-violet-600 dark:hover:text-violet-400">{o.name}</Link>
                    {o.organizer && <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">{o.organizer}</div>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-black/60 dark:text-white/60">
                      {o.prize_text && <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-500" /> {o.prize_text}</span>}
                      {o.application_deadline && (
                        <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> 截止 {o.application_deadline}
                          {dl != null && dl >= 0 && <span className={`ml-1 ${dl <= 14 ? "text-rose-500 font-semibold" : ""}`}>· 剩 {dl} 天</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => toggleSave(o.id)} title={isSaved ? "從航線移除" : "加入我的航線"}
                      className={`p-2 rounded-xl border transition ${isSaved ? "border-violet-500/40 text-violet-600 dark:text-violet-400 bg-violet-500/10" : "border-black/10 dark:border-white/15 text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/10"}`}>
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                    {o.official_url && (
                      <a href={o.official_url} target="_blank" rel="noreferrer" title="官方網站" className="p-2 rounded-xl border border-black/10 dark:border-white/15 text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/10">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
