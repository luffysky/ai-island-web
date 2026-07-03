import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

const r = robots();

function ruleFor(ua: string) {
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
  return rules.find((x) => x.userAgent === ua);
}

describe("robots — AI bot rules", () => {
  it("AI bots are restricted to exactly the public content areas", () => {
    const gpt = ruleFor("GPTBot");
    const claude = ruleFor("ClaudeBot");
    expect(gpt?.allow).toEqual(["/chapters", "/courses", "/blogs"]);
    expect(claude?.allow).toEqual(["/chapters", "/courses", "/blogs"]);
    expect(gpt?.disallow).toBe("/");
    expect(claude?.disallow).toBe("/");
  });

  it("includes the major AI crawlers (GPTBot + ClaudeBot)", () => {
    expect(ruleFor("GPTBot")).toBeTruthy();
    expect(ruleFor("ClaudeBot")).toBeTruthy();
    expect(ruleFor("PerplexityBot")).toBeTruthy();
  });

  it("the wildcard rule allows the site but disallows private areas incl. /admin and /api", () => {
    const star = ruleFor("*");
    expect(star?.allow).toBe("/");
    const disallow = star?.disallow as string[];
    expect(disallow).toContain("/api/");
    expect(disallow).toContain("/admin");
    expect(disallow).toContain("/me/");
  });

  it("exposes a sitemap and host", () => {
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
    expect(typeof r.host).toBe("string");
  });
});
