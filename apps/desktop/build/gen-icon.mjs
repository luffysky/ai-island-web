import { chromium } from "playwright";
import pngToIco from "png-to-ico";
import fs from "node:fs";
const svg = fs.readFileSync("build/icon.svg", "utf8");
const sizes = [256, 128, 64, 48, 32, 16];
const browser = await chromium.launch();
const page = await browser.newPage();
const bufs = [];
for (const s of sizes) {
  const sized = svg.replace('width="256" height="256"', `width="${s}" height="${s}"`);
  await page.setViewportSize({ width: s, height: s });
  await page.setContent(`<!doctype html><meta charset=utf8><style>*{margin:0;padding:0}html,body{background:transparent}svg{display:block}</style>${sized}`);
  const el = await page.$("svg");
  const buf = await el.screenshot({ omitBackground: true });
  bufs.push(buf);
  if (s === 256) fs.writeFileSync("build/icon.png", buf);
}
await browser.close();
const ico = await pngToIco(bufs);
fs.writeFileSync("build/icon.ico", ico);
console.log("✅ icon.ico:", ico.length, "bytes;  icon.png:", fs.statSync("build/icon.png").size, "bytes");
