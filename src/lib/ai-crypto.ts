// 簡易對稱加密、用於存 API key 到 DB
// 環境變數 AI_KEY_SECRET 必設（建議 32+ 字元、HEX 隨機）
import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getSecret(): string {
  const secret = process.env.AI_KEY_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // production 沒設就 throw、絕對不能用 fallback
      throw new Error(
        "AI_KEY_SECRET environment variable is required in production. " +
        "Generate one with: node scripts/generate-secrets.js"
      );
    }
    // dev 才允許 fallback、但 console 警告
    console.warn("[ai-crypto] AI_KEY_SECRET not set, using DEV-only fallback. DO NOT USE IN PRODUCTION!");
    return "default-dev-secret-only-for-local-development-do-not-use-in-prod";
  }
  if (secret.length < 32) {
    throw new Error("AI_KEY_SECRET must be at least 32 characters long");
  }
  return secret;
}

function getKey(): Buffer {
  // 32 bytes key
  return crypto.createHash("sha256").update(getSecret()).digest();
}

export function encryptKey(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptKey(encrypted: string): string {
  const [ivB64, tagB64, dataB64] = encrypted.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted key format");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// Mask API key for display
export function maskKey(key: string): string {
  if (key.length < 12) return "***";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
