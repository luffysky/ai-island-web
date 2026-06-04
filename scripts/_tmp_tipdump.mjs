import fs from "fs";import path from "path";
const dir="./src/data/chapters";
const SIG=["這個技術 2026 還在主流","訂閱 1-2 個技術頻道","Theo / Fireship","把這節學到的","配合這節用的工具"];
const isCanned=(t)=>SIG.some((s)=>(t||"").includes(s));
for(const ch of process.argv.slice(2)){const c=JSON.parse(fs.readFileSync(path.join(dir,ch+".json"),"utf8"));console.log("\n##### "+ch+" — "+c.title+" #####");for(const l of c.lessons){if(isCanned(l.tip&&l.tip.text)){const t=(l.outline||[]).map(o=>o.text).slice(0,4).join(" / ");console.log(l.id+" ┃ "+l.title+" ┃ "+(l.oneLineSummary||"").slice(0,55)+(t?" ┃ {"+t+"}":""));}}}
