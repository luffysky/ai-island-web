/**
 * 前端：用 presigned URL 直接把檔案 PUT 到 R2（不經 server 記憶體 → 無大小上限、不 OOM）。
 * 失敗時 fallback 走 /api/upload（小檔）。回公開 URL。
 */
export async function uploadMedia(file: File): Promise<string> {
  // 1) 取 presigned URL
  try {
    const pres = await fetch("/api/upload/presign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", folder: "creator-island", size: file.size }),
    }).then((r) => r.json());
    if (pres?.uploadUrl && pres?.publicUrl) {
      const put = await fetch(pres.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (put.ok) return pres.publicUrl;
    }
  } catch { /* fallthrough */ }
  // 2) fallback：server proxy（小檔）
  const fd = new FormData(); fd.append("file", file);
  const r = await fetch("/api/upload", { method: "POST", body: fd }).then((x) => x.json());
  if (!r.url) throw new Error(r.message || "上傳失敗");
  return r.url;
}

export function mediaKindOf(file: File): "image" | "video" | "audio" | "file" {
  const t = file.type;
  return t.startsWith("image") ? "image" : t.startsWith("video") ? "video" : t.startsWith("audio") ? "audio" : "file";
}
