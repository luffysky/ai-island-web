"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Film, Music, Heart, MessageCircle, FileText, Link2, Bookmark, Globe, Users, User } from "lucide-react";
import { uploadMedia } from "@/lib/creator-upload";
import { useConfirm, usePrompt } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { AnimatedEmojiPicker } from "@/components/ui/AnimatedEmojiPicker";
import { GifPicker } from "@/components/ui/GifPicker";
import { EmojiText } from "@/components/ui/EmojiText";

const _IMG = /^https?:\/\/[^\s]+\.(gif|png|jpe?g|webp)(\?[^\s]*)?$/i;
const _GIPHY = /^https?:\/\/(media\d?\.giphy\.com|i\.giphy\.com)\/[^\s]+/i;
/** 貼文內文：GIF/圖片網址→<img>、其他網址→連結、純文字→動態 emoji。 */
function renderBody(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((p, i) => {
    if (_IMG.test(p) || _GIPHY.test(p)) return <img key={i} src={p} alt="gif" loading="lazy" className="block max-w-[240px] max-h-[240px] rounded-lg my-1" />;
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer" className="text-accent underline break-all">{p}</a>;
    return <EmojiText key={i} text={p} size={18} />;
  });
}

type Author = { id?: string; username?: string; display_name?: string; avatar_url?: string };
type Post = {
  id: string; user_id: string; type: string; content: string; images: { url: string }[];
  video_url?: string | null; audio_url?: string | null; tags: string[];
  likes_count: number; comments_count: number; created_at: string; author?: Author;
};

async function call(url: string, method: string, body?: any) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
  return j;
}
const uploadFile = uploadMedia;
const name = (a?: Author) => a?.display_name || a?.username || "創作者";

type Scope = "public" | "friends" | "mine";
const SCOPES: { key: Scope; Icon: typeof Globe }[] = [
  { key: "public", Icon: Globe },
  { key: "friends", Icon: Users },
  { key: "mine", Icon: User },
];

