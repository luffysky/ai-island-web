/**
 * LINE image message 下載 helper
 * student bot (line-webhook-user) 跟 admin bot (line-webhook) 共用
 *
 * LINE Messaging API：GET /v2/bot/message/{messageId}/content
 * 回 binary、Content-Type 是 image/jpeg / image/png / image/webp 等
 */
export type ImagePart = { data: string; mediaType: string };

export async function fetchLineImageBase64(messageId: string, channelAccessToken: string): Promise<ImagePart | null> {
  try {
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const buf = await res.arrayBuffer();
    // vision API 上限 ~5MB、給 8MB 容錯
    if (buf.byteLength > 8 * 1024 * 1024) return null;
    return {
      data: Buffer.from(buf).toString("base64"),
      mediaType: ct.split(";")[0].trim(),
    };
  } catch {
    return null;
  }
}
