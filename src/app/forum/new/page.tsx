"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { ArrowLeft, Loader2, Send } from "lucide-react";

function NewThreadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetBoard = searchParams.get("board");

  const [boards, setBoards] = useState<any[]>([]);
  const [boardSlug, setBoardSlug] = useState(presetBoard ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [similar, setSimilar] = useState<any[]>([]);
  const [dismissedSimilar, setDismissedSimilar] = useState(false);

  // 發文前查重：標題打到一定長度就找相似討論，把重複問題導到舊串
  useEffect(() => {
    const q = title.trim();
    if (q.length < 4 || dismissedSimilar) { setSimilar([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/forum/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((j) => setSimilar((j.results ?? []).slice(0, 4)))
        .catch(() => setSimilar([]));
    }, 450);
    return () => clearTimeout(t);
  }, [title, dismissedSimilar]);

  useEffect(() => {
    fetch("/api/forum/boards")
      .then((r) => r.json())
      .then((j) => {
        const list = j.boards ?? [];
        setBoards(list);
        // 沒預設版塊就選第一個可發文的
        if (!presetBoard) {
          const firstMember = list.find((b: any) => b.post_role === "member");
          if (firstMember) setBoardSlug(firstMember.slug);
        }
      });
  }, []);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 5) setTags([...tags, t]);
    setTagInput("");
  };

  const submit = async () => {
    if (!title.trim() || !boardSlug || saving) return;
    setSaving(true);
    setErr("");
    const res = await fetch("/api/forum/threads", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content, tags, board_slug: boardSlug }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErr(json.message || json.error || "發表失敗");
      return;
    }
    router.push(`/forum/thread/${json.thread_id}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/forum" className="text-sm text-fg-muted hover:text-fg flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> 討論區
      </Link>
      <h1 className="reveal text-2xl font-bold mb-6">發表主題</h1>

      <div className="space-y-4">
        {/* 版塊選擇 */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">發表到</label>
          <select
            value={boardSlug}
            onChange={(e) => setBoardSlug(e.target.value)}
            className="w-full bg-bg-card border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="">選擇版塊...</option>
            {boards
              .filter((b) => b.post_role === "member")
              .map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.emoji} {b.category} / {b.name}
                </option>
              ))}
          </select>
        </div>

        {/* 標題 */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="主題標題"
          className="w-full bg-bg-card border border-border rounded-lg p-2.5 text-lg font-bold outline-none focus:border-accent"
        />

        {/* 發文前查重：相似討論 */}
        {similar.length > 0 && !dismissedSimilar && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300">💡 有幾個相似的討論，先看看是不是已經有答案？</div>
              <button onClick={() => setDismissedSimilar(true)} className="text-[11px] text-fg-muted hover:text-fg">還是要發新的 →</button>
            </div>
            <div className="space-y-1">
              {similar.map((s) => (
                <Link key={s.id} href={`/forum/thread/${s.id}`} target="_blank" className="block text-sm hover:text-accent truncate">
                  <span className="text-fg-muted text-xs mr-1">{s.board?.emoji}</span>{s.title}
                  <span className="text-[11px] text-fg-muted ml-1.5">· {s.reply_count} 回覆</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 內文編輯器 */}
        <BlogEditor content={content} onChange={setContent} placeholder="說說你想討論什麼..." />

        {/* 標籤 */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">標籤（最多 5 個）</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-bg-elevated flex items-center gap-1">
                #{t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))} className="text-fg-muted hover:text-red-400">×</button>
              </span>
            ))}
          </div>
          {tags.length < 5 && (
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="輸入標籤後按 Enter"
              className="w-full bg-bg-card border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
            />
          )}
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={!title.trim() || !boardSlug || saving}
            className="px-6 py-2.5 rounded-lg bg-accent text-black font-bold text-sm hover:scale-105 transition flex items-center gap-1 disabled:opacity-40"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            發表
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewThreadPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-fg-muted">載入中...</div>}>
      <NewThreadForm />
    </Suspense>
  );
}
