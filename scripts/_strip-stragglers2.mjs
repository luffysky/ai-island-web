import fs from "node:fs";
function load(ch){return JSON.parse(fs.readFileSync(`src/data/chapters/${ch}.json`,"utf8"));}
function save(ch,d){fs.writeFileSync(`src/data/chapters/${ch}.json`,JSON.stringify(d,null,2)+"\n","utf8");}
function lesson(d,id){return d.lessons.find(x=>x.id===id);}
let n=0;
// ch43 43.8 — 尾端 🎯面試考點
{
  const d=load("ch43"); const L=lesson(d,"43.8"); let c=L.content;
  const iv=c.indexOf("面試考點"); if(iv<0){console.error("ch43 面試考點 miss");process.exit(1);}
  let st=c.lastIndexOf("🎯",iv); if(st<0)st=iv;
  while(st>0&&/\s/.test(c[st-1]))st--;
  L.content=c.slice(0,st)+"\n"; save("ch43",d); n++;
}
// ch46 46.14 — HTML 包裹的 🎯面試考點
{
  const d=load("ch46"); const L=lesson(d,"46.14"); let c=L.content;
  const iv=c.indexOf("面試考點"); if(iv<0){console.error("ch46 面試考點 miss");process.exit(1);}
  let st=c.lastIndexOf("🎯",iv); if(st<0)st=iv;
  while(st>0&&/\s/.test(c[st-1]))st--;
  const endNeedle="拿出來 demo。"; let e=c.indexOf(endNeedle,iv);
  if(e<0){console.error("ch46 end miss");process.exit(1);} e+=endNeedle.length;
  while(e<c.length&&/\s/.test(c[e]))e++;
  L.content=c.slice(0,st)+(e<c.length?"\n\n  \n":"\n")+c.slice(e); save("ch46",d); n++;
}
console.log("removed",n);
