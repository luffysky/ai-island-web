"use client";

import { useState } from "react";
import { Plus, Copy, Check, Trash2, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type UtmRow = {
  id: string;
  short_code: string;
  name: string | null;
  dest_url: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  click_count: number;
  unique_clicks: number;
  conversion: number;
  revenue: number;
  created_at: string;
};

const COMMON_SOURCES = ["facebook", "instagram", "x", "threads", "line", "google", "newsletter", "blog", "tiktok"];
const COMMON_MEDIUMS = ["social", "cpc", "email", "banner", "qr", "organic", "referral"];

function genCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function UtmBuilderClient({ initialLinks, siteUrl }: { initialLinks: UtmRow[]; siteUrl: string }) {
  const [links, setLinks] = useState<UtmRow[]>(initialLinks);
  const [form, setForm] = useState({
    name: "",
    dest_url: "",
    utm_source: "facebook",
    utm_medium: "social",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
    short_code: genCode(),
  });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const toast = useToast();

  const buildFullUrl = (row: UtmRow | typeof form): string => {
    if (!row.dest_url) return "";
    const url = new URL(row.dest_url.startsWith("http") ? row.dest_url : `${siteUrl}${row.dest_url}`);
    if (row.utm_source) url.searchParams.set("utm_source", row.utm_source);
    if (row.utm_medium) url.searchParams.set("utm_medium", row.utm_medium);
    if (row.utm_campaign) url.searchParams.set("utm_campaign", row.utm_campaign);
    if (row.utm_term) url.searchParams.set("utm_term", row.utm_term);
    if (row.utm_content) url.searchParams.set("utm_content", row.utm_content);
    return url.toString();
  };

  const shortUrl = (code: string) => `${siteUrl}/s/${code}`;

  const create = async () => {
    if (!form.dest_url || !form.utm_campaign) {
      toast.warning("dest_url + utm_campaign 必填");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/utm", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "create failed");
      toast.success("✅ 短連結已建：" + shortUrl(j.short_code));
      setLinks([j.link, ...links]);
      setForm({ ...form, name: "", dest_url: "", utm_campaign: "", utm_term: "", utm_content: "", short_code: genCode() });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const copyShort = async (row: UtmRow) => {
    await navigator.clipboard.writeText(shortUrl(row.short_code));
    setCopiedId(row.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const copyFull = async (row: UtmRow) => {
    await navigator.clipboard.writeText(buildFullUrl(row));
    setCopiedId(row.id + "_full");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const archive = async (id: string) => {
    if (!confirm("封存這條短連結？舊連結還能點、但不再顯示在列表")) return;
    const res = await fetch("/api/admin/marketing/utm?id=" + id, { method: "DELETE" });
    if (res.ok) {
      setLinks(links.filter((l) => l.id !== id));
      toast.success("已封存");
    }
  };

  return (
    <div className="space-y-3">
      {/* New form */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-1.5">
          <Plus size={13} className="text-purple-400" /> 新建短連結
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-fg-muted">內部稱呼</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="春季促銷 FB 廣告"
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] text-fg-muted">短碼 (可改)</label>
            <div className="flex gap-1">
              <input
                value={form.short_code}
                onChange={(e) => setForm({ ...form, short_code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                className="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
              />
              <button onClick={() => setForm({ ...form, short_code: genCode() })} className="px-2 rounded border border-border text-fg-muted hover:text-fg" title="重生短碼">
                <RefreshCw size={11} />
              </button>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] text-fg-muted">目標 URL *</label>
            <input
              value={form.dest_url}
              onChange={(e) => setForm({ ...form, dest_url: e.target.value })}
              placeholder="/chapters/75 或 https://ai-island-web.snowrealm.pet/chapters/75"
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] text-fg-muted">utm_source *</label>
            <input
              list="utm-sources"
              value={form.utm_source}
              onChange={(e) => setForm({ ...form, utm_source: e.target.value })}
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
            />
            <datalist id="utm-sources">{COMMON_SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label className="text-[10px] text-fg-muted">utm_medium *</label>
            <input
              list="utm-mediums"
              value={form.utm_medium}
              onChange={(e) => setForm({ ...form, utm_medium: e.target.value })}
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
            />
            <datalist id="utm-mediums">{COMMON_MEDIUMS.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] text-fg-muted">utm_campaign * (活動名稱)</label>
            <input
              value={form.utm_campaign}
              onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })}
              placeholder="spring24_launch"
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] text-fg-muted">utm_term (關鍵字)</label>
            <input
              value={form.utm_term}
              onChange={(e) => setForm({ ...form, utm_term: e.target.value })}
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] text-fg-muted">utm_content (區分版本 A/B)</label>
            <input
              value={form.utm_content}
              onChange={(e) => setForm({ ...form, utm_content: e.target.value })}
              placeholder="banner_a"
              className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        {form.dest_url && (
          <div className="bg-bg p-2 rounded-lg border border-border">
            <div className="text-[10px] text-fg-muted">預覽：</div>
            <div className="text-[11px] font-mono text-purple-300 break-all">{shortUrl(form.short_code)}</div>
            <div className="text-[10px] text-fg-muted mt-1">→ {buildFullUrl(form as any)}</div>
          </div>
        )}
        <button
          onClick={create}
          disabled={saving}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          建立
        </button>
      </div>

      {/* List */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-bg-elevated text-[10px] font-bold text-fg-muted border-b border-border">
          <div className="col-span-3">短連結</div>
          <div className="col-span-3">campaign / source</div>
          <div className="col-span-4">目標</div>
          <div className="col-span-1 text-right">點擊</div>
          <div className="col-span-1 text-right">操作</div>
        </div>
        {links.length === 0 && <div className="p-4 text-center text-fg-muted text-xs">還沒有任何短連結</div>}
        {links.map((row) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 border-b border-border last:border-0 items-center hover:bg-bg-elevated/40 text-xs">
            <div className="col-span-3">
              <div className="flex items-center gap-1">
                <button onClick={() => copyShort(row)} className="text-purple-300 hover:text-purple-200 font-mono text-[11px] truncate" title="複製短連結">
                  /s/{row.short_code}
                </button>
                {copiedId === row.id && <Check size={11} className="text-emerald-400" />}
              </div>
              {row.name && <div className="text-[10px] text-fg-muted truncate">{row.name}</div>}
            </div>
            <div className="col-span-3">
              <div className="font-mono text-[11px] text-fg truncate">{row.utm_campaign}</div>
              <div className="text-[10px] text-fg-muted">{row.utm_source} · {row.utm_medium}</div>
            </div>
            <div className="col-span-4 text-[10px] text-fg-muted truncate flex items-center gap-1">
              <button onClick={() => copyFull(row)} title="複製完整 UTM URL" className="hover:text-emerald-400">
                {copiedId === row.id + "_full" ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
              </button>
              <a href={buildFullUrl(row)} target="_blank" rel="noopener noreferrer" className="hover:text-accent truncate">
                {row.dest_url}
              </a>
            </div>
            <div className="col-span-1 text-right">
              <div className="text-fg">{row.click_count}</div>
              <div className="text-[9px] text-fg-muted">{row.conversion} 轉</div>
            </div>
            <div className="col-span-1 text-right">
              <button onClick={() => archive(row.id)} className="text-fg-muted hover:text-red-400" title="封存">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
