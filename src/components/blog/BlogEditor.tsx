"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
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
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  List as ListIcon, ListOrdered, Quote, Heading1, Heading2, Heading3,
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon, Undo, Redo,
  Highlighter, AlignLeft, AlignCenter, AlignRight,
  FileCode, Minus, CheckSquare, Upload, Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const lowlight = createLowlight(common);

interface BlogEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function BlogEditor({ content, onChange, placeholder }: BlogEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({ placeholder: placeholder ?? "開始寫你的文章..." }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-accent underline" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CharacterCount,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose-custom max-w-none min-h-[400px] focus:outline-none px-4 py-3",
      },
    },
  });

  // 外部 content 變動時同步（編輯既有文章）
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) {
    return <div className="h-[460px] rounded-xl border border-border bg-bg-card animate-pulse" />;
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="px-4 py-2 border-t border-border text-xs text-fg-muted flex justify-between">
        <span>{editor.storage.characterCount.characters()} 字</span>
        <span>{editor.storage.characterCount.words()} 詞</span>
      </div>
    </div>
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
  const [uploading, setUploading] = useState(false);

  const addLink = () => {
    const url = window.prompt("連結網址：");
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
  };
  const addImageByUrl = () => {
    const url = window.prompt("圖片網址（或直接點右邊上傳）：");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };
  const uploadAndInsert = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("只支援圖片");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("檔案不可超過 8 MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "blog");
      const res = await fetch("/api/upload", {
      credentials: "include", method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "上傳失敗");
      editor.chain().focus().setImage({ src: j.url }).run();
      toast.success("已插入");
    } catch (e: any) {
      toast.error(e?.message || "上傳失敗");
    } finally {
      setUploading(false);
    }
  };
  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAndInsert(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  // 拖放 / 貼上圖片到編輯器 → 自動上傳
  useEffect(() => {
    const el = (editor.view.dom as HTMLElement);
    const onDrop = (e: DragEvent) => {
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith("image/")) {
        e.preventDefault();
        uploadAndInsert(f);
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const f = e.clipboardData?.files?.[0];
      if (f && f.type.startsWith("image/")) {
        e.preventDefault();
        uploadAndInsert(f);
      }
    };
    el.addEventListener("drop", onDrop);
    el.addEventListener("paste", onPaste);
    return () => {
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("paste", onPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border sticky top-0 bg-bg-card z-10 overflow-x-auto">
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
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="項目符號"><ListIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="編號清單"><ListOrdered size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={btn(editor.isActive("taskList"))} title="待辦清單"><CheckSquare size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} title="引言"><Quote size={16} /></button>
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
      <button type="button" onClick={addImageByUrl} className={btn(false)} title="圖片網址（或拖放 / 貼上 / 按下面上傳）"><ImageIcon size={16} /></button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={btn(false)}
        title="從電腦上傳圖片"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onPickImage}
      />
      <button type="button" onClick={addTable} className={btn(false)} title="表格"><TableIcon size={16} /></button>
      <Sep />
      <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="復原"><Undo size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="重做"><Redo size={16} /></button>
    </div>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-border mx-1" />;
}
