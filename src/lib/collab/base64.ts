/**
 * Uint8Array <-> base64（瀏覽器安全）。
 * Supabase Realtime broadcast 的 payload 走 JSON，二進位 Yjs update 必須先轉字串。
 * 用 chunk 迴圈避免大 update 觸發 String.fromCharCode(...huge) 的 stack overflow。
 */

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000; // 32KB 一段，避免 apply spread 爆掉
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
