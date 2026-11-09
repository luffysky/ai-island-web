/** Vercel 函式請求上限 4.5 MB，留點 multipart 空間。超過就改走 presign 直傳 R2。 */
const API_BODY_LIMIT = 4 * 1024 * 1024;

/**
 * 取代 fetch("/api/upload", { method: "POST", body: fd })：
 * 小檔照舊走 API（會寫 media_assets），大檔直傳 R2。回傳 Response，JSON 同樣帶 url / message / error。
 */
export async function postUpload(fd: FormData): Promise<Response> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size <= API_BODY_LIMIT) {
    return fetch("/api/upload", { credentials: "include", method: "POST", body: fd });
  }

  const contentType = file.type || "application/octet-stream";
  const presign = await fetch("/api/upload/presign", {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType, folder: String(fd.get("folder") ?? "misc"), size: file.size }),
  });
  const signed = await presign.json().catch(() => ({}));
  if (!presign.ok) return Response.json(signed, { status: presign.status });

  const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
  if (!put.ok) return Response.json({ error: "r2_put_failed", message: "檔案上傳失敗，請稍後再試" }, { status: 502 });
  return Response.json({ ok: true, url: signed.publicUrl });
}
