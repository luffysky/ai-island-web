/** Creator Island — 邀請碼 helper（hash 儲存、明碼只回一次）。 */
import { createHash, randomBytes } from "crypto";

export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateInviteCode(): string {
  return randomBytes(6).toString("base64url"); // ~8 字元、好分享
}
