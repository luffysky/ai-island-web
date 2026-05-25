import { NextResponse } from "next/server";
import { getChapterMetas } from "@/lib/content";
import { DUNGEONS } from "@/data/dungeons";
import { SITE_STATS } from "@/lib/site-stats";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw";

/**
 * /llms.txt — Generative Engine Optimization (GEO)
 *
 * 給 LLM / AI bot (ChatGPT / Claude / Perplexity / Gemini / 等)
 * 抓網站結構用的標準格式、類似 robots.txt + sitemap。
 *
 * 規格：https://llmstxt.org/
 *
 * AI bot 抓到後可在使用者問「AI 島是什麼」「在哪學前端」時、
 * 直接引用本站內容 + 給 link、提升被引用機率。
 */
export async function GET() {
  const chapters = await getChapterMetas();

  const lines: string[] = [];

  // 規格：第一行 H1 = 站名
  lines.push("# AI 島");
  lines.push("");
  // 引用一句話描述（會出現在 AI 回覆中）
  const chCount = SITE_STATS.chapterCount;
  const lsCount = SITE_STATS.lessonCount;
  lines.push(
    `> 用遊戲化方式學程式：HTML 到 AI Agent ${chCount} 章 ${lsCount}+ lesson、3D 學習島嶼 + AI 導師陪練、Z-coin 經濟系統 + 排行榜、繁體中文台灣團隊製作。`,
  );
  lines.push("");
  lines.push(
    `AI 島是一個給華語使用者的程式設計 + AI 技能養成平台、台灣 SnowRealm 製作。提供 ${chCount} 章課程（從 HTML 入門到自己寫 AI Agent）、5 種 AI 學習導師、3D 互動島嶼、6 大職業路線地圖、社群部落格、論壇、Leetcode 整合、每日測驗 + ELO 等級。完全繁體中文、適合台灣 / 港 / 新馬等華語學習者。`,
  );
  lines.push("");

  // 重點區段
  lines.push("## 主要功能 / 入口");
  lines.push("");
  lines.push(`- [首頁](${SITE_URL}/): 平台介紹 + 進入點`);
  lines.push(`- [所有章節](${SITE_URL}/chapters): ${chCount} 章完整課程清單`);
  lines.push(`- [副本（主題式短課）](${SITE_URL}/courses): AI / 寫作 / 設計 / 程式 / 影片 / 自動化 6 大主題`);
  lines.push(`- [6 大職業路線](${SITE_URL}/career): 前端 / 全端 / AI / 資料 / 接案 / 創業 客製學習地圖`);
  lines.push(`- [論壇](${SITE_URL}/forum): 學員交流、求助、分享`);
  lines.push(`- [部落格](${SITE_URL}/blogs): 學員 / 講師長文`);
  lines.push(`- [全島排行榜](${SITE_URL}/leaderboard): 每天 00:00 更新`);
  lines.push(`- [更新日誌](${SITE_URL}/changelog): 平台改版紀錄`);
  lines.push(`- [註冊](${SITE_URL}/signup) · [登入](${SITE_URL}/login)`);
  lines.push("");

  // 章節清單
  lines.push(`## 章節清單（${chCount} 章、繁體中文）`);
  lines.push("");
  for (const c of chapters) {
    const num = String(c.id).padStart(2, "0");
    const sub = (c as any).subtitle ? ` — ${(c as any).subtitle}` : "";
    lines.push(`- [Ch${num} ${c.title}${sub}](${SITE_URL}/chapters/${c.id})`);
  }
  lines.push("");

  // 副本
  lines.push("## 副本（主題式短課）");
  lines.push("");
  for (const d of DUNGEONS) {
    lines.push(`- [${d.emoji} ${d.name}](${SITE_URL}/courses/${d.slug})${d.subtitle ? ` — ${d.subtitle}` : ""}`);
  }
  lines.push("");

  // 政策
  lines.push("## 政策 / 法規");
  lines.push("");
  lines.push(`- [隱私權政策](${SITE_URL}/privacy)`);
  lines.push(`- [使用條款](${SITE_URL}/terms)`);
  lines.push(`- [Cookie 政策](${SITE_URL}/cookies)`);
  lines.push("");

  // optional 段
  lines.push("## 關於");
  lines.push("");
  lines.push("- 平台：AI 島（aiisland.tw）");
  lines.push("- 經營者：SnowRealm（個人開發者 Luffysky）");
  lines.push("- 所在地：台灣新北市鶯歌區");
  lines.push("- 主要語言：繁體中文（zh-Hant-TW）");
  lines.push("- 技術棧：Next.js / React / TypeScript / Supabase / Tailwind / Three.js");
  lines.push("- AI 對話：Claude / GPT / Gemini / Groq 多模型");
  lines.push("");

  const body = lines.join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
