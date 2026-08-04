import { describe, it, expect } from "vitest";
import { speechErrorMessage, normalizeRecognitionError } from "./speech-error-message";

describe("speechErrorMessage", () => {
  it("各錯誤碼給繁中、非原始 exception", () => {
    expect(speechErrorMessage("permission-denied")).toContain("麥克風");
    expect(speechErrorMessage("not-supported")).toContain("不支援");
    expect(speechErrorMessage("no-speech")).toContain("沒有偵測到");
    expect(speechErrorMessage({ code: "network" })).toContain("網路");
  });

  it("未知碼 fallback", () => {
    // @ts-expect-error 測試未知碼
    expect(speechErrorMessage("weird")).toBe(speechErrorMessage("unknown"));
  });
});

describe("normalizeRecognitionError", () => {
  it("瀏覽器 error 字串 → 我們的 code", () => {
    expect(normalizeRecognitionError("not-allowed")).toBe("permission-denied");
    expect(normalizeRecognitionError("service-not-allowed")).toBe("permission-denied");
    expect(normalizeRecognitionError("no-speech")).toBe("no-speech");
    expect(normalizeRecognitionError("audio-capture")).toBe("audio-capture");
    expect(normalizeRecognitionError("network")).toBe("network");
    expect(normalizeRecognitionError("aborted")).toBe("aborted");
    expect(normalizeRecognitionError(undefined)).toBe("unknown");
    expect(normalizeRecognitionError("something-else")).toBe("unknown");
  });
});
