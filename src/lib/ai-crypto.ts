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

// ─── 從 DB 抓 provider plain key（取代散落各檔的 process.env.XXX_API_KEY） ───
//
// 林董：「所有用到那 4 個變數的地方都要這樣操作 是 db 去確認 env 的值」
//   - 4 個 provider 的 plain key 都存 ai_api_keys.api_key_encrypted、不放 env
//   - env 只放 AI_KEY_SECRET（用來解 DB 內的 encrypted）
//   - 換 secret = admin UI rekey（待做）+ 同步 Zeabur env
//
// 1 分鐘 in-memory cache（跟 ai-embeddings.ts 同 pattern、減少 DB hit）
const providerKeyCache = new Map<string, { key: string | null; ts: number }>();
const PROVIDER_KEY_TTL = 60_000;

// 少數 provider 的 key 放 env（不在 ai_api_keys 表）→ DB 沒有就退這裡。
function envProviderKey(provider: string): string | null {
  if (provider === "openrouter") return process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY || null;
  return null;
}

export async function getProviderKey(provider: string): Promise<string | null> {
  const cached = providerKeyCache.get(provider);
  if (cached && Date.now() - cached.ts < PROVIDER_KEY_TTL) return cached.key;

  // dynamic import 避免 circular（supabase-admin → 這檔）
  const { createSupabaseAdmin } = await import("./supabase-admin");
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", provider)
    .maybeSingle();

  if (!data || !(data as any).enabled) {
    const envKey = envProviderKey(provider);
    providerKeyCache.set(provider, { key: envKey, ts: Date.now() });
    return envKey;
  }

  try {
    const key = decryptKey((data as any).api_key_encrypted);
    providerKeyCache.set(provider, { key, ts: Date.now() });
    return key;
  } catch (e: any) {
    console.warn(`[ai-crypto] decrypt ${provider} key failed:`, e?.message);
    const envKey = envProviderKey(provider);
    providerKeyCache.set(provider, { key: envKey, ts: Date.now() });
    return envKey;
  }
}

export function invalidateProviderKeyCache(provider?: string) {
  if (provider) providerKeyCache.delete(provider);
  else providerKeyCache.clear();
}