export function SocialFeed({ initialPosts, meId }: { initialPosts: Post[]; meId: string }) {
  const t = useTranslations("creator");
  const scopeLabel: Record<Scope, string> = {
    public: t("communityScopePublic"),
    friends: t("communityScopeFriends"),
    mine: t("communityScopeMine"),
  };
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [scope, setScope] = useState<Scope>("public");
  const [loadingScope, setLoadingScope] = useState(false);
  const [text, setText] = useState("");
  const [imgs, setImgs] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function attach(kind: "image" | "video" | "audio", file: File) {
    setErr(null); setBusy("upload");
    try {
      const url = await uploadFile(file);
      if (kind === "image") setImgs((p) => [...p, url]);
      else if (kind === "video") setVideo(url);
      else setAudio(url);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function post() {
    if (!text.trim() && !imgs.length && !video && !audio) return;
    setErr(null); setBusy("post");
    try {
      const { post } = await call("/api/creator-island/social/posts", "POST", {
        type: video ? "reel" : "post", content: text.trim(),
        images: imgs.map((url) => ({ url })), videoUrl: video, audioUrl: audio,
      });
      setPosts((p) => [{ ...post, author: { id: meId } }, ...p]);
      setText(""); setImgs([]); setVideo(null); setAudio(null);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function switchScope(s: Scope) {
    setScope(s); setLoadingScope(true); setErr(null);
    try { const j = await call(`/api/creator-island/social/posts?scope=${s}`, "GET"); setPosts(j.items ?? []); }
    catch (e: any) { setErr(e.message); } finally { setLoadingScope(false); }
  }

  return (
    <div className="space-y-4">
      {/* 發文 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t("communityComposePlaceholder")}
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent resize-y" />
        {imgs.length > 0 && <div className="flex gap-2 flex-wrap">{imgs.map((u, i) => <img key={i} src={u} className="w-16 h-16 rounded object-cover" />)}</div>}
        {video && <video src={video} controls className="w-full rounded-lg max-h-60" />}
        {audio && <audio src={audio} controls className="w-full" />}
        <div className="flex items-center gap-2 text-sm">
          <label className="cursor-pointer hover:text-accent" title={t("communityAttachImage")}><ImageIcon size={18} /><input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) attach("image", f); e.currentTarget.value = ""; }} /></label>
          <label className="cursor-pointer hover:text-accent" title={t("communityAttachVideo")}><Film size={18} /><input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) attach("video", f); e.currentTarget.value = ""; }} /></label>
          <label className="cursor-pointer hover:text-accent" title={t("communityAttachAudio")}><Music size={18} /><input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) attach("audio", f); e.currentTarget.value = ""; }} /></label>
          <AnimatedEmojiPicker onSelect={(e) => setText((v) => v + e)} />
          <GifPicker onSelect={(url) => setText((v) => (v ? v + " " : "") + url + " ")} />
          {busy === "upload" && <span className="text-xs text-fg-muted">{t("communityUploading")}</span>}
          <button onClick={post} disabled={busy !== null} className="ml-auto px-4 py-1.5 rounded-full bg-accent text-white text-sm font-bold disabled:opacity-40">{busy === "post" ? t("communityPosting") : t("communityPost")}</button>
        </div>
      </div>
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm">⚠️ {err}</div>}

      {/* 分流：公共 / 別人(好友) / 自己 */}
      <div className="flex items-center gap-1.5 text-sm">
        {SCOPES.map((s) => (
          <button key={s.key} onClick={() => switchScope(s.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition ${scope === s.key ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}><s.Icon size={14} /> {scopeLabel[s.key]}</button>
        ))}
        {loadingScope && <span className="text-xs text-fg-muted animate-pulse">{t("communityLoading")}</span>}
      </div>

      {/* 動態牆 */}
      {posts.length === 0 && !loadingScope && <div className="text-center text-fg-muted py-10 text-sm">{scope === "mine" ? t("communityEmptyMine") : scope === "friends" ? t("communityEmptyFriends") : t("communityEmptyPublic")}</div>}
      <div className="space-y-3">
        <AnimatePresence>
          {posts.map((p) => <PostCard key={p.id} p={p} meId={meId} onDelete={() => setPosts((arr) => arr.filter((x) => x.id !== p.id))} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PostCard({ p, meId, onDelete }: { p: Post; meId: string; onDelete: () => void }) {
  const t = useTranslations("creator");
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(p.likes_count);
  const [saved, setSaved] = useState(false);
  const [showC, setShowC] = useState(false);
  const [comments, setComments] = useState<any[] | null>(null);
  const [cbody, setCbody] = useState("");
  const confirm = useConfirm();
  const prompt = usePrompt();
  const toast = useToast();

  async function like() { try { const r = await call(`/api/creator-island/social/posts/${p.id}/like`, "POST"); setLiked(r.on); setLikes((n) => n + (r.on ? 1 : -1)); } catch {} }
  async function bookmark() { try { const r = await call(`/api/creator-island/social/posts/${p.id}/bookmark`, "POST"); setSaved(r.on); } catch {} }
  async function loadComments() { setShowC((s) => !s); if (comments) return; try { const j = await call(`/api/creator-island/social/posts/${p.id}/comments`, "GET"); setComments(j.comments ?? []); } catch {} }
  async function addComment() { if (!cbody.trim()) return; try { const j = await call(`/api/creator-island/social/posts/${p.id}/comments`, "POST", { body: cbody.trim() }); setComments((c) => [...(c ?? []), j.comment]); setCbody(""); } catch {} }
  async function del() { if (!(await confirm({ title: t("communityDeletePostConfirm"), confirmLabel: t("communityDelete"), destructive: true }))) return; try { await call(`/api/creator-island/social/posts/${p.id}`, "DELETE"); onDelete(); } catch {} }
  async function share() {
    const url = `${window.location.origin}/creator-island/p/${p.id}`;
    if ((navigator as any).share) { try { await (navigator as any).share({ title: t("communitySharePostTitle"), url }); return; } catch { /* 取消 */ } }
    try { await navigator.clipboard.writeText(url); toast.success(t("communityLinkCopied")); } catch { await prompt({ title: t("communityCopyLink"), defaultValue: url }); }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        {p.author?.avatar_url ? <img src={p.author.avatar_url} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-accent/20 grid place-items-center text-xs">{name(p.author)[0]}</div>}
        <div className="text-sm font-bold">{name(p.author)}</div>
        {p.type === "reel" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300">{t("communityReelBadge")}</span>}
        <span className="ml-auto text-[10px] text-fg-muted">{new Date(p.created_at).toLocaleString("zh-TW")}</span>
        {p.user_id === meId && <button onClick={del} className="text-fg-muted hover:text-red-400 text-xs">{t("communityDeleteShort")}</button>}
      </div>
      {p.content && <div className="text-sm whitespace-pre-wrap">{renderBody(p.content)}</div>}
      {p.images?.length > 0 && <div className={`grid gap-1 ${p.images.length > 1 ? "grid-cols-2" : ""}`}>{p.images.map((im, i) => <img key={i} src={im.url} className="rounded-lg w-full object-cover max-h-80" />)}</div>}
      {p.video_url && <video src={p.video_url} controls className="w-full rounded-lg max-h-96" />}
      {p.audio_url && <audio src={p.audio_url} controls className="w-full" />}
      <div className="flex items-center gap-4 text-sm text-fg-muted pt-1">
        <button onClick={like} className={`inline-flex items-center gap-1 ${liked ? "text-pink-400" : "hover:text-pink-400"}`}><Heart size={16} className={liked ? "fill-pink-400" : ""} /> {likes}</button>
        <button onClick={loadComments} className="inline-flex items-center gap-1 hover:text-accent"><MessageCircle size={16} /> {p.comments_count}</button>
        {p.user_id === meId && <button onClick={async () => { try { await call(`/api/creator-island/social/posts/${p.id}/publish-blog`, "POST"); toast.success(t("communityPublishedBlogDraft")); } catch (e: any) { toast.error(e.message); } }} className="hover:text-accent" title={t("communityPublishToBlog")}><FileText size={16} /></button>}
        <button onClick={share} className="hover:text-accent" title={t("communitySharePost")}><Link2 size={16} /></button>
        <button onClick={bookmark} className={`ml-auto ${saved ? "text-amber-300" : "hover:text-amber-300"}`} title={t("communityBookmark")}><Bookmark size={16} className={saved ? "fill-amber-300" : ""} /></button>
      </div>
      {showC && (
        <div className="border-t border-border pt-2 space-y-2">
          {(comments ?? []).map((c) => <div key={c.id} className="text-xs"><b>{name(c.author)}</b> <EmojiText text={c.body} size={16} /></div>)}
          <div className="flex gap-2 items-center">
            <AnimatedEmojiPicker onSelect={(e) => setCbody((v) => v + e)} buttonClassName="w-7 h-7" />
            <input value={cbody} onChange={(e) => setCbody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addComment(); }} placeholder={t("communityCommentPlaceholder")} className="flex-1 bg-bg-elevated border border-border rounded-full px-3 py-1.5 text-xs outline-none focus:border-accent" />
            <button onClick={addComment} className="text-accent text-xs">{t("communitySend")}</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
