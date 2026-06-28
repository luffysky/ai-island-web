# -*- coding: utf-8 -*-
"""補「空殼 lesson」的內容：只填 content 短於門檻（佔位）的課、不碰已寫好的真內容。
針對 P0 近乎空白的附錄（Ch65/66/67/69/70 等）。寫回 chapter JSON（Python 格式）。可重跑。

依 docs/ch26_beginner_friendly_spec_v0：術語英中對照 + 大白話 + 預設零基礎；速查章就寫成實用小抄。
誠實不掛保證。

憑證（_lib/print-ai-creds.mjs 注入）：
  IFS=$'\t' read -r AI_MODEL AI_API_KEY < <(node scripts/_lib/print-ai-creds.mjs); export AI_MODEL AI_API_KEY
  python -X utf8 scripts/gen-stub-lesson-content.py --only 65,66,67,69,70 --dry

flags：--only 65,66（只做這些章）、--max-len 250（只填短於這個字數的課）、--limit N、--dry
"""
import json, os, sys, time, urllib.request, argparse, glob, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_lib"))
from log_cli_usage import log_usage  # noqa: E402  記 CLI 用量 → 後台 usage
sys.stdout.reconfigure(encoding="utf-8")

ap = argparse.ArgumentParser()
ap.add_argument("--only", default="")
ap.add_argument("--max-len", type=int, default=250)
ap.add_argument("--limit", type=int, default=100000)
ap.add_argument("--dry", action="store_true")
args = ap.parse_args()

MODEL = os.environ.get("AI_MODEL")
KEY = os.environ.get("AI_API_KEY")
if not MODEL or not KEY:
    print("✗ 缺 AI_MODEL / AI_API_KEY"); sys.exit(1)

only = set(x.strip() for x in args.only.split(",") if x.strip())

SYS = """你是 AI 島的課程實作工程師。我會給你「章節主題 + 這一課的標題（可能還有原本的殘缺內容）」、請你把這一課的內容寫完整、寫紮實。

鐵則（務必遵守）：
1. 全程繁體中文、語氣大白話、生活比喻、用「」不用引號、頓號用「、」。
2. 預設讀者「完全沒碰過程式」。英文術語第一次出現要寫「英文（中文）—— 一句白話」。
3. 內容要「實用、具體、有料」。若是速查 / 工具 / 資源類的課、就寫成「能直接照做的小抄」：列出重點項目、每項一句說明、適時給範例。
4. 程式碼用 markdown code fence；指令類用 🖥️ 標籤、程式檔用 📄 標籤、電腦輸出用 💬 標籤。
5. 誠實、不浮誇、**不掛保證**（不要寫「保證找到工作 / 一定接到案 / 月入多少」）。
6. 內容長度約 400~800 字、用 markdown（## 小標 + 條列）。結尾加一段「**☕ 用人話講**」做白話總結。
7. 嚴格照下面分隔線格式回傳（不要用 JSON、不要用 ``` 把整篇包起來；內文的程式碼 code fence 照常用）。@@CONTENT@@ 之後到結尾全部都是內容：
@@SUMMARY@@
這課一句話重點
@@ANALOGY@@
一個生活化比喻（一句）
@@TIP@@
一句實用提醒
@@CONTENT@@
（完整 markdown 內容、想換幾行就換幾行）"""

def call_ai(user):
    body = json.dumps({
        "model": MODEL, "max_tokens": 2200,
        "system": SYS, "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
        "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)
    u = data.get("usage", {})
    log_usage(MODEL, u.get("input_tokens", 0), u.get("output_tokens", 0))
    raw = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
    def grab(tag, nxt):
        m = re.search(r"@@" + tag + r"@@\s*(.*?)\s*(?:@@" + nxt + r"@@|$)", raw, re.S)
        return (m.group(1).strip() if m else "")
    return {
        "oneLineSummary": grab("SUMMARY", "ANALOGY"),
        "analogy": grab("ANALOGY", "TIP"),
        "tip": {"type": "practical", "text": grab("TIP", "CONTENT")},
        "content": grab("CONTENT", "ZZZNONE"),
    }

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
        if len(l.get("content", "") or "") >= args.max_len: continue  # 已有實內容、不碰
        done += 1
        user = (f"章節：{d.get('title','')}（{d.get('subtitle','')}）\n"
                f"這一課標題：{l.get('title','')}\n"
                f"原本殘缺內容（可參考、可丟棄）：{(l.get('content') or '(空)')[:300]}\n\n"
                f"請把這一課寫完整（純 JSON）。")
        try:
            out = call_ai(user)
        except Exception as e:
            fail += 1; print(f"  ❌ Ch{cid} {l.get('id')}: {e}"); continue
        if not (isinstance(out, dict) and isinstance(out.get("content"), str) and len(out["content"]) > 200):
            fail += 1; print(f"  ⚠️ Ch{cid} {l.get('id')}: 產出太短/格式不對、跳過"); continue
        if args.dry:
            print(f"  🔎 Ch{cid} {l.get('id')} {l.get('title','')} → 會補 {len(out['content'])} 字")
        else:
            l["content"] = out["content"]
            if out.get("oneLineSummary") and not (l.get("oneLineSummary") or "").strip():
                l["oneLineSummary"] = out["oneLineSummary"]
            if out.get("analogy") and not (l.get("analogy") or "").strip():
                l["analogy"] = out["analogy"]
            if out.get("tip", {}).get("text") and not l.get("tip"):
                l["tip"] = out["tip"]
            changed = True
        ok += 1
        time.sleep(0.3)
    if changed and not args.dry:
        open(f, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
        print(f"  ✅ Ch{cid} {d.get('title','')} → 補實 lesson 內容")

print(f"\n完成、處理 lesson {done}、成功 {ok}、失敗/跳過 {fail}。")
