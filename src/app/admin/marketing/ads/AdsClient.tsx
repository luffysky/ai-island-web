"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Row = {
  id: string;
  platform: string;
  campaign_name: string | null;
  goal: string | null;
  audience: string | null;
  headlines: string[] | null;
  primary_text: string | null;
  descriptions: string[] | null;
  cta: string | null;
  landing_url: string | null;
  budget_ntd: number | null;
  status: string;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-fg-muted/15 text-fg-muted",
  ready: "bg-blue-500/15 text-blue-300",
  running: "bg-emerald-500/15 text-emerald-300",
  paused: "bg-yellow-500/15 text-yellow-300",
  completed: "bg-purple-500/15 text-purple-300",
  archived: "bg-red-500/15 text-red-300",
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: "📘 Meta",
  google: "🔍 Google",
  tiktok: "🎵 TikTok",
  line_ads: "💚 LINE Ads",
};

export function AdsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    platform: "meta",
    campaign_name: "",
    goal: "conversion",
    audience: "",
    headlines: "",
    primary_text: "",
    cta: "learn_more",
    landing_url: "",
    budget_ntd: "",
  });

  const create = () => {
    if (!form.campaign_name.trim()) {
      toast.warning("填 campaign 名稱");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/marketing/ads", {
      credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            headlines: form.headlines.split("\n").map((s) => s.trim()).filter(Boolean),
            budget_ntd: form.budget_ntd ? Number(form.budget_ntd) : null,
          }),
        });
        const j = await res.json();
        if (!res.ok) {
          toast.error(j.error || "建立失敗");
          return;
        }
        toast.success("已建立 ad creative");
        setShowAdd(false);
        setForm({
          platform: "meta", campaign_name: "", goal: "conversion", audience: "", headlines: "",
          primary_text: "", cta: "learn_more", landing_url: "", budget_ntd: "",
        });
        router.refresh();
      } catch (e: any) {
        toast.error(`網路錯誤：${e?.message ?? "unknown"}`);
      }
    });
  };

  const setStatus = (row: Row, status: string) => {
    const prev = row.status;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)));
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/marketing/ads", {
      credentials: "include",
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.id, status }),
        });
        if (!res.ok) throw new Error();
        toast.success(`狀態 → ${status}`);
      } catch {
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: prev } : r)));
        toast.error("失敗");
      }
    });
  };

  const remove = async (row: Row) => {
    const ok = await confirm({
      title: `封存 ${row.campaign_name}？`,
      confirmLabel: "封存",
      destructive: true,
    });
    if (!ok) return;
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/marketing/ads?id=${row.id}`, {
      credentials: "include", method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success("已封存");
      } catch {
        setRows((rs) => [...rs, row]);
        toast.error("失敗");
      }
    });
  };

  const runningCount = rows.filter((r) => r.status === "running").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-fg-muted">
          共 {rows.length} 個 ad creative、{runningCount} 個 running
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 text-sm inline-flex items-center gap-1.5 hover:bg-red-500/25 transition"
        >
          {showAdd ? <X size={13} /> : <Plus size={13} />}
          {showAdd ? "取消" : "新增 ad creative"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-bg-card border border-red-500/30 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Platform">
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
              >
                {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Campaign 名稱">
              <input
                value={form.campaign_name}
                onChange={(e) => setForm({ ...form, campaign_name: e.target.value })}
                placeholder="2026 春季招生 - 國中數位素養"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
                maxLength={200}
              />
            </Field>
            <Field label="目標 Goal">
              <select
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="awareness">awareness — 認知</option>
                <option value="traffic">traffic — 流量</option>
                <option value="leads">leads — 名單</option>
                <option value="conversion">conversion — 轉換</option>
              </select>
            </Field>
            <Field label="CTA">
              <select
                value={form.cta}
                onChange={(e) => setForm({ ...form, cta: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="learn_more">Learn More</option>
                <option value="sign_up">Sign Up</option>
                <option value="shop_now">Shop Now</option>
                <option value="download">Download</option>
                <option value="get_offer">Get Offer</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="受眾 Audience">
                <input
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  placeholder="台灣 18-35、興趣：寫程式、AI、自學"
                  className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
                  maxLength={500}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Headlines (每行一個、Meta 40 字 / Google 30 字)">
                <textarea
                  value={form.headlines}
                  onChange={(e) => setForm({ ...form, headlines: e.target.value })}
                  placeholder={"AI 島：72 章全端養成\n從零打造你的第一個 web app\n寵物陪你一起學"}
                  rows={3}
                  className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Primary Text (主文案、Meta 125 字)">
                <textarea
                  value={form.primary_text}
                  onChange={(e) => setForm({ ...form, primary_text: e.target.value })}
                  placeholder="主要文案、繁中口語、適度 emoji、避免官話"
                  rows={3}
                  className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
                  maxLength={2000}
                />
              </Field>
            </div>
            <Field label="Landing URL">
              <input
                value={form.landing_url}
                onChange={(e) => setForm({ ...form, landing_url: e.target.value })}
                placeholder="https://ai-island-web.snowrealm.pet/?utm_source=meta..."
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono text-xs"
              />
            </Field>
            <Field label="預算 NT$">
              <input
                type="number"
                value={form.budget_ntd}
                onChange={(e) => setForm({ ...form, budget_ntd: e.target.value })}
                placeholder="3000"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
              />
            </Field>
          </div>
          <button
            onClick={create}
            disabled={pending || !form.campaign_name.trim()}
            className="px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-sm inline-flex items-center gap-1.5 hover:bg-emerald-500/25 transition disabled:opacity-50"
          >
            <Save size={13} /> 建立
          </button>
        </div>
      )}

      <div className="bg-purple-500/5 border border-purple-500/30 rounded-2xl p-4 text-sm">
        <div className="font-bold text-purple-300 mb-2">📋 已建 ad creatives ({rows.length})</div>
        {rows.length === 0 ? (
          <p className="text-xs text-fg-muted">還沒有 ad copy、點上方「新增」開始。</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className={`bg-bg-card border border-border rounded-lg p-3 text-xs ${r.status === "archived" ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{r.campaign_name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated">{PLATFORM_LABEL[r.platform] ?? r.platform}</span>
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r, e.target.value)}
                      disabled={pending}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full bg-transparent ${STATUS_STYLE[r.status] ?? ""}`}
                    >
                      <option value="draft">draft</option>
                      <option value="ready">ready</option>
                      <option value="running">running</option>
                      <option value="paused">paused</option>
                      <option value="completed">completed</option>
                      <option value="archived">archived</option>
                    </select>
                    {r.budget_ntd && <span className="text-[10px] text-fg-muted">NT$ {Number(r.budget_ntd).toLocaleString()}</span>}
                  </div>
                  <button
                    onClick={() => remove(r)}
                    disabled={pending}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 disabled:opacity-50 inline-flex items-center gap-0.5"
                  >
                    <Trash2 size={9} /> 封存
                  </button>
                </div>
                {r.audience && <div className="text-fg-muted">受眾：{r.audience}</div>}
                {r.primary_text && <div className="text-fg-muted mt-1">{r.primary_text}</div>}
                {r.headlines && r.headlines.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.headlines.map((h, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated rounded">📌 {h}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-bg-elevated/40 border border-border rounded-2xl p-4 text-xs leading-relaxed text-fg-muted">
        <div className="font-bold text-fg mb-1">📐 廣告 copy 守則</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Meta：Headline 40 字、Primary Text 125 字、Description 30 字、3-5 個 headline A/B</li>
          <li>Google Search：3 個 Headline (30 字)、2 個 Description (90 字)、Final URL</li>
          <li>TikTok：標題 100 字、影片 9-15 秒、第一秒就要鉤住</li>
          <li>LINE Ads：標題 25 字、文案 75 字、適合 LINE 內嵌體驗</li>
          <li>每個 ad set 至少 3 個 creative 跑 A/B、保留前 2 月 data 再優化</li>
        </ul>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-fg-muted block mb-0.5">{label}</label>
      {children}
    </div>
  );
}
