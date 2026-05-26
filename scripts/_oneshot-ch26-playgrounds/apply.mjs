#!/usr/bin/env node
// 給 ch26 L0-L12 補 playground、改 L1-L5 重複範例
// 每課 playground 對應該課主題、新手友善、可改可跑
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CH_PATH = path.join(REPO_ROOT, 'src', 'data', 'chapters', 'ch26.json');

const PLAYGROUNDS = {
  '26.0': {
    key: '26.0.welcome',
    language: 'python',
    title: '哈囉、世界',
    initialCode: `# 歡迎！這是你的第一段 Python code
# 按右上「執行」、看下方輸出
print("Hello, AI 島！")
print("我準備好學 Python 了 🚀")

# 試試看：把名字改成你的
name = "新手"
print(f"我是 {name}、開始挑戰")
`,
    hint: '改 name 變數、按執行看結果',
  },

  '26.1': {
    key: '26.1.uv',
    language: 'python',
    title: 'Python 基本語法',
    initialCode: `# Python 是「直譯式」語言、寫了就能跑
# 不用 compile、不用宣告型別

# 變數
name = "AI 島"
year = 2026

# 字串組合（f-string、Python 3.6+ 標配）
print(f"歡迎來到 {name} {year} 年版！")

# 簡單運算
total_lessons = 33 + 25 + 25
print(f"Python 系列共 {total_lessons} 課")
`,
    hint: '改 name / year、看 f-string 怎麼變化',
  },

  '26.1.5': {
    key: '26.1.5.tools',
    language: 'python',
    title: '檢查 Python 環境',
    initialCode: `# 確認 Python 環境
import sys
import platform

print("Python 版本:", sys.version.split()[0])
print("作業系統:", platform.system())
print("CPU 架構:", platform.machine())

# 列出已裝模組（前 5 個）
import pkgutil
modules = [m.name for m in pkgutil.iter_modules()][:5]
print("\\n已裝模組（前 5 個）:", modules)
`,
    hint: '看你的 Python 版本 + OS 環境',
  },

  '26.2': {
    key: '26.2.hello',
    language: 'python',
    title: '第一個變數',
    initialCode: `# 變數 = 給資料取名字、之後用名字代表那筆資料

# 數字
age = 25
height = 175.5

# 字串
name = "Luffy"
city = "Taipei"

# 布林（True / False）
is_student = True

# print 顯示
print("Name:", name)
print("Age:", age)
print(f"Height: {height} cm")
print(f"Student? {is_student}")

# 變數可以「重新賦值」
age = 26
print(f"明年 {age} 歲")
`,
    hint: '改 name / age、看輸出怎麼變',
  },

  '26.3': {
    key: '26.3.types',
    language: 'python',
    title: '基本型態實驗',
    initialCode: `# Python 4 大基本型態
int_val = 42                # 整數 int
float_val = 3.14            # 浮點數 float
str_val = "Hello"           # 字串 str
bool_val = True             # 布林 bool

# 用 type() 查型態
print("int_val:", type(int_val).__name__, "=", int_val)
print("float_val:", type(float_val).__name__, "=", float_val)
print("str_val:", type(str_val).__name__, "=", str_val)
print("bool_val:", type(bool_val).__name__, "=", bool_val)

# 型態轉換
num_str = "123"
num_int = int(num_str)
print(f"\\n字串 '{num_str}' → 整數 {num_int}、相加 +1 = {num_int + 1}")

# 字串相乘（重複）
print("=" * 20)
print("Python 太強了！" * 3)
`,
    hint: '改數值、試 int("abc") 看會發生什麼錯',
  },

  '26.4': {
    key: '26.4.containers',
    language: 'python',
    title: '4 大容器',
    initialCode: `# Python 4 大容器：list / tuple / set / dict

# === List：有順序、可改 ===
fruits = ["apple", "banana", "cherry"]
fruits.append("date")          # 加一個
print("List:", fruits)
print("第 1 個:", fruits[0])

# === Tuple：有順序、不可改（更輕量）===
coords = (25.033, 121.5654)
print(f"\\nTuple 座標: 緯度 {coords[0]}, 經度 {coords[1]}")

# === Set：無序、自動去重 ===
tags = {"python", "ai", "indie", "python"}   # 重複的 python 會去掉
print("\\nSet 去重:", tags)

# === Dict：key-value 配對 ===
user = {"name": "Luffy", "age": 30, "city": "Taipei"}
print("\\nDict:", user)
print("Name:", user["name"])
print("Age:", user.get("age"))
`,
    hint: '加 / 改 / 刪 list 看效果、試 dict["不存在"] 看會錯',
  },

  '26.5': {
    key: '26.5.flow',
    language: 'python',
    title: '流程控制',
    initialCode: `# if / for / while + List Comprehension

# === if / elif / else ===
score = 85
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"
print(f"分數 {score} → 等級 {grade}")

# === for loop ===
print("\\n=== for ===")
for i in range(5):
    print(f"  第 {i+1} 次")

# === while loop ===
print("\\n=== while ===")
count = 0
while count < 3:
    print(f"  count = {count}")
    count += 1

# === List Comprehension（最 Pythonic 寫法）===
squares = [x ** 2 for x in range(1, 6)]
print("\\n平方:", squares)

# 加條件
evens = [x for x in range(1, 11) if x % 2 == 0]
print("偶數:", evens)
`,
    hint: '改 score 看 grade、試不同 range 範圍',
  },

  '26.6': {
    key: '26.6.functions',
    language: 'python',
    title: 'def 函數',
    initialCode: `# Python 函數：def 定義、可重複用

# === 基本函數 ===
def greet(name):
    return f"Hello, {name}!"

print(greet("Luffy"))
print(greet("AI 島"))

# === 預設值 ===
def power(base, exp=2):
    return base ** exp

print(f"\\n5 的平方 = {power(5)}")
print(f"5 的 3 次方 = {power(5, 3)}")

# === *args（不定數量參數）===
def sum_all(*numbers):
    return sum(numbers)

print(f"\\n1+2+3 = {sum_all(1, 2, 3)}")
print(f"1+2+3+4+5 = {sum_all(1, 2, 3, 4, 5)}")

# === lambda（匿名函數、一行函數）===
double = lambda x: x * 2
print(f"\\nlambda double(7) = {double(7)}")

# === 配 sorted 用 ===
people = [{"name": "A", "age": 30}, {"name": "B", "age": 25}, {"name": "C", "age": 35}]
sorted_by_age = sorted(people, key=lambda p: p["age"])
print("\\n按年齡排:", [p["name"] for p in sorted_by_age])
`,
    hint: '寫你自己的函數、用 *args 試試',
  },

  '26.7': {
    key: '26.7.modules',
    language: 'python',
    title: '內建模組',
    initialCode: `# Python 內建模組：不用裝、直接 import

# === 1. math：數學 ===
import math
print("π =", math.pi)
print("sqrt(16) =", math.sqrt(16))
print("sin(π/2) =", math.sin(math.pi / 2))

# === 2. random：隨機 ===
import random
print("\\n隨機 0-100:", random.randint(0, 100))
print("隨機選一個:", random.choice(["apple", "banana", "cherry"]))

# === 3. datetime：時間 ===
from datetime import datetime, timedelta
now = datetime.now()
print(f"\\n現在: {now}")
print(f"7 天後: {now + timedelta(days=7)}")

# === 4. json：JSON 處理 ===
import json
data = {"name": "Luffy", "tags": ["python", "ai"]}
json_str = json.dumps(data, ensure_ascii=False)
print(f"\\nJSON: {json_str}")

parsed = json.loads(json_str)
print(f"Parsed back: {parsed['name']}")

# === 5. os：作業系統 ===
import os
print(f"\\n當前目錄: {os.getcwd()}")
`,
    hint: '試其他內建模組：sys / time / re / collections',
  },

  '26.8': {
    key: '26.8.io',
    language: 'python',
    title: '檔案操作（記憶體模擬）',
    initialCode: `# 沙盒不能真的寫檔、但可以用 StringIO 模擬
import io
import csv
import json

# === 用 StringIO 當虛擬檔案 ===

# 1. 寫 + 讀 CSV
csv_buffer = io.StringIO()
writer = csv.writer(csv_buffer)
writer.writerow(["name", "age", "city"])
writer.writerow(["Luffy", 30, "Taipei"])
writer.writerow(["Nami", 28, "Tokyo"])

print("=== CSV 內容 ===")
print(csv_buffer.getvalue())

# 讀回來
csv_buffer.seek(0)
reader = csv.DictReader(csv_buffer)
print("=== 讀回來 ===")
for row in reader:
    print(f"  {row['name']} ({row['age']}歲) @ {row['city']}")

# 2. JSON
print("\\n=== JSON ===")
data = {"users": [{"name": "Luffy", "age": 30}]}
json_str = json.dumps(data, indent=2, ensure_ascii=False)
print(json_str)

# === with 語法（自動關檔）===
# 實際檔案：
# with open("data.txt", "w") as f:
#     f.write("Hello")
# with open("data.txt", "r") as f:
#     print(f.read())
print("\\n（實際檔案操作要在本機 Python 環境跑）")
`,
    hint: '改 CSV 內容、加更多 row',
  },

  '26.9': {
    key: '26.9.exceptions',
    language: 'python',
    title: '錯誤處理 try / except',
    initialCode: `# try / except：抓錯不讓程式 crash

# === 基本 try / except ===
def safe_divide(a, b):
    try:
        result = a / b
        return f"答案是 {result}"
    except ZeroDivisionError:
        return "❌ 不能除以 0"
    except TypeError:
        return "❌ 型別錯誤"

print(safe_divide(10, 2))
print(safe_divide(10, 0))      # 觸發 ZeroDivisionError
print(safe_divide(10, "abc"))  # 觸發 TypeError

# === try / except / else / finally ===
def read_data(value):
    try:
        num = int(value)
    except ValueError as e:
        print(f"❌ 解析失敗：{e}")
    else:
        print(f"✓ 解析成功：{num}")
    finally:
        print(f"--- 處理 '{value}' 結束 ---\\n")

read_data("123")
read_data("abc")

# === 自訂 Exception ===
class AgeError(Exception):
    pass

def check_age(age):
    if age < 0:
        raise AgeError(f"年齡不能負數: {age}")
    if age > 150:
        raise AgeError(f"年齡太大: {age}")
    return age

try:
    check_age(-5)
except AgeError as e:
    print(f"自訂錯誤：{e}")
`,
    hint: '改數字試不同錯誤、寫你自己的 Exception',
  },

  '26.10': {
    key: '26.10.oop',
    language: 'python',
    title: 'class 物件導向',
    initialCode: `# Python OOP：class、繼承、dataclass

# === 1. 基本 class ===
class Animal:
    def __init__(self, name, sound):
        self.name = name
        self.sound = sound

    def speak(self):
        return f"{self.name} says {self.sound}!"

dog = Animal("Rex", "Woof")
cat = Animal("Mimi", "Meow")
print(dog.speak())
print(cat.speak())

# === 2. 繼承 ===
class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name, "Woof")
        self.breed = breed

    def fetch(self):
        return f"{self.name} ({self.breed}) is fetching the ball!"

rex = Dog("Rex", "柴犬")
print("\\n" + rex.speak())
print(rex.fetch())

# === 3. dataclass（Python 3.7+ 推薦寫 class 方式）===
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

    def distance_to(self, other):
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5

p1 = Point(0, 0)
p2 = Point(3, 4)
print(f"\\n{p1} 到 {p2} 距離 = {p1.distance_to(p2)}")
`,
    hint: '寫你自己的 class、加 method',
  },

  '26.11': {
    key: '26.11.advanced',
    language: 'python',
    title: 'Decorator + Generator',
    initialCode: `# Python 進階：decorator / generator / context manager

# === 1. Decorator（裝飾器）===
import time

def timer(func):
    """計時 decorator"""
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"⏱️ {func.__name__} took {elapsed*1000:.2f}ms")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(0.1)
    return "done"

slow_function()

# === 2. Generator（用 yield 一筆一筆給）===
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print("\\nFibonacci:", list(fibonacci(10)))

# === 3. 配記憶體友善處理大數據 ===
def number_squares(n):
    """產生 n 個平方數、不全載入記憶體"""
    for i in range(1, n + 1):
        yield i * i

# 用 generator expression（最簡寫法）
total = sum(x * x for x in range(1, 1001))
print(f"\\n1-1000 的平方和 = {total:,}")

# === 4. Context Manager（with 語法）===
from contextlib import contextmanager

@contextmanager
def section(name):
    print(f"\\n--- 開始 {name} ---")
    yield
    print(f"--- 結束 {name} ---")

with section("我的區塊"):
    print("在區塊內做事")
`,
    hint: '試寫你自己的 decorator',
  },

  '26.12': {
    key: '26.12.types',
    language: 'python',
    title: 'Type Hints',
    initialCode: `# Type Hints：給函數加型別提示

from typing import Optional, Literal

# === 基本 type hint ===
def greet(name: str, age: int) -> str:
    return f"{name} is {age} years old"

print(greet("Luffy", 30))

# === Optional（可以是 None）===
def find_user(user_id: int) -> Optional[dict]:
    users = {1: {"name": "Luffy"}, 2: {"name": "Nami"}}
    return users.get(user_id)

print(find_user(1))   # 找到
print(find_user(99))  # None

# === Literal（限定值）===
def set_status(status: Literal["pending", "active", "deleted"]) -> str:
    return f"Status set to: {status}"

print(set_status("active"))
# set_status("foo")  # mypy 會告警

# === list[str] / dict[str, int]（Python 3.9+）===
def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

result = process_items(["apple", "banana", "cherry"])
print(result)

# === 自訂 type ===
from typing import TypedDict

class User(TypedDict):
    name: str
    age: int
    email: str

def show_user(user: User) -> None:
    print(f"{user['name']} ({user['age']}) - {user['email']}")

show_user({"name": "Luffy", "age": 30, "email": "luffy@example.com"})
`,
    hint: '寫帶 type hint 的函數、體驗 IDE 自動補完',
  },
};

const ch = JSON.parse(fs.readFileSync(CH_PATH, 'utf8'));
let updated = 0;
let added = 0;

for (const [lessonId, playground] of Object.entries(PLAYGROUNDS)) {
  const lesson = ch.lessons.find(l => l.id === lessonId);
  if (!lesson) {
    console.log(`  ⚠️ ${lessonId} not found`);
    continue;
  }

  const pgs = lesson.playgrounds || [];
  // 用 key 找既有 playground、有就 update / 沒就 push
  const existingIdx = pgs.findIndex(p => p.key === playground.key);
  if (existingIdx >= 0) {
    pgs[existingIdx] = { ...pgs[existingIdx], ...playground };
    updated++;
  } else if (pgs.length === 0) {
    pgs.push(playground);
    added++;
  } else {
    // 已有 playground 但 key 不同（fibonacci 重複範例）→ 取代第一個
    pgs[0] = playground;
    updated++;
  }
  lesson.playgrounds = pgs;
}

fs.writeFileSync(CH_PATH, JSON.stringify(ch, null, 2) + '\n', 'utf8');
console.log(`[ch26 playgrounds] DONE: ${added} added, ${updated} updated`);
