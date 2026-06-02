import fs from "node:fs";
const FILE = "src/data/chapters/ch10.json";
const d = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const tips = {
  "10.1": { type: "practical", text: "Next.js 最容易混淆的是『這段在 server 還是 client 跑』。做專案時先預設所有 component 都是 Server Component，只有需要 onClick / useState 的才加 \"use client\"——這個習慣能省掉大半 hydration 錯誤。" },
  "10.7": { type: "practical", text: "開發 API Route 時，GET 直接貼網址測、POST 用 Thunder Client 或 curl 打，不用每次都從前端觸發。回傳一律用 NextResponse.json(...)、錯誤記得帶對的 status code。" },
  "10.13": { type: "practical", text: "Parallel Routes 的資料夾用 @ 開頭（如 @analytics）、不影響 URL，只是 layout 的一個 slot。剛學時先在 layout 把每個 slot 印出來確認有對上，再填實際內容。" },
  "10.19": { type: "practical", text: "routeRules 可以針對不同路徑各用一種渲染策略。先從『首頁 prerender、後台 ssr、文章 ISR』這組常見搭配試起，再依實際流量微調。" },
  "10.25": { type: "practical", text: "部署前先在本機跑一次 next build——大多數『線上才爆』的錯（型別、缺環境變數、誤用 server-only API）在 build 階段就會現形，比推上去再翻 log 快很多。" },
};
let n = 0;
for (const L of d.lessons ?? []) { if (tips[L.id]) { L.tip = tips[L.id]; n++; } }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + "\n", "utf-8");
console.log("replaced", n, "tips");
