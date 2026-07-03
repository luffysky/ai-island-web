"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { FloatingMenu } from "@tiptap/react/menus";
import { Node as TiptapNode } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
// 即時共編（opt-in）：只有 EngineWorkspace 傳 collab 時才載入這條路徑。
// ⚠️ TipTap v3（本專案 3.23.5）把 CollaborationCursor 改名為 CollaborationCaret、
//   套件 @tiptap/extension-collaboration-cursor → @tiptap/extension-collaboration-caret。
//   舊的 -cursor 套件停在 v2、跟 v3 core 不相容。故這裡用 -caret（= 需求說的 cursor 的 v3 版）。
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import type { Doc as YDoc } from "yjs";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  List as ListIcon, ListOrdered, Quote, Heading1, Heading2, Heading3,
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon, Undo, Redo,
  Highlighter, AlignLeft, AlignCenter, AlignRight,
  FileCode, Minus, CheckSquare, Upload, Loader2, Baseline, Type,
  Video as VideoIcon, Music, Youtube, Paperclip, Info, Download, Printer,
} from "lucide-react";
import { TextStyleColorSize } from "@/lib/tiptap-text-style";
import { useToast } from "@/components/ui/Toast";
import { CodeBlockUpgraded } from "./tiptap/code-block";
import { Callout } from "./tiptap/callout";
import { SlashCommand } from "./tiptap/slash-command";
import { MentionExt } from "./tiptap/mention-suggestion";
import { ExternalImageUpload } from "./tiptap/external-image";
import { AIBubbleMenu } from "./tiptap/ai-bubble-menu";
import { EmojiButton } from "./tiptap/emoji-picker";
import { computeStats, estimateReadingMinutes, type EditorStats } from "./tiptap/toc";

const lowlight = createLowlight(common);

// 影片節點：可上傳 MP4/WebM、文章內直接播放
const VideoNode = TiptapNode.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { src: { default: null }, controls: { default: true } };
  },
  parseHTML() { return [{ tag: "video[src]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["video", { controls: "true", preload: "metadata", playsinline: "true", class: "rounded-lg max-w-full my-3", ...HTMLAttributes }];
  },
});

