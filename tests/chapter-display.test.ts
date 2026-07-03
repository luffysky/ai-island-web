import { describe, it, expect } from "vitest";
import {
  chapterDisplayNumber,
  chapterDisplayLabel,
  chapterDisplayNumberById,
  chapterDisplayLabelById,
} from "@/lib/chapter-display";

describe("chapterDisplayNumber — sortIndex → display number", () => {
  it("integer sortIndex → zero-padded base number", () => {
    expect(chapterDisplayNumber({ id: 8 })).toBe("08");
    expect(chapterDisplayNumber({ id: 8, sortIndex: 8 })).toBe("08");
    expect(chapterDisplayNumber({ id: 28, sortIndex: 28 })).toBe("28");
  });

  it(".5/.6 → suffix a", () => {
    expect(chapterDisplayNumber({ id: 72, sortIndex: 8.5 })).toBe("08a");
    expect(chapterDisplayNumber({ id: 99, sortIndex: 8.6 })).toBe("08a");
  });

  it(".7/.8 → suffix b", () => {
    expect(chapterDisplayNumber({ id: 74, sortIndex: 9.7 })).toBe("09b");
    expect(chapterDisplayNumber({ id: 99, sortIndex: 9.8 })).toBe("09b");
  });

  it(".9 → suffix c", () => {
    expect(chapterDisplayNumber({ id: 79, sortIndex: 28.9 })).toBe("28c");
  });

  it("falls back to id when sortIndex is absent", () => {
    expect(chapterDisplayNumber({ id: 5 })).toBe("05");
  });
});

describe("chapterDisplayLabel", () => {
  it("prefixes with Ch", () => {
    expect(chapterDisplayLabel({ id: 72, sortIndex: 8.5 })).toBe("Ch08a");
    expect(chapterDisplayLabel({ id: 8 })).toBe("Ch08");
  });
});

describe("by-id helpers use the built-in sortIndex override table", () => {
  it("maps known derived chapter ids", () => {
    expect(chapterDisplayNumberById(72)).toBe("08a"); // React 進階
    expect(chapterDisplayNumberById(77)).toBe("28a"); // 機器學習
    expect(chapterDisplayNumberById(79)).toBe("28c"); // 語言模型
    expect(chapterDisplayLabelById(75)).toBe("Ch04a"); // HTTP
  });

  it("an unlisted id just uses its own number", () => {
    expect(chapterDisplayNumberById(12)).toBe("12");
    expect(chapterDisplayLabelById(3)).toBe("Ch03");
  });
});
