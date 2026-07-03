import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/blog-types";
import { sanitizeRichHtml } from "@/lib/rich-html";

describe("slugify", () => {
  it("lowercases, trims and hyphenates spaces", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });
  it("collapses repeated separators and strips punctuation", () => {
    expect(slugify("Hello,   World!!!")).toBe("hello-world");
  });
  it("keeps CJK characters", () => {
    expect(slugify("學習 JavaScript 入門")).toBe("學習-javascript-入門");
  });
  it("caps length at 80 chars", () => {
    expect(slugify("a".repeat(200)).length).toBe(80);
  });
  it("falls back to a post-<ts> slug when everything is stripped", () => {
    expect(slugify("!!!")).toMatch(/^post-\d+$/);
  });
});

describe("sanitizeRichHtml — XSS scrubbing", () => {
  it("returns empty string for non-string input", () => {
    expect(sanitizeRichHtml(null)).toBe("");
    expect(sanitizeRichHtml(123)).toBe("");
  });
  it("strips <script> blocks entirely", () => {
    const out = sanitizeRichHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).toContain("<p>ok</p>");
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("alert(1)");
  });
  it("removes inline event handlers", () => {
    const out = sanitizeRichHtml('<img src="x" onerror="hack()">');
    expect(out).not.toMatch(/onerror/i);
  });
  it("neutralizes javascript: URLs", () => {
    const out = sanitizeRichHtml('<a href="javascript:evil()">x</a>');
    expect(out).not.toMatch(/javascript:/i);
  });
  it("drops iframes and style blocks", () => {
    const out = sanitizeRichHtml('<iframe src="//evil"></iframe><style>*{}</style><b>keep</b>');
    expect(out).not.toMatch(/<iframe/i);
    expect(out).not.toMatch(/<style/i);
    expect(out).toContain("<b>keep</b>");
  });
  it("keeps benign formatting untouched", () => {
    const html = '<p><strong>Hi</strong> <em>there</em></p>';
    expect(sanitizeRichHtml(html)).toBe(html);
  });
});
