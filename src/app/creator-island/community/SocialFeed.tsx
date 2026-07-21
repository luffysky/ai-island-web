"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Film, Music, Heart, MessageCircle, FileText, Link2, Bookmark, Globe, Users, User } from "lucide-react";
import { uploadMedia } from "@/lib/creator-upload";
import { useConfirm, usePrompt } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { handleEnterSubmit, autoGrow } from "@/lib/composer";
import { AnimatedEmojiPicker } from "@/components/ui/AnimatedEmojiPicker";
import { GifPicker } from "@/components/ui/GifPicker";
import { EmojiText } from "@/components/ui/EmojiText";
import { TranslateButton } from "@/components/ui/TranslateButton";
import Link from "next/link";
import { MentionTextarea, resolveMentions, type Mention } from "@/components/ui/MentionTextarea";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { X } from "lucide-react";

const MAX_IMAGES = 20;

const _IMG = /^https?:\/\/[^\s]+\.(gif|png|jpe?g|webp|svg)(\?[^\s]*)?$/i;
const _GIPHY = /^https?:\/\/(media\d?\.giphy\.com|i\.giphy\.com)\/[^\s]+/i;
/** 貼文/留言內文：@提及 token→可點連結、GIF/圖片網址→<img>、其他網址→連結、純文字→動態 emoji。 */
function renderBody(text: string) {
  const out: React.ReactNode[] = [];
  let key = 0;
  text.split(/(\[\[user:[0-9a-fA-F-]{36}\|[^\]]*\]\])/g).forEach((seg) => {
    if (!seg) return;
    const um = seg.match(/^\[\[user:([0-9a-fA-F-]{36})\|([^\]]*)\]\]$/);
    if (um) { out.push(<Link key={key++} href={`/forum/user/${um[1]}` as any} className="font-medium text-accent hover:underline">@{um[2] || "用戶"}</Link>); return; }
    seg.split(/(https?:\/\/[^\s]+)/g).forEach((p) => {
      if (!p) return;
      if (_IMG.test(p) || _GIPHY.test(p)) out.push(<img key={key++} src={p} alt="gif" loading="lazy" className="block max-w-[240px] max-h-[240px] rounded-lg my-1" />);
      else if (/^https?:\/\//.test(p)) out.push(<a key={key++} href={p} target="_blank" rel="noreferrer" className="text-accent underline break-all">{p}</a>);
      else out.push(<EmojiText key={key++} text={p} size={18} />);
    });
  });
  return out;
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

  async function attach(kind: "video" | "audio", file: File) {
    setErr(null); setBusy("upload");
    try {
      const url = await uploadFile(file);
      if (kind === "video") setVideo(url);
      else setAudio(url);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  // 圖片可一次選多張、最多 20 張（IG 風輪播）
  async function attachImages(files: FileList) {
    setErr(null);
    const room = MAX_IMAGES - imgs.length;
    if (room <= 0) { setErr(`最多只能上傳 ${MAX_IMAGES} 張圖片`); return; }
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) setErr(`最多 ${MAX_IMAGES} 張，只加了前 ${room} 張`);
    setBusy("upload");
    try {
      const urls = await Promise.all(picked.map((f) => uploadFile(f)));
      setImgs((p) => [...p, ...urls].slice(0, MAX_IMAGES));
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  const removeImg = (i: number) => setImgs((p) => p.filter((_, k) => k !== i));
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
        {imgs.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-2 flex-wrap">
              {imgs.map((u, i) => (
                <div key={i} className="relative w-16 h-16 group/thumb">
                  <img src={u} className="w-16 h-16 rounded object-cover" />
                  <button type="button" onClick={() => removeImg(i)} aria-label="移除" className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white grid place-items-center opacity-0 group-hover/thumb:opacity-100 transition"><X size={12} /></button>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-fg-muted">{imgs.length}/{MAX_IMAGES} 張</div>
          </div>
        )}
        {video && <video src={video} controls className="w-full rounded-lg max-h-60" />}
        {audio && <audio src={audio} controls className="w-full" />}
        <div className="flex items-center gap-2 text-sm">
          <label className="cursor-pointer hover:text-accent" title={`${t("communityAttachImage")}（最多 ${MAX_IMAGES} 張）`}><ImageIcon size={18} /><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const fs = e.target.files; if (fs && fs.length) attachImages(fs); e.currentTarget.value = ""; }} /></label>
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
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [showC, setShowC] = useState(false);
  const [comments, setComments] = useState<any[] | null>(null);
  const [cbody, setCbody] = useState("");
  const [cmentions, setCmentions] = useState<Mention[]>([]);
  const confirm = useConfirm();
  const prompt = usePrompt();
  const toast = useToast();

  async function like() { try { const r = await call(`/api/creator-island/social/posts/${p.id}/like`, "POST"); setLiked(r.on); setLikes((n) => n + (r.on ? 1 : -1)); } catch {} }
  async function bookmark() { try { const r = await call(`/api/creator-island/social/posts/${p.id}/bookmark`, "POST"); setSaved(r.on); } catch {} }
  async function follow() { if (followBusy) return; setFollowBusy(true); try { const r = await call(`/api/creator-island/community/follow`, "POST", { targetType: "creator", targetId: p.user_id }); setFollowing(r.on); } catch {} finally { setFollowBusy(false); } }
  async function loadComments() { setShowC((s) => !s); if (comments) return; try { const j = await call(`/api/creator-island/social/posts/${p.id}/comments`, "GET"); setComments(j.comments ?? []); } catch {} }
  async function addComment() { if (!cbody.trim()) return; const body = resolveMentions(cbody.trim(), cmentions); try { const j = await call(`/api/creator-island/social/posts/${p.id}/comments`, "POST", { body }); setComments((c) => [...(c ?? []), j.comment]); setCbody(""); setCmentions([]); } catch {} }
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
        {p.user_id !== meId && (
          <button onClick={follow} disabled={followBusy}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition disabled:opacity-50 ${following ? "border-border text-fg-muted" : "border-accent/50 text-accent hover:bg-accent/10"}`}>
            {following ? "追蹤中" : "＋ 追蹤"}
          </button>
        )}
        {p.type === "reel" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300">{t("communityReelBadge")}</span>}
        <span className="ml-auto text-[10px] text-fg-muted">{new Date(p.created_at).toLocaleString("zh-TW")}</span>
        {p.user_id === meId && <button onClick={del} className="text-fg-muted hover:text-red-400 text-xs">{t("communityDeleteShort")}</button>}
      </div>
      {p.content && <div className="text-sm whitespace-pre-wrap">{renderBody(p.content)}</div>}
      {p.content && <TranslateButton text={p.content} />}
      {p.images?.length > 0 && <ImageCarousel images={p.images} maxHeight="max-h-96" />}
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
          {(comments ?? []).map((c) => <div key={c.id} className="text-xs"><div><b>{name(c.author)}</b> {renderBody(c.body)}</div><TranslateButton text={c.body} /></div>)}
          <div className="flex gap-2 items-center">
            <AnimatedEmojiPicker onSelect={(e) => setCbody((v) => v + e)} buttonClassName="w-7 h-7" />
            <GifPicker onSelect={(url) => setCbody((v) => (v ? v + " " : "") + url + " ")} />
            <div className="flex-1">
              <MentionTextarea rows={1} value={cbody} onChange={setCbody} onPick={(m) => setCmentions((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))} onInput={(e) => autoGrow(e.currentTarget, 100)} onKeyDown={(e) => handleEnterSubmit(e, addComment)} placeholder={t("communityCommentPlaceholder")} className="w-full bg-bg-elevated border border-border rounded-2xl px-3 py-1.5 text-xs outline-none focus:border-accent resize-none" style={{ maxHeight: "100px" }} />
            </div>
            <button onClick={addComment} className="text-accent text-xs">{t("communitySend")}</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
