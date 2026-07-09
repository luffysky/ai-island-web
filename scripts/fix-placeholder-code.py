# 把兩處「do_stuff() / if condition:」占位偽代碼改成新手可直接複製執行的真範例。
# 依 CLAUDE.md：用 Python json.dump(ensure_ascii=False, indent=2)+"\n" 保持格式一致。
import json, io, sys

def load(f):
    with io.open(f, encoding="utf-8") as fh:
        return json.load(fh)

def save(f, data):
    with io.open(f, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

# --- ch26 lesson 26.5：do-while 模擬 ---
f26 = "src/data/chapters/ch26.json"
d = load(f26)
old26 = (
    "# === Python 沒有 do-while ===\n"
    "# 用 while True + break 模擬「至少跑一次再判斷」\n"
    "while True:\n"
    "    do_stuff()\n"
    "    if condition:\n"
    "        break"
)
new26 = (
    "# === Python 沒有 do-while ===\n"
    "# 用 while True + break 模擬「至少跑一次、再判斷要不要停」\n"
    "n = 1\n"
    "while True:\n"
    '    print("第", n, "次")   # 先做事（保證至少跑一次）\n'
    "    n += 1\n"
    "    if n > 3:              # 再判斷：跑到第 3 次就停\n"
    "        break\n"
    "# 印「第 1 次」「第 2 次」「第 3 次」"
)
cnt = 0
for L in d["lessons"]:
    c = L.get("content")
    if isinstance(c, str) and old26 in c:
        L["content"] = c.replace(old26, new26)
        cnt += 1
        print("ch26 fixed lesson", L.get("id"))
if cnt == 0:
    print("!! ch26 pattern NOT found", file=sys.stderr); sys.exit(1)
save(f26, d)

# --- ch07 lesson 7.16：不要默默吞錯 ---
f07 = "src/data/chapters/ch07.json"
d = load(f07)
old07 = (
    "1. 不要默默吞錯\n"
    "   try:\n"
    "       do_stuff()\n"
    "   except:\n"
    "       pass  # ❌ 這是大罪"
)
new07 = (
    "1. 不要默默吞錯\n"
    "   try:\n"
    '       int("abc")           # 這行會 ValueError\n'
    "   except:\n"
    "       pass  # ❌ 錯誤被吃掉、你永遠不知道哪裡爆"
)
cnt = 0
for L in d["lessons"]:
    c = L.get("content")
    if isinstance(c, str) and old07 in c:
        L["content"] = c.replace(old07, new07)
        cnt += 1
        print("ch07 fixed lesson", L.get("id"))
if cnt == 0:
    print("!! ch07 pattern NOT found", file=sys.stderr); sys.exit(1)
save(f07, d)
print("done")
