"use client";

import { useState } from "react";
import { Calendar, Clock, Edit3, Trash2, Loader2, Save, X, Eye } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Draft = {
  id: string;
  title: string;
  topic: string | null;
  platforms: string[];
  contents: Record<string, string>;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-fg-muted/20 text-fg-muted border-fg-muted/30",
  scheduled: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  publishing: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  published: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
};

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: "📘", instagram: "📷", x: "🐦", threads: "🧵", line: "💚", email_subject: "✉️", blog_title: "📝", email: "📧", blog: "📰",
};

export function ScheduleClient({ initialDrafts }: { initialDrafts: Draft[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts);
  const [editing, setEditing] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const toast = useToast();

  const startEdit = (d: Draft) => {
    setEditing(d.id);
    if (d.scheduled_at) {
      const dt = new Date(d.scheduled_at);
      const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
      setScheduleDate(local.toISOString().slice(0, 16));
    } else {
      const future = new Date(Date.now() + 24 * 3600 * 1000);
      const local = new Date(future.getTime() - future.getTimezoneOffset() * 60000);
      setScheduleDate(local.toISOString().slice(0, 16));
    }
  };

  const saveSchedule = async (id: string) => {
    setSaving(id);
    try {
      const iso = scheduleDate ? new Date(scheduleDate).toISOString() : null;
      const res = await fetch("/api/admin/marketing/drafts", {
      credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, scheduled_at: iso, status: iso ? "scheduled" : "draft" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setDrafts(drafts.map((d) => d.id === id ? { ...d, scheduled_at: iso, status: iso ? "scheduled" : "draft" } : d));
      setEditing(null);
      toast.success(iso ? "✅ 排程已設" : "已取消排程、變回草稿");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("封存這份草稿？")) return;
    const res = await fetch("/api/admin/marketing/drafts?id=" + id, { method: "DELETE" });
    if (res.ok) {
      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("已封存");
    }
  };

  if (drafts.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl p-8 text-center">
        <Calendar className="mx-auto mb-2 text-fg-muted" size={28} />
        <p className="text-sm text-fg-muted">還沒有任何草稿</p>
        <p className="text-xs text-fg-muted/70 mt-1">到「📝 AI 文案產生器」生一份、按「存草稿 → 去排程」</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((d) => (
        <div key={d.id} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap border-b border-border">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLOR[d.status] ?? STATUS_COLOR.draft}`}>
              {d.status}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{d.title}</div>
              {d.topic && <div className="text-[10px] text-fg-muted truncate">{d.topic}</div>}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-fg-muted">
              {d.platforms.map((p) => (
                <span key={p} title={p}>{PLATFORM_EMOJI[p] ?? "📄"}</span>
              ))}
            </div>
            {d.scheduled_at && (
              <span className="text-[10px] text-purple-300 inline-flex items-center gap-1">
                <Clock size={10} /> {new Date(d.scheduled_at).toLocaleString("zh-TW")}
              </span>
            )}
            {d.published_at && (
              <span className="text-[10px] text-emerald-400">
                ✓ {new Date(d.published_at).toLocaleString("zh-TW", { dateStyle: "short" })}
              </span>
            )}
            <div className="flex items-center gap-1">
              <button onClick={() => setPreviewing(previewing === d.id ? null : d.id)} className="p-1.5 rounded hover:bg-bg-elevated text-fg-muted hover:text-fg">
                <Eye size={12} />
              </button>
              <button onClick={() => startEdit(d)} className="p-1.5 rounded hover:bg-bg-elevated text-fg-muted hover:text-fg">
                <Edit3 size={12} />
              </button>
              <button onClick={() => remove(d.id)} className="p-1.5 rounded hover:bg-bg-elevated text-fg-muted hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Schedule editor */}
          {editing === d.id && (
            <div className="bg-bg-elevated px-4 py-3 flex items-center gap-2 flex-wrap border-b border-border">
              <Clock size={13} className="text-purple-400" />
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-bg border border-border rounded-lg px-2 py-1 text-xs"
              />
              <button
                onClick={() => saveSchedule(d.id)}
                disabled={saving === d.id}
                className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs inline-flex items-center gap-1"
              >
                {saving === d.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                設排程
              </button>
              <button onClick={() => setScheduleDate("")} className="px-3 py-1 rounded-full border border-border text-xs text-fg-muted">
                取消排程
              </button>
              <button onClick={() => setEditing(null)} className="px-2 py-1 text-fg-muted hover:text-fg text-xs">
                <X size={11} className="inline" /> 關閉
              </button>
            </div>
          )}

          {/* Preview */}
          {previewing === d.id && (
            <div className="bg-[#0d1117] p-4 space-y-3">
              {d.platforms.map((p) => (
                <div key={p} className="border border-border rounded-lg p-3 bg-bg-card">
                  <div className="text-xs font-bold mb-1 flex items-center gap-1">
                    <span className="text-lg">{PLATFORM_EMOJI[p] ?? "📄"}</span> {p}
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-fg-muted font-sans">{d.contents?.[p] ?? "(無內容)"}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
