"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Edit, ExternalLink, Eye, Globe, Lock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTWDate } from "@/lib/format-date";

type Portfolio = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  tags: string[];
  playground_ids: string[];
  is_public: boolean;
  view_count: number;
  updated_at: string;
};

type Playground = {
  id: string;
  title: string | null;
  language: string;
  playground_key: string;
};

export function PortfoliosClient({
  initial,
  playgrounds,
  username,
}: {
  initial: Portfolio[];
  playgrounds: Playground[];
  username: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<Partial<Portfolio> | null>(null);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast.warning("title 必填");
      return;
    }
    const payload = {
      ...editing,
      slug: editing.slug?.trim() || slugify(editing.title),
      playground_ids: editing.playground_ids ?? [],
    };
    try {
      const isEdit = !!editing.id;
      const res = await fetch(isEdit ? `/api/me/portfolios/${editing.id}` : "/api/me/portfolios", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      toast.success(isEdit ? "已更新" : "已建立");
      setEditing(null);
      router.refresh();
    } catch (e: any) {
      toast.error(`儲存失敗：${e?.message || ""}`);
    }
  };

  const del = async (id: string) => {
    const ok = await confirm({ title: "刪除這個作品集？", destructive: true, confirmLabel: "刪除" });
    if (!ok) return;
    const res = await fetch(`/api/me/portfolios/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((l) => l.filter((p) => p.id !== id));
      toast.success("已刪除");
    } else toast.error("刪除失敗");
  };

  const togglePg = (id: string) => {
    if (!editing) return;
    const ids = editing.playground_ids ?? [];
    if (ids.includes(id)) {
      setEditing({ ...editing, playground_ids: ids.filter((x) => x !== id) });
    } else {
      setEditing({ ...editing, playground_ids: [...ids, id] });
    }
  };

  return (
    <div className="space-y-4">
      {editing ? (
        <div className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
          <h2 className="font-bold">{editing.id ? "編輯作品集" : "新增作品集"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="標題" className="bg-bg border border-border rounded-lg px-3 py-2 text-sm" />
            <input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="slug（網址、空白自動生）" className="bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="說明（你做了什麼、用到什麼技術）" rows={3} className="w-full bg-bg border border-border rounded-lg p-2 text-sm" />
          <input value={editing.cover_image ?? ""} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} placeholder="封面圖 URL（選）" className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />
          <input value={editing.tags?.join(", ") ?? ""} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="標籤（用逗號分、例：React, AI, todo-app）" className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm" />

          {/* 選 playgrounds */}
          <div>
            <label className="text-sm font-bold block mb-2">包含的 playgrounds（多選）</label>
            {playgrounds.length === 0 ? (
              <div className="text-xs text-fg-muted text-center py-4">還沒有 playground、去 <Link href="/chapters" className="text-accent">章節</Link> 寫一些再回來</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-60 overflow-y-auto">
                {playgrounds.map((p) => {
                  const on = (editing.playground_ids ?? []).includes(p.id);
                  return (
                    <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${on ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"}`}>
                      <input type="checkbox" checked={on} onChange={() => togglePg(p.id)} />
                      <span className="text-[10px] uppercase font-mono bg-bg-elevated px-1 rounded">{p.language}</span>
                      <span className="flex-1 truncate">{p.title || p.playground_key}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="text-[10px] text-fg-muted mt-1">已選 {(editing.playground_ids ?? []).length} 個</div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!editing.is_public} onChange={(e) => setEditing({ ...editing, is_public: e.target.checked })} />
            公開到 /portfolio/{username}/{editing.slug || "your-slug"}（不勾即草稿）
          </label>

          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={save} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm">儲存</button>
            <button onClick={() => setEditing(null)} className="px-4 py-1.5 rounded-lg border border-border text-sm">取消</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing({ is_public: false, tags: [], playground_ids: [] })} className="w-full p-3 border border-dashed border-border rounded-xl hover:border-accent flex items-center justify-center gap-1 text-sm">
          <Plus size={14} /> 新增作品集
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.length === 0 ? (
          <div className="md:col-span-2 text-center py-12 text-fg-muted text-sm rounded-xl bg-bg-card border border-border">
            還沒有作品集、按上面新增一個吧
          </div>
        ) : list.map((p) => (
          <div key={p.id} className="rounded-xl bg-bg-card border border-border p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold truncate flex-1">{p.title}</h3>
              {p.is_public ? (
                <Globe size={14} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <Lock size={14} className="text-fg-muted flex-shrink-0" />
              )}
            </div>
            {p.description && <p className="text-xs text-fg-muted line-clamp-2 mb-2">{p.description}</p>}
            <div className="flex gap-1.5 flex-wrap mb-2">
              {p.tags.slice(0, 5).map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">#{t}</span>
              ))}
            </div>
            <div className="text-[10px] text-fg-muted">
              {p.playground_ids.length} 個 playground · <Eye size={9} className="inline" /> {p.view_count} · {formatTWDate(p.updated_at)}
            </div>
            <div className="flex gap-1 mt-3 pt-2 border-t border-border">
              {p.is_public && (
                <Link href={`/portfolio/${username}/${p.slug}` as any} target="_blank" className="text-xs px-2 py-1 rounded-lg border border-border hover:text-accent hover:border-accent flex items-center gap-1">
                  <ExternalLink size={11} /> 看公開頁
                </Link>
              )}
              <button onClick={() => setEditing(p)} className="text-xs px-2 py-1 rounded-lg border border-border hover:text-accent flex items-center gap-1 ml-auto">
                <Edit size={11} /> 編輯
              </button>
              <button onClick={() => del(p.id)} className="p-1.5 text-fg-muted hover:text-red-400">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
