import { test, expect } from "@playwright/test";

// SEO 端點：robots.txt / sitemap.xml 用 request fixture 直接 GET、免開瀏覽器。
// robots 要含 AI 爬蟲允許路徑（/chapters /courses /blogs）。

test("/robots.txt 回 200 且含 AI 允許路徑", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/Allow:\s*\/chapters/);
  expect(body).toMatch(/Allow:\s*\/courses/);
  expect(body).toMatch(/Allow:\s*\/blogs/);
  // 至少列出一個已知 AI 爬蟲
  expect(body).toMatch(/GPTBot|ClaudeBot|PerplexityBot/);
});

test("/sitemap.xml 回 200 且是 XML", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("<urlset");
  expect(body).toContain("<loc>");
});
