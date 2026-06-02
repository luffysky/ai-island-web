import fs from "node:fs";
function load(ch){return JSON.parse(fs.readFileSync(`src/data/chapters/${ch}.json`,"utf8"));}
function save(ch,d){fs.writeFileSync(`src/data/chapters/${ch}.json`,JSON.stringify(d,null,2)+"\n","utf8");}
function lesson(d,id){return d.lessons.find(x=>x.id===id);}
let n=0;

// ch18 18.25 — 移除「### 7. 接案/工作（薪資行情）」整段
{
  const d=load("ch18"); const L=lesson(d,"18.25"); let c=L.content;
  const s=c.indexOf("### 7. 接案 / 工作");
  if(s<0){console.error("ch18 18.25 start miss");process.exit(1);}
  let st=s; while(st>0&&/\s/.test(c[st-1]))st--;
  let e=c.indexOf("### ", s+5);
  e = e<0 ? c.length : (()=>{let k=e;while(k>0&&/\s/.test(c[k-1]))k--;return k;})();
  c = c.slice(0,st) + (e<c.length?"\n\n  \n":"\n") + c.slice(e);
  L.content=c; save("ch18",d); n++;
}
// ch43 43.8 — 移除尾端 🎯面試考點
{
  const d=load("ch43"); const L=lesson(d,"43.8"); let c=L.content;
  const s=c.indexOf("🎯");
  if(s<0||!c.slice(s,s+12).includes("面試考點")){console.error("ch43 43.8 miss");process.exit(1);}
  let st=s; while(st>0&&/\s/.test(c[st-1]))st--;
  L.content=c.slice(0,st)+"\n"; save("ch43",d); n++;
}
// ch46 46.14 — 移除 🎯面試考點（HTML 包裹版）
{
  const d=load("ch46"); const L=lesson(d,"46.14"); let c=L.content;
  const s=c.indexOf("🎯");
  if(s<0){console.error("ch46 46.14 miss");process.exit(1);}
  const endNeedle="拿出來 demo。";
  let e=c.indexOf(endNeedle,s);
  if(e<0){console.error("ch46 end miss");process.exit(1);}
  e+=endNeedle.length;
  let st=s; while(st>0&&/\s/.test(c[st-1]))st--;
  while(e<c.length&&/\s/.test(c[e]))e++;
  L.content=c.slice(0,st)+"\n"+c.slice(e); save("ch46",d); n++;
}
console.log("removed",n,"straggler blocks");
