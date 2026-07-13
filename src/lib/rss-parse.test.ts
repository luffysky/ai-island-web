import { describe, it, expect } from "vitest";
import { parseFeed } from "./rss-parse";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
<title>Feed</title>
<item><title>2026 AI 創新競賽</title><link>https://example.gov.tw/a</link>
<description><![CDATA[獎金 100 萬，<b>免報名費</b>]]></description><pubDate>Mon, 06 Jul 2026 08:00:00 +0800</pubDate></item>
<item><title>青年創業補助</title><link>https://example.gov.tw/b</link>
<description>補助說明 &amp; 資格</description></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Hackathon 2026</title><link href="https://ex.org/h" rel="alternate"/>
<summary>Build with AI</summary><published>2026-07-01T00:00:00Z</published></entry>
</feed>`;

describe("parseFeed", () => {
  it("解析 RSS item：title/link/summary/date", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("2026 AI 創新競賽");
    expect(items[0].link).toBe("https://example.gov.tw/a");
    expect(items[0].summary).toContain("獎金 100 萬");
    expect(items[0].summary).toContain("免報名費");
    expect(items[0].publishedAt).toBe("2026-07-06T00:00:00.000Z"); // +0800 → UTC
  });

  it("解 CDATA 與 HTML entity、去標籤", () => {
    const items = parseFeed(RSS);
    expect(items[1].summary).toBe("補助說明 & 資格");
    expect(items[1].publishedAt).toBeNull();
  });

  it("解析 Atom entry：link href", () => {
    const items = parseFeed(ATOM);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Hackathon 2026");
    expect(items[0].link).toBe("https://ex.org/h");
  });

  it("空/壞 XML 不炸", () => {
    expect(parseFeed("")).toEqual([]);
    expect(parseFeed("<html>no items</html>")).toEqual([]);
  });
});
