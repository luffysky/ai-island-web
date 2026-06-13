# -*- coding: utf-8 -*-
"""批量補 lesson miniQuiz（每課一題單選自我檢測）。
缺哪課補哪課、不覆蓋已有。寫回 chapter JSON（Python 格式）。可重跑、resumable。

一石二鳥：每課多一個自我檢測 + 餵養每日測驗的章節題池（api/quiz/today 抽 lesson.miniQuiz）。

憑證從環境變數讀（用 _lib/print-ai-creds.mjs 注入）：
  IFS=$'\t' read -r AI_MODEL AI_API_KEY < <(node scripts/_lib/print-ai-creds.mjs)
  export AI_MODEL AI_API_KEY
  python -X utf8 scripts/gen-lesson-miniquiz.py --only 2 --dry

flags：--only 2,3（只做這些章）、--limit N（最多處理幾個 lesson）、--min-len 300（內容太短的跳過）、--dry
"""
import json, os, sys, time, urllib.request, argparse, glob, re
sys.stdout.reconfigure(encoding="utf-8")

ap = argparse.ArgumentParser()
ap.add_argument("--only", default="")
ap.add_argument("--limit", type=int, default=100000)
ap.add_argument("--min-len", type=int, default=300)
ap.add_argument("--dry", action="store_true")
args = ap.parse_args()

MODEL = os.environ.get("AI_MODEL")
KEY = os.environ.get("AI_API_KEY")
if not MODEL or not KEY:
    print("✗ 缺 AI_MODEL / AI_API_KEY，請先用 _lib/print-ai-creds.mjs 注入"); sys.exit(1)

only = set(x.strip() for x in args.only.split(",") if x.strip())

SYS = """你是 AI 島的出題老師。我會給你「一課的標題與內容」、請你針對「這一課真正教的重點」出一題繁體中文的單選題、用來讓學員自我檢測有沒有讀懂。

鐵則：
1. 全程繁體中文、白話、新手友善。題目考「概念有沒有懂」、不要鑽冷僻細節。
2. 四個選項、value 固定 "a" "b" "c" "d"、只有一個正確。錯的選項要「像真的會有人選」（似是而非）、不要明顯廢答。
3. 一定要根據「這課的內容」出題、不要超出範圍亂考。
4. 只回傳純 JSON、外面不要任何 markdown code fence 或多餘文字。結構嚴格如下：
{
  "question": "題幹",
  "options": [
    {"value": "a", "label": "選項文字"},
    {"value": "b", "label": "選項文字"},
    {"value": "c", "label": "選項文字"},
    {"value": "d", "label": "選項文字"}
  ],
  "answer": "a",
  "explanation": "為什麼這個對、其他為什麼錯（1-2 句）"
}"""

def call_ai(user):
    body = json.dumps({
        "model": MODEL, "max_tokens": 900,
        "system": SYS, "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
        "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.load(r)
    raw = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    i, j = raw.find("{"), raw.rfind("}")
    if i > 0: raw = raw[i:]
    if j >= 0: raw = raw[:raw.rfind("}") + 1]
    return json.loads(raw)

def valid(q):
    return (isinstance(q, dict) and isinstance(q.get("question"), str)
            and isinstance(q.get("options"), list) and len(q["options"]) == 4
            and all(isinstance(o, dict) and o.get("value") in ("a", "b", "c", "d")
                    and isinstance(o.get("label"), str) for o in q["options"])
            and q.get("answer") in ("a", "b", "c", "d")
            and any(o["value"] == q["answer"] for o in q["options"]))

files = sorted(glob.glob("src/data/chapters/ch*.json"))
done = ok = fail = 0
for f in files:
    if done >= args.limit: break
    d = json.load(open(f, encoding="utf-8"))
    cid = str(d.get("id"))
    if only and cid not in only: continue
    changed = False
    for l in d.get("lessons", []):
        if done >= args.limit: break
        if l.get("miniQuiz"): continue
        content = l.get("content", "") or ""
        if len(content) < args.min_len: continue  # 太短（佔位課）跳過
        done += 1
        user = f"課名：{l.get('title','')}\n\n內容：\n{content[:2600]}\n\n請針對這課重點出一題單選自我檢測（純 JSON）。"
        try:
            q = call_ai(user)
        except Exception as e:
            fail += 1; print(f"  ❌ Ch{cid} {l.get('id')}: {e}"); continue
        if not valid(q):
            fail += 1; print(f"  ⚠️ Ch{cid} {l.get('id')}: 格式不對、跳過"); continue
        if not args.dry:
            l["miniQuiz"] = q
            changed = True
        ok += 1
        time.sleep(0.3)
    if changed and not args.dry:
        open(f, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
        print(f"  ✅ Ch{cid} {d.get('title','')} → 補了 miniQuiz、本章累計 {sum(1 for l in d['lessons'] if l.get('miniQuiz'))} 題")
    elif args.dry and only:
        print(f"  🔎 Ch{cid} 會處理（dry、不寫檔）")

print(f"\n完成、處理 lesson {done}、成功 {ok}、失敗/跳過 {fail}。")