// 音訊節點：可上傳 MP3/WAV/M4A、文章內直接播放
const AudioNode = TiptapNode.create({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { src: { default: null }, controls: { default: true } };
  },
  parseHTML() { return [{ tag: "audio[src]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["audio", { controls: "true", preload: "metadata", class: "w-full my-3", ...HTMLAttributes }];
  },
});

// 貼上/拖入外部圖片 → 抓回重傳 R2、換 src（連結防腐）。CORS 擋掉時 graceful 回 null、保留原 src。
async function uploadExternalImage(src: string): Promise<string | null> {
  try {
    const resp = await fetch(src, { mode: "cors" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    if (!blob.type.startsWith("image/")) return null;
    if (blob.size > 8 * 1024 * 1024) return null;
    const ext = (blob.type.split("/")[1] || "png").split("+")[0];
    const file = new File([blob], `pasted-${Date.now()}.${ext}`, { type: blob.type });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "blog");
    const up = await fetch("/api/upload", { credentials: "include", method: "POST", body: fd });
    const j = await up.json().catch(() => ({}));
    if (!up.ok) return null;
    return j.url ?? null;
  } catch {
    return null;
  }
}

interface BlogEditorProps {
  /** 單人模式的初始/受控內容。共編（collab）模式不需要、也不應傳（內容由 Yjs doc 掌控）。 */
  content?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  /** 編輯器就緒時回傳 editor 實例（給創作引擎做 AI 插入/取代選取）。 */
  onReady?: (editor: Editor) => void;
  /** 內文變動時回傳目錄 / 預估閱讀時間 / 字詞數（消費頁可自行渲染 TOC）。 */
  onStats?: (stats: EditorStats) => void;
  /**
   * 即時共編（opt-in）。傳入時：內容改由 Yjs 文件（doc）掌控——
   *  - 不吃 `content` prop、也不跑外部 content 同步 effect（避免與 Collaboration 重複灌內容）。
   *  - StarterKit 內建的 undo/redo（undoRedo）關掉，改用 Collaboration 的歷史。
   * 不傳時：行為 100% 不變（單人編輯，走 content / onChange）。
   */
  collab?: {
    doc: YDoc;
    /** 需帶 `.awareness`（給游標）；本專案是 SupabaseYjsProvider。 */
    provider: { awareness: unknown };
    user: { name: string; color: string };
  };
}

export function BlogEditor({ content, onChange, placeholder, editable = true, onReady, onStats, collab }: BlogEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      // 共編時關掉 StarterKit 的 undoRedo（歷史交給 Collaboration，否則會衝突）
      StarterKit.configure(collab ? { codeBlock: false, undoRedo: false } : { codeBlock: false }),
      Placeholder.configure({ placeholder: placeholder ?? "開始寫你的文章...（輸入 / 叫出指令選單）" }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-accent underline" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      VideoNode,
      AudioNode,
      Underline,
      TextStyleColorSize,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CharacterCount,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockUpgraded.configure({ lowlight }),
      Callout,
      SlashCommand,
      MentionExt,
      ExternalImageUpload.configure({ upload: uploadExternalImage }),
      Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: false, linkify: true }),
      // 共編擴充（僅 collab 存在時）——放最後、且不與 content prop 併用（見下方 content 守衛）
      ...(collab
        ? [
            Collaboration.configure({ document: collab.doc }),
            CollaborationCaret.configure({ provider: collab.provider as any, user: collab.user }),
          ]
        : []),
    ],
    // 共編時內容來源 = Yjs doc，絕不從 content prop 灌（否則會與 Collaboration 重複／打架）
    content: collab ? undefined : (content || ""),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      if (onStats) onStats(computeStats(editor));
    },
    editorProps: {
      attributes: {
        class: "prose-custom max-w-none min-h-[400px] focus:outline-none px-4 py-3",
      },
    },
  });

  // 外部 content 變動時同步（編輯既有文章）。共編時「絕不」跑——內容由 Yjs doc 掌控，
  // 若這裡 setContent 會蓋掉 / 重複灌 CRDT 內容（duplication bug）。
  useEffect(() => {
    if (collab) return;
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // editable 變動時同步到 editor
  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  // 就緒時回傳 editor 實例 + 首次 stats
  useEffect(() => {
    if (editor && onReady) onReady(editor);
    if (editor && onStats) onStats(computeStats(editor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) {
    return <div className="h-[460px] rounded-xl border border-border bg-bg-card animate-pulse" />;
  }

  const chars = editor.storage.characterCount.characters();
  const words = editor.storage.characterCount.words();

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {/* 只在列印時隱藏工具列 / 底部列 */}
      <style>{`@media print { .blog-editor-toolbar, .blog-editor-footer { display: none !important; } }`}</style>
      {editable && <Toolbar editor={editor} />}
      {editable && <AIBubbleMenu editor={editor} />}
      {editable && (
        <FloatingMenu editor={editor} options={{ placement: "left-start" }}>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-bg-card p-1 shadow-xl">
            <QuickBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="標題"><Heading2 size={15} /></QuickBtn>
            <QuickBtn onClick={() => editor.chain().focus().toggleBulletList().run()} title="項目清單"><ListIcon size={15} /></QuickBtn>
            <QuickBtn onClick={() => editor.chain().focus().toggleTaskList().run()} title="待辦"><CheckSquare size={15} /></QuickBtn>
            <QuickBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="程式碼區塊"><FileCode size={15} /></QuickBtn>
            <QuickBtn onClick={() => editor.chain().focus().setCallout("info").run()} title="提示框"><Info size={15} /></QuickBtn>
            <QuickBtn onClick={() => editor.view.dom.dispatchEvent(new CustomEvent("blogeditor:pick-image"))} title="圖片"><ImageIcon size={15} /></QuickBtn>
          </div>
        </FloatingMenu>
      )}
      <EditorContent editor={editor} />
      <div className="blog-editor-footer px-4 py-2 border-t border-border text-xs text-fg-muted flex flex-wrap gap-x-4 gap-y-1 justify-between">
        <span>{chars} 字</span>
        <span>約 {estimateReadingMinutes(chars, words)} 分鐘閱讀</span>
        <span>{words} 詞</span>
      </div>
    </div>
  );
}

function QuickBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title} className="p-1.5 rounded text-fg hover:bg-bg-elevated transition">
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    `p-1.5 rounded transition ${
      active
        ? "bg-accent text-black"
        : "hover:bg-bg-elevated text-fg"
    }`;

  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const addLink = () => {
    const url = window.prompt("連結網址：");
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
  };
  // 嵌入 YouTube / Vimeo 影片連結
  const addEmbed = () => {
    const url = window.prompt("貼上 YouTube 或 Vimeo 影片連結：");
    if (!url) return;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    let src = "";
    if (yt) src = `https://www.youtube.com/embed/${yt[1]}`;
    else if (vm) src = `https://player.vimeo.com/video/${vm[1]}`;
    else { toast.error("只支援 YouTube / Vimeo 連結"); return; }
    editor.chain().focus().insertContent(
      `<iframe src="${src}" class="w-full aspect-video rounded-lg my-4" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="影片"></iframe><p></p>`
    ).run();
  };
  // 上傳圖 / 影 / 音，依類型插入對應節點（文章內直接播放）
  const uploadAndInsert = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    if (!isImage && !isVideo && !isAudio) {
      toast.error("只支援 圖片 / 影片 / 音訊");
      return;
    }
    // 影片走 presign 直傳 R2（不經 server 記憶體、可到 500MB）；圖/音走一般上傳
    const maxMb = isImage ? 8 : isAudio ? 20 : 500;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`檔案不可超過 ${maxMb} MB`);
      return;
    }
    setUploading(true);
    try {
      let url: string;
      if (isVideo) {
        const ps = await fetch("/api/upload/presign", {
          credentials: "include", method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "blog", size: file.size }),
        });
        const pj = await ps.json();
        if (!ps.ok) throw new Error(pj.message || pj.error || "presign 失敗");
        const put = await fetch(pj.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!put.ok) throw new Error("直傳 R2 失敗（請確認 R2 已設 CORS 允許本站 PUT）");
        url = pj.publicUrl;
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "blog");
        const res = await fetch("/api/upload", { credentials: "include", method: "POST", body: fd });
        const j = await res.json();
        if (!res.ok) throw new Error(j.message || j.error || "上傳失敗");
        url = j.url;
      }
      if (isImage) editor.chain().focus().setImage({ src: url }).run();
      else if (isVideo) editor.chain().focus().insertContent(`<video src="${url}" controls></video>`).run();
      else editor.chain().focus().insertContent(`<audio src="${url}" controls></audio>`).run();
      toast.success("已插入");
    } catch (e: any) {
      toast.error(e?.message || "上傳失敗");
    } finally {
      setUploading(false);
    }
  };
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>, ref: React.RefObject<HTMLInputElement | null>) => {
    const f = e.target.files?.[0];
    if (f) uploadAndInsert(f);
    if (ref.current) ref.current.value = "";
  };

  // 任意檔案附件（pdf / word / excel / ppt / txt / md / zip…）→ 插入下載連結
  const fileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["pdf"].includes(ext)) return "📕";
    if (["doc", "docx"].includes(ext)) return "📘";
    if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
    if (["ppt", "pptx"].includes(ext)) return "📙";
    if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
    if (["md", "txt"].includes(ext)) return "📄";
    return "📎";
  };
  const uploadAttachment = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) { toast.error("附件不可超過 25 MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "blog");
      const res = await fetch("/api/upload", { credentials: "include", method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "上傳失敗");
      const kb = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
      editor.chain().focus().insertContent(
        `<p><a href="${j.url}" download="${file.name}" target="_blank" rel="noopener noreferrer">${fileIcon(file.name)} ${file.name}（${kb}）</a></p>`
      ).run();
      toast.success("已插入附件");
    } catch (e: any) {
      toast.error(e?.message || "上傳失敗");
    } finally {
      setUploading(false);
    }
  };
  const onPickAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAttachment(f);
    if (attachInputRef.current) attachInputRef.current.value = "";
  };
  // 拖放 / 貼上檔案到編輯器 → 自動上傳（圖/影/音內嵌、其他檔案插下載連結）
  // 另監聽 slash / FloatingMenu 觸發的「選圖片」事件。
  useEffect(() => {
    const el = (editor.view.dom as HTMLElement);
    const isMedia = (f: File) => f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/");
    const handle = (f?: File | null) => {
      if (!f) return false;
      if (isMedia(f)) uploadAndInsert(f);
      else uploadAttachment(f);
      return true;
    };
    const onDrop = (e: DragEvent) => {
      const f = e.dataTransfer?.files?.[0];
      if (f) { e.preventDefault(); handle(f); }
    };
    const onPaste = (e: ClipboardEvent) => {
      const f = e.clipboardData?.files?.[0];
      if (f) { e.preventDefault(); handle(f); }
    };
    const onPickImage = () => fileInputRef.current?.click();
    el.addEventListener("drop", onDrop);
    el.addEventListener("paste", onPaste);
    el.addEventListener("blogeditor:pick-image", onPickImage as EventListener);
    return () => {
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("paste", onPaste);
      el.removeEventListener("blogeditor:pick-image", onPickImage as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  // 匯出 Markdown（.md 下載）
  const exportMarkdown = () => {
    try {
      const md = (editor.storage as any).markdown?.getMarkdown?.() ?? "";
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `文章-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("匯出失敗");
    }
  };

  return (
    <div className="blog-editor-toolbar flex flex-wrap items-center gap-0.5 p-2 border-b border-border sticky top-0 bg-bg-card z-10 overflow-x-auto max-w-full">
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive("heading", { level: 1 }))} title="標題 1"><Heading1 size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))} title="標題 2"><Heading2 size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))} title="標題 3"><Heading3 size={16} /></button>
      <Sep />
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="粗體"><Bold size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="斜體"><Italic size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title="底線"><UnderlineIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))} title="刪除線"><Strikethrough size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={btn(editor.isActive("highlight"))} title="螢光標記"><Highlighter size={16} /></button>
      <Sep />
      <FontSizeSelect editor={editor} />
      <ColorButton editor={editor} />
      <EmojiButton editor={editor} />
      <Sep />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="項目符號"><ListIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="編號清單"><ListOrdered size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={btn(editor.isActive("taskList"))} title="待辦清單"><CheckSquare size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} title="引言"><Quote size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setCallout("info").run()} className={btn(editor.isActive("callout"))} title="提示框（注意 / 警告 / 成功；或用 / 指令）"><Info size={16} /></button>
      <Sep />
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive("code"))} title="行內程式碼"><Code size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive("codeBlock"))} title="程式碼區塊"><FileCode size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} title="分隔線"><Minus size={16} /></button>
      <Sep />
      <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btn(editor.isActive({ textAlign: "left" }))} title="靠左"><AlignLeft size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btn(editor.isActive({ textAlign: "center" }))} title="置中"><AlignCenter size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btn(editor.isActive({ textAlign: "right" }))} title="靠右"><AlignRight size={16} /></button>
      <Sep />
      <button type="button" onClick={addLink} className={btn(editor.isActive("link"))} title="連結"><LinkIcon size={16} /></button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={btn(false)}
        title="上傳圖片（也支援拖放 / 貼上）"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPickFile(e, fileInputRef)}
      />
      <button
        type="button"
        onClick={() => videoInputRef.current?.click()}
        disabled={uploading}
        className={btn(false)}
        title="上傳影片（MP4 / WebM / MOV，≤ 50MB、文章內直接播放）"
      >
        <VideoIcon size={16} />
      </button>
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => onPickFile(e, videoInputRef)}
      />
      <button
        type="button"
        onClick={() => audioInputRef.current?.click()}
        disabled={uploading}
        className={btn(false)}
        title="上傳音樂 / 音訊（MP3 / WAV / M4A / OGG，≤ 20MB、文章內直接播放）"
      >
        <Music size={16} />
      </button>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => onPickFile(e, audioInputRef)}
      />
      <button
        type="button"
        onClick={() => attachInputRef.current?.click()}
        disabled={uploading}
        className={btn(false)}
        title="上傳附件（PDF / Word / Excel / PPT / TXT / MD / ZIP… 任意檔案，≤ 25MB，插入下載連結）"
      >
        <Paperclip size={16} />
      </button>
      <input
        ref={attachInputRef}
        type="file"
        className="hidden"
        onChange={onPickAttachment}
      />
      <button type="button" onClick={addEmbed} className={btn(false)} title="嵌入 YouTube / Vimeo 影片連結"><Youtube size={16} /></button>
      <button type="button" onClick={addTable} className={btn(false)} title="表格"><TableIcon size={16} /></button>
      <Sep />
      <button type="button" onClick={exportMarkdown} className={btn(false)} title="匯出 Markdown（.md）"><Download size={16} /></button>
      <button type="button" onClick={() => window.print()} className={btn(false)} title="列印 / 匯出 PDF"><Printer size={16} /></button>
      <Sep />
      <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="復原"><Undo size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="重做"><Redo size={16} /></button>
    </div>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

const FONT_SIZES: { label: string; value: string }[] = [
  { label: "小", value: "13px" },
  { label: "正常", value: "" },
  { label: "中", value: "18px" },
  { label: "大", value: "22px" },
  { label: "特大", value: "28px" },
  { label: "超大", value: "36px" },
];

function FontSizeSelect({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes("textStyle").fontSize as string) || "";
  return (
    <span className="inline-flex items-center gap-1" title="字型大小">
      <Type size={15} className="text-fg-muted shrink-0" />
      <select
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setFontSize(v).run();
          else editor.chain().focus().unsetFontSize().run();
        }}
        className="bg-bg-elevated border border-border rounded px-1.5 py-1 text-xs outline-none focus:border-accent cursor-pointer"
      >
        {FONT_SIZES.map((s) => (
          <option key={s.label} value={s.value}>{s.label}</option>
        ))}
      </select>
    </span>
  );
}

// 字色盤 48 色（8 欄＝灰/紅/橙/黃/綠/青/藍/紫，6 列由淺到深）＋自訂取色器
const TEXT_COLORS = [
  "#ffffff", "#fecaca", "#fed7aa", "#fde68a", "#bbf7d0", "#99f6e4", "#bfdbfe", "#e9d5ff",
  "#d1d5db", "#fca5a5", "#fdba74", "#fcd34d", "#86efac", "#5eead4", "#93c5fd", "#d8b4fe",
  "#9ca3af", "#f87171", "#fb923c", "#fbbf24", "#4ade80", "#2dd4bf", "#60a5fa", "#c084fc",
  "#6b7280", "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#14b8a6", "#3b82f6", "#a855f7",
  "#374151", "#dc2626", "#ea580c", "#d97706", "#16a34a", "#0d9488", "#2563eb", "#9333ea",
  "#000000", "#991b1b", "#9a3412", "#92400e", "#15803d", "#0f766e", "#1d4ed8", "#7e22ce",
];

function ColorButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const originalRef = useRef<string>("");
  const active = ((editor.getAttributes("textStyle").color as string) || "").toLowerCase();

  const PANEL_W = 244;
  const openPanel = () => {
    originalRef.current = (editor.getAttributes("textStyle").color as string) || "";
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const left = Math.min(r.left, window.innerWidth - PANEL_W - 8);
      setPos({ top: r.bottom + 6, left: Math.max(8, left) });
    }
    setOpen(true);
  };
  const preview = (c: string) => editor.chain().focus().setColor(c).run(); // 即時預覽、不關閉
  const confirm = () => setOpen(false); // 保留預覽
  const cancel = () => {
    const o = originalRef.current;
    if (o) editor.chain().focus().setColor(o).run();
    else editor.chain().focus().unsetColor().run();
    setOpen(false);
  };

  // 點面板與按鈕以外 = 確定（保留目前預覽）
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? confirm() : openPanel())}
        className={`p-1.5 rounded transition ${open ? "bg-accent text-black" : "hover:bg-bg-elevated text-fg"}`}
        title="文字顏色"
      >
        <Baseline size={16} style={active ? { color: active } : undefined} />
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[80] p-2.5 rounded-lg border border-border bg-bg-card shadow-2xl"
          style={{ top: pos.top, left: pos.left, width: PANEL_W }}
        >
          <div className="grid grid-cols-8 gap-1.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => preview(c)}
                className={`w-6 h-6 rounded-full transition hover:scale-110 ${active === c ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-card" : ""}`}
                style={{ background: c, border: c === "#ffffff" ? "1px solid #d1d5db" : "1px solid rgba(0,0,0,0.12)" }}
                title={c}
                aria-label={`顏色 ${c}`}
              />
            ))}
          </div>
          <label className="mt-2.5 flex items-center gap-2 text-xs text-fg-muted cursor-pointer">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(active) ? active : "#000000"}
              onChange={(e) => preview(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border border-border p-0"
              title="自訂顏色"
            />
            自訂顏色
          </label>
          <div className="mt-2.5 flex items-center gap-1.5">
            <button type="button" onClick={cancel} className="flex-1 text-xs px-2 py-1 rounded border border-border text-fg-muted hover:bg-bg-elevated transition">取消</button>
            <button type="button" onClick={() => editor.chain().focus().unsetColor().run()} className="text-xs px-2 py-1 rounded border border-border text-fg-muted hover:bg-bg-elevated transition">清除</button>
            <button type="button" onClick={confirm} className="flex-1 text-xs px-2 py-1 rounded bg-accent text-black font-semibold hover:scale-105 transition">確定</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
