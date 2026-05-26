"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X, ImagePlus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Folder = "avatar" | "blog" | "forum" | "comment" | "ai-attach" | "portfolio" | "social" | "misc";

export function ImageUploader({
  folder = "misc",
  value,
  onUploaded,
  onClear,
  shape = "rect",
  hint,
  maxSizeMB = 8,
  className = "",
}: {
  folder?: Folder;
  value?: string | null;
  onUploaded: (url: string) => void;
  onClear?: () => void;
  shape?: "rect" | "circle";
  hint?: string;
  maxSizeMB?: number;
  className?: string;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("只支援圖片");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`檔案大小不可超過 ${maxSizeMB} MB`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", {
      credentials: "include", method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "上傳失敗");
      onUploaded(j.url);
      toast.success("已上傳");
    } catch (e: any) {
      toast.error(e?.message || "上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const rounded = shape === "circle" ? "rounded-full aspect-square" : "rounded-xl";

  // 有圖：預覽 + 換 / 清
  if (value) {
    return (
      <div className={`relative inline-block ${className}`}>
        <div className={`overflow-hidden ${rounded} bg-bg-elevated border border-border`}>
          <Image
            src={value}
            alt=""
            width={shape === "circle" ? 96 : 320}
            height={shape === "circle" ? 96 : 180}
            unoptimized
            className={`object-cover ${shape === "circle" ? "w-24 h-24" : "w-full h-auto"}`}
          />
        </div>
        <div className="absolute -bottom-2 -right-2 flex gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="bg-bg-card border border-border rounded-full p-1.5 shadow hover:border-accent disabled:opacity-50"
            title="換一張"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          </button>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={uploading}
              className="bg-bg-card border border-red-500/40 text-red-400 rounded-full p-1.5 shadow hover:bg-red-500/10"
              title="移除"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileSelected}
        />
      </div>
    );
  }

  // 空狀態：拖放 / 點上傳區
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer flex flex-col items-center justify-center gap-2 text-center px-4 py-6 ${rounded} border-2 border-dashed transition ${
        dragOver ? "border-accent bg-accent/10" : "border-border hover:border-accent/50 bg-bg-elevated/30"
      } ${shape === "circle" ? "w-24 h-24" : "w-full"} ${className}`}
    >
      {uploading ? (
        <>
          <Loader2 size={20} className="animate-spin text-accent" />
          <span className="text-xs text-fg-muted">上傳中…</span>
        </>
      ) : (
        <>
          <ImagePlus size={shape === "circle" ? 20 : 28} className="text-fg-muted" />
          {shape !== "circle" && (
            <div className="text-xs text-fg-muted leading-relaxed">
              點此 / 拖曳上傳<br />
              <span className="text-[10px]">JPG / PNG / WebP / GIF · ≤ {maxSizeMB} MB</span>
              {hint && <div className="mt-1 text-[10px]">{hint}</div>}
            </div>
          )}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileSelected}
      />
    </div>
  );
}
