-- ============================================================
-- Nami 挑戰模式 + 進度
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nami_challenges (
  id              TEXT PRIMARY KEY,           -- 'py-01' / 'pandas-02'
  level           TEXT NOT NULL,              -- 'easy' / 'medium' / 'hard'
  category        TEXT NOT NULL,              -- 'basic' / 'pandas' / 'scrape' / 'fastapi' / 'web'
  title           TEXT NOT NULL,
  scenario        TEXT NOT NULL,              -- 故事 / 背景
  task            TEXT NOT NULL,              -- 要做什麼
  starter_code    TEXT NOT NULL,              -- 起點 code
  test_code       TEXT NOT NULL,              -- assert ... 沒 exception 就 PASS
  hints           TEXT[] DEFAULT '{}',
  solution        TEXT,                       -- 通過後可看
  solution_explain TEXT[] DEFAULT '{}',
  xp_award        INT DEFAULT 50,
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nami_challenges_level ON public.nami_challenges(level);
CREATE INDEX IF NOT EXISTS idx_nami_challenges_category ON public.nami_challenges(category);

CREATE TABLE IF NOT EXISTS public.nami_challenge_progress (
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id    TEXT REFERENCES public.nami_challenges(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'pending',     -- 'pending' / 'attempted' / 'passed'
  attempts        INT DEFAULT 0,
  best_code       TEXT,
  hints_revealed  INT DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  passed_at       TIMESTAMPTZ,
  PRIMARY KEY (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_nami_progress_user ON public.nami_challenge_progress(user_id);

ALTER TABLE public.nami_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nami_challenge_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nami_challenges_admin_all" ON public.nami_challenges;
CREATE POLICY "nami_challenges_admin_all" ON public.nami_challenges FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "nami_progress_own" ON public.nami_challenge_progress;
CREATE POLICY "nami_progress_own" ON public.nami_challenge_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Seed 12 個挑戰 (easy 4 / medium 5 / hard 3)
-- ============================================================
INSERT INTO public.nami_challenges (id, level, category, title, scenario, task, starter_code, test_code, hints, solution, solution_explain, xp_award, sort_order) VALUES

-- EASY
('py-e01', 'easy', 'basic', '回傳平均分數',
  '老師給你一個學生成績 list、要你寫一個 function 算平均。',
  '寫一個 function avg(scores) 回傳平均（四捨五入到 2 位）。',
  E'def avg(scores):\n    # TODO\n    pass\n',
  E'assert avg([80, 90, 70]) == 80.0, f"3 個 80/90/70 應該 80.0、你回 {avg([80, 90, 70])}"\nassert avg([100]) == 100.0\nassert avg([85, 95]) == 90.0\nassert round(avg([1, 2, 3, 4, 5]), 2) == 3.0',
  ARRAY['用 sum(scores) / len(scores)', 'round(x, 2) 四捨五入', '空 list 不會出現、不用處理'],
  E'def avg(scores):\n    return round(sum(scores) / len(scores), 2)',
  ARRAY['sum() 加總、len() 算筆數', 'round(x, 2) 兩位小數', '無需處理 edge case'],
  30, 1),

('py-e02', 'easy', 'basic', '過濾偶數',
  '產品經理給你一串 ID、只要偶數的。',
  '寫 function only_even(nums) 回傳新 list、只含偶數、保持順序。',
  E'def only_even(nums):\n    # TODO\n    pass\n',
  E'assert only_even([1,2,3,4,5,6]) == [2,4,6]\nassert only_even([7,9,11]) == []\nassert only_even([10,20,30]) == [10,20,30]',
  ARRAY['用 list comprehension', 'n % 2 == 0 是偶數', '保持原順序、不用 sort'],
  E'def only_even(nums):\n    return [n for n in nums if n % 2 == 0]',
  ARRAY['list comprehension：[expr for x in iterable if condition]', 'n % 2 取餘數、=0 = 偶數', '一行解'],
  30, 2),

('py-e03', 'easy', 'basic', '反轉字串',
  '密碼學練習：給定字串、反轉。',
  '寫 function reverse(s) 回傳反轉後字串。',
  E'def reverse(s):\n    # TODO\n    pass\n',
  E'assert reverse("hello") == "olleh"\nassert reverse("") == ""\nassert reverse("a") == "a"\nassert reverse("中文") == "文中"',
  ARRAY['Python slice [::-1] 一行搞定', '不需要 loop'],
  E'def reverse(s):\n    return s[::-1]',
  ARRAY['Python slice 三個冒號 [start:end:step]', '[::-1] 意思：「從頭到尾、步長 -1（倒著走）」', '對 list 同樣 work'],
  30, 3),

('py-e04', 'easy', 'basic', '字典 + 計次',
  '統計購物車裡每件商品數量。',
  '寫 count_items(items) 回傳 dict {product: count}。',
  E'def count_items(items):\n    # TODO\n    pass\n',
  E'assert count_items(["apple","banana","apple","apple","banana"]) == {"apple":3,"banana":2}\nassert count_items([]) == {}\nassert count_items(["one"]) == {"one":1}',
  ARRAY['用 dict + .get(key, 0) + 1', '或 collections.Counter()', '空 list 回 {}'],
  E'def count_items(items):\n    result = {}\n    for item in items:\n        result[item] = result.get(item, 0) + 1\n    return result\n\n# 或一行：\n# from collections import Counter\n# def count_items(items): return dict(Counter(items))',
  ARRAY['dict.get(k, 0) 安全拿值、沒 key 回 0 不噴錯', 'collections.Counter 是 Python 標準 idiom、業界常用', 'Counter 還能 .most_common(N) 找 top N'],
  40, 4),

-- MEDIUM
('py-m01', 'medium', 'pandas', '銷售排名 Top N',
  '電商給你 100 筆訂單、要找消費前 3 名客戶。',
  E'寫 top_customers(df, n=3) 收一個 DataFrame (欄位：customer_id, amount)、回傳 top N 客戶 id list、依消費金額排序。',
  E'import pandas as pd\n\ndef top_customers(df, n=3):\n    # TODO\n    pass\n\n# 測試資料\ndf = pd.DataFrame({\n    "customer_id": ["A","B","A","C","B","A","C"],\n    "amount": [100, 200, 50, 300, 150, 80, 70],\n})',
  E'result = top_customers(df, 3)\nassert isinstance(result, list), f"要回 list、你回 {type(result)}"\nassert result == ["B", "C", "A"], f"預期 [\'B\',\'C\',\'A\']、你回 {result}"\nassert top_customers(df, 2) == ["B", "C"]',
  ARRAY[
    'df.groupby("customer_id")["amount"].sum() 算每人總和',
    'nlargest(n) 拿前 n 大',
    '.index.tolist() 把 Series index 變 list'
  ],
  E'import pandas as pd\n\ndef top_customers(df, n=3):\n    totals = df.groupby("customer_id")["amount"].sum()\n    return totals.nlargest(n).index.tolist()',
  ARRAY['groupby 是 SQL GROUP BY 的 Python 版', 'sum() 聚合、nlargest() 排序取前 n', '.index 是 Series 的 key、.tolist() 轉 list'],
  60, 5),

('py-m02', 'medium', 'basic', '檢查迴文 (palindrome)',
  '練習：寫個函式判斷字串是不是迴文（正讀反讀一樣）。',
  '寫 is_palindrome(s)。忽略大小寫跟空白、回 True/False。',
  E'def is_palindrome(s):\n    # TODO\n    pass\n',
  E'assert is_palindrome("racecar") == True\nassert is_palindrome("Race CAR") == True\nassert is_palindrome("hello") == False\nassert is_palindrome("A man a plan a canal Panama") == True\nassert is_palindrome("") == True',
  ARRAY['先 lower() + replace(" ", "") 去空白', '反轉 [::-1] 比較', '空字串是 True'],
  E'def is_palindrome(s):\n    clean = s.lower().replace(" ", "")\n    return clean == clean[::-1]',
  ARRAY['先 normalize: 全小寫 + 去空白', 'slice [::-1] 反轉', '比較 == 就行'],
  50, 6),

('py-m03', 'medium', 'basic', '兩數之和 (Two Sum)',
  '經典面試題：找 list 裡兩個數加起來 = target、回它們的 index。',
  '寫 two_sum(nums, target) 回 [i, j]、保證有解、index 小的在前。',
  E'def two_sum(nums, target):\n    # TODO\n    pass\n',
  E'assert two_sum([2,7,11,15], 9) == [0,1]\nassert two_sum([3,2,4], 6) == [1,2]\nassert two_sum([3,3], 6) == [0,1]\nassert two_sum([1,5,3,8,2], 10) == [1,3]',
  ARRAY['暴力解：O(n²) 雙 for 迴圈', '更好：用 dict 記 {value: index}、O(n)', '一邊掃一邊查 target - num 是否已在 dict'],
  E'def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []',
  ARRAY[
    '用 hashmap (dict) 把 O(n²) 降到 O(n)',
    '一邊走一邊建 dict、查 complement = target - num',
    '業界面試經典題、第一題會考這個'
  ],
  60, 7),

('py-m04', 'medium', 'scrape', '抓 GitHub Star',
  E'產品要追蹤競品 GitHub repo 的 star 數。寫 function 抓單一 repo。',
  E'寫 get_repo_stars(owner, name) 回 int (star 數)。\n用 GitHub API: https://api.github.com/repos/{owner}/{name}',
  E'async def get_repo_stars(owner, name):\n    # 提示：用 await nami_fetch(url, as_json=True)\n    # TODO\n    pass\n',
  E'# 測試：vercel/next.js star > 100000\nresult = await get_repo_stars("vercel", "next.js")\nassert isinstance(result, int), f"要回 int、你回 {type(result)}"\nassert result > 50000, f"next.js star 應 > 50000、你回 {result}"\n# 不存在的 repo\ntry:\n    await get_repo_stars("nonexistent-user", "nonexistent-repo-xyz")\n    assert False, "不存在的 repo 應該丟錯"\nexcept (RuntimeError, KeyError):\n    pass',
  ARRAY[
    'API URL: f"https://api.github.com/repos/{owner}/{name}"',
    '用內建 nami_fetch(url, as_json=True) 拿 dict',
    'star 數在 response 的 "stargazers_count" key'
  ],
  E'async def get_repo_stars(owner, name):\n    url = f"https://api.github.com/repos/{owner}/{name}"\n    data = await nami_fetch(url, as_json=True)\n    return data["stargazers_count"]',
  ARRAY[
    'GitHub API: GET /repos/{owner}/{name} 回 repo 詳情 dict',
    'stargazers_count 是 star 數欄位',
    'nami_fetch 是內建 helper、自動走 admin proxy + handle error'
  ],
  70, 8),

('py-m05', 'medium', 'pandas', '清資料 + 填補空值',
  '行銷給你 CSV、有缺值。清完才能算統計。',
  E'寫 clean_df(df) 收 DataFrame、做兩件事：\n1. 把 age 欄位 NaN 用平均年齡填補\n2. 把 city 欄位 NaN 用 "Unknown" 填\n回 cleaned DataFrame。',
  E'import pandas as pd\nimport numpy as np\n\ndef clean_df(df):\n    # TODO\n    pass\n\ndf = pd.DataFrame({\n    "name": ["Alice", "Bob", "Carol", "Dave"],\n    "age":  [25, np.nan, 30, np.nan],\n    "city": ["TPE", "KHH", np.nan, "TXG"],\n})',
  E'result = clean_df(df.copy())\nassert result["age"].isna().sum() == 0, "age 還有 NaN"\nassert result["city"].isna().sum() == 0, "city 還有 NaN"\nassert result["age"].iloc[1] == 27.5, f"平均 = (25+30)/2 = 27.5、你的 = {result[\'age\'].iloc[1]}"\nassert result["city"].iloc[2] == "Unknown"',
  ARRAY[
    'df["age"].mean() 算非 NaN 的平均',
    'df["age"].fillna(value) 填補空值',
    'df.copy() 避免改到原 df'
  ],
  E'import pandas as pd\nimport numpy as np\n\ndef clean_df(df):\n    df = df.copy()\n    df["age"] = df["age"].fillna(df["age"].mean())\n    df["city"] = df["city"].fillna("Unknown")\n    return df',
  ARRAY[
    'fillna() 是 pandas 處理缺值的標準方法',
    'mean() 自動忽略 NaN、不用先 dropna()',
    '業界做法：先 fillna、再 groupby / aggregate'
  ],
  70, 9),

-- HARD
('py-h01', 'hard', 'basic', '費氏數列 memoization',
  '經典：費氏數列 O(2^n) 太慢、用 memoization 優化到 O(n)。',
  E'寫 fib(n) 回第 n 個 fibonacci (0-indexed: fib(0)=0, fib(1)=1)。\nfib(50) 必須 < 1 秒。',
  E'def fib(n):\n    # TODO: 用 memoization 或 iterative\n    pass\n',
  E'assert fib(0) == 0\nassert fib(1) == 1\nassert fib(10) == 55\nassert fib(30) == 832040\n# 效能：fib(50) 必須 < 1 秒\nimport time\nt0 = time.time()\nresult = fib(50)\nelapsed = time.time() - t0\nassert result == 12586269025, f"fib(50) 預期 12586269025、你回 {result}"\nassert elapsed < 1.0, f"太慢: {elapsed:.2f}s (純遞迴會 >> 30s)"',
  ARRAY[
    '純遞迴 fib(n-1) + fib(n-2) 是 O(2^n)、超慢',
    '解法 1: 用 @functools.lru_cache decorator',
    '解法 2: iterative loop、a, b = b, a+b',
    '解法 3: 用 dict 自己存 memo'
  ],
  E'# 解法 1: lru_cache (最 Pythonic)\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n < 2: return n\n    return fib(n-1) + fib(n-2)\n\n# 解法 2: iterative (最快)\n# def fib(n):\n#     a, b = 0, 1\n#     for _ in range(n):\n#         a, b = b, a + b\n#     return a',
  ARRAY[
    '@lru_cache 一行就把 O(2^n) → O(n)',
    'iterative 版本更省記憶體 + 更快、業界正式環境推薦',
    '理解 memoization 是 DP (dynamic programming) 的基礎'
  ],
  100, 10),

('py-h02', 'hard', 'data', '線性回歸預測下月',
  '老闆要你看過去 12 個月銷售、預測下個月。',
  E'寫 predict_next(values) 收一個 list of 月銷售、用線性回歸預測「下一個月」。\n回 float 預測值。',
  E'def predict_next(values):\n    # TODO: 不可用 sklearn、手刻線性回歸\n    # 公式：y = ax + b、用最小平方法\n    pass\n',
  E'# 純線性 [10, 20, 30, 40] → 預測 50\nassert predict_next([10, 20, 30, 40]) == 50.0\n# 12 月有上升趨勢\nresult = predict_next([100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210])\nassert abs(result - 220.0) < 0.01, f"預期 220、你回 {result}"',
  ARRAY[
    '線性回歸 y = ax + b、最小平方法',
    'a = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)',
    'b = (Σy - a*Σx) / n',
    'x 是 index (0, 1, 2, ...)、y 是 values',
    '預測 index = len(values)'
  ],
  E'def predict_next(values):\n    n = len(values)\n    x = list(range(n))\n    y = values\n    sum_x = sum(x)\n    sum_y = sum(y)\n    sum_xy = sum(xi * yi for xi, yi in zip(x, y))\n    sum_x2 = sum(xi ** 2 for xi in x)\n    a = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)\n    b = (sum_y - a * sum_x) / n\n    return a * n + b',
  ARRAY[
    '最小平方法 (Least Squares) 是線性回歸最經典解法',
    'sklearn 的 LinearRegression 內部一樣是這公式、只是用矩陣寫',
    '理解原理後可推廣到多變數 (multivariate)'
  ],
  120, 11),

('py-h03', 'hard', 'fastapi', 'FastAPI CRUD + 驗證',
  E'建一個完整 FastAPI app：users CRUD + Pydantic 驗證。',
  E'寫一個 FastAPI app、有 4 個 endpoint：\n  GET  /users      → 列出全部\n  POST /users      → 建 user (驗 name + age)\n  GET  /users/{id} → 找一個 (找不到 404)\n  DELETE /users/{id} → 刪 (找不到 404)\n\nPydantic User: name (str, min 2 字)、age (int, 0~120)',
  E'import micropip\nawait micropip.install(["fastapi", "httpx", "pydantic"])\n\nfrom fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel, Field\nfrom fastapi.testclient import TestClient\n\napp = FastAPI()\nUSERS = {}  # 全域 user store {id: {name, age}}\n_next_id = [1]\n\n# TODO: 寫 4 個 endpoint + User schema\n\nclient = TestClient(app)',
  E'# 1. 列空\nr = client.get("/users")\nassert r.status_code == 200\nassert r.json() == []\n\n# 2. 建一個\nr = client.post("/users", json={"name": "Alice", "age": 25})\nassert r.status_code == 200, f"{r.status_code}: {r.json()}"\nu = r.json()\nassert u["name"] == "Alice" and u["age"] == 25\nuser_id = u["id"]\n\n# 3. 名字太短 → 422\nr = client.post("/users", json={"name": "X", "age": 25})\nassert r.status_code == 422\n\n# 4. age 超範圍 → 422\nr = client.post("/users", json={"name": "Bob", "age": 200})\nassert r.status_code == 422\n\n# 5. 找一個\nr = client.get(f"/users/{user_id}")\nassert r.status_code == 200 and r.json()["name"] == "Alice"\n\n# 6. 找不存在 → 404\nr = client.get("/users/9999")\nassert r.status_code == 404\n\n# 7. 刪\nr = client.delete(f"/users/{user_id}")\nassert r.status_code == 200\nr = client.get(f"/users/{user_id}")\nassert r.status_code == 404\n\nprint("所有 7 個測試都通過！")',
  ARRAY[
    'class User(BaseModel): name: str = Field(min_length=2)、age: int = Field(ge=0, le=120)',
    '@app.get("/users") 返回 list(USERS.values())',
    '@app.post("/users") 收 User、加 id、存進 USERS',
    'raise HTTPException(status_code=404, detail="not found") 處理找不到'
  ],
  E'import micropip\nawait micropip.install(["fastapi", "httpx", "pydantic"])\n\nfrom fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel, Field\nfrom fastapi.testclient import TestClient\n\napp = FastAPI()\nUSERS = {}\n_next_id = [1]\n\nclass User(BaseModel):\n    name: str = Field(..., min_length=2, max_length=50)\n    age: int = Field(..., ge=0, le=120)\n\n@app.get("/users")\ndef list_users():\n    return list(USERS.values())\n\n@app.post("/users")\ndef create_user(u: User):\n    uid = _next_id[0]\n    _next_id[0] += 1\n    stored = {"id": uid, **u.model_dump()}\n    USERS[uid] = stored\n    return stored\n\n@app.get("/users/{uid}")\ndef get_user(uid: int):\n    if uid not in USERS:\n        raise HTTPException(status_code=404, detail="user not found")\n    return USERS[uid]\n\n@app.delete("/users/{uid}")\ndef delete_user(uid: int):\n    if uid not in USERS:\n        raise HTTPException(status_code=404, detail="user not found")\n    del USERS[uid]\n    return {"deleted": uid}\n\nclient = TestClient(app)',
  ARRAY[
    'Pydantic Field(..., min_length=N) 設驗證、違反自動回 422',
    'HTTPException 是 FastAPI 拋 HTTP 錯誤的標準做法',
    'in-memory dict 當測試 DB、正式環境換 SQLAlchemy / SQLModel',
    '業界上線：加 dependency injection (Auth / DB session) + middleware'
  ],
  150, 12)

ON CONFLICT (id) DO NOTHING;
