# -*- coding: utf-8 -*-
"""
章節教學程式碼「補執行結果」工具（#177，Nami 要求）。

原則：**真的把程式碼跑一遍**取得真實輸出，再把 stdout 補成 inline `# ` 註解——不是用猜的、不亂寫。

做法：
- 掃 src/data/chapters/*.json 每個 lesson.content 的 ```python / ```py / ```text 圍欄程式碼區塊。
- 只處理「看起來是 Python 且有 print/輸出」的區塊。
- 把區塊依「空行」切成一段段小範例；用**累積的 namespace** 逐段 exec（讓 user=... 之後還用得到），
  用 contextlib.redirect_stdout 抓每段的 stdout。
- 若某段有輸出、且該段後面「還沒有」對應的輸出註解 → 在該段最後一行 print 後面補 `# <每行輸出>`。
- 跑掛掉 / 需要 input / 有副作用（開檔、網路）→ 整個區塊跳過，一個字都不動（寧可不補、不亂補）。
- 冪等：已經有輸出註解的段落不重複補。

用法：
  python scripts/add-code-outputs.py            # dry-run，只印會改哪些、不寫檔
  python scripts/add-code-outputs.py --write     # 真的寫回 JSON
  python scripts/add-code-outputs.py ch26 --write # 只處理指定章
  python scripts/add-code-outputs.py ch26 --lesson 26.5 --write
改完 JSON 記得： node scripts/import_chapters_to_db.mjs chXX
"""
import sys, os, re, json, io, contextlib, glob, builtins

CH_DIR = os.path.join("src", "data", "chapters")

# 只允許 import 這些純運算、無副作用、確定性的標準庫（沙箱 __import__ 白名單）。
# 其餘 import（os/sys/requests/streamlit/random/time/datetime…）一律 ImportError → 整塊跳過（不補）。
SAFE_MODULES = {
    "math", "json", "itertools", "functools", "collections", "string",
    "decimal", "fractions", "statistics", "textwrap", "re", "typing",
    "dataclasses", "enum", "copy", "pprint", "operator", "heapq", "bisect", "array",
}

# 來源層防護：需要輸入 / 無窮迴圈 / 非確定性（set 順序、id/hash、pop）→ 整塊跳過。
# （import 類已由沙箱擋掉，這裡只補「不需 import 也會出問題」的。）
FORBIDDEN = re.compile(
    r"(\binput\s*\(|\bopen\s*\(|\bexec\s*\(|\beval\s*\(|while\s+True|"
    r"\bset\s*\(|\bid\s*\(|\bhash\s*\(|\.pop\s*\(|\basync\s+def\b|\bawait\b)")
# set 字面量迭代（{a, b, c} 沒有冒號）順序不定 → 保守跳過
SET_LITERAL_ITER = re.compile(r"(for\s+\w+\s+in\s*\{[^{}:]*\}|in\s*\{[^{}:]+\}\s*:)")


def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    root = name.split(".")[0]
    if root not in SAFE_MODULES:
        raise ImportError(f"module '{name}' not allowed in sandbox")
    return __import__(name, globals, locals, fromlist, level)


def _make_safe_builtins():
    import builtins as _b
    safe = {}
    # 從真 builtins 拷貝、拿掉危險的
    banned = {"open", "input", "exec", "eval", "compile", "__import__", "exit", "quit",
              "help", "globals", "locals", "vars", "memoryview", "breakpoint"}
    for k in dir(_b):
        if k.startswith("__"):
            continue
        if k in banned:
            continue
        safe[k] = getattr(_b, k)
    safe["__import__"] = _safe_import
    return safe

_SAFE_BUILTINS = _make_safe_builtins()
FENCE_RE = re.compile(r"```(python|py|text)\n(.*?)```", re.S)


def looks_like_python(code: str) -> bool:
    if "print(" not in code:
        return False
    # 有明顯 shell / 輸出貼上、或明顯非 python 就跳過
    if re.search(r"^\s*(\$|>>>|pip |npm |node )", code, re.M):
        return False
    return True


def _norm(s: str) -> str:
    """正規化：去空白、引號統一，用來比對『輸出是否已標在註解裡』（避免引號/空白差異造成漏判）。"""
    return re.sub(r"\s+", "", s).replace('"', "'")


PRINT_TRAILING_COMMENT = re.compile(r"\bprint\s*\(.*#")


def already_annotated(seg_body, outs) -> bool:
    """這段是否『已經標了輸出』——是的話就別重複補（避免重複、變醜）。
    判斷：
      1) 任一 print 行有行尾註解（print(...)  # ...）→ 作者已在行尾標輸出。
      2) 半數以上輸出行已出現在段內任何註解裡（引號/空白正規化後比對）。
    """
    for ln in seg_body:
        if PRINT_TRAILING_COMMENT.search(ln):
            return True
    if outs:
        comment_text = _norm("\n".join(l.split("#", 1)[1] if "#" in l else "" for l in seg_body))
        matched = sum(1 for o in outs if o.strip() and _norm(o) in comment_text)
        if matched / len(outs) >= 0.5:
            return True
    return False


class _StepGuard(Exception):
    pass


