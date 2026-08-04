import { describe, it, expect } from "vitest";
import {
  validateInternalPath, validateExternalUrl, canTransition, isTerminal,
  needsUserGesture, isStale, STALE_ACK_MS, type ClientAction,
} from "./client-actions";

describe("validateInternalPath", () => {
  it("接受站內白名單路徑（含連字號路由）", () => {
    expect(validateInternalPath("/").ok).toBe(true);
    expect(validateInternalPath("/chapters/ch26").ok).toBe(true);
    expect(validateInternalPath("/message-coach").ok).toBe(true);   // 連字號不可被擋
    expect(validateInternalPath("/creator-island").ok).toBe(true);
    expect(validateInternalPath("/fortune?tab=bazi#top").ok).toBe(true);
  });
  it("擋 protocol / 雙斜線跳轉 / 外部 / traversal / 非白名單", () => {
    expect(validateInternalPath("//evil.com").ok).toBe(false);        // 協定相對
    expect(validateInternalPath("https://x.com").ok).toBe(false);     // 未以 / 開頭
    expect(validateInternalPath("/chapters/../admin").ok).toBe(false);// traversal
    expect(validateInternalPath("/admin").ok).toBe(false);            // 非白名單
    expect(validateInternalPath("/debug").ok).toBe(false);            // 非白名單
    expect(validateInternalPath("javascript:alert(1)").ok).toBe(false);
    expect(validateInternalPath("/foo bar").ok).toBe(false);          // 含空白
    expect(validateInternalPath(123).ok).toBe(false);                 // 非字串
  });
});

describe("validateExternalUrl", () => {
  it("正式只允許 https", () => {
    expect(validateExternalUrl("https://youtube.com").ok).toBe(true);
    expect(validateExternalUrl("http://example.com").ok).toBe(false);
  });
  it("擋 javascript:/data:/file:/blob:", () => {
    expect(validateExternalUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateExternalUrl("data:text/html,x").ok).toBe(false);
    expect(validateExternalUrl("file:///etc/passwd").ok).toBe(false);
    expect(validateExternalUrl("blob:https://x/y").ok).toBe(false);
  });
  it("dev 允許 localhost（http）", () => {
    expect(validateExternalUrl("http://localhost:3000/x", { allowLocalhost: true }).ok).toBe(true);
    expect(validateExternalUrl("http://localhost:3000/x").ok).toBe(false);   // 未開 allowLocalhost
    expect(validateExternalUrl("http://evil.com", { allowLocalhost: true }).ok).toBe(false); // 非 localhost
  });
  it("亂字串 → 不 ok", () => {
    expect(validateExternalUrl("not a url").ok).toBe(false);
    expect(validateExternalUrl(42).ok).toBe(false);
  });
});

describe("狀態機 canTransition / isTerminal", () => {
  it("合法轉移", () => {
    expect(canTransition("pending", "acknowledged")).toBe(true);
    expect(canTransition("pending", "completed")).toBe(true);
    expect(canTransition("acknowledged", "completed")).toBe(true);
    expect(canTransition("acknowledged", "failed")).toBe(true);
  });
  it("completed/cancelled 不可再轉移（冪等）；failed 可手動重試再推進", () => {
    expect(canTransition("completed", "failed")).toBe(false);
    expect(canTransition("cancelled", "acknowledged")).toBe(false);
    expect(canTransition("failed", "completed")).toBe(true);      // 手動重試
    expect(canTransition("failed", "acknowledged")).toBe(true);
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("failed")).toBe(true);                       // settled（輪詢可停）
    expect(isTerminal("pending")).toBe(false);
  });
});

describe("needsUserGesture / isStale", () => {
  const base = { id: "a1", createdAt: "2026-08-05T00:00:00.000Z" };
  it("只有 new-tab open_url 需要使用者手勢", () => {
    expect(needsUserGesture({ ...base, type: "open_url", url: "https://x.com", target: "new-tab", status: "pending" } as ClientAction)).toBe(true);
    expect(needsUserGesture({ ...base, type: "open_url", url: "https://x.com", target: "same-tab", status: "pending" } as ClientAction)).toBe(false);
    expect(needsUserGesture({ ...base, type: "navigate_internal", path: "/agent", status: "pending" } as ClientAction)).toBe(false);
  });
  it("acknowledged 逾時算 stale、其他狀態不算", () => {
    const ackAt = "2026-08-05T00:00:00.000Z";
    const now = new Date(ackAt).getTime();
    const a: ClientAction = { ...base, type: "navigate_internal", path: "/agent", status: "acknowledged", acknowledgedAt: ackAt };
    expect(isStale(a, now + STALE_ACK_MS + 1)).toBe(true);
    expect(isStale(a, now + 1000)).toBe(false);
    expect(isStale({ ...a, status: "pending" }, now + STALE_ACK_MS + 1)).toBe(false);
    expect(isStale({ ...a, status: "completed" }, now + STALE_ACK_MS + 1)).toBe(false);
  });
});
