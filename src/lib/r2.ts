/**
 * Cloudflare R2 圖片 / 媒體儲存 helper
 *
 * 借鏡 insight-engine、用 @aws-sdk/client-s3 (R2 相容 S3 API)
 *
 * 必要 env:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_URL                (https://pub-xxx.r2.dev、無結尾斜線)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

let _client: S3Client | null = null;
function r2Client(): S3Client {
  if (_client) return _client;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID not set");
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
  return _client;
}

function bucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error("R2_BUCKET_NAME not set");
  return b;
}

function publicUrl(): string {
  const u = process.env.R2_URL;
  if (!u) throw new Error("R2_URL not set");
  return u.replace(/\/$/, "");
}

export function isR2Configured(): boolean {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME && process.env.R2_URL);
}

/** 上傳檔案到 R2、回完整 public URL */
export async function uploadToR2(
  body: Buffer | Uint8Array,
  originalName: string,
  contentType: string,
  folder: string = "uploads",
): Promise<string> {
  const safeFolder = folder.replace(/[^a-zA-Z0-9_/-]/g, "_").slice(0, 64);
  const ext = (originalName.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
  const hash = crypto.randomBytes(12).toString("hex");
  const key = `${safeFolder}/${Date.now()}-${hash}.${ext}`;

  await r2Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${publicUrl()}/${key}`;
}

/** 從 R2 刪除（用完整 URL、自動扣掉 publicUrl prefix 拿 key） */
export async function deleteFromR2(url: string): Promise<void> {
  const prefix = publicUrl();
  if (!url.startsWith(prefix)) return; // 非自家 R2 URL、不做
  const key = url.slice(prefix.length).replace(/^\//, "");
  if (!key) return;
  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
  );
}