def run_segment(ns: dict, seg_code: str, step_cap=500_000):
    """在累積 namespace（沙箱 builtins）跑一段，回 (stdout_lines, ok)。
    任何例外 / 超過步數上限（防無窮迴圈）→ ok=False、整塊放棄。"""
    buf = io.StringIO()
    steps = [0]

    def tracer(frame, event, arg):
        if event == "line":
            steps[0] += 1
            if steps[0] > step_cap:
                raise _StepGuard()
        return tracer

    try:
        code_obj = compile(seg_code, "<seg>", "exec")
        with contextlib.redirect_stdout(buf):
            sys.settrace(tracer)
            try:
                exec(code_obj, ns)
            finally:
                sys.settrace(None)
    except BaseException:
        return [], False
    out = buf.getvalue()
    # 超長輸出（可能誤跑迴圈）→ 放棄
    if out.count("\n") > 200 or len(out) > 8000:
        return [], False
    lines = out.split("\n")
    if lines and lines[-1] == "":
        lines = lines[:-1]
    return lines, True


def process_block(code: str):
    """回 (new_code, changed)。整塊真跑；任一段掛掉就整塊放棄（回 changed=False）。"""
    if not looks_like_python(code):
        return code, False
    if FORBIDDEN.search(code) or SET_LITERAL_ITER.search(code):
        return code, False

    # 先確認整塊能乾淨跑完（累積 namespace、沙箱 builtins）——不能就整塊不動
    ns = {"__name__": "__main__", "__builtins__": _SAFE_BUILTINS}
    # 用「空行」切段，但保留段內結構
    raw_lines = code.split("\n")
    # 分段：連續非空行為一段，遇空行分段（空行本身保留在輸出）
    segments = []  # list of (start_idx, end_idx) 對 raw_lines
    i = 0
    n = len(raw_lines)
    while i < n:
        if raw_lines[i].strip() == "":
            i += 1
            continue
        j = i
        while j < n and raw_lines[j].strip() != "":
            j += 1
        segments.append((i, j))
        i = j

    # 逐段跑、記每段輸出
    seg_outputs = []
    for (a, b) in segments:
        seg_code = "\n".join(raw_lines[a:b])
        outs, ok = run_segment(ns, seg_code)
        if not ok:
            return code, False  # 整塊放棄
        seg_outputs.append(outs)

    # 重建：每段後若有輸出、且段末還沒有輸出註解 → 補 inline `# `
    changed = False
    out_lines = list(raw_lines)
    # 從後往前插入，避免 index 位移
    for idx in range(len(segments) - 1, -1, -1):
        a, b = segments[idx]
        outs = seg_outputs[idx]
        if not outs:
            continue
        seg_body = raw_lines[a:b]
        # 已經標過輸出（行尾註解 or 段內註解）→ 不重複補
        if already_annotated(seg_body, outs):
            continue
        # 超長輸出行（如 10**100 的 101 位數）不適合當註解顯示 → 整段跳過
        if any(len(o) > 60 for o in outs):
            continue
        # 縮排對齊該段最外層（用第一行的前導空白）
        indent = re.match(r"\s*", seg_body[0]).group(0)
        # 輸出註解用「無縮排」放段末（跟現有風格一致：# 0: 蘋果）
        comment_lines = [f"# {ln}" for ln in outs]
        # 插在段末（b 位置前）
        out_lines[b:b] = comment_lines
        changed = True

    return "\n".join(out_lines), changed


def process_content(content: str):
    changed_any = False

    def repl(m):
        nonlocal changed_any
        lang, code = m.group(1), m.group(2)
        new_code, changed = process_block(code)
        if changed:
            changed_any = True
            return f"```{lang}\n{new_code}```"
        return m.group(0)

    new_content = FENCE_RE.sub(repl, content)
    return new_content, changed_any


def main():
    args = [a for a in sys.argv[1:]]
    write = "--write" in args
    args = [a for a in args if a != "--write"]
    review_path = None
    if "--review" in args:
        k = args.index("--review")
        review_path = args[k + 1]
        del args[k:k + 2]
    review_f = io.open(review_path, "w", encoding="utf-8") if review_path else None
    only_lesson = None
    if "--lesson" in args:
        k = args.index("--lesson")
        only_lesson = args[k + 1]
        del args[k:k + 2]
    ch_filter = args[0] if args else None

    files = sorted(glob.glob(os.path.join(CH_DIR, "*.json")))
    if ch_filter:
        files = [f for f in files if os.path.basename(f).startswith(ch_filter)]

    total_lessons = 0
    total_files = 0
    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        file_changed = False
        for les in d.get("lessons", []):
            if only_lesson and str(les.get("number", "")).replace("LESSON ", "") != only_lesson and str(les.get("id")) != only_lesson:
                continue
            c = les.get("content") or ""
            if "```" not in c:
                continue
            new_c, changed = process_content(c)
            if changed:
                les["content"] = new_c
                file_changed = True
                total_lessons += 1
                print(f"  補: {os.path.basename(f)}  {les.get('number')} {les.get('title')}")
                if review_f:
                    review_f.write(f"\n\n========== {os.path.basename(f)} {les.get('number')} {les.get('title')} ==========\n")
                    for mm in FENCE_RE.finditer(new_c):
                        blk = mm.group(2)
                        if "# " in blk:
                            review_f.write("```" + mm.group(1) + "\n" + blk + "```\n")
        if file_changed:
            total_files += 1
            if write:
                json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
                open(f, "a", encoding="utf-8").write("\n")
    if review_f:
        review_f.close()
    print(f"\n{'已寫入' if write else 'DRY-RUN（未寫）'}：{total_lessons} 課、{total_files} 章有更動")


if __name__ == "__main__":
    main()
