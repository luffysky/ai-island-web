# -*- coding: utf-8 -*-
"""批量補章節 metadata：summary / faq / outcomes（缺哪個補哪個、不覆蓋已有）。
用系統 AI key 生草稿、寫回 chapter JSON（Python 格式、與既有檔一致）。可重跑、idempotent。

憑證從環境變數讀（用 _lib/print-ai-creds.mjs 注入）：
  IFS=$'\t' read -r AI_MODEL AI_API_KEY < <(node scripts/_lib/print-ai-creds.mjs)
  export AI_MODEL AI_API_KEY
  python -X utf8 scripts/gen-chapter-metadata.py --limit 5 --dry

flags：--limit N（最多處理幾章）、--only 26,27（只做這些）、--dry（不寫檔）
"""
import json, os, sys, time, urllib.request, urllib.error, argparse, glob, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_lib"))
from log_cli_usage import log_usage  # noqa: E402  記 CLI 用量 → 後台 usage
sys.stdout.reconfigure(encoding="utf-8")

ap = argparse.ArgumentParser()
ap.add_argument("--limit", type=int, default=999)
ap.add_argument("--only", default="")
ap.add_argument("--dry", action="store_true")
args = ap.parse_args()

MODEL = os.environ.get("AI_MODEL")
KEY = os.environ.get("AI_API_KEY")
if not MODEL or not KEY:
    print("✗ 缺 AI_MODEL / AI_API_KEY，請先用 _lib/print-ai-creds.mjs 注入"); sys.exit(1)

only = set(x.strip() for x in args.only.split(",") if x.strip())

SYS = """你是 AI 島的課程編輯。我會給你一個章節的標題、副標、與所有 lesson 標題、請你產出該章的 metadata。

鐵則：
1. 全程繁體中文、語氣大白話、新手友善（預設讀者是完全零基礎的人）。用「」不用引號、頓號用「、」。
2. 誠實、不浮誇。**絕對不可掛保證**——不要寫「學完保證找到工作 / 一定能接案 / 月入多少」這類話。可以說「打底」「具備能力」「看得懂」。
3. 只回傳純 JSON、外面不要任何 markdown code fence 或多餘文字。結構嚴格如下：
{
  "outcomes": ["學完你會……（5 條、動詞開頭、具體可檢查）"],
  "summary": ["這章重點濃縮（5 條、每條一句話、像複習小抄）"],
  "faq": [ {"q": "新手最可能問的問題", "a": "白話、誠實的回答（2-3 句）"} ]
}
outcomes 5 條、summary 5 條、faq 3 題。"""

def call_ai(user):
    body = json.dumps({
        "model": MODEL, "max_tokens": 1500,
        "system": SYS, "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
        "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.load(r)
    u = data.get("usage", {})
    log_usage(MODEL, u.get("input_tokens", 0), u.get("output_tokens", 0))
    raw = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    i, j = raw.find("{"), raw.rfind("}")
    if i > 0: raw = raw[i:]
    if j >= 0: raw = raw[:raw.rfind("}") + 1]
    return json.loads(raw)

files = sorted(glob.glob("src/data/chapters/ch*.json"))
done = 0
for f in files:
    if done >= args.limit: break
    d = json.load(open(f, encoding="utf-8"))
    cid = str(d.get("id"))
    if only and cid not in only: continue
    need = [k for k in ("outcomes", "summary", "faq") if not d.get(k)]
    if not need: continue
    titles = "\n".join(f"- {l.get('title','')}" for l in d.get("lessons", [])[:40])
    user = (f"章節：{d.get('title','')}\n副標：{d.get('subtitle','')}\n說明：{(d.get('description') or '')[:400]}\n\n"
            f"lesson 標題：\n{titles}\n\n請產出該章 metadata（純 JSON）。")
    try:
        out = call_ai(user)
    except Exception as e:
        print(f"  ❌ Ch{cid}: {e}"); continue
    filled = []
    for k in need:
        v = out.get(k)
        if v:
            if not args.dry: d[k] = v
            filled.append(f"{k}({len(v)})")
    if args.dry:
        print(f"  🔎 Ch{cid} {d.get('title','')} → 會補 {filled}")
    else:
        open(f, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
        print(f"  ✅ Ch{cid} {d.get('title','')} → 補了 {filled}")
    done += 1
    time.sleep(0.3)

print(f"\n完成、處理 {done} 章。")
