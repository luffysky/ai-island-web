"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Story = { id: string; user_id: string; media_url: string; media_type: "image" | "video"; caption?: string | null; created_at: string; author?: { id?: string; username?: string; display_name?: string; avatar_url?: string } };
const name = (a?: Story["author"]) => a?.display_name || a?.username || "創作者";

export function Stories({ initial, meId }: { initial: Story[]; meId: string }) {
  const [stories, setStories] = useState<Story[]>(initial);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<{ uid: string; idx: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 依使用者分組（自己排最前）
  const groups = useMemo(() => {
    const m = new Map<string, Story[]>();
    for (const s of stories) { const a = m.get(s.user_id) ?? []; a.push(s); m.set(s.user_id, a); }
    const arr = Array.from(m.entries()).map(([uid, list]) => ({ uid, list, author: list[0].author }));
    arr.sort((a, b) => (a.uid === meId ? -1 : b.uid === meId ? 1 : 0));
    return arr;
  }, [stories, meId]);

  async function add(file: File) {
    setErr(null); setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (!up.url) throw new Error(up.message || "上傳失敗");
      const mediaType = file.type.startsWith("video") ? "video" : "image";
      const { story } = await fetch("/api/creator-island/social/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaUrl: up.url, mediaType, caption: "" }) }).then((r) => r.json());
      setStories((p) => [{ ...story, author: { id: meId } }, ...p]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  function open(uid: string) {
    const g = groups.find((x) => x.uid === uid); if (!g) return;
    setViewer({ uid, idx: 0 });
    fetch(`/api/creator-island/social/stories/${g.list[0].id}`, { method: "POST" }).catch(() => {});
  }
  function step(d: number) {
    if (!viewer) return;
    const g = groups.find((x) => x.uid === viewer.uid); if (!g) return;
    const ni = viewer.idx + d;
    if (ni < 0 || ni >= g.list.length) { setViewer(null); return; }
    setViewer({ uid: viewer.uid, idx: ni });
    fetch(`/api/creator-island/social/stories/${g.list[ni].id}`, { method: "POST" }).catch(() => {});
  }
  const cur = viewer ? groups.find((x) => x.uid === viewer.uid)?.list[viewer.idx] : null;

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <label className="shrink-0 flex flex-col items-center gap-1 cursor-pointer">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-accent/50 grid place-items-center text-accent text-xl">{busy ? "…" : "＋"}</div>
          <span className="text-[10px] text-fg-muted">{busy ? "上傳" : "我的限動"}</span>
          <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) add(f); e.currentTarget.value = ""; }} />
        </label>
        {groups.map((g) => (
          <button key={g.uid} onClick={() => open(g.uid)} className="shrink-0 flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-500">
              {g.author?.avatar_url ? <img src={g.author.avatar_url} className="w-full h-full rounded-full object-cover border-2 border-bg" /> : <div className="w-full h-full rounded-full bg-bg-card grid place-items-center text-sm border-2 border-bg">{name(g.author)[0]}</div>}
            </div>
            <span className="text-[10px] text-fg-muted max-w-16 truncate">{g.uid === meId ? "你" : name(g.author)}</span>
          </button>
        ))}
      </div>
      {err && <div className="text-xs text-red-400 mt-1">⚠️ {err}</div>}

      <AnimatePresence>
        {cur && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setViewer(null)}>
            <button onClick={(e) => { e.stopPropagation(); step(-1); }} className="absolute left-2 sm:left-8 text-white/70 text-3xl">‹</button>
            <div className="max-w-md w-full px-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-2 text-white text-sm">
                <span className="font-bold">{name(cur.author)}</span>
                <span className="text-xs text-white/50">{new Date(cur.created_at).toLocaleString("zh-TW")}</span>
                <button onClick={() => setViewer(null)} className="ml-auto text-white/70">✕</button>
              </div>
              {cur.media_type === "video" ? <video src={cur.media_url} autoPlay controls className="w-full rounded-xl max-h-[78vh]" /> : <img src={cur.media_url} className="w-full rounded-xl max-h-[78vh] object-contain" />}
              {cur.caption && <div className="text-white text-sm mt-2 text-center">{cur.caption}</div>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); step(1); }} className="absolute right-2 sm:right-8 text-white/70 text-3xl">›</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
