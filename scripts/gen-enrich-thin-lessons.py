# -*- coding: utf-8 -*-
"""擴寫「偏薄 lesson」：把字數低於門檻的課加深加厚（保留原本講對的重點、再補範例/比喻/程式碼）。
依 docs/ch26_beginner_friendly_spec_v0：術語英中對照 + 四種區塊標籤(📄🖥️⌨️💬) + 預設零基礎 + ☕用人話講。
不碰已經紮實的課（content >= --max-len 的跳過）。寫回 chapter JSON（Python 格式）。可重跑。

⚠️ 這會「改寫既有內容」、屬 AI 草稿、務必人工校稿（靠 git diff 審）。

憑證（_lib/print-ai-creds.mjs 注入）：
  IFS=$'\t' read -r AI_MODEL AI_API_KEY < <(node scripts/_lib/print-ai-creds.mjs); export AI_MODEL AI_API_KEY
  python -X utf8 scripts/gen-enrich-thin-lessons.py --only 77,78 --dry

flags：--only 77,78（只做這些章）、--max-len 2500（只擴寫短於此字數的課）、--limit N、--dry
"""
import json, os, sys, time, urllib.request, argparse, glob, re
sys.stdout.reconfigure(encoding="utf-8")

ap = argparse.ArgumentParser()
ap.add_argument("--only", default="")
ap.add_argument("--max-len", type=int, default=2500)
ap.add_argument("--limit", type=int, default=100000)
ap.add_argument("--dry", action="store_true")
args = ap.parse_args()

MODEL = os.environ.get("AI_MODEL")
KEY = os.environ.get("AI_API_KEY")
if not MODEL or not KEY:
    print("✗ 缺 AI_MODEL / AI_API_KEY"); sys.exit(1)

only = set(x.strip() for x in args.only.split(",") if x.strip())

SYS = """你是 AI 島的課程實作工程師。我會給你「章節主題 + 一課的標題 + 這課原本（偏薄）的內容」、請你把它「擴寫加深」成紮實、好懂的完整教材。

鐵則（務必遵守）：
1. 這是「擴寫加深」、不是「砍掉重寫」。**原本講對的重點、定義、範例一律保留**、在上面補更多：白話解釋、生活比喻、具體範例、程式碼、常見雷、為什麼。
2. 全程繁體中文、大白話、用「」不用引號、頓號用「、」。預設讀者「完全沒碰過程式」。
3. 英文術語第一次出現要寫「英文（中文）—— 一句白話」。
4. 程式碼用 markdown code fence；終端指令用 🖥️ 標籤、寫進程式檔用 📄 標籤、使用者輸入用 ⌨️、電腦輸出用 💬 標籤。
5. 技術內容要正確、不可降深度、不可亂編 API / 函式名。不確定的寧可不寫、不要捏造。
6. 誠實、不浮誇、**不掛保證**（不要寫「保證找到工作 / 一定接案 / 月入多少」）。
7. 長度約 1200~2000 字、結構用 ## 小標 + 條列、結尾加「**☕ 用人話講**」一段白話總結。
8. 直接回傳「擴寫後的 markdown 內容本身」、開頭不要任何前言或說明、**不要用 JSON 包、不要用 ``` 把整篇包起來**（內文裡的程式碼 code fence 照常用）。"""

def _strip_wrap_fence(t):
    lines = t.split("\n")
    if lines and re.match(r"^```", lines[0].strip()):
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
    return "\n".join(lines).strip()

def call_ai(user):
    body = json.dumps({
        "model": MODEL, "max_tokens": 3000,
        "system": SYS, "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
        "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=150) as r:
        data = json.load(r)
    raw = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
    return _strip_wrap_fence(raw)

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
        cur = l.get("content", "") or ""
        if len(cur) >= args.max_len: continue  # 已紮實、不碰
        if len(cur) < 40: continue              # 純空殼交給 stub-filler、不在這裡
        done += 1
        user = (f"章節：{d.get('title','')}（{d.get('subtitle','')}）\n"
                f"這一課標題：{l.get('title','')}\n\n"
                f"原本內容（請保留重點、在上面擴寫加深）：\n{cur[:3000]}\n\n"
                f"請擴寫加深這一課（純 JSON）。")
        try:
            nc = call_ai(user)
        except Exception as e:
            fail += 1; print(f"  ❌ Ch{cid} {l.get('id')}: {e}"); continue
        if not (isinstance(nc, str) and len(nc) > len(cur) and len(nc) > 500):
            fail += 1; print(f"  ⚠️ Ch{cid} {l.get('id')}: 產出沒比原本長/格式不對、跳過"); continue
        if args.dry:
            print(f"  🔎 Ch{cid} {l.get('id')} {l.get('title','')[:24]} → {len(cur)}→{len(nc)} 字")
        else:
            l["content"] = nc
            changed = True
            print(f"  ✅ Ch{cid} {l.get('id')} {l.get('title','')[:24]} → {len(cur)}→{len(nc)} 字")
        ok += 1
        time.sleep(0.3)
    if changed and not args.dry:
        open(f, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")

print(f"\n完成、處理 lesson {done}、成功 {ok}、失敗/跳過 {fail}。")
