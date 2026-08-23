import { describe, it, expect } from "vitest";
import {
  sha256, normalizeForHash, normalizeUrl, itemContentHash,
  parseSitemap, sitemapEntryToItem, parseJsonApi, parseSourceBody,
} from "./opportunity-radar";

describe("normalizeForHash", () => {
  it("壓平空白、去頭尾、轉小寫", () => {
    expect(normalizeForHash("  Hello   World \n")).toBe("hello world");
    expect(normalizeForHash(null)).toBe("");
    expect(normalizeForHash(undefined)).toBe("");
  });
});

describe("normalizeUrl", () => {
  it("去掉 utm_/fbclid 等追蹤參數、保留真參數並排序", () => {
    expect(normalizeUrl("https://ex.com/a?utm_source=fb&id=3&fbclid=xyz"))
      .toBe("https://ex.com/a?id=3");
    expect(normalizeUrl("https://ex.com/a?b=2&a=1")).toBe("https://ex.com/a?a=1&b=2");
  });
  it("去結尾斜線與 hash，但根路徑的 / 保留", () => {
    expect(normalizeUrl("https://ex.com/path/#frag")).toBe("https://ex.com/path");
    expect(normalizeUrl("https://ex.com/")).toBe("https://ex.com/");
  });
  it("壞 URL 不炸、回傳修剪後原字串", () => {
    expect(normalizeUrl("  not a url ")).toBe("not a url");
  });
});

describe("itemContentHash", () => {
  it("同內容 → 同 hash；純空白差異不算變動", () => {
    const a = itemContentHash({ title: "AI 競賽", summary: "獎金 100 萬" });
    const b = itemContentHash({ title: "  AI 競賽 ", summary: "獎金   100 萬 " });
    expect(a).toBe(b);
  });
  it("內容真的變了 → hash 不同", () => {
    const a = itemContentHash({ title: "AI 競賽", summary: "獎金 100 萬" });
    const b = itemContentHash({ title: "AI 競賽", summary: "獎金 200 萬" });
    expect(a).not.toBe(b);
  });
  it("sha256 穩定", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

const SITEMAP = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://gov.tw/grants/ai-2026-award</loc><lastmod>2026-07-01</lastmod></url>
  <url><loc>https://gov.tw/grants/youth-startup</loc></url>
  <url><loc>ftp://bad/not-http</loc></url>
</urlset>`;

const SITEMAP_INDEX = `<?xml version="1.0"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://gov.tw/sitemap-1.xml</loc></sitemap>
  <sitemap><loc>https://gov.tw/sitemap-2.xml</loc></sitemap>
</sitemapindex>`;

describe("parseSitemap", () => {
  it("抽 <url><loc> 並跳過非 http", () => {
    const { urls } = parseSitemap(SITEMAP);
    expect(urls).toHaveLength(2);
    expect(urls[0].loc).toBe("https://gov.tw/grants/ai-2026-award");
    expect(urls[0].lastmod).toBe("2026-07-01T00:00:00.000Z");
    expect(urls[1].lastmod).toBeNull();
  });
  it("sitemap index → 回傳子 sitemap 連結", () => {
    const { sitemaps } = parseSitemap(SITEMAP_INDEX);
    expect(sitemaps).toEqual(["https://gov.tw/sitemap-1.xml", "https://gov.tw/sitemap-2.xml"]);
  });
  it("sitemapEntryToItem：slug 人可讀化當標題", () => {
    const it = sitemapEntryToItem({ loc: "https://gov.tw/grants/ai-2026-award", lastmod: null });
    expect(it.title).toBe("ai 2026 award");
    expect(it.link).toBe("https://gov.tw/grants/ai-2026-award");
  });
});

describe("parseJsonApi", () => {
  const json = {
    data: {
      results: [
        { name: "AI Grant", url: "https://ex.com/1", desc: "$1M", when: "2026-06-01" },
        { name: "No Link", url: "", desc: "skip me" },
        { name: "Startup Comp", url: "https://ex.com/2", desc: "join now" },
      ],
    },
  };
  it("依 mapping 抽 items（對不到 URL 的跳過）", () => {
    const items = parseJsonApi(json, {
      itemsPath: "data.results", titleField: "name", urlField: "url",
      summaryField: "desc", publishedField: "when",
    });
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("AI Grant");
    expect(items[0].summary).toBe("$1M");
    expect(items[0].publishedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(items[1].link).toBe("https://ex.com/2");
  });
  it("整個回應就是陣列（無 itemsPath）", () => {
    const items = parseJsonApi(
      [{ t: "X", u: "https://ex.com/x" }],
      { titleField: "t", urlField: "u" },
    );
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("X");
  });
  it("非陣列或壞路徑 → 空陣列", () => {
    expect(parseJsonApi({}, { itemsPath: "nope", titleField: "t", urlField: "u" })).toEqual([]);
  });
});

describe("parseSourceBody", () => {
  it("rss/atom 走 parseFeed", () => {
    const rss = `<rss><channel><item><title>T</title><link>https://e.com/a</link></item></channel></rss>`;
    expect(parseSourceBody("rss", rss)).toHaveLength(1);
  });
  it("sitemap 走 parseSitemap→item", () => {
    const items = parseSourceBody("sitemap", SITEMAP);
    expect(items).toHaveLength(2);
    expect(items[0].link).toBe("https://gov.tw/grants/ai-2026-award");
  });
  it("api 沒給 mapping → 空", () => {
    expect(parseSourceBody("api", "[]")).toEqual([]);
  });
  it("api 給 mapping 且 body 壞 JSON → 空、不炸", () => {
    expect(parseSourceBody("api", "not json", {
      apiMapping: { titleField: "t", urlField: "u" },
    })).toEqual([]);
  });
});
