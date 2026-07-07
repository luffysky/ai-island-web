/**
 * 筆記市集種子：官方帳號(AI 島官方)提供的「免費」開發筆記包（Python / 前端 / 後端 / 課程常忽略的基本功）。
 * 每個 pack = 一組 notes（實際筆記內容）+ 一個 note_products（price_z=0 免費、is_active）。
 * 冪等：先刪掉這批（依 seller + category / product 標題）再重鋪，可安全重跑。
 * 內容原則：用「真人自己在整理的筆記」口吻手寫——第一人稱、有踩過雷的經驗、口語但有料，
 *   每則都講「這是什麼／為什麼用／我一開始卡在哪／新手雷」，不是丟一行語法、也不是教科書。
 *   （持續加量中，目標每包 120+；這批是手寫、不用腳本亂生。）
 * Usage: node scripts/seed-note-market.mjs
 */
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

// 官方賣家：ai_island（沒有就現建）
async function ensureOfficial() {
  const { rows } = await c.query("select id from public.profiles where username='ai_island'");
  if (rows[0]) return rows[0].id;
  const { data, error } = await admin.auth.admin.createUser({ email: "ai_island@npc.snowrealm.pet", password: crypto.randomUUID() + "Aa1!", email_confirm: true, user_metadata: { username: "ai_island", full_name: "AI 島官方" } });
  if (error) throw new Error(error.message);
  await c.query("update public.profiles set username='ai_island', display_name='AI 島官方', bio=$2 where id=$1", [data.user.id, "📢 AI 島官方帳號｜公告 · 新手指南 · 免費筆記"]);
  return data.user.id;
}
const SELLER = await ensureOfficial();

const P = (...paras) => paras.map((t) => `<p>${t}</p>`).join("");
const CAT = "官方開發筆記";

// pack：{ product 標題/描述, notes:[{title, content}] }
const PACKS = [
  {
    title: "🐍 Python 開發筆記（官方免費）",
    desc: "我自己從零學 Python 一路記下來的筆記，白話、有踩過的雷。從環境、語法、資料處理到爬蟲。免費拿去。",
    notes: [
      {
        title: "itertools.chain：好幾串當一串跑，不用先合併",
        chapter_id: 26,
        content: P(
          "我以前要把好幾個 list 接起來一起跑，都先 <code>a + b + c</code> 拼成一個大 list，資料一多超浪費記憶體。",
          "後來用 <code>from itertools import chain</code>，<code>for x in chain(a, b, c)</code> 就像把好幾條水管接成一條，水一路流過去，中間不用先倒進大水桶。",
          "如果你手上是「list 裡面又是一堆 list」，用 <code>chain.from_iterable(list_of_lists)</code> 一次攤平。",
          "⚠️ 我踩過：chain 回的是「一次性的迭代器」，跑完就空了。想用兩次就得 <code>list(chain(...))</code> 存下來，不然第二個迴圈啥都沒有。",
        ),
      },
      {
        title: "groupby 有雷：不先排序就切得亂七八糟",
        chapter_id: 26,
        content: P(
          "第一次用 <code>itertools.groupby</code> 分組，我氣死——同一種東西被切成好幾段，完全沒合起來。",
          "重點是：groupby 只會把「<b>相鄰</b>且相同」的併一組，它不會幫你全域分類。你想成它像超市結帳輸送帶，只會把「連在一起」的同款商品算一堆，隔開的就各算各的。",
          "所以一定要<b>先照分組的 key 排序</b>：<code>data.sort(key=f)</code> 之後再 <code>groupby(data, key=f)</code>，兩邊 key 要用同一個。",
          "⚠️ 還有個雷：每組給你的是迭代器，你在跳到下一組前沒把它 <code>list()</code> 存起來，回頭再拿就沒了。",
        ),
      },
      {
        title: "要窮舉組合？product / combinations 一行搞定",
        chapter_id: 26,
        content: P(
          "以前要「所有搭配」我都寫三層巢狀 for，醜又容易漏。itertools 有現成的。",
          "<code>product(顏色, 尺寸)</code> = 兩兩配對（像巢狀迴圈）；密碼窮舉 <code>product(\"0123456789\", repeat=4)</code>。<code>combinations(隊員, 2)</code> = 挑 2 個不看順序（選人）；<code>permutations</code> = 排列，看順序。",
          "口訣：要「同時選幾樣、順序無所謂」用 combinations；「排名次、順序有差」用 permutations。",
          "⚠️ 這些數量會爆炸性成長，10 個東西挑 5 個就好幾百種。別直接 <code>list()</code> 一個大集合，先 <code>math.comb</code> 估一下數量再說。",
        ),
      },
      {
        title: "lru_cache：同樣的問題別算第二次",
        chapter_id: 26,
        content: P(
          "我寫一個很慢的函式（遞迴算費氏數列），跑大一點就卡住。後來一個裝飾器就救了。",
          "在函式上面加 <code>@functools.lru_cache</code>，它會偷偷把「這組參數算過的答案」記在小抄裡，下次一樣的參數直接抄答案、不重算。就像考卷寫過的題目老師幫你貼標籤。",
          "很適合「同樣輸入永遠同樣輸出」又「重複被呼叫」的純計算。",
          "⚠️ 雷：只能用在「參數可 hash」（數字、字串、tuple 可以，list、dict 不行）而且函式沒有副作用的情況。拿去快取「每次結果都不同」的東西（像讀當下時間、打 API）會給你舊答案。",
        ),
      },
      {
        title: "functools.partial：先把幾個參數固定起來",
        chapter_id: 26,
        content: P(
          "我常常一個函式一直用同一組固定參數呼叫，重複打很煩。",
          "<code>partial</code> 可以「先幫函式綁好幾個參數」，生出一個新函式。像 <code>int(x, base=2)</code> 每次都要打 base=2，那就 <code>to_bin = partial(int, base=2)</code>，之後只要 <code>to_bin(\"1010\")</code>。",
          "很適合當回呼（callback）——人家只讓你傳一個「不帶參數的函式」，你就用 partial 把該帶的先包進去。",
          "⚠️ 我搞混過：partial 綁的是「呼叫當下」才生效，但你綁進去的變數值是「綁的那一刻」抓的。在迴圈裡 partial 一堆函式時，記得該固定的值有沒有真的被固定住。",
        ),
      },
      {
        title: "reduce：把一整串「滾成」一個值",
        chapter_id: 26,
        content: P(
          "加總我知道用 <code>sum</code>，但「連乘」「一路合併」就卡住。<code>functools.reduce</code> 是那個通用版。",
          "它像滾雪球：拿前兩個做運算得一個結果，再拿這結果跟下一個做，一路滾到底。<code>reduce(lambda a, b: a*b, nums)</code> 就是全部相乘。",
          "說真的，能用 <code>sum</code>、<code>max</code>、<code>\"\".join</code> 這種現成的就別 reduce，可讀性差很多。",
          "⚠️ 空的可迭代物又沒給起始值，reduce 會直接噴錯。有疑慮就給第三個參數當起點：<code>reduce(f, nums, 0)</code>。",
        ),
      },
      {
        title: "deque：要從「頭」進出就別用 list",
        chapter_id: 26,
        content: P(
          "我做一個先進先出的排隊，用 list 的 <code>pop(0)</code> 一直從頭拿，資料一多整個變慢。",
          "原因：list 從頭刪，後面每個元素都要往前挪一格（像排隊有人從最前面走、後面全部得往前站）。<code>collections.deque</code> 兩頭進出都是瞬間的。",
          "用法一樣直覺：<code>q.append(x)</code> 尾巴加、<code>q.popleft()</code> 頭拿；還能 <code>appendleft</code>。做 BFS、做「最近 N 筆」用 <code>deque(maxlen=N)</code> 超香，滿了自動擠掉最舊的。",
          "⚠️ deque 支援索引但「用索引隨機存取中間」很慢（要一路走過去）。要常常 <code>q[中間某個]</code> 的還是乖乖用 list。",
        ),
      },
      {
        title: "ChainMap：好幾層設定疊起來，前面蓋後面",
        chapter_id: 26,
        content: P(
          "我做設定檔時常要「使用者設定 > 專案設定 > 預設值」這種優先順序，以前一個個 merge 很煩。",
          "<code>collections.ChainMap(user, project, default)</code> 把好幾個 dict 疊成一疊，查 key 時從最前面那層開始找，找到就回。像好幾張投影片疊著看，上面那張擋住下面的。",
          "好處是它不真的複製資料，只是「看穿」下面幾層，原字典改了它也跟著變。",
          "⚠️ 對 ChainMap 寫入（<code>cm[k]=v</code>）只會寫進<b>第一層</b>那個 dict，不會動到下面。以為改到 default 結果只改到最上層，這個我卡過。",
        ),
      },
      {
        title: "heapq：一直要「最小的那個」就用它",
        chapter_id: 26,
        content: P(
          "我要一直拿「目前最小值」又邊拿邊加新資料，每次 sort 一遍慢死。heapq 就是為這個生的。",
          "它把 list 維護成一個「堆」，<code>heappush</code> 加、<code>heappop</code> 每次都彈出<b>最小</b>的那個，成本很低。想成一個會自動把最輕的浮到頂端的水桶。",
          "要「最大的 N 個」「最小的 N 個」直接 <code>heapq.nlargest(3, data)</code> / <code>nsmallest</code>，比全排序快。",
          "⚠️ 它是<b>小根堆</b>（永遠彈最小）。要最大優先，把值存成負數推進去、拿出來再變回正，或在 tuple 裡放 <code>(-優先度, 資料)</code>。",
        ),
      },
      {
        title: "bisect：在已排序的 list 裡插隊、找位置",
        chapter_id: 26,
        content: P(
          "我有一串已經排好序的分數，要塞新的一筆進去又保持排序，重排整串很浪費。",
          "<code>bisect.insort(arr, x)</code> 用二分法幫你找到該插的位置直接插進去，順序自動維持。像圖書館把新書插進已排好的書架，不用把整排重排。",
          "只想「查它該排第幾」不插的話用 <code>bisect_left / bisect_right</code>，很適合做「成績轉等第」這種區間對照。",
          "⚠️ 大前提：list 本來就得是<b>已排序</b>的，bisect 不會幫你排。丟沒排序的進去，它給你的位置是錯的、還不報錯，超難抓。",
        ),
      },
      {
        title: "海象運算子 := ：一邊算一邊存起來",
        chapter_id: 26,
        content: P(
          "我常常一個值要先算、判斷、然後又要用，變成算兩次或多寫一行。Python 3.8 的 <code>:=</code> 解決這個。",
          "它讓你「在判斷式裡順手把值存進變數」。像 <code>while (line := f.readline()):</code>，讀一行、順便存進 line、順便判斷是不是空的，三件事一行做完。",
          "推導式裡也很有用：<code>[y for x in data if (y := f(x)) > 0]</code>，f(x) 只算一次又能拿來過濾又能收進去。",
          "⚠️ 別為了省行數硬塞，塞到一行看不懂就是負分。而且它叫「海象」是因為 <code>:=</code> 像海象的眼睛跟牙，別跟一般的 <code>=</code> 搞混。",
        ),
      },
      {
        title: "自己做 with：contextlib 幫你收尾",
        chapter_id: 26,
        content: P(
          "<code>with open(...)</code> 好用在「自動關檔」。我想讓自己的東西（連線、計時、暫時改設定）也有這種「用完自動收拾」。",
          "最省事的是 <code>from contextlib import contextmanager</code>，寫個函式：yield 之前是「進場準備」，yield 之後是「離場收尾」，中間加個 <code>@contextmanager</code> 就變成能 with 的東西。像進出房間自動開燈/關燈。",
          "例如計時器：yield 前記開始時間、yield 後印花了多久，包起來就能 <code>with timer():</code>。",
          "⚠️ 收尾程式碼一定要放進 <code>try/finally</code> 的 finally 或靠 with 的機制，不然中間噴錯就跳過收尾（沒關到檔、沒還原設定）。",
        ),
      },
      {
        title: "subprocess：在 Python 裡跑外部指令",
        chapter_id: 26,
        content: P(
          "我想在程式裡跑 git、ffmpeg 那些命令列工具。以前用老舊的 <code>os.system</code>，抓不到輸出也不好判斷成功失敗。",
          "現在統一用 <code>subprocess.run([\"git\", \"status\"], capture_output=True, text=True)</code>，回來的物件有 <code>.stdout</code>、<code>.returncode</code>（0 代表成功）。",
          "指令用<b>list</b>一個一個字分開傳（<code>[\"ls\", \"-l\"]</code>），別自己拼成一整串字串。",
          "⚠️ 大雷：加了 <code>shell=True</code> 又把使用者輸入拼進指令字串，等於開後門讓人執行任意指令（command injection）。能不用 shell=True 就別用，參數用 list 傳最安全。",
        ),
      },
      {
        title: "argparse：讓你的腳本能吃命令列參數",
        chapter_id: 26,
        content: P(
          "我的小工具本來把設定寫死在程式裡，每次改都要動 code。想做成 <code>python tool.py --name 小明 --count 3</code> 這樣。",
          "<code>import argparse</code>，建 <code>parser = argparse.ArgumentParser()</code>，用 <code>add_argument(\"--count\", type=int, default=1)</code> 一個個加，最後 <code>args = parser.parse_args()</code>，就能 <code>args.count</code> 拿到。",
          "最爽的是它自動生 <code>--help</code> 說明，還會幫你檢查型別、必填。",
          "⚠️ 別自己土炮解析 <code>sys.argv</code>，處理「有沒有給、順序、預設值、型別」很快就一團糟。幾個參數以上就用 argparse。",
        ),
      },
      {
        title: "requests：打 API 我只記這幾招",
        chapter_id: 26,
        content: P(
          "第一次串 API 我被一堆術語嚇到，其實 requests 超簡單。",
          "拿資料 <code>r = requests.get(url, params={\"q\": \"貓\"})</code>；送資料 <code>requests.post(url, json={...})</code>。回傳是 JSON 就 <code>r.json()</code> 直接變 dict。",
          "一定要檢查狀態：<code>r.status_code</code>（200 才是成功），或直接 <code>r.raise_for_status()</code> 讓失敗自己噴錯。",
          "⚠️ 兩個必踩：一是不設 <code>timeout=10</code>，對方掛掉你的程式會<b>永遠卡住</b>等它；二是把 API 金鑰硬寫在程式裡推上 GitHub。金鑰放環境變數、timeout 一定要給。",
        ),
      },
      {
        title: "pip / poetry / uv 到底用哪個裝套件",
        chapter_id: 26,
        content: P(
          "剛學就 <code>pip install</code> 加 <code>requirements.txt</code>，夠用。但團隊協作、要鎖死版本時就會想要更好的工具。",
          "我的白話比較：<b>pip+venv</b>=最原始、人人都有，但版本鎖得鬆。<b>poetry/pipenv</b>=幫你管相依關係、生 lock 檔（大家裝到一模一樣的版本），但速度普通。<b>uv</b>=新星，用 Rust 寫的、超快，也能鎖版本，正在紅。",
          "新專案我現在會直接試 uv：<code>uv venv</code>、<code>uv pip install</code> 快到有感。",
          "⚠️ 別在同個專案混用（一下 pip、一下 poetry），相依關係會兩邊打架。選一個、整個專案貫徹到底。",
        ),
      },
      {
        title: "async / await：不是變快，是「等的時候去做別的」",
        chapter_id: 26,
        content: P(
          "asyncio 我卡最久的觀念是：它<b>不會讓計算變快</b>，它是讓你「在等網路/等 IO 的空檔去做別的事」。",
          "比喻：你一個人煮三鍋麵，不用站著等第一鍋滾完才下第二鍋——水滾的空檔就去下別鍋。<code>await</code> 就是「這裡要等一下，你先去忙別的」。",
          "函式前面加 <code>async def</code>，裡面該等的地方 <code>await</code>，最後用 <code>asyncio.run(main())</code> 啟動。要一起跑很多個用 <code>asyncio.gather(...)</code>。",
          "⚠️ 大雷：在 async 裡呼叫「會卡住的同步函式」（像普通的 <code>time.sleep</code>、普通的 requests），整個事件迴圈被你卡死，async 白搭。要用 async 版（<code>asyncio.sleep</code>、httpx/aiohttp）。",
        ),
      },
      {
        title: "懶得碰 async？concurrent.futures 更好上手",
        chapter_id: 26,
        content: P(
          "想「同時做很多件事」但不想學整套 asyncio，我很多時候用 <code>concurrent.futures</code> 就夠。",
          "<code>with ThreadPoolExecutor() as ex: results = ex.map(下載, 網址們)</code>，它自動開一堆工人分頭做，你收結果就好。像找一票人同時去不同櫃檯排隊。",
          "選哪種池子：<b>等網路/讀檔（IO 密集）</b>用 ThreadPoolExecutor；<b>純計算很吃 CPU</b>用 ProcessPoolExecutor（繞開 GIL）。",
          "⚠️ 多執行緒同時改同一個共用變數（例如一個計數器）會算錯，要嘛用 Lock、要嘛讓每個工人回傳自己的結果、最後你再合。",
        ),
      },
      {
        title: "sqlite3：一個檔案就是一個資料庫，免安裝",
        chapter_id: 17,
        content: P(
          "想存結構化資料又不想架 MySQL，Python 內建的 sqlite3 超讚——整個資料庫就是一個 <code>.db</code> 檔。",
          "<code>con = sqlite3.connect(\"app.db\")</code>，拿 <code>cur = con.cursor()</code> 下 SQL，改完資料一定要 <code>con.commit()</code> 才會真的存進去。",
          "查詢帶參數用問號：<code>cur.execute(\"select * from users where age > ?\", (18,))</code>。",
          "⚠️ 兩個必踩：一是忘了 commit，程式關掉資料全沒；二是用 f-string 把值拼進 SQL（<code>f\"... where name='{name}'\"</code>）＝SQL injection 大門。<b>永遠用問號帶參數</b>，別自己拼字串。",
        ),
      },
      {
        title: "SQLAlchemy 入門：用「物件」操作資料庫，少寫 SQL",
        chapter_id: 17,
        content: P(
          "純手寫 SQL 字串久了很累、又容易拼錯。SQLAlchemy 讓我把資料表對應成 Python class，操作物件就等於操作資料庫（這叫 ORM）。",
          "定義一個繼承自 Base 的 <code>User</code> class、欄位當 class 屬性；之後 <code>session.add(User(name=\"小明\"))</code>、<code>session.commit()</code> 就寫進去，查詢用 <code>session.query(User).filter(...)</code>。",
          "好處：跨資料庫（SQLite 換 Postgres）程式幾乎不用改，還幫你擋掉 injection。",
          "⚠️ ORM 方便但會偷偷發很多 SQL——經典的 <b>N+1 查詢</b>：迴圈裡每一圈都去撈關聯資料，1 筆變幾百筆查詢。該用 <code>joinedload</code> 一次撈就別偷懶。",
        ),
      },
      {
        title: "pickle：把 Python 物件存成檔、再原封不動讀回來",
        chapter_id: 26,
        content: P(
          "我算了半天的結果想存下來下次直接用，存成 JSON 又塞不下自訂物件。pickle 可以把幾乎任何 Python 物件「醃」成檔案。",
          "存 <code>pickle.dump(obj, open(\"data.pkl\", \"wb\"))</code>、讀 <code>obj = pickle.load(open(\"data.pkl\", \"rb\"))</code>，讀回來連 class、巢狀結構都在。注意是二進位模式 <code>wb</code>/<code>rb</code>。",
          "適合自己程式內部暫存中間結果，不適合當跨語言/對外的資料格式（那用 JSON）。",
          "⚠️ 超重要資安雷：<b>絕對不要 pickle.load 來路不明的檔案</b>。它反序列化時可以執行任意程式碼，等於幫對方在你電腦跑指令。只 load 你自己產生、信得過的。",
        ),
      },
      {
        title: "if __name__ == \"__main__\"：這行到底在幹嘛",
        chapter_id: 26,
        content: P(
          "我一直看到這行卻不懂，後來搞懂它其實很單純：它是問「這個檔案是被<b>直接執行</b>、還是被別人 import 的？」",
          "你 <code>python a.py</code> 直接跑時，a 的 <code>__name__</code> 會是 <code>\"__main__\"</code>；但如果 a 是被別的檔 <code>import a</code>，它就變成 <code>\"a\"</code>。所以這個 if 底下放「只有直接跑才要做的事」（像測試、啟動）。",
          "比喻：這是一個「只有我自己主演時才播的開場」，被當配角 import 進別的戲時就不播。",
          "⚠️ 沒包這行、又把「馬上執行的程式」寫在檔案最外層，那別人一 <code>import</code> 你的檔，那些程式就<b>立刻亂跑一遍</b>。函式定義放外面、真正要跑的動作放進這個 if。",
        ),
      },
      {
        title: "循環 import：A 要 B、B 又要 A，卡死",
        chapter_id: 26,
        content: P(
          "我兩個檔案互相 import，結果噴 <code>ImportError</code> 或某個東西「還沒定義好」。這就是循環 import。",
          "原因：Python 執行 import 是「從上往下跑一遍那個檔」，A 跑到一半去 import B、B 又回頭 import 還沒跑完的 A，就拿到半成品。像兩個人互相等對方先講話。",
          "解法通常是：把共用的東西抽到第三個檔（<code>common.py</code>）大家都 import 它；或把 import 移到「用到的函式裡面」延後執行。",
          "⚠️ 別靠「調換 import 順序」硬喬過去，那是碰運氣、之後一定復發。看到循環，代表你的模組邊界該重新切了。",
        ),
      },
      {
        title: "property：讓「方法」用起來像「屬性」",
        chapter_id: 26,
        content: P(
          "我想在讀寫一個屬性時偷偷做點事（檢查、換算），但又不想把 <code>obj.攝氏</code> 改成醜醜的 <code>obj.get_攝氏()</code>。property 就是幹這個的。",
          "在方法上面加 <code>@property</code>，之後 <code>obj.攝氏</code> 看起來是屬性、其實背後跑了一個函式；再配 <code>@攝氏.setter</code> 就能攔截「賦值」那一刻做檢查（例如溫度不准低於絕對零度就擋下）。",
          "好處：對外介面不變（還是 <code>obj.攝氏 = 25</code>），內部想加驗證/換算隨時能加，不用改所有用到的地方。",
          "⚠️ 別在 property 裡塞很重的計算（每次讀都重算會很慢），也別讓 getter 有副作用——別人只是「讀個值」不預期你偷偷改東西。",
        ),
      },
      {
        title: "classmethod 還是 staticmethod？我這樣分",
        chapter_id: 26,
        content: P(
          "class 裡三種方法我一直搞混。白話分：一般方法第一個參數 <code>self</code>（拿到那個物件實例）；classmethod 第一個是 <code>cls</code>（拿到類別本身）；staticmethod 兩個都不拿。",
          "<b>classmethod</b> 最常用來做「另一種建構方式」，像 <code>User.from_json(s)</code>——它需要 <code>cls</code> 才能 <code>cls(...)</code> 生出正確的子類。",
          "<b>staticmethod</b> 就是「剛好放在這 class 底下、但其實不碰實例也不碰類別」的工具函式，純粹歸類用。",
          "⚠️ 判斷法：方法裡有用到 self 就一般方法；沒用 self 但有用到 cls（要建實例、讀類別屬性）就 classmethod；兩個都沒用到才 staticmethod。硬把該用 self 的寫成 static，之後要拿實例資料就卡住。",
        ),
      },
      {
        title: "__str__ 跟 __repr__ 差在哪（別再只有一堆記憶體位址）",
        chapter_id: 26,
        content: P(
          "我 print 自己的物件都跳出 <code>&lt;User object at 0x7f...&gt;</code>，完全看不懂。加這兩個方法就解決。",
          "<code>__str__</code> 是「給人看的漂亮版」，<code>print(obj)</code> 和 <code>str(obj)</code> 會用它。<code>__repr__</code> 是「給開發者看的精確版」，你在互動視窗直接打變數名、或看 list 裡的元素、debug 時看到的就是它。",
          "我的習慣：<b>一定先寫 __repr__</b>，寫成「能重建這個物件」的樣子像 <code>User(name='小明')</code>；__str__ 沒寫時會自動退回用 __repr__，所以先顧好它最划算。",
          "⚠️ list 裡的元素、還有噴錯訊息裡顯示物件，用的都是 __repr__ 不是 __str__。只寫 __str__ 的話 debug 時還是一片看不懂。",
        ),
      },
      {
        title: "__eq__ 跟 __hash__ 要成雙成對",
        chapter_id: 26,
        content: P(
          "我讓兩個「內容一樣」的自訂物件被判定相等，就寫了 <code>__eq__</code>。結果拿去放 set 或當 dict 的 key 時出怪事。",
          "規則：只要你定義了 <code>__eq__</code>，Python 會把 <code>__hash__</code> 設成 None，你的物件就<b>不能</b>放進 set、不能當 dict 的 key。因為「相等的東西 hash 必須一樣」，你改了相等定義就得一起交代 hash。",
          "解法：兩個一起定義，而且用「同一組欄位」算。<code>__eq__</code> 比哪些欄位，<code>__hash__</code> 就 <code>hash((那些欄位))</code>。",
          "⚠️ 別把「會變的欄位」拿去算 hash——物件放進 set 後你又改了那欄，它就在 set 裡「找不到自己」。當 key/放 set 的物件，拿來算 hash 的欄位要是不可變的。",
        ),
      },
      {
        title: "__slots__：物件很多時偷偷省一大把記憶體",
        chapter_id: 26,
        content: P(
          "我一次生幾十萬個小物件，記憶體爆掉。原因是每個 Python 物件預設都背著一個 <code>__dict__</code>（可以隨時加屬性用的），量一大就很肥。",
          "在 class 裡加一行 <code>__slots__ = (\"x\", \"y\")</code>，就是跟 Python 說「這個物件只會有這幾個屬性、別給我那個 dict」，記憶體省很多、存取還變快。像從「可以無限塞的抽屜櫃」換成「剛好幾格的收納盒」。",
          "很適合資料量大、欄位固定的小資料類。",
          "⚠️ 代價：加了 slots 就<b>不能臨時再塞新屬性</b>（<code>obj.z = 1</code> 會噴錯），這正是它省記憶體的原因。也和某些功能（多重繼承、需要 __dict__ 的套件）會衝突，用之前想清楚欄位。",
        ),
      },
      {
        title: "ABC 抽象基底類：規定子類「一定要實作這幾個」",
        chapter_id: 26,
        content: P(
          "我做外掛系統，希望每個外掛都<b>保證</b>有 <code>run()</code> 方法，但父類自己給不出實作。ABC 就是拿來立這種規矩的。",
          "<code>from abc import ABC, abstractmethod</code>，父類繼承 ABC、要求的方法上面加 <code>@abstractmethod</code>。這樣任何忘了實作 run 的子類，一<b>建立實例</b>就直接噴錯，不會拖到執行才爆。",
          "把它想成合約：簽了（繼承）就必須履行（實作那些方法），不然當場擋下。",
          "⚠️ 抽象類本身不能被實例化（<code>MyABC()</code> 會報錯，這是故意的）。它只是模板，要用就繼承它、把該實作的補齊。",
        ),
      },
      {
        title: "dataclass 進階：field 跟 frozen 別踩雷",
        chapter_id: 26,
        content: P(
          "dataclass 幫我省掉一堆 <code>__init__</code>。但兩個地方我踩過雷，記一下。",
          "第一：欄位預設值如果是 list/dict 這種可變物件，<b>不能直接寫</b> <code>items: list = []</code>（會報錯，因為所有實例會共用同一個）。要用 <code>field(default_factory=list)</code>，每個實例才有自己的。",
          "第二：加 <code>@dataclass(frozen=True)</code> 可以做出「不可改」的資料物件（建完就凍結、改欄位噴錯），還自動能 hash、能放 set，很適合當設定或 key。",
          "⚠️ frozen 的物件真的不能改，你需要「改一點點的新版本」時用 <code>dataclasses.replace(obj, x=5)</code> 生一個新的，別想直接賦值。",
        ),
      },
      {
        title: "typing 三寶：Protocol / TypedDict / Literal",
        chapter_id: 26,
        content: P(
          "型別註記寫久了，這三個讓我少寫很多、也讓工具更懂我的意圖。",
          "<b>Protocol</b>＝「鴨子型別」寫成型別：不管你是誰，只要有 <code>read()</code> 方法就算數，不用硬去繼承。<b>TypedDict</b>＝規定一個 dict「該有哪些 key、各是什麼型別」（像描述 API 回傳的 JSON 形狀）。<b>Literal</b>＝限定只能是某幾個固定值，<code>Literal[\"asc\", \"desc\"]</code>。",
          "它們讓 <code>mypy</code>、編輯器能在你打錯 key、傳錯字串時當場提醒。",
          "⚠️ 提醒：這些型別註記<b>執行時不會真的檢查</b>，Python 照跑不誤。真正抓錯要靠 mypy 之類的工具去掃，別以為寫了註記就會自動擋。",
        ),
      },
      {
        title: "mypy：在跑之前就抓出型別對不上的地方",
        chapter_id: 26,
        content: P(
          "Python 不管型別，很多錯要跑到那行才炸。mypy 讓我「不用執行」就先掃一遍，提早抓包。",
          "配合 type hints 用：<code>def add(a: int, b: int) -> int:</code>，然後命令列 <code>mypy 你的檔.py</code>，它會挑出「你把字串傳給要 int 的參數」「函式可能回 None 你卻直接 .strip()」這種問題。",
          "對大專案、多人協作特別值得，等於多一層免費的自動審查。",
          "⚠️ 別想一次全套嚴格模式套上舊專案，會被幾百個錯淹沒。從新檔案、關鍵模組開始，逐步加註記，體感才好。",
        ),
      },
      {
        title: "zoneinfo：算時區別再自己 +8 小時",
        chapter_id: 26,
        content: P(
          "我以前處理時區都手動加減 8 小時，遇到日光節約時間就整個崩。Python 3.9 內建的 <code>zoneinfo</code> 一勞永逸。",
          "<code>from zoneinfo import ZoneInfo</code>，把時區「貼」到時間上：<code>dt.astimezone(ZoneInfo(\"Asia/Taipei\"))</code>，它自己知道每個地區在每個日期的正確偏移。",
          "我的鐵則：<b>存資料一律存 UTC</b>，只有要顯示給使用者看時才轉成當地時區。",
          "⚠️ 別用「沒帶時區的 naive 時間」（<code>datetime.now()</code>）去跟帶時區的比大小，會直接噴錯或算歪。要嘛全帶時區、要嘛全不帶，別混。",
        ),
      },
      {
        title: "timedelta：日期加減、算天數的正確姿勢",
        chapter_id: 26,
        content: P(
          "「三天後是幾號」「兩個日期差幾天」這種我以前傻傻自己算，遇到跨月跨年就錯。datetime 早就幫你算好了。",
          "<code>from datetime import timedelta</code>，直接 <code>今天 + timedelta(days=3)</code> 就是三天後，跨月自動處理。兩個 datetime 相減會得到一個 timedelta，<code>(d2 - d1).days</code> 就是差幾天。",
          "timedelta 能裝 days、hours、minutes、seconds，混著加也行。",
          "⚠️ timedelta 沒有「months」「years」——因為一個月幾天不固定。要「幾個月後」得用 <code>dateutil.relativedelta</code> 或自己處理年月，別硬用 <code>days=30</code> 湊，久了一定歪。",
        ),
      },
      {
        title: "uuid：要一個「幾乎不可能撞」的 ID",
        chapter_id: 26,
        content: P(
          "我要給每筆資料一個唯一 ID，又不想靠資料庫的自增號（會外洩數量、多台機器還會撞）。uuid 解決這個。",
          "<code>import uuid</code>，<code>uuid.uuid4()</code> 產一個隨機的長 ID，長到你這輩子產再多也幾乎不可能重複。轉成字串 <code>str(uuid.uuid4())</code> 就能當檔名、當 key。",
          "跨機器、離線先產 ID、不想讓人猜到下一個是誰，都很適合。",
          "⚠️ 別把 uuid4 拿去當「安全的 token / 密碼」——它是為了唯一、不是為了保密，理論上可被推測。要防人猜的秘密用 <code>secrets</code> 模組產。",
        ),
      },
      {
        title: "hashlib：算檔案/字串的指紋",
        chapter_id: 26,
        content: P(
          "我想確認「這兩個檔一不一樣」「下載的檔有沒有被動過」，一個個 byte 比太慢。hash 就是內容的指紋。",
          "<code>import hashlib</code>，<code>hashlib.sha256(資料的bytes).hexdigest()</code> 給你一串固定長度的字。內容只要差一個 byte，指紋就整個不同；一樣的內容永遠一樣的指紋。",
          "常拿來做檔案完整性校驗、資料去重（比指紋就好）。注意輸入要是 bytes，字串記得先 <code>.encode()</code>。",
          "⚠️ <b>存密碼別用普通 sha256/md5</b>。那類太快，被撈走後暴力破解很快。密碼要用專門的慢雜湊（bcrypt、argon2）加 salt。hashlib 適合「校驗完整性」不是「存密碼」。",
        ),
      },
      {
        title: "secrets：要「安全的隨機」就別用 random",
        chapter_id: 26,
        content: P(
          "我曾經用 <code>random</code> 產「重設密碼的連結 token」，後來才知道這超危險。",
          "<code>random</code> 是「可預測的偽隨機」，適合洗牌、抽獎這種不涉及安全的；但拿去產 token、密碼、驗證碼，攻擊者有機會推算出來。要安全隨機用內建的 <code>secrets</code>。",
          "<code>secrets.token_urlsafe(32)</code> 產一段能塞網址的安全亂碼、<code>secrets.choice(候選)</code> 安全地隨機挑一個，拿來做臨時密碼很讚。",
          "⚠️ 判斷法很簡單：這個隨機值「被別人猜到會不會出事」？會出事（token、密碼、金鑰）→ secrets；不會（遊戲、抽樣）→ random 就好。",
        ),
      },
      {
        title: "base64：把二進位「翻譯」成純文字，不是加密",
        chapter_id: 26,
        content: P(
          "我要把圖片塞進 JSON、或放進網址，二進位資料直接塞會壞掉。base64 把它轉成只有英數符號的純文字。",
          "<code>import base64</code>，編 <code>base64.b64encode(bytes)</code>、解 <code>base64.b64decode(字串)</code>。你在 HTML 看到的 <code>data:image/png;base64,...</code> 就是這個。",
          "重點觀念：它是「換一種表示法」讓文字通道能載二進位，體積還會變大約 1/3。",
          "⚠️ <b>base64 不是加密</b>！任何人都能一秒解回原文。別拿它「藏」密碼或敏感資料以為安全了，那只是把明文換個樣子而已。",
        ),
      },
      {
        title: "tempfile：要暫存檔就別自己在桌面亂丟",
        chapter_id: 26,
        content: P(
          "我以前處理中間檔都自己 <code>open(\"temp.txt\")</code> 丟在當前資料夾，忘了刪、還會兩支程式同時搶同一個檔名打架。",
          "<code>import tempfile</code> 幫你在系統的暫存區生一個「名字不會撞、用完自動刪」的檔。<code>with tempfile.NamedTemporaryFile() as f:</code> 離開 with 就自動清掉。要暫存整個資料夾用 <code>TemporaryDirectory()</code>。",
          "好處：跨平台（自己找到正確的暫存位置）、不會殘留垃圾、多程式同時跑也不撞名。",
          "⚠️ 在 Windows 上，用 NamedTemporaryFile 時「同時間用別的方式再開那個檔」可能開不了（檔案鎖）。需要「先寫完、再讓別的程式讀」的場景，設 <code>delete=False</code> 自己控制刪除時機。",
        ),
      },
      {
        title: "glob：用 *.csv 這種模式一次抓一堆檔",
        chapter_id: 26,
        content: P(
          "我要處理資料夾裡「所有 csv」，以前 <code>os.listdir</code> 撈全部再自己過濾副檔名，很囉唆。",
          "<code>from glob import glob</code>，<code>glob(\"data/*.csv\")</code> 直接回一個符合的檔案路徑 list，<code>*</code> 代表「任意字」。要連子資料夾一起找用 <code>glob(\"data/**/*.csv\", recursive=True)</code>。",
          "純文字模式很直覺，跟你在命令列打的萬用字元一樣。",
          "⚠️ 兩個雷：一是回來的順序<b>不保證</b>照檔名排，需要固定順序就 <code>sorted(glob(...))</code>；二是預設抓不到 <code>.env</code> 這種點開頭的隱藏檔。",
        ),
      },
      {
        title: "shutil：複製、搬移、砍整個資料夾",
        chapter_id: 26,
        content: P(
          "檔案層級的操作（開檔讀寫）我會了，但「複製一整個資料夾」「搬檔」用底層 os 很痛。shutil 是高階版。",
          "常用就這幾個：<code>shutil.copy(src, dst)</code> 複製檔、<code>shutil.copytree(src, dst)</code> 複製整個資料夾、<code>shutil.move(src, dst)</code> 搬移或改名、<code>shutil.rmtree(dir)</code> 砍掉整個資料夾。還能 <code>make_archive</code> 打包成 zip。",
          "把它想成程式版的「複製貼上/剪下/整個資料夾丟垃圾桶」。",
          "⚠️ <code>rmtree</code> 是<b>直接刪、不進垃圾桶、沒得反悔</b>。路徑組錯（例如不小心指到根目錄）後果不堪設想。刪之前務必 print 出要刪的路徑確認，或先 <code>if os.path.isdir(path)</code> 把關。",
        ),
      },
      {
        title: "正則的群組：用括號把要的部分「圈起來抓」",
        chapter_id: 26,
        content: P(
          "正則我一開始只會判斷「符不符合」，不會「把符合的某段挖出來」。關鍵就是<b>括號</b>。",
          "在 pattern 裡用 <code>()</code> 圈住你要的部分，比對後 <code>m.group(1)</code> 拿第一個括號抓到的、<code>m.group(2)</code> 第二個。像 <code>(\\d{4})-(\\d{2})</code> 就能分別拿到年跟月。",
          "括號一多就數不清第幾個，改用<b>命名群組</b> <code>(?P&lt;year&gt;\\d{4})</code>，之後 <code>m.group(\"year\")</code> 用名字拿，清楚多了。",
          "⚠️ 先判斷有沒有配到再拿：<code>re.search</code> 沒配到會回 <code>None</code>，你直接 <code>.group()</code> 會噴 <code>AttributeError</code>。一定先 <code>if m:</code> 再取值。",
        ),
      },
      {
        title: "re.sub：批次取代，還能用抓到的東西重組",
        chapter_id: 26,
        content: P(
          "「把所有電話號碼中間打碼」「統一日期格式」這種批次替換，用普通的 <code>str.replace</code> 做不到（它只能換固定字串）。re.sub 可以。",
          "<code>re.sub(pattern, 換成什麼, 文字)</code> 把所有符合 pattern 的都換掉。厲害的是「換成什麼」裡能用 <code>\\1</code>、<code>\\g&lt;name&gt;</code> 引用剛抓到的群組，等於邊抓邊重組（把 <code>2024-01</code> 換成 <code>01/2024</code>）。",
          "要更靈活時，「換成什麼」可以傳一個<b>函式</b>，每個配到的地方叫一次，回傳要換的字。",
          "⚠️ 替換字串裡的反斜線要小心（Python 字串本身也吃反斜線）。pattern 和替換字建議都用 <code>r\"...\"</code> raw 字串，不然 <code>\\1</code> 會被吃掉。",
        ),
      },
      {
        title: "算錢別用 float：認識 Decimal",
        chapter_id: 26,
        content: P(
          "我做金額計算，<code>0.1 + 0.2</code> 印出來竟然是 <code>0.30000000000000004</code>，帳就差一點點、越加越歪。這是 float 的天生問題。",
          "原因：float 用二進位存，很多十進位小數（像 0.1）根本存不準，是「很接近但不完全等於」。錢這種<b>要精確</b>的東西不能用它。",
          "改用 <code>from decimal import Decimal</code>，<code>Decimal(\"0.1\") + Decimal(\"0.2\")</code> 就老實給你 <code>0.3</code>。它照十進位精確運算。",
          "⚠️ 一定用<b>字串</b>建：<code>Decimal(\"0.1\")</code> 對，<code>Decimal(0.1)</code> 會把已經不準的 float 灌進去、照樣歪。錢的源頭就別讓 float 碰。",
        ),
      },
      {
        title: "fractions：要「三分之一」就別用小數硬湊",
        chapter_id: 26,
        content: P(
          "有些計算用小數會累積誤差（<code>1/3</code> 永遠除不盡），如果你要的是<b>精確的分數</b>，Python 有現成的 Fraction。",
          "<code>from fractions import Fraction</code>，<code>Fraction(1, 3) + Fraction(1, 6)</code> 老實給你 <code>Fraction(1, 2)</code>，全程精確、還自動約分。",
          "適合做需要精確比例的計算、教學、或當 Decimal 之外的另一種精確選擇。",
          "⚠️ 同樣別用 float 建 <code>Fraction(0.1)</code>（會得到一個超醜的近似分數）。要嘛給整數分子分母 <code>Fraction(1, 10)</code>、要嘛給字串 <code>Fraction(\"0.1\")</code>。",
        ),
      },
      {
        title: "math 跟 statistics：內建就有，別自己造輪子",
        chapter_id: 26,
        content: P(
          "算平均、開根號、無條件進位這些，我以前自己寫迴圈或用魔法數字。其實內建早就有、又快又準。",
          "<code>math</code>：<code>math.sqrt</code> 開根號、<code>math.ceil / floor</code> 進位捨去、<code>math.gcd</code> 最大公因數、還有 <code>math.pi</code>、<code>math.inf</code>（無限大）。<code>statistics</code>：<code>mean</code> 平均、<code>median</code> 中位數、<code>stdev</code> 標準差，一行搞定。",
          "資料量不大、又不想扛 numpy 這種大套件時，statistics 剛剛好。",
          "⚠️ 別用 <code>int(x)</code> 當「四捨五入」——它是<b>直接砍掉小數</b>（無條件捨去），<code>int(2.9)</code> 是 2 不是 3。要四捨五入用 <code>round()</code>，要進位用 <code>math.ceil</code>。",
        ),
      },
      {
        title: "weakref 與 gc：為什麼物件明明沒用了卻不消失",
        chapter_id: 26,
        content: P(
          "Python 會自動回收沒人用的物件（垃圾回收）。但我遇過「該被回收的卻一直佔記憶體」，原因是有東西還<b>抓著它不放</b>。",
          "只要還有一個變數指著它、或它被放在某個還活著的 list/快取裡，它就不會被回收。經典雷是「快取 dict 抓住一堆物件，永遠不放」。",
          "解法之一是 <code>weakref</code>（弱引用）：讓你「參考一個物件，但不算數」——當別人都不用它時，它照樣能被回收，你的弱引用就自動變空。很適合做不想造成記憶體洩漏的快取。",
          "⚠️ 兩個物件互相抓（循環引用）Python 的 gc 能處理，但如果類別有寫 <code>__del__</code> 又循環引用，舊版可能卡住不回收。發現記憶體只增不減，先找「誰還抓著它」。",
        ),
      },
      {
        title: "id() 跟 is：兩個東西是不是「同一個」",
        chapter_id: 26,
        content: P(
          "<code>==</code> 是問「內容一不一樣」，<code>is</code> 是問「是不是<b>同一個</b>物件」（記憶體同一格）。<code>id(obj)</code> 就是那個物件的「身分證號」，兩個 id 一樣才是同一個。",
          "比喻：兩個一模一樣的雙胞胎，<code>==</code> 說「長得一樣」，<code>is</code> 說「是不是同一個人」。內容相同不代表是同一個物件。",
          "實務上 <code>is</code> 只固定用來比 <code>None</code>、<code>True</code>、<code>False</code>（<code>if x is None</code>）。",
          "⚠️ 別用 <code>is</code> 比數字或字串！<code>a is b</code> 對小整數/短字串有時「剛好成立」（Python 會暫存共用），你以為它可靠，換個大數字或字串就 False。比值一律用 <code>==</code>。",
        ),
      },
      {
        title: "keyword-only 參數：逼呼叫的人「寫出名字」",
        chapter_id: 26,
        content: P(
          "我有個函式 <code>send(msg, urgent=False, silent=False)</code>，別人呼叫 <code>send(\"hi\", True, False)</code>——那兩個布林到底哪個是哪個？完全看不出來。",
          "在參數列放一個單獨的 <code>*</code>，它後面的參數就變成「<b>只能用名字傳</b>」：<code>def send(msg, *, urgent=False, silent=False)</code>。之後只能 <code>send(\"hi\", urgent=True)</code>，一眼就懂。",
          "尤其一堆布林旗標、選項的函式，強制寫名字能救掉超多「傳錯位置」的 bug。",
          "⚠️ 反過來，用 <code>/</code> 可以做「只能照位置傳」的參數（positional-only）。一般人用 <code>*</code> 就夠了，重點是：容易搞混的選項，強迫寫名字。",
        ),
      },
      {
        title: "for-else / while-else：迴圈「沒被 break」才做的事",
        chapter_id: 26,
        content: P(
          "Python 的 for/while 後面可以接 <code>else</code>，我第一次看以為是「迴圈沒跑就做」，結果完全會錯意。",
          "真正的意思是：<b>迴圈正常跑完、中途沒有被 break</b>，才會執行 else。一旦 break 跳出，else 就跳過。",
          "最經典用途是「找東西」：迴圈裡找到就 break，<code>else</code> 放「整圈都沒找到」要做的事，省掉一個 <code>found = False</code> 旗標。",
          "⚠️ 這個 else 太容易誤讀，隊友看不懂也是常事。用之前加個註解，或乾脆改用旗標/包成函式 return，可讀性有時更重要。",
        ),
      },
      {
        title: "字串驗證：isdigit / isalpha 有你沒想到的坑",
        chapter_id: 26,
        content: P(
          "要判斷使用者輸入「是不是純數字」，我用 <code>s.isdigit()</code>，大部分沒事，但踩過幾個坑。",
          "常用的：<code>isdigit()</code>（全是數字）、<code>isalpha()</code>（全是字母）、<code>isalnum()</code>（字母或數字）、<code>isspace()</code>（全空白）。判斷前記得先 <code>strip()</code> 去頭尾空白。",
          "要「能不能轉成數字」其實更常見，那用 <code>try: int(s) except ValueError:</code> 比 isdigit 準（isdigit 對負號、小數點都會回 False）。",
          "⚠️ 兩個雷：一是空字串 <code>\"\".isdigit()</code> 是 <b>False</b>，別忘了先擋空的；二是 <code>\"²\".isdigit()</code>、全形數字這些也可能回 True，真要嚴格判斷阿拉伯數字用 <code>s.isdecimal()</code> 或直接試轉型。",
        ),
      },
      {
        title: "os.environ：機密別寫死在程式裡，讀環境變數",
        chapter_id: 26,
        content: P(
          "API 金鑰、資料庫密碼我以前直接寫在 code 裡，推上 GitHub 才驚覺全世界都看得到。正解是放環境變數。",
          "<code>import os</code>，<code>os.environ[\"API_KEY\"]</code> 讀，或 <code>os.environ.get(\"API_KEY\")</code>（沒設回 None、不會爆）、<code>os.getenv(\"PORT\", \"3000\")</code> 還能給預設。開發時常搭配 <code>.env</code> 檔加 <code>python-dotenv</code> 載入。",
          "好處：同一份 code，本機、測試、上線各用各的設定，機密也不進版控。",
          "⚠️ 一定把 <code>.env</code> 加進 <code>.gitignore</code>！我看過太多人把 .env 一起推上去。還有，環境變數<b>都是字串</b>，要數字記得自己 <code>int(os.getenv(\"PORT\"))</code>。",
        ),
      },
      {
        title: "__init__.py：資料夾怎麼變成「可以 import 的套件」",
        chapter_id: 26,
        content: P(
          "我把程式拆成好幾個檔放進資料夾，結果 import 一直失敗。關鍵是那個常被忽略的 <code>__init__.py</code>。",
          "一個資料夾裡放個（可以是空的）<code>__init__.py</code>，Python 就把它當成一個「套件」，你才能 <code>from 資料夾 import 某檔</code>。它像資料夾的「這是一個正式套件」標籤。",
          "你也能在 <code>__init__.py</code> 裡 <code>from .core import main</code>，讓外面直接 <code>from 套件 import main</code>，把好用的東西提到門口。",
          "⚠️ 現代 Python（3.3+）就算沒有 __init__.py 有時也能 import（namespace package），但行為容易出意外、工具支援也參差。<b>老實每個套件資料夾放一個</b>，省很多鬼打牆。",
        ),
      },
      {
        title: "multiprocessing：吃 CPU 的活，開好幾個「真的」平行",
        chapter_id: 26,
        content: P(
          "我做一個超吃 CPU 的計算，開多執行緒（thread）卻沒變快。原因是 Python 的 <b>GIL</b>——同一時間只有一條 thread 真的在算。",
          "解法是 <code>multiprocessing</code>：它開的是「多個獨立的行程」，各有各的直譯器、繞開 GIL，能真正同時吃好幾顆 CPU 核心。像找好幾個人各用一台電腦分頭算。",
          "<code>with Pool() as p: results = p.map(重計算函式, 資料)</code>，它自動分給各行程、幫你收回結果。",
          "⚠️ 行程之間<b>不共享記憶體</b>，資料要用 pickle 搬來搬去（所以傳大物件很貴、函式和資料還得能被 pickle）。純等網路/讀檔的活別用它，那種用 thread 或 async 就好。",
        ),
      },
      {
        title: "queue.Queue：多執行緒之間安全地傳東西",
        chapter_id: 26,
        content: P(
          "多個 thread 想共用一份「待辦清單」，直接用 list 大家一起 append/pop 會出亂子（同時動就資料錯亂）。<code>queue.Queue</code> 是為這個生的。",
          "它<b>本身就是執行緒安全</b>的，你放心讓一堆 thread <code>q.put(工作)</code>、另一堆 <code>q.get()</code> 拿，內部自己上鎖不會打架。經典的「生產者—消費者」模型。",
          "消費者做完一件 <code>q.task_done()</code>，主程式 <code>q.join()</code> 就能等到全部做完。",
          "⚠️ <code>q.get()</code> 在佇列空時會<b>卡住等</b>（這常是你要的）。要「沒東西就別等」用 <code>q.get_nowait()</code> 或設 timeout，不然收工時 thread 可能永遠卡在那等一個不會來的工作。",
        ),
      },
      {
        title: "dict 現在是「保序」的了，但別依賴到底",
        chapter_id: 26,
        content: P(
          "老教學都說「dict 沒有順序」，這在 Python 3.7 之後<b>變了</b>——dict 現在保證照「你放進去的順序」記著，迭代出來也照那個順序。",
          "所以 <code>for k in d</code>、<code>d.keys()</code>、轉成 JSON 的欄位順序，都跟你插入時一致，很多以前要用 OrderedDict 的場合現在普通 dict 就夠。",
          "要「照 key 或 value 排序」還是得自己排：<code>dict(sorted(d.items()))</code>。保序≠自動排序，兩回事。",
          "⚠️ 「保序」是插入順序、不是排序，別搞混。另外若你的程式碼還要支援很舊的 Python（3.6 以前），那邊不保證，需要順序就明確用 <code>collections.OrderedDict</code>。",
        ),
      },
      {
        title: "合併字典：Python 3.9 的 | 超好用",
        chapter_id: 26,
        content: P(
          "合併兩個 dict 我以前寫 <code>{**a, **b}</code>，會但不直覺。Python 3.9 之後有更白話的寫法。",
          "<code>c = a | b</code> 就合併成新的（b 的 key 若跟 a 撞，以 <b>b 為準</b>覆蓋）；想「就地更新 a」用 <code>a |= b</code>，跟 <code>a.update(b)</code> 同效果。",
          "跟數字的「或」共用同一個符號，但對 dict 是「合併」，讀起來像「a 疊上 b」。",
          "⚠️ 重點記牢：<b>右邊蓋左邊</b>。想保留舊值、只補沒有的 key，就把舊的放右邊 <code>新 | 舊</code>，順序反了資料就被覆蓋掉。",
        ),
      },
      {
        title: "串一大堆字串用 join，別用 += 慢慢接",
        chapter_id: 26,
        content: P(
          "我在迴圈裡 <code>result += line</code> 把幾萬行接成一大串，跑超慢。這是很多人不知道的效能雷。",
          "因為字串是<b>不可變</b>的，每次 <code>+=</code> 都是「開一個新字串、把舊的全抄過去再加新的」，越接越長、越抄越久（是 N² 等級的慢）。",
          "正解：先把片段收進 list，最後一次 <code>\"\".join(片段)</code> 或 <code>\"\\n\".join(行們)</code>。join 一次算好總長、只抄一遍，快非常多。",
          "⚠️ join 只能接<b>字串</b>元素，list 裡有數字會噴 <code>TypeError</code>。先轉：<code>\",\".join(str(x) for x in nums)</code>。",
        ),
      },
      {
        title: "raise from：包裝例外時別把原兇手弄丟",
        chapter_id: 26,
        content: P(
          "我 catch 到一個底層錯誤，想換成自己好懂的訊息再往上丟，結果原本的錯誤堆疊不見了、之後 debug 找不到根源。",
          "用 <code>raise MyError(\"存檔失敗\") from e</code>，它會把「新錯誤」跟「原本的 e」串起來，錯誤訊息會顯示 <code>直接原因是上面這個</code>，兩層都看得到，追根究底超方便。",
          "這叫例外鏈（exception chaining），保留因果關係。",
          "⚠️ 若你是「這個底層錯誤本來就該被吞掉、別再顯示」，用 <code>raise MyError(...) from None</code> 明確斷開鏈。但多數時候你會想留著 <code>from e</code>，別無腦吞掉真兇。",
        ),
      },
      {
        title: "finally 的雷：它一定會跑，包括你 return 之後",
        chapter_id: 26,
        content: P(
          "<code>finally</code> 我知道是「不管有沒有出錯都會執行」，拿來關檔、釋放資源很讚。但它有幾個會坑人的地方。",
          "重點：就算 try 裡面 <code>return</code> 了，離開前還是會<b>先跑 finally</b> 再真的回去。所以 finally 是收尾的最後保險。",
          "但反過來——如果你在 finally 裡也寫了 <code>return</code>，它會<b>蓋掉</b> try 裡本來要回的值，連 try 裡正在噴的例外都被吞掉、無聲無息。這超難抓。",
          "⚠️ finally 裡別放 return / break / continue，也別放可能自己噴錯的重活。它就乖乖做「關檔、解鎖」這種收尾，別搶戲。",
        ),
      },
      {
        title: "cProfile：程式慢在哪，別用猜的",
        chapter_id: 26,
        content: P(
          "程式跑很慢，我以前憑感覺猜「大概是那個迴圈」然後亂優化，常常改錯地方。內建的 cProfile 直接告訴你答案。",
          "命令列 <code>python -m cProfile -s cumtime 你的檔.py</code>，它會列出「每個函式被呼叫幾次、各花多少時間」，照累計時間排序，一眼看出誰是大魔王。",
          "優化的鐵律：<b>先量再改</b>。九成的時間常常卡在你意想不到的一小段。",
          "⚠️ 別憑直覺瞎優化——最慢的往往不是你以為的那行。也別花時間優化只跑一次、佔比極小的部分，抓住 profile 指出的那個熱點就好。",
        ),
      },
      {
        title: "計時要用 perf_counter，不是 time.time()",
        chapter_id: 26,
        content: P(
          "我要量「這段跑多久」，一開始用 <code>time.time()</code> 前後相減，偶爾量出<b>負數</b>或怪值，嚇一跳。",
          "原因：<code>time.time()</code> 是「牆上時鐘」，會被系統校時、對時調整（甚至倒退）。量「經過多少時間」要用<b>單調時鐘</b> <code>time.perf_counter()</code>，它只會往前、精度也高。",
          "用法一樣：<code>t = time.perf_counter()</code> ... <code>time.perf_counter() - t</code> 就是秒數。",
          "⚠️ perf_counter 的「絕對值」沒意義（不是現在幾點），只能拿來<b>相減</b>算差。要知道「現在幾點/幾號」還是用 <code>time.time()</code> 或 datetime，兩者用途別搞混。",
        ),
      },
      {
        title: "contextlib.suppress：優雅地「這個錯就算了」",
        chapter_id: 26,
        content: P(
          "有些錯誤我就是想忽略（例如「刪一個可能本來就不存在的檔」），寫 <code>try/except/pass</code> 三行有點囉唆。",
          "<code>from contextlib import suppress</code>，<code>with suppress(FileNotFoundError): os.remove(path)</code>——一行講明「這段裡如果冒出 FileNotFoundError，就默默略過」，比空的 except 清楚多了。",
          "它讀起來很白話：「壓下這種錯」。",
          "⚠️ 只 suppress <b>你明確指定的那種</b>錯，別 <code>suppress(Exception)</code> 把所有錯都吞掉——那會連你沒預期的 bug 一起靜音，出事完全查不到。範圍越小越安全。",
        ),
      },
      {
        title: "寫裝飾器記得加 functools.wraps",
        chapter_id: 26,
        content: P(
          "我自己寫裝飾器（decorator）包函式，包完發現被包的函式「名字」跟「說明文件」都不見了，變成裝飾器內層那個 wrapper 的。",
          "因為裝飾器其實是「用一個新函式替換掉原函式」，新函式當然有自己的名字。解法：在內層 wrapper 上面加 <code>@functools.wraps(原函式)</code>，它會把原函式的名字、docstring、簽名都<b>複製過來</b>。",
          "這樣 <code>help(你的函式)</code>、<code>函式.__name__</code>、還有一堆靠函式名工作的工具（像測試框架、API 路由）才不會壞掉。",
          "⚠️ 這幾乎是寫裝飾器的「一定要做」步驟，但超容易忘。忘了它，平常看不出問題，等某個依賴函式名的工具出怪事才發現，超難聯想到是這裡。",
        ),
      },
      {
        title: "Optional 跟 Union：這個值「可能沒有」怎麼標",
        chapter_id: 26,
        content: P(
          "函式參數「可以不給、給的話是字串」、回傳「有時是結果、有時是 None」——這種型別怎麼註記，我一開始不會寫。",
          "<code>Optional[str]</code> 意思是「str 或 None」，等同 <code>Union[str, None]</code>。Python 3.10 之後更簡潔：直接寫 <code>str | None</code>。多種型別就 <code>int | str | None</code>。",
          "這讓 mypy 和編輯器知道「這裡可能是 None」，會提醒你用之前先檢查。",
          "⚠️ 觀念別誤會：<code>Optional</code> 不代表「這個參數可以省略」，它只代表「值可能是 None」。要「參數可省略」是給它<b>預設值</b>（<code>def f(x: str | None = None)</code>）——兩件事常一起出現但意義不同。",
        ),
      },
      {
        title: "無限迭代器：count / cycle / repeat + islice 喊停",
        chapter_id: 26,
        content: P(
          "itertools 有三個「會無限流下去」的產生器，配合 <code>islice</code> 取前幾個超好用。",
          "<code>count(1)</code> 從 1 一直數上去（當自動編號）、<code>cycle([\"紅\",\"綠\",\"燈\"])</code> 循環繞圈（輪班、輪色）、<code>repeat(0, 5)</code> 重複某值。它們像永遠轉的跑馬燈，你要多少自己取多少。",
          "喊停靠 <code>islice(可迭代, 10)</code> 取前 10 個，或在迴圈裡自己 <code>break</code>。<code>zip(count(1), 資料)</code> 也是一種手動編號法。",
          "⚠️ 大雷：對 <code>count()</code>、<code>cycle()</code> 直接 <code>list()</code> 或 <code>for</code> 沒 break，程式會<b>永遠跑下去、記憶體吃爆</b>。無限的東西一定要有「取幾個」或「何時停」的機制。",
        ),
      },
      {
        title: "textwrap：把長文字漂亮地折行、縮排",
        chapter_id: 26,
        content: P(
          "我要把一大段文字印成「每行不超過 40 字」的整齊區塊，自己數字元折行寫到瘋。<code>textwrap</code> 幫你做好。",
          "<code>textwrap.fill(長文字, width=40)</code> 直接折成一段整齊的多行字串；<code>textwrap.shorten(text, width=20, placeholder=\"…\")</code> 把太長的截斷加省略號（做預覽超好用）。",
          "還有 <code>textwrap.dedent</code>，能把程式裡「因為縮排而多出來的前導空白」統一去掉——寫多行字串常用。",
          "⚠️ <code>fill</code> 預設是<b>按空白斷詞</b>設計給英文的，中文沒有空白、可能整段不折或折得怪。中文要按字數折得自己來（或設 <code>break_long_words</code> 相關參數試），別預期它自動漂亮。",
        ),
      },
      {
        title: "pprint：巢狀資料印出來別擠成一坨",
        chapter_id: 26,
        content: P(
          "我 print 一個很深的巢狀 dict/list（像 API 回來的 JSON），整包擠成一行完全看不懂結構。",
          "<code>from pprint import pprint</code>，<code>pprint(資料)</code> 會自動照層次縮排、換行，一眼看出誰包著誰。debug 複雜資料時我幾乎都用它取代 print。",
          "想控制深度用 <code>pprint(data, depth=2)</code> 只展開兩層，太深的用 <code>...</code> 帶過，看整體骨架很方便。",
          "⚠️ 它是給「人看」的排版，別拿 pprint 的輸出當資料儲存格式（那用 json.dumps）。純看結構、debug 用，兩者別搞混。",
        ),
      },
      {
        title: "string.Template：給非工程師填的簡單模板",
        chapter_id: 26,
        content: P(
          "有時我要讓「不太懂程式的人」改一段有變數的文字模板，用 f-string 或 format 他們容易打壞（一個大括號打錯整個爆）。<code>string.Template</code> 更安全。",
          "<code>from string import Template</code>，<code>Template(\"嗨 $name，你有 $n 則通知\").substitute(name=\"小明\", n=3)</code>，變數用 <code>$名字</code>，語法夠白話、少踩雷。",
          "適合信件模板、設定檔那種「給人填」的場景。",
          "⚠️ 用 <code>substitute</code> 時少給一個變數會噴 <code>KeyError</code>；容忍缺漏就用 <code>safe_substitute</code>（缺的原樣留著不報錯）。看你要「嚴格要求填滿」還是「能填多少填多少」。",
        ),
      },
      {
        title: "環境先搞定，不然後面一直卡",
        chapter_id: 26,
        content: P(
          "我一開始最挫折的不是寫程式，是「怎麼裝東西一直錯」。後來搞懂虛擬環境就順了。",
          "虛擬環境（venv）你就想成：每個專案有自己的一個小房間，房間裡的工具只屬於它。這樣 A 專案要舊版、B 要新版也不會打架。",
          "開房間：<code>python -m venv venv</code>；啟用（Win：<code>venv\\Scripts\\activate</code>、Mac：<code>source venv/bin/activate</code>）。啟用後命令列前面會有 <code>(venv)</code>，看到它才代表你在房間裡。",
          "裝套件 <code>pip install 名稱</code>；把用到的記下來 <code>pip freeze > requirements.txt</code>，換電腦一次還原 <code>pip install -r requirements.txt</code>。",
          "⚠️ 我踩過的雷：忘了 activate 就 install，套件裝到全域、之後版本一團亂。前面沒有 <code>(venv)</code> 就先 activate 再說。",
        ),
      },
      {
        title: "f-string：字串裡塞變數，別再用加號接",
        chapter_id: 26,
        content: P(
          "以前我都 <code>\"你好\" + name + \"，共\" + str(n) + \"筆\"</code> 接一長串，醜又容易漏 str()。",
          "後來只用 f-string：<code>f\"你好 {name}，共 {n} 筆\"</code>。前面加個 f，大括號裡直接放變數就好。",
          "小技巧：debug 想印變數，<code>print(f\"{x=}\")</code> 會印成 <code>x=值</code>，超省事。",
          "⚠️ 大括號要放變數/運算式，不是隨便的文字；要印一個真正的大括號要打兩個 <code>{{ }}</code>。",
        ),
      },
      {
        title: "推導式：一行做出一個新清單（看不懂就拆回 for）",
        chapter_id: 26,
        content: P(
          "<code>[x*2 for x in nums if x>0]</code> 我第一次看也傻眼，唸法是「把 nums 裡每個 x，只留大於 0 的，乘 2 收進新清單」。",
          "它其實等於：開一個空 list、for 迴圈、if 判斷、append。只是濃縮成一行。看不懂就把它拆回四行想，馬上懂。",
          "字典也能推導：<code>{k: v*2 for k, v in d.items()}</code>。",
          "⚠️ 別為了炫技把三層邏輯塞一行，自己回頭看不懂就失去意義了。複雜就乖乖寫迴圈。",
        ),
      },
      {
        title: "資料結構怎麼選：list / dict / set / tuple",
        chapter_id: 26,
        content: P(
          "語法會了卻不知道該用哪個容器，是我卡最久的地方。給我自己的判斷：",
          "要「照順序存一串、還會增刪」→ list <code>[1,2,3]</code>。",
          "要「用名字查資料」→ dict <code>{\"name\":\"小明\"}</code>，查一筆超快。",
          "要「去重複」或「常判斷在不在裡面」→ set <code>{\"a\",\"b\"}</code>，<code>x in 集合</code> 比 <code>x in list</code> 快超多。",
          "一組固定不會變（座標、回傳多個值）→ tuple <code>(緯度, 經度)</code>。",
          "⚠️ 我犯過：要一直判斷「在不在」卻用 list，資料一多整個變慢。那種就該用 set。",
        ),
      },
      {
        title: "for 迴圈的好朋友：enumerate 跟 zip",
        chapter_id: 26,
        content: P(
          "以前要編號我都 <code>for i in range(len(items))</code> 再 <code>items[i]</code>，醜。",
          "<code>for i, x in enumerate(items)</code> 一次給你「第幾個 + 值」，需要編號時直接用。",
          "兩串一起跑用 zip：<code>for name, score in zip(names, scores)</code>，配對超乾淨。",
          "⚠️ zip 會以「最短那串」為準，長度不一樣時後面會被吃掉，記得。",
        ),
      },
      {
        title: "字典安全取值：.get() 比中括號安全",
        chapter_id: 26,
        content: P(
          "<code>d[\"age\"]</code> 找不到 key 會直接噴 <code>KeyError</code> 讓程式掛掉。",
          "<code>d.get(\"age\", 預設值)</code> 找不到就回你給的預設，不會爆。處理來路不明的資料（API 回傳）特別好用。",
          "要「沒有就建一個」可以用 <code>d.setdefault(k, [])</code>，或 <code>collections.defaultdict</code>。",
          "⚠️ 想改字典又同時在迭代它，會出錯；先把要改的收集起來、迴圈跑完再改。",
        ),
      },
      {
        title: "函式：參數、回傳、預設值的雷",
        chapter_id: 26,
        content: P(
          "<code>def greet(name, greeting=\"嗨\"):</code>——有預設值的參數要放後面。呼叫時 <code>greet(\"小明\", greeting=\"哈囉\")</code> 用名字帶參數，讀起來清楚。",
          "回傳多個值其實是回一個 tuple：<code>return x, y</code>，接的時候 <code>a, b = fn()</code>。",
          "⚠️ 超經典大雷：預設值別用可變物件 <code>def f(items=[])</code>——那個 list 會被所有呼叫共用、越跑越髒。要用 <code>def f(items=None): items = items or []</code>。",
        ),
      },
      {
        title: "看懂錯誤訊息（這招最值錢）",
        chapter_id: 26,
        content: P(
          "以前看到紅字就慌、亂改。後來發現錯誤訊息根本在幫我。",
          "先看<b>最後一行</b>：它寫「錯誤類型 + 說明」，像 <code>KeyError: 'age'</code> 就是去拿一個不存在的 key。",
          "再看倒數幾行的「檔名 + 行號」，直接跳過去那行看。",
          "常見翻譯：<code>NameError</code> 用了沒定義的變數（多半打錯字）、<code>TypeError</code> 型別不對、<code>IndexError</code> 索引超出範圍、<code>IndentationError</code> 縮排亂了。",
          "⚠️ 別只看紅字亂猜。把「錯誤那一行」複製去 Google，通常第一篇就有答案。看得懂錯誤你就贏一半。",
        ),
      },
      {
        title: "我的除錯 SOP（不是用猜的）",
        chapter_id: 26,
        content: P(
          "程式不動時，方法比天分重要。我固定這樣做：",
          "1. 先讓它說話：<code>print(f\"{x=}\")</code> 印出關鍵變數，確認它到底是什麼。",
          "2. 二分法夾兇手：不知道哪裡壞，就在中間印一行「到這裡了」；有印＝前半沒事往後找，沒印＝問題在前半。",
          "3. 要看更細：<code>import pdb; pdb.set_trace()</code> 讓程式停在那行，逐行走、隨時打變數看值。",
          "4. 講給別人（或鴨子）聽：一句一句解釋你的程式，講到一半常常自己就發現哪錯了。",
          "⚠️ 一次只改一處、改完就測。一次改一堆，壞了也不知道是哪個造成的。",
        ),
      },
      {
        title: "pandas 入門：先懂它在解決什麼",
        chapter_id: 27,
        content: P(
          "pandas 我一開始覺得好難，後來發現：把它想成「程式版 Excel」就通了。核心叫 DataFrame，就是一張有欄有列的表。",
          "讀資料 <code>df = pd.read_csv('a.csv')</code>；先養成習慣 <code>df.head()</code> 看前幾列、<code>df.info()</code> 看每欄型別。",
          "篩選 <code>df[df['age'] > 18]</code>：裡面 <code>df['age'] > 18</code> 對每列算 True/False，外面把 True 的留下。",
          "排序 <code>df.sort_values('age')</code>；分組彙總 <code>df.groupby('city')['sales'].sum()</code>（依 city 分組、對 sales 加總）。",
          "⚠️ 對篩出來的子表直接改值會跳 SettingWithCopyWarning；要改用 <code>df.loc[條件, '欄位'] = 值</code>。",
        ),
      },
      {
        title: "爬蟲入門：網頁是怎麼被抓下來的（含禮貌）",
        chapter_id: 28,
        content: P(
          "其實你瀏覽器開網頁，就是「跟伺服器要一份 HTML、再畫成畫面」。爬蟲就是用程式做同一件事。",
          "抓：<code>r = requests.get(url, headers={'User-Agent':'...'})</code>，先看 <code>r.status_code</code> 是不是 200。",
          "解析：<code>soup = BeautifulSoup(r.text, 'html.parser')</code>；<code>soup.select('css 選擇器')</code> 挑元素（跟前端同一套規則）。",
          "禮貌很重要：看對方 <code>robots.txt</code>、每次請求間 <code>time.sleep()</code> 一下別狂打、有官方 API 就別硬爬。",
          "⚠️ 能抓 ≠ 能拿去用。版權、個資、服務條款要留意，抓下來只做學習分析。",
        ),
      },
      {
        title: "Python 標準庫寶庫（先問「有沒有現成的」）",
        chapter_id: 26,
        content: P(
          "最省力的心法：需求出現時，先想「內建有沒有現成工具」，常常不用自己造輪子。",
          "<code>pathlib</code> 處理路徑（跨系統不出錯）、<code>json</code> 讀寫 JSON、<code>datetime</code> 日期時間。",
          "<code>collections.Counter</code> 一行統計每個東西幾次；<code>itertools</code> 各種迭代/組合工具。",
          "⚠️ 別把自己的檔名取得跟標準庫一樣（<code>json.py</code>、<code>random.py</code>），會 import 到自己、噴莫名的錯。",
        ),
      },
      {
        title: "try / except：程式別一出錯就整個掛掉",
        chapter_id: 26,
        content: P(
          "有些錯誤你「預期它可能發生」（檔案不存在、網路斷線、使用者亂輸入），這種不該讓整個程式當掉，要接住它。",
          "<code>try:</code> 裡放「可能出錯的動作」，<code>except 錯誤類型 as e:</code> 放「出錯時怎麼辦」。例如 <code>try: n = int(s) except ValueError: n = 0</code>——轉數字失敗就當 0。",
          "接特定類型，別用一個 <code>except:</code> 把所有錯都吞掉——那樣連你自己寫錯的 bug 都被藏起來，超難查。",
          "有「不管成功失敗都要做」的收尾（關檔、關連線）放 <code>finally:</code>。",
          "⚠️ 我踩過：把一大段都包在 try 裡，結果哪一行出錯都分不出來。try 盡量只包「真的會出錯的那一兩行」。",
        ),
      },
      {
        title: "match-case：加強版的 if（Python 3.10+）",
        chapter_id: 26,
        content: P(
          "很多人第一次看到 match-case 會愣住：「不是有 if 了嗎？」差別在——它會「照資料的形狀比對，還順手把裡面的東西拆出來」。",
          "普通 if 只能比「值相不相等」；match-case 可以問「這筆資料長得像哪一種？像的話把它的欄位抓出來用」。",
          "以座標 <code>(x, y)</code> 為例：<code>case (0, 0)</code> 是原點；<code>case (x, 0)</code> 在 X 軸、<b>同時</b>把 x 綁出來用；<code>case (0, y)</code> 在 Y 軸；<code>case (x, y)</code> 一般點；<code>case _</code> 是「以上都不是」（<code>_</code> 是萬用）。",
          "用 if 寫會是 <code>if p==(0,0): ... elif p[1]==0: x=p[0] ...</code> 又臭又長；match-case 把「判斷形狀 + 取出內容」合成一件事，讀起來像在描述資料。",
          "⚠️ 什麼時候用：處理「有結構的資料」（座標、JSON、指令、狀態）最舒服；只是比幾個值，用 if 就好、不用硬上。",
        ),
      },
      {
        title: "型別提示 type hints：讓編輯器幫你抓錯",
        chapter_id: 26,
        content: P(
          "Python 不強制型別，但你可以「標註」給人和工具看：<code>def add(a: int, b: int) -> int:</code>——參數是 int、回傳也是 int。",
          "好處：編輯器會即時提示、你傳錯型別當場看到紅線，不用等執行才爆。變數也能標 <code>name: str = \"小明\"</code>。",
          "常見寫法：<code>list[int]</code>、<code>dict[str, int]</code>、可有可無用 <code>str | None</code>。",
          "⚠️ 它只是「提示」，不會真的擋你亂傳（Python 執行時不檢查）。要真的檢查得配 mypy 這類工具，但光是有提示，開發就順很多。",
        ),
      },
      {
        title: "開檔案用 with：記得關，別讓它一直開著",
        chapter_id: 26,
        content: P(
          "讀寫檔案最容易忘的就是「關檔」。忘了關可能資料沒寫進去、或占著檔案不放。",
          "用 <code>with</code> 就不用自己關：<code>with open('a.txt', 'r', encoding='utf-8') as f: data = f.read()</code>——離開這個區塊，Python 自動幫你關。",
          "模式：<code>'r'</code> 讀、<code>'w'</code> 覆蓋寫、<code>'a'</code> 附加。中文檔一定加 <code>encoding='utf-8'</code>，不然容易亂碼。",
          "⚠️ 這個「進來自動開、離開自動收」的東西叫 context manager，資料庫連線、鎖也常這樣用，看到 <code>with</code> 就知道它會幫你收尾。",
        ),
      },
      {
        title: "切片 slicing：[start:stop:step] 三個數字的魔法",
        chapter_id: 26,
        content: P(
          "切片是 Python 超好用的東西，一開始看到 <code>[1:4]</code> 我完全不懂，搞懂之後回不去了。",
          "規則：<code>seq[start:stop]</code> 取「從 start 到 stop <b>前一個</b>」（含頭不含尾，跟 range 一樣）。<code>\"Python\"[1:4]</code> = <code>\"yth\"</code>。",
          "省略有預設：<code>[:3]</code> 從頭到第 3 個、<code>[2:]</code> 從第 2 個到底、<code>[:]</code> 整份複製一份。",
          "第三個是步長：<code>[::2]</code> 每隔一個取、<code>[::-1]</code> <b>反轉</b>（字串、list 都能這樣倒過來）。",
          "⚠️ 負數是「從右邊數」：<code>[-1]</code> 最後一個、<code>[-3:]</code> 最後三個。切片超出範圍不會報錯（回空的），但 <code>[index]</code> 超出會 IndexError。",
        ),
      },
      {
        title: "is 跟 == 不一樣：可變 vs 不可變的雷",
        chapter_id: 26,
        content: P(
          "<code>==</code> 比「值一不一樣」、<code>is</code> 比「是不是同一個東西（記憶體同一份）」。九成情況你要的是 <code>==</code>。",
          "唯一常用 <code>is</code> 的地方：跟 <code>None</code> 比——<code>if x is None:</code>（慣例、也比較安全）。",
          "為什麼要懂：list / dict 是<b>可變</b>的，<code>b = a</code> 只是幫同一份 list 取第二個名字，改 b 會連 a 一起變（因為是同一個）。要真的複製用 <code>a.copy()</code> 或 <code>list(a)</code>。",
          "數字、字串、tuple 是<b>不可變</b>的，改它其實是「生一個新的」，不會有上面的雷。",
          "⚠️ 「我明明只改了 b、a 怎麼也變了」= 十之八九就是共用了同一個可變物件。",
        ),
      },
      {
        title: "字串常用方法：處理文字先會這幾個",
        chapter_id: 26,
        content: P(
          "文字處理是天天在做的事，這幾個記起來省很多力。",
          "去頭尾空白 <code>s.strip()</code>（表單輸入必用）、大小寫 <code>s.lower()</code> / <code>s.upper()</code>。",
          "切割與拼接：<code>\"a,b,c\".split(\",\")</code> → list；反過來 <code>\",\".join(清單)</code> → 字串。",
          "找與換：<code>s.replace(\"舊\",\"新\")</code>、判斷開頭結尾 <code>s.startswith(...)</code> / <code>s.endswith(\".jpg\")</code>、包不包含用 <code>\"key\" in s</code>。",
          "⚠️ 字串是不可變的，<code>s.replace()</code> 是<b>回一個新字串</b>、不會改到原本的 s——記得 <code>s = s.replace(...)</code> 接回去。",
        ),
      },
      {
        title: "None 與真假值：什麼算「空」、什麼算 False",
        chapter_id: 26,
        content: P(
          "<code>None</code> 代表「沒有值 / 空」，跟 0 或空字串不一樣。函式沒寫 return 時預設就回 None。",
          "Python 的「真假值」很直覺：空的都當 False——<code>0</code>、<code>\"\"</code>、<code>[]</code>、<code>{}</code>、<code>None</code> 都是 falsy；有東西就是 truthy。",
          "所以判斷「list 是不是空的」直接 <code>if not items:</code> 就好，不用 <code>if len(items) == 0:</code>。",
          "取預設值的常用招：<code>name = user_input or \"訪客\"</code>（前面是空的就用後面）。",
          "⚠️ 但要分清「是 None」還是「是 0 / 空字串」時，別用 truthy 判斷、要用 <code>is None</code>——不然 <code>0</code> 會被誤當成「沒填」。",
        ),
      },
      {
        title: "import 與模組：程式怎麼拆成多個檔",
        chapter_id: 26,
        content: P(
          "程式一大就要拆檔。一個 <code>.py</code> 就是一個「模組」，用 import 互相取用。",
          "整包拿：<code>import math</code> → 用 <code>math.sqrt(9)</code>。只拿需要的：<code>from math import sqrt</code> → 直接 <code>sqrt(9)</code>。",
          "取別名：<code>import pandas as pd</code>（大家慣例）。自己的檔也一樣：<code>from utils import my_func</code>。",
          "第三方套件先 <code>pip install</code> 再 import；標準庫（math/json/os…）內建、不用裝。",
          "⚠️ 兩個雷：① 檔名別跟套件同名（<code>json.py</code> 會 import 到自己）；② 兩個檔互相 import（circular import）會出錯，通常代表該把共用的東西抽到第三個檔。",
        ),
      },
      {
        title: "生成器 yield：一次給一個、不佔記憶體",
        chapter_id: 26,
        content: P(
          "一般函式用 <code>return</code> 一次把結果全給你；<b>生成器</b>用 <code>yield</code> 一次給一個、要下一個才算下一個。",
          "差在哪：處理一百萬筆資料，用 list 會把一百萬個一次塞進記憶體；用生成器一次只算一個、跑完就丟，記憶體超省。",
          "怎麼寫：函式裡把 <code>return</code> 換成 <code>yield</code>，它就變生成器。用 <code>for x in 生成器:</code> 一個一個拿。",
          "小寫法：<code>(x*2 for x in nums)</code>（圓括號）就是生成器版的推導式，跟 <code>[...]</code>（list）差一個括號、但不立刻算。",
          "⚠️ 生成器只能跑一次，跑完就空了；需要重複用就存成 list。",
        ),
      },
      {
        title: "lambda 與 sorted(key=...)：一次性的小函式",
        chapter_id: 26,
        content: P(
          "<code>lambda</code> 是「臨時的小函式」，懶得用 def 命名時用。<code>lambda x: x*2</code> 等於一個回傳 x*2 的函式。",
          "最常見用途是排序的 <code>key</code>：<code>sorted(users, key=lambda u: u[\"age\"])</code>——依 age 排。",
          "找極值也能：<code>max(users, key=lambda u: u[\"score\"])</code> 找分數最高的那個人。",
          "反向排序加 <code>reverse=True</code>；多層排序 key 回一個 tuple：<code>key=lambda u: (u[\"city\"], u[\"age\"])</code>。",
          "⚠️ lambda 只適合「一行講得完」的邏輯；要好幾行、或會重複用，就乖乖 def 一個有名字的函式，好讀好測。",
        ),
      },
      {
        title: "深拷貝 vs 淺拷貝：巢狀資料的坑",
        chapter_id: 26,
        content: P(
          "承接前面「可變物件共用」的雷，遇到巢狀（list 裡有 list、dict 裡有 dict）會更微妙。",
          "<code>a.copy()</code> 是<b>淺</b>拷貝：外層複製了，但裡面的子 list 還是「共用同一份」——改子 list 兩邊還是一起變。",
          "要整份獨立：<code>import copy; b = copy.deepcopy(a)</code>——連裡面每一層都複製一份，改 b 完全不影響 a。",
          "⚠️ 沒有巢狀時淺拷貝就夠、也比較快；有巢狀又想完全隔離才用 deepcopy。搞不清楚「改一個另一個也變」時，先想是不是拷貝層數不夠。",
        ),
      },
      {
        title: "自訂例外與 raise：主動丟錯，讓問題早點爆",
        chapter_id: 26,
        content: P(
          "有時「早點報錯」比「硬跑下去拿到怪結果」好。用 <code>raise</code> 主動丟例外。",
          "例：<code>if age < 0: raise ValueError(\"年齡不能是負的\")</code>——參數不合理就當場擋下、附清楚訊息。",
          "選對類型：參數值不對用 <code>ValueError</code>、型別不對用 <code>TypeError</code>、找不到用 <code>KeyError</code>/<code>FileNotFoundError</code>。",
          "自訂一種：<code>class PaymentError(Exception): pass</code>，之後 <code>raise PaymentError(\"...\")</code>、呼叫端能專門 <code>except PaymentError</code> 接。",
          "⚠️ 例外訊息寫清楚「哪裡、為什麼、期望什麼」，未來 debug 的人（很可能是你）會感謝你。",
        ),
      },
      {
        title: "class 入門：self 到底是什麼",
        chapter_id: 26,
        content: P(
          "class 是「把資料 + 操作那些資料的函式，打包在一起」的東西。像做一個模板，之後可以生很多個。",
          "<code>class Dog:</code> 裡的 <code>__init__(self, name)</code> 是「生一隻的時候要做什麼」，<code>self.name = name</code> 把名字記在這隻身上。",
          "<b>self 就是「這一個實例自己」</b>——<code>d = Dog(\"小白\")</code> 生一隻，之後 <code>d.name</code> 拿到 \"小白\"。方法第一個參數固定寫 self，Python 呼叫時會自動把「這隻」傳進去。",
          "方法（class 裡的函式）第一個參數都要 self；要用到自己的資料就 <code>self.xxx</code>。",
          "⚠️ 新手最常忘 self：在方法裡直接寫 <code>name</code> 會找不到、要寫 <code>self.name</code>。還沒需要「多個同型別物件各自帶狀態」時，其實用函式 + dict 就夠，別為了用而用。",
        ),
      },
      {
        title: "Counter 與 defaultdict：計數與分組的神器",
        chapter_id: 26,
        content: P(
          "「數每個東西出現幾次」「把東西依類別分組」是超常見需求，用對工具一行搞定。",
          "<b>Counter</b>：<code>from collections import Counter; c = Counter(words)</code>——直接得到每個字的次數。<code>c.most_common(3)</code> 拿前三多的。",
          "<b>defaultdict</b>：分組不用先檢查 key 存不存在。<code>from collections import defaultdict; groups = defaultdict(list)</code>，然後 <code>groups[city].append(name)</code> 直接加，key 不存在會自動生一個空 list。",
          "⚠️ 用一般 dict 做這些要先 <code>if k not in d: d[k]=…</code> 很囉唆；看到「計數」想 Counter、「分組」想 defaultdict。",
        ),
      },
      {
        title: "set 運算：交集 / 聯集 / 差集實戰",
        chapter_id: 26,
        content: P(
          "set 不只是去重，它的集合運算解決一堆「比對兩群東西」的問題。",
          "<b>交集 &</b>：兩邊都有的。<code>已買 & 想要</code> = 買過又還想要的。",
          "<b>聯集 |</b>：任一邊有的（合起來去重）。<code>A 標籤 | B 標籤</code>。",
          "<b>差集 -</b>：我有你沒有的。<code>新名單 - 舊名單</code> = 這次新加入的人。",
          "⚠️ 「找出兩個清單的差異/共同」別用雙層迴圈慢慢比——轉成 set 用 &、-，又快又清楚。",
        ),
      },
      {
        title: "三元運算子：一行寫完 if-else",
        chapter_id: 26,
        content: P(
          "簡單的「這樣就 A、否則 B」，不用寫四行 if-else。",
          "語法：<code>值A if 條件 else 值B</code>。例：<code>status = \"成人\" if age &gt;= 18 else \"未成年\"</code>。",
          "常拿來給預設值、或在 f-string / 推導式裡做小分支：<code>[\"even\" if x%2==0 else \"odd\" for x in nums]</code>。",
          "⚠️ 別把三層三元疊在一行（<code>a if x else b if y else c</code> 讀到瞎）——複雜就乖乖寫 if-elif-else。",
        ),
      },
      {
        title: "*args 與 **kwargs：接任意數量的參數",
        chapter_id: 26,
        content: P(
          "想讓函式「幾個參數都能收」，用這兩個。",
          "<code>*args</code>：把多的位置參數收成一個 tuple。<code>def total(*nums): return sum(nums)</code> → <code>total(1,2,3)</code>。",
          "<code>**kwargs</code>：把多的具名參數收成一個 dict。<code>def make(**opts): print(opts)</code> → <code>make(color=\"red\", size=3)</code>。",
          "反過來也能「攤開」傳進去：<code>func(*my_list)</code>、<code>func(**my_dict)</code>。",
          "⚠️ 名字不是規定、是慣例（<code>*args</code>/<code>**kwargs</code>），重點是那個 <code>*</code> 和 <code>**</code>。順序：一般參數 → *args → 具名 → **kwargs。",
        ),
      },
      {
        title: "解包 unpacking：一次拆好幾個變數",
        chapter_id: 26,
        content: P(
          "Python 讓你「一次把一串拆進多個變數」，很優雅。",
          "基本：<code>a, b = (1, 2)</code>；交換不用暫存變數：<code>a, b = b, a</code>。",
          "星號收剩下的：<code>first, *rest = [1,2,3,4]</code> → first=1、rest=[2,3,4]；<code>*init, last = ...</code> 也行。",
          "字典解包合併：<code>merged = {**a, **b}</code>（b 蓋掉 a 的重複 key）。",
          "⚠️ 左右數量要對得上（除非用 *）——<code>a, b = [1,2,3]</code> 會報錯 too many values。",
        ),
      },
      {
        title: "f-string 格式規格：對齊、小數、千分位",
        chapter_id: 26,
        content: P(
          "f-string 大括號裡加 <code>:</code> 後面可以下「格式規格」，報表輸出超好用。",
          "小數位：<code>f\"{price:.2f}\"</code> → 兩位小數。千分位：<code>f\"{n:,}\"</code> → 1,234,567。百分比：<code>f\"{rate:.1%}\"</code>。",
          "對齊/補寬：<code>f\"{name:&lt;10}\"</code> 靠左補到 10 寬、<code>:&gt;10</code> 靠右、<code>:^10</code> 置中；補零 <code>f\"{n:03d}\"</code> → 007。",
          "⚠️ 這些只是「顯示格式」、不改原本的值；要真的四捨五入計算用 <code>round()</code>。",
        ),
      },
      {
        title: "pathlib：處理檔案路徑別再拼字串",
        chapter_id: 26,
        content: P(
          "用 <code>+</code> 拼路徑（<code>dir + \"/\" + name</code>）跨系統會出事（Windows 是反斜線）。用 pathlib。",
          "<code>from pathlib import Path; p = Path(\"data\") / \"a.csv\"</code>——用 <code>/</code> 接路徑，自動處理分隔符。",
          "好用方法：<code>p.exists()</code> 在不在、<code>p.suffix</code> 副檔名、<code>p.stem</code> 檔名（不含副檔）、<code>p.read_text()</code> 直接讀、<code>Path(\"out\").mkdir(exist_ok=True)</code> 建資料夾。",
          "⚠️ 路徑用 pathlib、別手拼字串；跨作業系統跑不掉這關。",
        ),
      },
      {
        title: "datetime：日期時間與那個時區的坑",
        chapter_id: 26,
        content: P(
          "處理時間遲早會遇到，先會這些。",
          "現在：<code>from datetime import datetime; now = datetime.now()</code>。格式化成字串 <code>now.strftime(\"%Y-%m-%d %H:%M\")</code>；反過來 parse 用 <code>strptime</code>。",
          "算時間差用 <code>timedelta</code>：<code>now + timedelta(days=7)</code> = 一週後。",
          "⚠️ <b>時區大坑</b>：存資料庫用 UTC、顯示時再轉當地，才不會差 8 小時。跨時區務必用「帶時區資訊（aware）」的時間，別用 naive 的裸時間亂比。",
        ),
      },
      {
        title: "json 模組：讀寫設定檔與 API 資料",
        chapter_id: 26,
        content: P(
          "程式跟外界交換資料，JSON 是通用語言，Python 內建 json 模組處理。",
          "字串↔物件：<code>json.loads(字串)</code> 變 dict/list；<code>json.dumps(物件)</code> 變字串。",
          "檔案：<code>json.load(f)</code> 從檔讀、<code>json.dump(物件, f)</code> 寫檔。存中文加 <code>ensure_ascii=False</code>、要好讀加 <code>indent=2</code>。",
          "⚠️ JSON 只有基本型別——Python 的 datetime、set 不能直接丟進去 dump（要先轉字串/list）。key 一律變字串。",
        ),
      },
      {
        title: "random：抽樣、洗牌、亂數",
        chapter_id: 26,
        content: P(
          "抽獎、洗牌、隨機測試資料常用。",
          "<code>random.randint(1, 6)</code> 骰子（含兩端）、<code>random.random()</code> 0~1 小數、<code>random.choice(清單)</code> 隨機挑一個。",
          "<code>random.sample(清單, 3)</code> 不重複抽 3 個、<code>random.shuffle(清單)</code> 就地洗牌。",
          "⚠️ 這是「偽亂數」——不能拿來做安全用途（產密碼/token）。要安全的隨機用 <code>secrets</code> 模組。要每次結果一樣（測試）用 <code>random.seed(值)</code> 固定。",
        ),
      },
      {
        title: "sorted 進階：多鍵排序與反向",
        chapter_id: 26,
        content: P(
          "排序不只是由小到大，key 用熟能解很多題。",
          "反向：<code>sorted(nums, reverse=True)</code>。依欄位：<code>sorted(users, key=lambda u: u[\"age\"])</code>。",
          "<b>多鍵</b>（先依 A、A 同再依 B）：key 回一個 tuple <code>key=lambda u: (u[\"city\"], u[\"age\"])</code>。",
          "想「A 升冪、B 降冪」：對數字 B 取負 <code>(u[\"city\"], -u[\"age\"])</code>。",
          "⚠️ <code>sorted()</code> 回新的、不動原本；<code>list.sort()</code> 是就地改。想留原順序用 sorted。",
        ),
      },
      {
        title: "裝飾器 decorator：@ 到底在幹嘛",
        chapter_id: 26,
        content: P(
          "看到函式上面一行 <code>@something</code> 很多人黑人問號。它其實是「幫函式包一層額外行為」。",
          "白話：decorator 是「吃一個函式、回一個加強版函式」的函式。<code>@timer</code> 放在某函式上，就等於「先用 timer 把它包起來」——例如自動計時、自動記 log、自動檢查登入。",
          "常見場景：Web 框架的 <code>@app.route(\"/\")</code>、快取 <code>@cache</code>、權限 <code>@login_required</code>。",
          "⚠️ 初學會用（貼上框架給的 decorator）就夠了；自己寫 decorator 是進階，等你真的需要「很多函式共用同一段前後處理」再學。",
        ),
      },
      {
        title: "變數作用域與 global：函式內外的雷",
        chapter_id: 26,
        content: P(
          "函式「看得到外面的變數，但預設不能改它」，這個規則不懂會踩雷。",
          "讀取 OK：函式裡可以讀外層/全域變數。但你在函式裡 <code>x = 5</code> 是「新建一個只屬於函式的 x」，不會動到外面的。",
          "真的要改外層全域：<code>global x</code> 宣告（但少用、容易讓程式難追）。改外層函式的變數用 <code>nonlocal</code>。",
          "⚠️ 更好的做法是「用參數傳進來、用 return 傳出去」，而不是靠 global 偷改——這樣函式才單純、好測。看到一堆 global 通常是設計該調整的訊號。",
        ),
      },
      {
        title: "any / all / next：一行做判斷與找第一個",
        chapter_id: 26,
        content: P(
          "這三個配生成器，能把好幾行迴圈濃縮成一行、又好讀。",
          "<b>any</b>：只要有一個符合就 True。<code>any(u.is_admin for u in users)</code> = 有沒有管理員。",
          "<b>all</b>：全部符合才 True。<code>all(x &gt; 0 for x in nums)</code> = 是不是全正數。",
          "<b>next</b>：找第一個符合的。<code>next((u for u in users if u.is_admin), None)</code> = 第一個管理員、沒有回 None。",
          "⚠️ any/all 是「短路」的——找到答案就停、不會跑完整串，效能好。next 記得給第二個參數當「找不到的預設」，不然找不到會噴 StopIteration。",
        ),
      },
      {
        title: "assert：開發時的防呆檢查",
        chapter_id: 26,
        content: P(
          "<code>assert 條件, \"訊息\"</code>：「我斷定這裡條件一定成立」，不成立就當場報 AssertionError。",
          "用途：在開發/測試時「早點抓到不該發生的狀態」。<code>assert len(a) == len(b), \"兩串長度要一樣\"</code>。",
          "它讓 bug 在「出錯的當下」爆，而不是拖到很後面才拿到怪結果、難追。",
          "⚠️ <b>別拿 assert 做正式的輸入驗證/權限檢查</b>——Python 用 <code>-O</code> 最佳化執行時 assert 會被整個拿掉。那種該用 if + raise。assert 是給開發者的自我檢查，不是給使用者的把關。",
        ),
      },
      {
        title: "整數除法與運算子：// % ** divmod",
        chapter_id: 26,
        content: P(
          "數學運算有幾個新手容易混的符號。",
          "<code>/</code> 一律回小數（<code>6/2</code> = 3.0）；<code>//</code> 是「整除」丟掉小數（<code>7//2</code> = 3）；<code>%</code> 取餘數（<code>7%2</code> = 1）；<code>**</code> 次方（<code>2**10</code> = 1024）。",
          "判斷奇偶最常用 <code>%</code>：<code>n % 2 == 0</code> 是偶數。一次拿商跟餘數用 <code>divmod(7,2)</code> → <code>(3, 1)</code>。",
          "⚠️ 負數整除會「往下取整」（<code>-7//2</code> = -4 不是 -3）；浮點數 <code>0.1+0.2 != 0.3</code>（電腦二進位的老問題），比小數別用 <code>==</code>、用差值夠小或 <code>math.isclose</code>。",
        ),
      },
      {
        title: "型別轉換的陷阱",
        chapter_id: 26,
        content: P(
          "在數字與字串之間轉換很常見，但幾個坑要知道。",
          "<code>int(\"3\")</code> OK，但 <code>int(\"3.5\")</code> 會<b>爆</b>（ValueError）——要先 <code>int(float(\"3.5\"))</code>。<code>str(123)</code> 轉字串、<code>float(\"1.5\")</code> 轉小數。",
          "<code>bool</code> 的雷：<code>bool(\"False\")</code> 是 <b>True</b>（非空字串都 True）！從環境變數/表單讀「True/False」要自己判斷字串內容，別直接 bool()。",
          "⚠️ 使用者輸入轉數字一定包 try/except（他可能亂打）；<code>int(\"08\")</code> 在新版 OK 但別依賴前導零。",
        ),
      },
      {
        title: "字串、bytes 與 encode / decode",
        chapter_id: 26,
        content: P(
          "處理檔案、網路資料遲早遇到 <code>bytes</code>（位元組）跟 <code>str</code>（文字）的差別。",
          "<b>str</b> 是給人看的文字；<b>bytes</b> 是實際傳輸/儲存的位元組（前面有個 <code>b</code>，像 <code>b'hello'</code>）。",
          "互轉：<code>\"你好\".encode(\"utf-8\")</code> 文字→bytes；<code>資料.decode(\"utf-8\")</code> bytes→文字。",
          "requests 的 <code>r.text</code> 是 str、<code>r.content</code> 是 bytes（下載圖片/檔案要用 content）。",
          "⚠️ 「TypeError: a bytes-like object is required」或亂碼，多半是 str/bytes 搞混了——確認你手上是哪一種、該不該 encode/decode。",
        ),
      },
      {
        title: "遞迴 recursion：函式自己呼叫自己",
        chapter_id: 7,
        content: P(
          "遞迴＝「把大問題拆成同型的小問題」，函式在自己裡面呼叫自己。",
          "兩個要素：<b>基底條件</b>（小到可以直接回答、停止遞迴）+ <b>遞迴步驟</b>（縮小問題再呼叫自己）。",
          "例：階乘 <code>def f(n): return 1 if n&lt;=1 else n*f(n-1)</code>。走樹狀/巢狀資料（資料夾、留言串）特別自然。",
          "⚠️ 忘了基底條件 = 無限遞迴 → <code>RecursionError</code>。Python 遞迴深度有限（預設約 1000），很深的用迴圈或改寫。很多遞迴其實用迴圈更快更省。",
        ),
      },
      {
        title: "閉包 closure：函式記住外層的變數",
        chapter_id: 7,
        content: P(
          "閉包＝「一個函式，記住了它出生時外層的變數」，即使外層已經結束。",
          "例：<code>def multiplier(n): def mul(x): return x*n; return mul</code>——<code>double = multiplier(2)</code>，之後 <code>double(5)</code> = 10，那個 <code>n=2</code> 被 <code>double</code> 記住了。",
          "用途：做「工廠函式」（產生客製的函式）、裝飾器的底層原理、回呼帶狀態。",
          "⚠️ 迴圈裡建閉包又用迴圈變數，常常全部記到「最後一個值」——需要當下的值就用預設參數 <code>def f(x, n=n)</code> 綁進去。",
        ),
      },
      {
        title: "dataclass：資料類別免寫一堆樣板",
        chapter_id: 26,
        content: P(
          "要一個「只是裝資料」的類別，用 <code>@dataclass</code> 省掉手寫 <code>__init__</code>。",
          "<code>from dataclasses import dataclass; @dataclass\nclass Point: x: int; y: int</code>——自動幫你生 <code>__init__</code>、好看的 <code>__repr__</code>、還能比較相等。",
          "<code>p = Point(1, 2); print(p)</code> → <code>Point(x=1, y=2)</code>，不用自己寫。可給預設值、設 <code>frozen=True</code> 變不可變。",
          "⚠️ 可變預設（list/dict）要用 <code>field(default_factory=list)</code>、不能直接 <code>=[]</code>（跟函式預設參數同一個雷）。純資料用 dataclass、有複雜行為才寫一般 class。",
        ),
      },
      {
        title: "Enum：別再用魔法字串當狀態",
        chapter_id: 26,
        content: P(
          "訂單狀態到處寫 <code>\"pending\"</code>、<code>\"paid\"</code> 字串，打錯字也不會報錯——用 Enum 收斂。",
          "<code>from enum import Enum; class Status(Enum): PENDING=\"pending\"; PAID=\"paid\"</code>。",
          "用 <code>Status.PAID</code>，打錯名字會當場報錯（不像字串打錯默默錯）；集中一個地方管所有合法值。",
          "⚠️ 別散落一堆「魔法字串/魔法數字」在程式各處——用 Enum 或常數集中，改一次、到處對，也讓編輯器能自動完成。",
        ),
      },
      {
        title: "namedtuple：輕量、有名字的資料",
        chapter_id: 26,
        content: P(
          "想要「像 tuple 一樣輕、但欄位有名字」，用 namedtuple。",
          "<code>from collections import namedtuple; Point = namedtuple(\"Point\", \"x y\")</code>；<code>p = Point(1, 2)</code>，可以 <code>p.x</code> 也可以 <code>p[0]</code>。",
          "比 dict 省記憶體、不可變（當 key、當回傳多值很好用），比 dataclass 更輕。",
          "⚠️ 需要「可變 + 方法」用 dataclass 或 class；只是「一組固定欄位的小資料、還要能解包」namedtuple 最順。",
        ),
      },
      {
        title: "CSV 讀寫：處理表格資料",
        chapter_id: 26,
        content: P(
          "跟 Excel/試算表交換資料最常見的格式，用內建 <code>csv</code> 模組（或 pandas）。",
          "讀：<code>import csv; with open(\"a.csv\", encoding=\"utf-8\") as f: for row in csv.DictReader(f): print(row[\"name\"])</code>——<code>DictReader</code> 讓你用欄位名取值。",
          "寫：<code>csv.DictWriter(f, fieldnames=[...])</code>，先 <code>writeheader()</code> 再 <code>writerow(dict)</code>。",
          "⚠️ 中文一定 <code>encoding=\"utf-8\"</code>；給 Excel 開會亂碼可改 <code>utf-8-sig</code>。欄位裡有逗號/換行別自己拼字串——用 csv 模組它會正確處理引號跳脫。",
        ),
      },
      {
        title: "logging 取代 print：正式一點的輸出",
        chapter_id: 26,
        content: P(
          "隨手 <code>print</code> debug 沒問題，但正式程式用 <code>logging</code> 更好。",
          "<code>import logging; logging.basicConfig(level=logging.INFO); logging.info(\"開始處理 %s\", name)</code>。",
          "好處：分級別（debug/info/warning/error）可一鍵調要看多細；能同時輸出到檔案；帶時間戳；正式環境關掉 debug 不用刪 print。",
          "⚠️ 到處 print 上線後很難管、也可能不小心印出機密。函式庫/服務端用 logging；一次性小腳本 print 就好。",
        ),
      },
      {
        title: "pytest 入門：怎麼寫第一個測試",
        chapter_id: 26,
        content: P(
          "Python 測試最常用 pytest，上手超簡單。",
          "寫一個 <code>test_xxx.py</code>，裡面 <code>def test_add(): assert add(1,2) == 3</code>——函式名以 <code>test_</code> 開頭、用 <code>assert</code> 斷言。",
          "終端跑 <code>pytest</code>，它自動找所有 test_ 檔跑、綠燈全過、紅燈告訴你哪個 assert 失敗、期望 vs 實際。",
          "測邊界：空的、0、負數、超大、壞輸入——bug 常躲在邊界。",
          "⚠️ 先對「最容易錯、最重要」的函式寫幾個測試就好，別一開始追求 100% 覆蓋。有測試，你改 code 才敢大膽。",
        ),
      },
      {
        title: "breakpoint()：停下來逐行看",
        chapter_id: 26,
        content: P(
          "比 print 更強的除錯：在想檢查的那行放 <code>breakpoint()</code>，程式跑到那會停、進入互動除錯器（pdb）。",
          "停住後可以：打變數名看值、<code>n</code> 下一行、<code>s</code> 進入函式、<code>c</code> 繼續跑、<code>q</code> 離開。",
          "比一直加 print 再刪快多了——現場所有變數隨你查。",
          "⚠️ <code>breakpoint()</code> 是 Python 3.7+ 內建（等同 <code>import pdb; pdb.set_trace()</code>）；別忘了拿掉、也別 commit 進版控（會讓別人的程式卡住）。",
        ),
      },
      {
        title: "GIL 與並行：多執行緒還是多程序",
        chapter_id: 26,
        content: P(
          "想「同時做很多事」加速，先搞懂 Python 的一個特性。",
          "<b>GIL</b>（全域直譯器鎖）讓 Python「同一時間只有一條執行緒在跑 Python code」——所以多執行緒對「純計算」<b>沒</b>加速。",
          "分兩種情況：等 I/O（下載、讀檔、等 API）用<b>多執行緒 / async</b>——等待時可以切去做別的，有效；純吃 CPU 的計算用<b>多程序</b>（multiprocessing）——真的用到多核。",
          "⚠️ 並行很容易寫出難抓的 bug（競爭條件）。新手先用「asyncio 處理大量 I/O」或「multiprocessing 跑重計算」這兩個明確場景，別盲目上多執行緒。",
        ),
      },
      {
        title: "pythonic 迴圈：直接迭代、別用 index",
        chapter_id: 26,
        content: P(
          "從別的語言來的人常寫 <code>for i in range(len(items)): items[i]</code>——Python 有更漂亮的方式。",
          "直接跑元素：<code>for item in items:</code>。要編號配 <code>enumerate</code>；兩串一起配 <code>zip</code>；反向 <code>reversed</code>；排序後 <code>sorted</code>。",
          "判斷「在不在」用 <code>if x in items</code>（別自己寫迴圈找）；要「找第一個/有沒有/全部」用 <code>next/any/all</code>。",
          "⚠️ 「用 index 存取」在 Python 通常是壞味道——多半有更直接的寫法。寫得像 Python，讀的人（含你）都輕鬆。",
        ),
      },
      {
        title: "os / sys：跟系統與參數打交道",
        chapter_id: 26,
        content: P(
          "寫工具腳本常要碰環境、路徑、命令列參數。",
          "<code>import os; os.environ.get(\"API_KEY\")</code> 讀環境變數；<code>os.getcwd()</code> 目前目錄；路徑操作優先用 <code>pathlib</code>（前面教過）。",
          "<code>import sys; sys.argv</code> 拿命令列參數（<code>python x.py a b</code> → argv 是 ['x.py','a','b']）；<code>sys.exit(1)</code> 用非 0 離開表示失敗。",
          "要跑外部指令用 <code>subprocess.run([...])</code>。",
          "⚠️ <code>subprocess</code> 別用 <code>shell=True</code> 拼使用者輸入（指令注入風險）；讀環境變數當機密來源、別寫死金鑰。",
        ),
      },
    ],
  },
  {
    title: "🎨 前端開發筆記（官方免費）",
    desc: "切版切到懷疑人生後整理的筆記。先搞懂「瀏覽器在幹嘛」，再學排版跟互動就不用一直亂試。免費。",
    notes: [
      {
        title: "Promise 到底在幹嘛：一張「號碼牌」的比喻",
        chapter_id: 4,
        content: P(
          "我一開始被 Promise 搞得很亂，後來一個比喻就通了：Promise 就是餐廳給你的<b>號碼牌</b>——不是餐點本身，是「餐好了會通知你」的憑證。",
          "拿到結果接 <code>.then(結果 =&gt; ...)</code>，出錯接 <code>.catch(err =&gt; ...)</code>。then 可以一直串，前一個 return 的東西會變成下一個 then 的輸入。",
          "一個 Promise 只會有一種結局：成功（resolve）或失敗（reject），而且只發生一次、不會反悔。",
          "⚠️ 我踩過：忘了 <code>return</code> 鏈裡的 Promise，下一個 then 就提早跑、拿到 undefined。then 裡面又發一個非同步，記得把它 return 出來接著串。",
        ),
      },
      {
        title: "async/await 的錯誤要用 try/catch 接",
        chapter_id: 4,
        content: P(
          "改用 async/await 後我一度以為錯誤自己會消失，結果請求一失敗整個畫面就掛掉、Console 一句 <code>Uncaught (in promise)</code>。",
          "await 的東西失敗會「用丟例外的方式」爆出來，所以要用 <code>try { ... } catch (err) { ... }</code> 包住，就像 Promise 的 <code>.catch</code>。",
          "常見寫法：try 裡 await fetch + 解析，catch 裡顯示錯誤訊息、finally 裡把 loading 關掉。",
          "⚠️ 別忘了 <code>if (!res.ok) throw new Error(...)</code>——fetch 對 404/500 <b>不會</b>自己 reject，你不主動 throw，錯誤的回應會被當成功繼續往下用。",
        ),
      },
      {
        title: "fetch 的三個常忘設定：headers / body / credentials",
        chapter_id: 75,
        content: P(
          "fetch 的第二個參數是「這次請求的設定」，我最常忘的就是這三個。",
          "送 JSON 要<b>兩件事一起</b>：<code>headers: {\"Content-Type\": \"application/json\"}</code> 加 <code>body: JSON.stringify(data)</code>。少了 header，後端可能不知道怎麼解析 body。",
          "要帶 cookie（登入狀態）跨網域時加 <code>credentials: \"include\"</code>；同網域用預設的 <code>same-origin</code> 就會帶。",
          "⚠️ 我踩過：body 直接丟物件沒 stringify，後端收到空的。fetch 的 body 只吃字串（或 FormData 等），物件一定要先 <code>JSON.stringify</code>。",
        ),
      },
      {
        title: "AbortController：把「不要了」的請求取消掉",
        chapter_id: 4,
        content: P(
          "搜尋框快速打字，前一個請求還沒回、新的又送出，結果<b>舊的比新的晚回來</b>、畫面顯示錯的資料。這叫 race condition。",
          "解法：<code>const c = new AbortController()</code>，fetch 時傳 <code>signal: c.signal</code>，要取消就 <code>c.abort()</code>。被取消的 fetch 會丟 <code>AbortError</code>。",
          "React 裡最順的位置是 useEffect 的 cleanup：effect 重跑或元件卸載前，abort 掉上一個請求。",
          "⚠️ abort 會讓 fetch reject 成 AbortError，記得在 catch 裡「認出它、別當成真的錯誤」顯示給使用者（<code>if (err.name === \"AbortError\") return</code>）。",
        ),
      },
      {
        title: "上傳檔案別自己拼：用 FormData",
        chapter_id: 4,
        content: P(
          "第一次做檔案上傳我試著把檔案塞進 JSON，怎麼弄都不對——檔案（二進位）本來就不該 JSON.stringify。",
          "用 <code>FormData</code>：<code>const fd = new FormData(); fd.append(\"file\", fileInput.files[0]);</code>，然後 <code>fetch(url, {method:\"POST\", body: fd})</code>。",
          "整個表單也能一鍵打包：<code>new FormData(formElement)</code> 會自動收集有 name 的欄位。",
          "⚠️ 用 FormData 時<b>不要自己設 Content-Type</b>！瀏覽器要自動加上帶 boundary 的 multipart header，你手動設反而會壞掉、後端解不出檔案。",
        ),
      },
      {
        title: "網址上的 ?a=1&b=2 別手動拼字串",
        chapter_id: 4,
        content: P(
          "組查詢字串我以前用 <code>+</code> 硬接，遇到中文、空格、&符號就爆——因為沒編碼。",
          "用 <code>URLSearchParams</code>：<code>const p = new URLSearchParams({q: \"你好\", page: 2}); fetch(\"/search?\" + p)</code>，它會自動幫你 encode。",
          "讀當前網址的參數也好用：<code>new URLSearchParams(location.search).get(\"page\")</code>。",
          "⚠️ 值有中文、斜線、空白時，手拼字串一定出事。交給 URLSearchParams 或 <code>encodeURIComponent</code>，別自己 escape。",
        ),
      },
      {
        title: "SPA 換頁不重整：History API 在做什麼",
        chapter_id: 4,
        content: P(
          "以前不懂 React Router「換網址但頁面沒閃」是怎麼辦到的，其實底層就是瀏覽器的 History API。",
          "<code>history.pushState(state, \"\", \"/about\")</code> 會「改網址列 + 加一筆歷史紀錄」但<b>不發送請求</b>；你自己用 JS 換掉畫面內容。上一頁／下一頁靠監聽 <code>popstate</code>。",
          "所以前端路由 = 攔截連結點擊 → pushState 改網址 → 依網址渲染對應元件。框架幫你把這串包好了。",
          "⚠️ 純前端路由重新整理某個深層網址（如 /about）會 404——因為伺服器沒那個實體檔案。要設「所有路徑都回傳 index.html」讓前端接手，不然使用者一重整就壞。",
        ),
      },
      {
        title: "解構賦值：把東西「拆包」出來",
        chapter_id: 4,
        content: P(
          "解構就是「一次把物件／陣列裡的東西拆出來命名」，寫法乾淨很多，React 裡到處都是。",
          "物件按 key 拆：<code>const {name, age} = user;</code>；陣列按位置拆：<code>const [first, second] = arr;</code>（useState 回傳的就是陣列解構）。",
          "可以改名 <code>const {name: userName} = user</code>、給預設 <code>const {age = 18} = user</code>，函式參數也能直接解構。",
          "⚠️ 解構 undefined／null 會直接爆 <code>Cannot destructure property...</code>。物件可能沒值時給預設 <code>const {a} = obj ?? {}</code>，別假設它一定存在。",
        ),
      },
      {
        title: "三個點 ... ：展開與收集是相反的兩件事",
        chapter_id: 4,
        content: P(
          "同樣是 <code>...</code>，看在哪用意思相反，搞懂位置就不亂。",
          "<b>展開（spread）</b>是「攤開」：<code>[...arr, newItem]</code> 複製陣列再加、<code>{...obj, age: 20}</code> 複製物件再覆蓋某欄——React 更新 state 全靠這招產生新物件。",
          "<b>收集（rest）</b>是「打包剩下的」：<code>function sum(...nums)</code> 把多個參數收成陣列、<code>const {id, ...others} = obj</code> 把剩下的欄位收成一包。",
          "⚠️ spread 是<b>淺複製</b>——只複製第一層。裡面的巢狀物件還是共用同一個參考，改它會連動到原本的。深層要更新得逐層展開。",
        ),
      },
      {
        title: "?. 可選鏈：安全地摸資料，別再被 undefined 炸",
        chapter_id: 4,
        content: P(
          "串 API 回來的資料常常某層是空的，<code>user.address.city</code> 只要 address 不在就整個爆 <code>Cannot read properties of undefined</code>。",
          "可選鏈 <code>?.</code> 就是「如果前面是 null／undefined，就整條停下來回傳 undefined、不爆」：<code>user?.address?.city</code>。",
          "也能用在函式／陣列：<code>obj.fn?.()</code>（有才呼叫）、<code>arr?.[0]</code>。",
          "⚠️ 別整條到處亂加 <code>?.</code> 當萬靈丹——該有值卻沒有，你反而把「本該報錯的 bug」藏起來、之後更難查。只在「這裡真的可能沒有」時用。",
        ),
      },
      {
        title: "?? 和 || 差在哪：0 跟空字串的坑",
        chapter_id: 4,
        content: P(
          "設預設值我以前一律用 <code>||</code>，結果數量 0、空字串這種「合法的假值」被當成沒填、硬被換成預設。",
          "<code>||</code> 是「左邊<b>假值</b>（0、空字串、false、null、undefined）就用右邊」；<code>??</code> 是「左邊<b>只有 null／undefined</b>才用右邊」。",
          "所以「可以是 0 的數字、可以是空字串」要用 <code>count ?? 10</code>，別用 <code>count || 10</code>（0 會被吃掉變 10）。",
          "⚠️ 分清楚：「沒填」用 <code>??</code>、「假值就換」才用 <code>||</code>。很多莫名其妙的預設值 bug 都是這兩個混用造成的。",
        ),
      },
      {
        title: "陣列三兄弟：find / some / every",
        chapter_id: 4,
        content: P(
          "map／filter 大家都會，這三個「回傳單一結果」的也超常用、能少寫一堆迴圈。",
          "<code>find</code>：找出<b>第一個</b>符合的元素（找不到回 undefined）；<code>some</code>：有<b>任何一個</b>符合就回 true（像 OR）；<code>every</code>：<b>全部</b>符合才回 true（像 AND）。",
          "例：<code>users.find(u =&gt; u.id === 3)</code>、<code>cart.some(i =&gt; i.stock === 0)</code>、<code>form.every(f =&gt; f.valid)</code>。",
          "⚠️ 想要「找位置」用 <code>findIndex</code>（find 回的是元素、不是索引）；只想知道「有沒有某個值」用 <code>includes</code> 更直接，別用 find 硬湊。",
        ),
      },
      {
        title: "flatMap：map 完順便攤平一層",
        chapter_id: 4,
        content: P(
          "有時候 map 每個元素會回傳一個小陣列，結果得到「陣列裡包陣列」，還要再 flat 一次很囉唆。",
          "<code>flatMap</code> 就是「map + 攤平一層」合一：<code>tags.flatMap(t =&gt; t.split(\",\"))</code> 直接得到一維陣列。",
          "小技巧：在 flatMap 裡回傳 <code>[]</code> 等於「跳過這個」、回傳 <code>[a, b]</code> 等於「一個變兩個」——可以同時做 filter + map。",
          "⚠️ flatMap 只攤<b>一層</b>。更深的巢狀要用 <code>arr.flat(Infinity)</code>。想攤兩層以上別指望 flatMap。",
        ),
      },
      {
        title: "Set 和 Map：去重複與「用物件當 key」",
        chapter_id: 4,
        content: P(
          "普通物件當字典有兩個痛點：key 只能是字串、也不好知道「有幾個」。Set／Map 解決這些。",
          "<b>Set</b> 是「不重複的集合」，去重複一行：<code>[...new Set(arr)]</code>；查有沒有 <code>set.has(x)</code> 很快。",
          "<b>Map</b> 是「有順序、key 可以是任何型別」的字典：<code>map.set(obj, 值)</code>、<code>map.get(obj)</code>、<code>map.size</code> 直接拿數量、可以直接 for...of 迭代。",
          "⚠️ Set／Map 不是 JSON 能直接存的——要存 localStorage 或送 API 得先轉成陣列（<code>[...map]</code>），JSON.stringify 一個 Map 會得到空的 <code>{}</code>。",
        ),
      },
      {
        title: "JS 的 Date 有夠雷：月份從 0 開始",
        chapter_id: 4,
        content: P(
          "JS 原生 Date 是公認難用，講幾個我實際被咬過的。",
          "月份<b>從 0 算</b>：<code>new Date(2026, 0, 1)</code> 是一月不是二月，getMonth() 回 0~11、要顯示自己 +1。",
          "解析字串很坑：<code>new Date(\"2026-07-08\")</code> 被當成 UTC 午夜，時區偏移下可能顯示成前一天。盡量用明確格式或工具庫（date-fns、Day.js）。",
          "⚠️ Date 是<b>可變物件</b>，<code>setDate</code> 會改到原本那個。做日期計算前先複製 <code>new Date(d)</code>，不然會不小心改到別人也在用的日期。",
        ),
      },
      {
        title: "數字、日期、金額格式化：用內建的 Intl 就好",
        chapter_id: 4,
        content: P(
          "顯示「1,234,567」「NT$1,200」「2026年7月8日」我以前自己寫函式處理逗號，其實瀏覽器內建 Intl 全包了、還自動配合語系。",
          "數字／貨幣：<code>new Intl.NumberFormat(\"zh-TW\", {style:\"currency\", currency:\"TWD\"}).format(1200)</code>。日期：<code>new Intl.DateTimeFormat(\"zh-TW\").format(date)</code>。",
          "還有 <code>Intl.RelativeTimeFormat</code> 做「3 天前」、<code>Intl.ListFormat</code> 做「A、B 和 C」，不用裝套件。",
          "⚠️ 每次 render 都 <code>new Intl.NumberFormat</code> 建一個其實有成本，清單很大時把 formatter 拉到迴圈外建一次、重複用 <code>.format()</code>。",
        ),
      },
      {
        title: "JSON.stringify 的隱藏參數：排版與過濾",
        chapter_id: 4,
        content: P(
          "大家都用 <code>JSON.stringify(obj)</code>，但它其實有第二、三個參數，debug 和存檔很好用。",
          "第三個是縮排：<code>JSON.stringify(obj, null, 2)</code> 印出來有排版、給人看超清楚。",
          "第二個 replacer 可以過濾／改值：給陣列 <code>[\"id\", \"name\"]</code> 只留這幾個 key；給函式可以逐一改寫每個值（例如把敏感欄位遮掉）。",
          "⚠️ stringify 會<b>默默丟掉</b> undefined、函式、和 Symbol，還會把 Date 轉成字串、Map／Set 變空物件、遇到循環參考直接爆。存複雜結構前先確認它們挺得過這關。",
        ),
      },
      {
        title: "自訂事件 CustomEvent：讓元件之間喊話",
        chapter_id: 4,
        content: P(
          "不用框架、又想讓「這裡發生事、那裡收到」，可以自己造事件，不用把兩塊硬綁在一起。",
          "發：<code>el.dispatchEvent(new CustomEvent(\"cart:add\", {detail: {id: 3}}))</code>；收：<code>el.addEventListener(\"cart:add\", e =&gt; console.log(e.detail))</code>，資料放在 <code>detail</code> 裡。",
          "想讓事件冒泡到 document 讓誰都能聽，加 <code>{bubbles: true}</code>。這是很輕量的模組解耦方式。",
          "⚠️ 在 React 專案裡別濫用這招取代 props／狀態——它會繞過 React 的資料流、很難追。CustomEvent 適合「跨框架」或「純 JS 元件」溝通，React 內部溝通還是走 state／context。",
        ),
      },
      {
        title: "動畫別用 setInterval：用 requestAnimationFrame",
        chapter_id: 4,
        content: P(
          "我以前用 <code>setInterval</code> 每 16ms 動一次，結果動畫卡卡、切到背景分頁還在空轉燒電。",
          "<code>requestAnimationFrame(fn)</code> 是「下一次瀏覽器要重繪前叫我」——會跟螢幕更新頻率同步（通常 60fps），動起來最順。",
          "用法是遞迴：函式裡做完一格、再 <code>requestAnimationFrame</code> 排下一格，要停就別再排（或用 <code>cancelAnimationFrame</code>）。",
          "⚠️ 分頁切到背景時 rAF 會<b>自動暫停</b>（省電、對），所以別拿它當精準計時器。純動畫用 rAF，需要「不管在不在前景都要跑」的計時邏輯用別的。",
        ),
      },
      {
        title: "捲動卡頓？試試 passive 事件監聽",
        chapter_id: 4,
        content: P(
          "手機上頁面捲動有點頓，有時候不是你的錯，是瀏覽器在「等你的 touch／wheel 監聽器決定要不要 preventDefault」才敢捲。",
          "如果你的監聽器<b>根本不會</b> preventDefault，就明講：<code>el.addEventListener(\"touchmove\", fn, {passive: true})</code>，瀏覽器就能立刻捲、不用等你。",
          "scroll、wheel、touchstart／touchmove 這類「高頻又常只是讀取」的事件最該加。",
          "⚠️ 設了 passive 就<b>不能</b>在裡面 <code>preventDefault</code>（會被忽略還跳警告）。真的需要擋預設行為（例如自訂手勢）的監聽器，就別設 passive。",
        ),
      },
      {
        title: "Web Worker：把重活丟到背景，別卡住畫面",
        chapter_id: 4,
        content: P(
          "JS 是單執行緒，一段很重的計算（大量資料處理、影像運算）跑起來，整個畫面會凍住、點什麼都沒反應。",
          "Web Worker 是「另一條背景執行緒」：<code>const w = new Worker(\"calc.js\")</code>，主線和它用 <code>postMessage</code> ／ <code>onmessage</code> 傳訊息溝通，重活在它那邊算、UI 照樣順。",
          "適合：解析大檔、加解密、影像／音訊處理這種純計算的工作。",
          "⚠️ Worker <b>碰不到 DOM</b>、也不共享變數，只能靠傳訊息來回，而且傳大資料有複製成本。小工作用它反而更慢——值不值得先想清楚。",
        ),
      },
      {
        title: "存很多、還要結構化：IndexedDB（不是 localStorage）",
        chapter_id: 4,
        content: P(
          "localStorage 只能存字串、約 5MB、而且是同步的（存大東西會卡）。要在瀏覽器存「大量、結構化」的資料就得用 IndexedDB。",
          "它是瀏覽器內建的「小型資料庫」：能存物件、建索引、非同步查詢，容量大得多（幾百 MB 起跳）。離線 App、快取大量資料靠它。",
          "原生 API 很囉唆（一堆 request／事件），實務上大多用包裝庫（如 <code>idb</code>）讓它像 async／await 一樣好寫。",
          "⚠️ IndexedDB 全是非同步、還有「版本升級」的概念（改結構要開新版本 + onupgradeneeded 遷移）。別把它當 localStorage 隨手用，簡單偏好設定用 localStorage 就好。",
        ),
      },
      {
        title: "元素變大小要反應：ResizeObserver 別監聽 window.resize",
        chapter_id: 4,
        content: P(
          "我以前想「某個容器變寬時重算東西」，就聽 <code>window.resize</code>——但容器不是只有視窗縮放才變（旁邊展開側欄、內容變多都會變），漏一堆情況。",
          "<code>ResizeObserver</code> 直接盯「這個元素」的尺寸：<code>new ResizeObserver(entries =&gt; {...}).observe(el)</code>，它自己變大變小就回呼你，跟視窗無關。",
          "做「依容器寬度切換佈局」「canvas 跟著容器尺寸重畫」很好用。",
          "⚠️ 在回呼裡改被觀察元素的尺寸，可能觸發「ResizeObserver loop」警告（無限循環）。別在回呼裡改到自己的大小；用完 <code>disconnect()</code>（React 放 cleanup）。",
        ),
      },
      {
        title: "MutationObserver：DOM 被別人改了通知我",
        chapter_id: 4,
        content: P(
          "有時候頁面內容是「別的腳本或使用者」動態改的（第三方 widget、contenteditable、注入的元素），你想在它變動時做事。",
          "<code>MutationObserver</code> 就是盯 DOM 變化的哨兵：<code>new MutationObserver(cb).observe(el, {childList:true, subtree:true, attributes:true})</code>，子節點增減、屬性改變都會通知你。",
          "常見用途：偵測第三方塞進來的元素、監控某節點被移除、同步外部編輯器內容。",
          "⚠️ 觀察範圍開太大（整個 document + subtree + 所有屬性）回呼會爆量、拖效能。只觀察你真正需要的節點與變化類型，用完 <code>disconnect()</code>。",
        ),
      },
      {
        title: "一鍵複製：Clipboard API 比 execCommand 好",
        chapter_id: 4,
        content: P(
          "做「複製連結」按鈕，網路上很多老教學用 <code>document.execCommand(\"copy\")</code>——那個已經淘汰了，現在有更乾淨的做法。",
          "<code>await navigator.clipboard.writeText(\"要複製的字\")</code> 一行搞定，回傳 Promise、可以接著顯示「已複製！」。",
          "讀剪貼簿用 <code>readText()</code>，但會跳權限詢問（合理，別人不該隨便讀你剪貼簿）。",
          "⚠️ Clipboard API <b>只在 HTTPS（或 localhost）</b>下能用，而且通常要「使用者點擊觸發」才行。本機 http 或非點擊情境會失敗——記得包 try／catch 給退路。",
        ),
      },
      {
        title: "contenteditable：讓一塊 div 能打字，但別高興太早",
        chapter_id: 1,
        content: P(
          "想做「就地編輯」或簡易富文本，給元素加 <code>contenteditable=\"true\"</code> 它就能被輸入，看起來超方便。",
          "取內容用 <code>el.innerText</code> 或 <code>innerHTML</code>，聽 <code>input</code> 事件知道使用者改了什麼。",
          "但它天生會產生「髒 HTML」——貼上時會帶一堆來源網站的樣式標籤、不同瀏覽器換行還用不同標籤（div／p／br）。",
          "⚠️ 直接把 contenteditable 的 innerHTML 存起來再渲染 = <b>XSS 大門</b>（使用者能貼 script／事件屬性）。一定要過濾／清消毒（sanitize），做正經編輯器建議用成熟的庫，別自己硬幹。",
        ),
      },
      {
        title: "選對 input type，手機自動跳對的鍵盤",
        chapter_id: 1,
        content: P(
          "同一個輸入框，在手機上跳出的鍵盤好不好用，差別就在 <code>type</code> 和 <code>inputmode</code> 設對沒。",
          "電話用 <code>type=\"tel\"</code>（跳數字鍵盤）、email 用 <code>type=\"email\"</code>（鍵盤有 @）、網址 <code>type=\"url\"</code>。純數字驗證碼可以用 <code>inputmode=\"numeric\"</code>。",
          "再配 <code>autocomplete</code>（如 <code>autocomplete=\"one-time-code\"</code>、<code>\"email\"</code>）讓瀏覽器幫使用者自動填、少打字。",
          "⚠️ 別為了「只想要數字鍵盤」就用 <code>type=\"number\"</code> 裝電話／驗證碼——它會允許 e、+、-、上下箭頭改值、還會吃掉開頭的 0。要數字外觀的字串用 <code>inputmode=\"numeric\"</code> 才對。",
        ),
      },
      {
        title: "@layer：終於能管好「誰蓋過誰」",
        chapter_id: 2,
        content: P(
          "CSS 最痛的就是覆蓋大戰——第三方樣式、自己的樣式、utility 互相蓋，最後只好狂加 <code>!important</code>。Cascade Layers 就是來治這個的。",
          "<code>@layer reset, base, components, utilities;</code> 先宣告順序，之後不管誰寫得多具體，<b>後面的 layer 整層贏過前面的 layer</b>——優先級由你排的層級決定，不再看選擇器誰更長。",
          "把第三方庫放進低層、自己的覆蓋放高層，就能穩穩蓋過它、不用比 specificity。",
          "⚠️ 「沒放進任何 layer」的樣式優先級<b>高於所有 layer</b>。混用時容易搞混誰贏——要嘛全上 layer、要嘛清楚知道哪些沒進 layer，別半套。",
        ),
      },
      {
        title: "Container Queries：元件看「自己容器」多寬，不是看螢幕",
        chapter_id: 2,
        content: P(
          "media query 是看「整個螢幕」多寬，但同一張卡片可能出現在寬側欄也可能在窄欄——我想要的是「卡片依<b>自己所在容器</b>的寬度變佈局」。",
          "容器查詢就是這個：父層設 <code>container-type: inline-size</code>，子層用 <code>@container (min-width: 400px) { ... }</code>——容器夠寬才套，跟螢幕無關。",
          "這讓元件<b>真正可重用</b>：同一個卡片元件丟到哪個寬度的欄位都能自己適應。",
          "⚠️ 你要查詢的元素必須放在一個「被宣告為 container 的祖先」裡，而且不能查詢容器<b>自己</b>（要查外面包一層）。忘了設 container-type，@container 整段靜悄悄不生效。",
        ),
      },
      {
        title: ":has()：CSS 終於有「父選擇器」了",
        chapter_id: 2,
        content: P(
          "CSS 幾十年來只能「由外往內」選，選不到「有某個子元素的父層」，這需求以前只能靠 JS。<code>:has()</code> 破了這個限制。",
          "<code>.card:has(img)</code>＝「內含 img 的 card」；<code>label:has(input:checked)</code>＝「裡面 input 被勾的 label」；<code>form:has(:invalid)</code>＝「有欄位沒通過驗證的表單」。",
          "還能配相鄰選擇器做連動：<code>h2:has(+ p)</code>、依「後面有沒有某元素」調樣式，純 CSS 就能做很多以前要 JS 的互動。",
          "⚠️ :has() 很強所以容易寫出「牽一髮動全身」的規則，複雜條件下也可能影響效能。範圍圈小一點、別寫成整頁掃描的巨型選擇器。",
        ),
      },
      {
        title: "CSS 原生巢狀：不用 Sass 也能寫巢狀了",
        chapter_id: 2,
        content: P(
          "以前要寫巢狀 CSS 得裝 Sass，現在瀏覽器<b>原生支援</b>了，少一層建置工具。",
          "直接把子規則寫進父層：<code>.card { padding: 1rem; .title { font-weight: bold; } &amp;:hover { ... } }</code>，<code>&amp;</code> 代表父選擇器自己。",
          "好處是相關樣式集中、少重複打 <code>.card</code> 前綴、結構跟 HTML 對得起來。",
          "⚠️ 別巢太深（超過兩三層），跟 Sass 一樣會產生又長又難覆蓋的選擇器、specificity 爆表。巢狀是為了整理、不是無限往裡塞。",
        ),
      },
      {
        title: ":is() 和 :where()：把落落長的選擇器縮短",
        chapter_id: 2,
        content: P(
          "要對好幾個選擇器套同一組樣式，以前得寫 <code>header a, main a, footer a { ... }</code> 一長串。<code>:is()</code> 讓你合併成 <code>:is(header, main, footer) a</code>。",
          "<code>:where()</code> 長得一樣，差別在<b>優先級</b>：<code>:where()</code> 的 specificity 永遠算 0，超好被覆蓋——最適合寫「基底樣式／reset」，讓別人輕鬆蓋過。",
          "<code>:is()</code> 則會取括號裡「最高的那個」的 specificity。",
          "⚠️ 關鍵差異就是 specificity：想寫「容易被覆蓋的預設」用 <code>:where()</code>；<code>:is()</code> 裡放了 id 會把整條優先級拉很高，別不小心把基底樣式寫死。",
        ),
      },
      {
        title: "logical properties：別再寫 left/right（多語系會謝你）",
        chapter_id: 2,
        content: P(
          "我一直用 <code>margin-left</code>、<code>padding-right</code>、<code>text-align: left</code>，直到要支援阿拉伯文（由右往左讀）才發現整個版面鏡像後全錯。",
          "邏輯屬性用「閱讀方向」而非「實體方位」：<code>margin-inline-start</code>（行首側）、<code>padding-inline</code>（左右一起）、<code>inset-block-start</code>（上）。RTL 語系會自動翻轉。",
          "就算只做中文，<code>padding-inline: 1rem</code>（左右）、<code>margin-block: 1rem</code>（上下）也比分開寫兩行清爽。",
          "⚠️ inline = 文字流動方向（水平書寫時是左右）、block = 堆疊方向（上下），一開始容易記反。記住「inline 跟著字走」就不會弄錯。",
        ),
      },
      {
        title: "毛玻璃效果：backdrop-filter 一行搞定",
        chapter_id: 2,
        content: P(
          "那種「半透明 + 背後模糊」的毛玻璃導覽列／彈窗，以前要疊圖層很麻煩，現在一個屬性就有。",
          "<code>backdrop-filter: blur(10px)</code> 模糊「元素<b>背後</b>的東西」（注意不是自己）；通常配半透明背景 <code>background: rgba(255,255,255,.6)</code> 才看得出效果。",
          "還能疊 <code>saturate()</code>、<code>brightness()</code> 調味，做出 iOS 那種質感。",
          "⚠️ backdrop-filter 蠻吃效能（尤其大面積、行動裝置），別整頁亂用。部分舊瀏覽器要 <code>-webkit-</code> 前綴、也可能不支援——用 <code>@supports</code> 檢查、給個純色退路。",
        ),
      },
      {
        title: "mix-blend-mode：讓文字跟著背景自動反白",
        chapter_id: 2,
        content: P(
          "有個常見需求：白字放在亂七八糟的圖上，圖亮的地方就看不清。混合模式能讓顏色「跟背景互動」而不是單純疊上去。",
          "<code>mix-blend-mode: difference</code> 讓元素和背後做「差值」混色——白字壓在任何背景上都會自動變成對比色，永遠看得清。",
          "還有 <code>multiply</code>（正片疊底、做陰影／染色）、<code>screen</code>（濾色、做光暈）等，跟修圖軟體的圖層模式同一套概念。",
          "⚠️ 混合模式是「跟<b>後面</b>的東西混」，所以很吃堆疊順序和背景。它也會建立新的堆疊脈絡、可能影響 z-index。想「只在容器內混、不吃到更後面」用 <code>isolation: isolate</code> 隔開。",
        ),
      },
      {
        title: "transform-origin：旋轉/縮放的「軸心」在哪",
        chapter_id: 2,
        content: P(
          "做旋轉動畫，元素老是繞著「怪怪的點」轉——因為 transform 預設是繞<b>正中心</b>，但我想要的是繞某個角。",
          "<code>transform-origin</code> 就是設那個軸心：<code>transform-origin: top left</code> 繞左上角轉、<code>0 100%</code> 繞左下角。時鐘指針、開合選單、翻頁效果都靠它。",
          "縮放同理：<code>scale</code> 時原點決定「從哪裡長出來」，選單從按鈕角落展開就設對應的角。",
          "⚠️ origin 是相對元素自己的框。動畫看起來「飄一下」通常就是 origin 沒設對——先確認你算的是哪個角、有沒有被 padding／邊界影響。",
        ),
      },
      {
        title: "prefers-reduced-motion：有人看動畫會頭暈",
        chapter_id: 2,
        content: P(
          "動效很潮，但真的有人對大幅動態會不適甚至暈眩。系統有個「減少動態」的設定，我們該尊重它。",
          "<code>@media (prefers-reduced-motion: reduce) { *{ animation: none !important; transition: none !important; } }</code>——偵測到使用者開了這設定，就把非必要動畫關掉或縮小。",
          "不用全砍，把「大幅位移／縮放／視差」換成單純的淡入即可，資訊照樣傳達。",
          "⚠️ 這是無障礙該做的、不是可有可無。做酷炫進場／視差前，順手加這段防護；預設全速動畫對某些人是真的不友善。",
        ),
      },
      {
        title: ":focus-visible：留著鍵盤焦點框，滑鼠點才不顯醜框",
        chapter_id: 2,
        content: P(
          "很多人嫌點按鈕後那圈藍框醜，就 <code>outline: none</code> 全砍掉——結果鍵盤使用者<b>完全看不出焦點在哪</b>，無障礙直接崩。",
          "<code>:focus-visible</code> 解決兩難：瀏覽器判斷「這次是用鍵盤操作」才顯示焦點框，滑鼠點擊時不顯。你只要 <code>:focus-visible { outline: 2px solid ... }</code>。",
          "所以做法是：<code>:focus { outline: none } :focus-visible { 自訂焦點樣式 }</code>，兩全其美。",
          "⚠️ 千萬別只 <code>outline:none</code> 卻不補任何替代焦點樣式——這是最常見的無障礙錯誤之一。要嘛保留、要嘛用 :focus-visible 換個好看的，不能讓焦點「消失」。",
        ),
      },
      {
        title: "accent-color：一行改掉 checkbox / radio 的顏色",
        chapter_id: 2,
        content: P(
          "以前想讓勾選框、單選鈕、進度條符合品牌色，得整個 <code>appearance: none</code> 再自己刻，超麻煩。",
          "現在一行 <code>accent-color: #22c55e</code> 就能把原生 checkbox、radio、range 滑桿、progress 的主色換掉，還保留原本的無障礙和互動行為。",
          "放 <code>:root</code> 或表單容器上，整組表單控件一起換色。",
          "⚠️ 它只換「主色調」，不能改大小、邊框、勾勾形狀那種細節。要完全客製外觀還是得 appearance:none 重刻——但那要自己補回焦點／勾選狀態的可見性。多數情況 accent-color 就夠了、別過度客製。",
        ),
      },
      {
        title: "color-scheme：讓瀏覽器原生元件也跟著深色",
        chapter_id: 2,
        content: P(
          "做深色模式時我發現：背景我改深了，但捲軸、下拉選單、日期選擇器、input 內建外觀還是<b>白的</b>，很突兀。",
          "<code>color-scheme: light dark</code>（或指定 <code>dark</code>）告訴瀏覽器「這頁支援深色」，它就會把原生 UI（捲軸、表單控件、autofill）也套上對應的深色樣式。",
          "放在 <code>:root</code>，或跟著你的主題切換一起改。",
          "⚠️ 這是很多人做深色模式漏掉的一塊——只改自己的 CSS、忘了瀏覽器原生元件。捲軸／input 在深色下還白白的，八成就是少了 color-scheme。",
        ),
      },
      {
        title: "@supports：新 CSS 先問「你支援嗎」再用",
        chapter_id: 2,
        content: P(
          "想用新屬性又怕舊瀏覽器壞掉？<code>@supports</code> 讓 CSS 自己做特性偵測，支援才套、不支援走退路。",
          "<code>@supports (backdrop-filter: blur(1px)) { ... }</code>＝支援才給毛玻璃；<code>@supports not (...) { 退路樣式 }</code> 反過來給不支援的。",
          "概念跟 JS 的 <code>if (feature)</code> 一樣，只是用在 CSS，讓你安心漸進增強。",
          "⚠️ @supports 檢查的是「瀏覽器認不認得這語法」，不是「效果好不好看」，也偵測不到有 bug 的部分實作。它是保險、不是萬能——關鍵功能還是要實測。",
        ),
      },
      {
        title: "手機 100vh 會被網址列切到：改用 dvh / svh",
        chapter_id: 2,
        content: P(
          "做「滿版一屏」用 <code>height: 100vh</code>，在手機上底部老是被瀏覽器網址列蓋掉一截——因為 vh 算的是「網址列縮起來時」的高度。",
          "新單位解決這個：<code>svh</code>（small，網址列展開時的可視高，最保守）、<code>lvh</code>（large，網址列縮起時）、<code>dvh</code>（dynamic，跟著網址列伸縮即時變）。",
          "想「永遠填滿當下可視區、不被切」多用 <code>100dvh</code>；不希望捲動時高度一直跳動則用 <code>svh</code>。",
          "⚠️ <code>dvh</code> 會隨網址列出現／隱藏而變高變矮，若在上面放動畫或固定佈局，可能看到「跳一下」。看情境在 dvh 的即時性和 svh 的穩定性之間選。",
        ),
      },
      {
        title: "瀏海 / 圓角螢幕：safe-area-inset 別讓內容被吃掉",
        chapter_id: 2,
        content: P(
          "全螢幕網頁在 iPhone 上，底部按鈕會被那條「home indicator」壓到、瀏海旁邊內容也可能被切。",
          "先在 head 開啟：<code>viewport</code> 加 <code>viewport-fit=cover</code>；再用環境變數留白：<code>padding-bottom: env(safe-area-inset-bottom)</code>，左右同理。",
          "常見組合 <code>padding: env(safe-area-inset-top) env(safe-area-inset-right) ...</code>，讓內容避開瀏海、圓角、下巴。",
          "⚠️ 沒加 <code>viewport-fit=cover</code> 的話 <code>env(safe-area-inset-*)</code> 全部是 0、根本沒作用。固定在螢幕邊緣的元素（底部工具列、浮動按鈕）最容易忘、實機一看就穿幫。",
        ),
      },
      {
        title: "自動排卡片牆：Grid 的 minmax + auto-fill/auto-fit",
        chapter_id: 2,
        content: P(
          "「卡片自動排、螢幕寬就多幾欄、窄就少幾欄」不用寫任何 media query，Grid 一行就能做到。",
          "<code>grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))</code>：每欄最小 200px、能長就長，容器放得下幾欄就排幾欄、自動換行。",
          "<code>minmax(min, max)</code> 是「最小到最大之間彈性」，<code>1fr</code> 讓多餘空間平分。",
          "⚠️ <code>auto-fill</code> 和 <code>auto-fit</code> 差在「空欄」：東西不夠填滿時，auto-fill 會<b>留著空欄位</b>（元素維持原寬），auto-fit 會把空欄<b>收掉</b>（現有元素撐滿整排）。想置中排列通常用 auto-fit。",
        ),
      },
      {
        title: "頁面越來越卡？用 contain 圈出「不用管外面」的區塊",
        chapter_id: 2,
        content: P(
          "頁面元素一多，任何一點小改動瀏覽器可能得重算一大片版面。<code>contain</code> 是告訴瀏覽器「這塊裡面的變化，不會影響到外面」，讓它能少算很多。",
          "<code>contain: layout paint</code>＝這區的排版和繪製自成一格、跟外界隔離；<code>content-visibility: auto</code> 更狠，畫面外的區塊<b>先不渲染</b>，長列表／長文章滾動超有感。",
          "適合：獨立卡片、留言區塊、螢幕外的長內容。",
          "⚠️ <code>content-visibility: auto</code> 因為沒渲染，會讓瀏覽器「不知道那塊多高」、捲軸長度會跳動。配 <code>contain-intrinsic-size</code> 給個預估高度，捲動才不會亂彈。",
        ),
      },
      {
        title: "按鈕在手機上超難點？觸控目標要夠大",
        chapter_id: 3,
        content: P(
          "在電腦上好按的小按鈕／小連結，換到手機常常「點半天點不到、還點到旁邊」——因為手指比游標粗多了。",
          "建議可點區域至少 <b>44×44 px</b>（Apple 建議值），彼此間也留點間距別擠在一起。視覺上想小沒關係，用 padding 或偽元素把「可點範圍」撐大。",
          "文字連結太小可點，把 padding 加進 <code>&lt;a&gt;</code>（inline 元素記得改 inline-block 或加足夠 padding）。",
          "⚠️ 相鄰的可點元素靠太近，手指誤觸率超高。刪除、送出這種「點錯有後果」的按鈕，尺寸和間距更要給足，別跟其他按鈕擠一塊。",
        ),
      },
      {
        title: ":hover 在手機上會「黏住」——別把重要功能藏在 hover",
        chapter_id: 3,
        content: P(
          "我把「刪除鈕」設成滑過卡片才顯示（hover），電腦很潮，到手機上使用者<b>根本點不出來</b>——觸控裝置沒有「滑過」這個狀態。",
          "更煩的是：手機點一下常會觸發 hover 樣式然後「卡住」，要點別處才消失。所以 hover 只能當「加分」、不能是唯一入口。",
          "想精準區分裝置能力用 <code>@media (hover: hover)</code>——只有「真的能 hover 的裝置」才套那段樣式。",
          "⚠️ 任何「只在 hover 時才出現」的操作（選單、按鈕、tooltip），一定要給觸控裝置另一條路（常駐顯示或點擊展開）。不然手機使用者等於用不到那功能。",
        ),
      },
      {
        title: "Pointer Events：滑鼠、觸控、觸控筆一套搞定",
        chapter_id: 4,
        content: P(
          "以前要同時支援滑鼠和觸控，得寫兩套：mousedown／mousemove 一組、touchstart／touchmove 一組，還要防兩者重複觸發，很痛。",
          "Pointer Events 把它們統一了：<code>pointerdown / pointermove / pointerup</code> 一套處理所有指標裝置，事件裡的 <code>pointerType</code> 還能分辨是 mouse／touch／pen。",
          "做拖曳、畫布、自訂手勢時，用 pointer 事件最省事，還能拿到壓力、傾斜（觸控筆）等資訊。",
          "⚠️ 拖曳時記得 <code>el.setPointerCapture(e.pointerId)</code>，把後續事件「鎖」在這元素上，手指／游標移出元素也不會中斷。另外用了 pointer 就別再混綁 mouse／touch，會重複觸發。",
        ),
      },
      {
        title: "彈窗打開後，Tab 別跑到後面去：focus trap",
        chapter_id: 3,
        content: P(
          "自己刻的 modal 開著時，鍵盤按 Tab 焦點居然跑到<b>後面被遮住</b>的頁面上去了——使用者看不到焦點在哪、完全亂掉。",
          "對話框要做「焦點陷阱」：打開時把焦點移進去、Tab 走到最後一個元素再按就繞回第一個（Shift+Tab 反向），焦點<b>鎖在彈窗內</b>。關閉時把焦點還給「當初開啟它的按鈕」。",
          "最省事的做法是用原生 <code>&lt;dialog&gt;</code> 元素 + <code>showModal()</code>，瀏覽器自動幫你做焦點鎖定和 Esc 關閉。",
          "⚠️ 別忘了 <b>Esc 關閉</b>和「焦點鎖定」兩件事一起做，還有背景頁面要設 <code>inert</code> 讓讀螢幕器也別跑出去。只做視覺遮罩、鍵盤和讀屏使用者會卡死在裡面。",
        ),
      },
      {
        title: "用 div 假裝按鈕？至少補 role 和 tabindex",
        chapter_id: 3,
        content: P(
          "能用原生 <code>&lt;button&gt;</code> 就別用 div——但真的得用 div／span 當互動元件時，要自己補回瀏覽器免費送的東西。",
          "三件事：加 <code>role=\"button\"</code>（告訴讀螢幕器它是按鈕）、加 <code>tabindex=\"0\"</code>（讓它能被 Tab 選到）、還要自己聽鍵盤（Enter／空白鍵也要能觸發，不能只聽 click）。",
          "<code>tabindex=\"0\"</code>＝照文件順序可聚焦、<code>-1</code>＝程式可聚焦但 Tab 跳過（給 modal 容器用）。<b>別用正數</b> tabindex，會打亂整個焦點順序。",
          "⚠️ 這就是為什麼「能用原生元素就用原生」——一個 div 假按鈕要補 role、tabindex、鍵盤事件、focus 樣式一堆，還常補不齊。<code>&lt;button&gt;</code> 全部免費內建。",
        ),
      },
      {
        title: "同一張圖給手機和 4K：srcset 讓瀏覽器自己挑",
        chapter_id: 1,
        content: P(
          "手機根本不需要載 2000px 寬的大圖，浪費流量又慢。但我又不想寫 JS 判斷裝置換圖——其實 <code>&lt;img&gt;</code> 自己就能做。",
          "<code>srcset</code> 列出多種尺寸、<code>sizes</code> 告訴瀏覽器「這圖在版面上大概佔多寬」，瀏覽器<b>自己</b>依螢幕解析度和寬度挑最合適的那張下載。",
          "例：<code>&lt;img srcset=\"s.jpg 480w, m.jpg 800w, l.jpg 1600w\" sizes=\"(max-width:600px) 100vw, 50vw\"&gt;</code>。",
          "⚠️ 只給 srcset 不給 <code>sizes</code>，瀏覽器會假設圖是滿版（100vw）、常常挑太大張。sizes 要照實際版面寬度寫，才真的省到流量。",
        ),
      },
      {
        title: "自訂字型載入時「閃一下」：FOUT vs FOIT",
        chapter_id: 2,
        content: P(
          "用了 Google Fonts 或自家字型，載入那瞬間文字會「先看不見、或先用系統字再跳成目標字」，這兩種現象有名字。",
          "<b>FOIT</b>（Flash of Invisible Text）＝字還沒下載完，文字<b>整段空白</b>看不到；<b>FOUT</b>（Flash of Unstyled Text）＝先用備援字顯示、載好再換。多數情況 FOUT 體驗較好（至少讀得到字）。",
          "用 <code>@font-face</code> 的 <code>font-display: swap</code> 就是選 FOUT（先顯示再換），<code>optional</code> 更保守（慢就乾脆不換）。",
          "⚠️ 換字瞬間若字寬差很多，版面會「跳一下」（CLS）。挑「度量接近」的備援字、或用 <code>size-adjust</code> 對齊，能讓那一跳幾乎看不出來。",
        ),
      },
      {
        title: "reflow 和 repaint：為什麼有些改動特別卡",
        chapter_id: 2,
        content: P(
          "同樣是改樣式，有的順、有的整頁卡，差別在你動到的東西讓瀏覽器要重算多少。",
          "<b>reflow（重排）</b>最貴：改到「尺寸／位置」（width、top、加刪元素）會讓瀏覽器重算整片版面。<b>repaint（重繪）</b>次之：只改顏色、背景這種不影響佈局的。最便宜的是只動 <code>transform</code> 和 <code>opacity</code>（合成層、不重排）。",
          "所以動畫盡量用 transform 位移／縮放，別用改 <code>top／left／width</code> 的方式動。",
          "⚠️ 迴圈裡「改一下樣式、馬上讀 <code>offsetHeight／getBoundingClientRect</code>」會逼瀏覽器每次都同步重排（layout thrashing）、超卡。批次處理：先全部讀、再全部寫，別讀寫交錯。",
        ),
      },
      {
        title: "手機版做了 RWD 卻沒作用？先看 viewport meta",
        chapter_id: 2,
        content: P(
          "新手最常見的悲劇：CSS media query 都寫對了，手機上卻像看縮小的電腦版——因為少了那一行 meta。",
          "head 裡一定要有 <code>&lt;meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"&gt;</code>，意思是「用裝置的實際寬度當版面寬度、初始不縮放」，media query 才會照手機寬度作用。",
          "沒有它，手機會假設頁面有 980px 寬再整個縮小塞進螢幕，你的 RWD 全白做。",
          "⚠️ 別為了防手勢縮放而加 <code>maximum-scale=1, user-scalable=no</code>——那會擋掉使用者放大看內容的能力，是無障礙的雷。讓使用者能縮放。",
        ),
      },
      {
        title: "useRef：存值不觸發重畫，還能抓 DOM",
        chapter_id: 8,
        content: P(
          "useRef 有兩個看似無關、其實同源的用途，一起理解最快。",
          "<b>抓 DOM</b>：<code>const inputRef = useRef(null)</code>，掛到 <code>&lt;input ref={inputRef}&gt;</code>，之後 <code>inputRef.current.focus()</code> 直接操作那個真實元素。",
          "<b>存「不需重畫」的值</b>：改 <code>ref.current</code> <b>不會</b>觸發重新渲染（跟 state 相反），適合放計時器 id、前一次的值、不影響畫面的旗標。",
          "⚠️ 別把「該顯示在畫面上的東西」放 ref——改了畫面不會更新。判準：<b>會影響畫面就用 state、只是幕後記個東西才用 ref</b>。",
        ),
      },
      {
        title: "useReducer：狀態變複雜時比 useState 好管",
        chapter_id: 8,
        content: P(
          "一個表單／元件有五六個互相關聯的 state，useState 一堆、更新邏輯散得到處都是。useReducer 把它們收攏。",
          "概念：所有狀態放一包，改狀態要 <code>dispatch({type: \"...\"})</code>，由一個 <code>reducer(state, action)</code> 函式集中決定「收到這動作、狀態怎麼變」。像 Redux 的縮小版、但 React 內建。",
          "好處：更新邏輯集中在一處、好測試、複雜連動（下一步依賴前一步）清楚很多。",
          "⚠️ 別一開始什麼都上 useReducer——簡單的獨立狀態用 useState 更直覺。等到「多個狀態糾纏、更新邏輯變亂」再重構過去，別提早給自己加樣板。",
        ),
      },
      {
        title: "useEffect vs useLayoutEffect：畫面閃一下的救星",
        chapter_id: 8,
        content: P(
          "九成情況用 <code>useEffect</code> 就好。但有種 bug：你在 effect 裡量元素尺寸再調位置，使用者會<b>看到「先錯位、再跳對」</b>閃一下。",
          "差別在時機：<code>useEffect</code> 在瀏覽器<b>畫完之後</b>才跑（不擋畫面）；<code>useLayoutEffect</code> 在<b>畫出來之前</b>同步跑——所以你的量測+修正會在使用者看到前完成，不閃。",
          "用途：讀取 DOM 尺寸／位置後立刻要改版面（tooltip 定位、量高度）才用它。",
          "⚠️ useLayoutEffect 是<b>同步、會擋渲染</b>，放重活會卡畫面，而且它在 SSR（伺服器端）會警告。沒有「閃一下」問題就乖乖用 useEffect，別預設用它。",
        ),
      },
      {
        title: "Portal：把彈窗「傳送」到 body 底下",
        chapter_id: 8,
        content: P(
          "modal／下拉選單被父層的 <code>overflow:hidden</code> 切掉、或被某個 z-index 脈絡壓住——明明程式在這裡，但 DOM 上它不該待在這裡。",
          "React 的 <code>createPortal(children, document.body)</code> 能讓元件「邏輯上還是子元件（拿得到 props、context、事件照冒泡上來），但實際 DOM 掛到 body 底下」，脫離會限制它的父層。",
          "所以彈窗、tooltip、通知這種「要浮在最上層」的東西，用 Portal 掛到 body 最乾淨。",
          "⚠️ Portal 的事件<b>還是照 React 樹冒泡</b>（不是照 DOM 位置），所以點 portal 內部可能觸發你「以為在外面」的 onClick——做「點外面關閉」時要小心別把自己也判成外面。",
        ),
      },
      {
        title: "forwardRef：讓自訂元件也能被 ref 抓到",
        chapter_id: 8,
        content: P(
          "我想對自己包的 <code>&lt;MyInput&gt;</code> 用 ref 去 focus，結果 ref 是 null——因為 ref <b>不像一般 prop</b>，不會自動傳進元件裡。",
          "用 <code>forwardRef</code> 接住並轉交：<code>const MyInput = forwardRef((props, ref) =&gt; &lt;input ref={ref} {...props} /&gt;)</code>，這樣外面的 ref 就接到真正的 input 上了。",
          "常用在做可重用的表單元件、要讓父層能聚焦／捲動／量測子元件時。（註：React 19 起函式元件可直接收 ref 當 prop，不一定要 forwardRef。）",
          "⚠️ 想「開放特定方法」而不是整個 DOM，配 <code>useImperativeHandle</code> 只暴露你要的（如 <code>{ focus, clear }</code>），別讓外面亂摸內部 DOM、破壞封裝。",
        ),
      },
      {
        title: "Error Boundary：一個元件爆掉，別讓整站白畫面",
        chapter_id: 8,
        content: P(
          "React 有個嚇人的預設：<b>渲染時只要一個元件丟錯，整棵樹會卸載、整頁變白</b>。使用者只看到空白，體驗超差。",
          "Error Boundary 是「錯誤的防火牆」：把它包在某區塊外面，那區塊內的渲染錯誤會被它<b>接住</b>、顯示你準備的退路 UI（「這塊出了點問題」），其他部分照常運作。",
          "目前得用 class 元件實作（<code>componentDidCatch</code> ／ <code>getDerivedStateFromError</code>），或用現成的 <code>react-error-boundary</code> 套件。",
          "⚠️ Error Boundary <b>抓不到</b>事件處理函式裡的錯、非同步（setTimeout／fetch）的錯、和 SSR 的錯——那些還是要自己 try／catch。它只接「渲染期間」的錯。",
        ),
      },
      {
        title: "Suspense：把「載入中」畫面抽出來統一管",
        chapter_id: 8,
        content: P(
          "以前每個會抓資料／延遲載入的元件，我都自己寫一份 <code>if (loading) return &lt;Spinner/&gt;</code>，到處重複。",
          "<code>&lt;Suspense fallback={&lt;Spinner/&gt;}&gt;</code> 是個「邊界」：只要裡面有元件還在「等」（lazy 載入的元件、或支援 Suspense 的資料源），就<b>自動</b>顯示 fallback，好了再換成真內容。",
          "配 <code>lazy(() =&gt; import(...))</code> 做程式碼分割、或搭配框架的資料抓取，載入狀態集中在邊界處理、元件本身乾淨。",
          "⚠️ Suspense 會顯示「最近一層」的 fallback。邊界包太外面，一個小東西在載會讓一大片變 spinner；包太細又到處是轉圈。依「使用者能接受哪塊一起等」來切邊界。",
        ),
      },
      {
        title: "能算出來的別另存 state：衍生值就當場算",
        chapter_id: 8,
        content: P(
          "新手常見錯誤：有了 <code>items</code> 這個 state，又另外開一個 <code>total</code> state 存總價、每次改 items 都要記得同步更新 total——遲早忘記、兩邊對不上。",
          "原則：<b>能從現有 state 算出來的東西，不要另存一份</b>。渲染時當場算就好：<code>const total = items.reduce(...)</code>，永遠正確、少一個要維護的狀態。",
          "只有「算起來真的很貴、又量測出有效能問題」時，才用 <code>useMemo</code> 把結果快取起來。",
          "⚠️ 同一份資料存兩處＝遲早不同步（single source of truth 被打破）。看到「A 改了要記得改 B」的程式碼，八成 B 該刪掉、改成從 A 算。",
        ),
      },
      {
        title: "state 放太上面反而卡：能放近一點就放近一點",
        chapter_id: 8,
        content: P(
          "「lift state up」被教得很兇，結果我反射性把所有 state 全塞最上層元件——一個小 input 打字，<b>整棵樹跟著重畫</b>，越大越卡。",
          "反向原則叫 colocation：<b>狀態放在「真正用到它的地方」，越近越好</b>。只有這個表單自己用的狀態，就放這個表單裡，別提到 App 頂層。",
          "只有「多個元件真的要共用」時才往上提到它們的共同父層，提到剛好夠用的高度就停。",
          "⚠️ state 位置越高、重畫範圍越大、也越難維護。先問「還有誰需要這個狀態？」——沒有別人需要，就留在原地，別為了「統一管理」硬往上搬。",
        ),
      },
      {
        title: "事件委派：一個監聽器管一整串（含動態新增的）",
        chapter_id: 4,
        content: P(
          "一個清單有 100 個項目，我以前每個都 <code>addEventListener</code>——不只囉唆，之後「動態新增」的項目還沒綁到、點了沒反應。",
          "利用冒泡：只在<b>父容器</b>裝一個監聽器，點到哪個子項，事件會冒泡上來，用 <code>e.target.closest(\".item\")</code> 判斷是誰被點。這叫事件委派。",
          "好處：監聽器數量從 N 個變 1 個（省記憶體）、而且<b>未來新增的子項自動也能用</b>，不用重綁。",
          "⚠️ 用 <code>e.target.closest(選擇器)</code> 別直接用 <code>e.target</code>——使用者可能點到子項裡面的圖示／文字，target 是那個小東西、不是整個項目。closest 幫你往上找到對的那層。",
        ),
      },
      {
        title: "算 specificity：用 (a,b,c) 三個數字比大小",
        chapter_id: 2,
        content: P(
          "「為什麼這條規則沒生效」十次有八次是被更高優先級蓋掉。與其猜，不如學會<b>算分</b>。",
          "把選擇器拆成三欄 <b>(id, class, 標籤)</b>：id 算一個 a、class／屬性／偽類算一個 b、標籤／偽元素算一個 c。<code>#nav .item a</code> = (1,1,1)、<code>.item a</code> = (0,1,1)。<b>先比 a、再比 b、最後比 c</b>，前面大的直接贏。",
          "同分時「後寫的贏」；行內 <code>style</code> 比任何選擇器都高；<code>!important</code> 再蓋過一切（最後手段）。",
          "⚠️ 別靠疊 class 或加 id 硬拉高分數來覆蓋——會越滾越難維護。DevTools 的 Styles 面板會把「被劃掉的規則」顯示出來，直接看誰蓋掉誰，比心算快。",
        ),
      },
      {
        title: "sticky 沒黏住？照這張清單一個個排除",
        chapter_id: 2,
        content: P(
          "<code>position: sticky</code> 是我最常「寫對了卻不動」的東西。它不報錯、就是默默不黏，所以要有排查順序。",
          "① <b>沒設 top/bottom</b>：sticky 一定要給臨界值（<code>top: 0</code>），不然它不知道黏在哪。② <b>祖先有 overflow</b>：任何父層 <code>overflow: hidden／auto／scroll</code> 都會讓它改黏在那個容器裡、看起來像沒黏。",
          "③ <b>父容器高度不夠</b>：sticky 只能在「父容器範圍內」黏，父層跟它一樣高就沒有可黏的空間。④ 父層是 <code>flex／grid</code> 時子項高度行為不同，也可能影響。",
          "⚠️ 最陰的是那個 <b>overflow</b>——常常是很上面某個祖先為了別的目的設了 <code>overflow:hidden</code>，你在下面怎麼調都沒用。從 sticky 元素往上一層層檢查每個祖先的 overflow，兇手通常在那。",
        ),
      },
      {
        title: "先有這張地圖：HTML / CSS / JS 各幹嘛",
        chapter_id: 1,
        content: P(
          "學前端前先記住這個，後面全部都好懂：HTML 是「內容與結構」（有什麼）、CSS 是「長相」（好不好看）、JS 是「行為」（會不會動）。",
          "DOM 是什麼？瀏覽器讀完 HTML 後，在記憶體裡把它變成一棵「節點樹」，這棵就是 DOM。你畫面上看到的都是 DOM 上的節點。",
          "所以「互動」的本質就是：使用者做動作 → JS 抓 DOM、改內容或樣式 → 畫面跟著變。",
          "⚠️ 我卡過的低級雷：改了檔畫面沒變——沒存檔、沒重整、或改到快取。先確認你改的是「正在看的那份」。",
        ),
      },
      {
        title: "別整頁 div：語意標籤讓大家看懂",
        chapter_id: 1,
        content: P(
          "我以前整頁 <code>&lt;div&gt;</code>，能動但回頭自己都看不懂。用對標籤（語意）差很多。",
          "版面骨架：<code>&lt;header&gt; &lt;nav&gt; &lt;main&gt; &lt;section&gt; &lt;article&gt; &lt;footer&gt;</code>，一眼看懂哪塊是幹嘛的。",
          "表單小技巧：<code>&lt;label for=\"email\"&gt;</code> 的 for 要等於 input 的 id，這樣點文字也能選欄位，手機超好按。",
          "圖片一定給 <code>alt</code>：圖壞掉時的替代文字、也是無障礙和 SEO 讀的。",
          "⚠️ 全 div 不是不能動，是無障礙差、SEO 差、維護痛。能語意就語意。",
        ),
      },
      {
        title: "排版兩大工具：Flex 管一排、Grid 管棋盤",
        chapter_id: 2,
        content: P(
          "排版一直亂試，是因為沒搞懂這兩個各自解決什麼。",
          "一排東西怎麼排/置中/間距 → Flexbox。經典置中 <code>display:flex; justify-content:center; align-items:center;</code>。記法：justify 管主軸、align 管交叉軸。",
          "要切整齊格子（卡片牆、相簿）→ Grid：<code>display:grid; grid-template-columns:repeat(3,1fr); gap:12px;</code>。",
          "一句話選：一條線就 Flex、二維表格就 Grid。",
          "⚠️ 沒設 <code>box-sizing:border-box</code> 時，加 padding 會把寬度撐爆版面。專案第一行常放 <code>*{box-sizing:border-box}</code>。",
        ),
      },
      {
        title: "RWD：手機優先，往大螢幕加",
        chapter_id: 2,
        content: P(
          "同一個站在手機/平板/電腦都好看＝響應式（RWD）。",
          "手機優先：先把手機版做好，再往上加 <code>@media (min-width:768px){ ... }</code>（螢幕 768 以上才套）。",
          "圖片別溢出：<code>img{max-width:100%; height:auto;}</code>。",
          "斷點不用硬背，版面在哪裡開始擠、就在那裡加。常用 768（平板）、1024（桌機）。",
          "⚠️ 我以前只在電腦測、上手機整個爆版。開 DevTools 手機模式邊做邊看。",
        ),
      },
      {
        title: "JavaScript 常用武器（含 async 白話）",
        chapter_id: 4,
        content: P(
          "處理一串資料的三寶：<code>map</code>（每個轉換）、<code>filter</code>（只留符合的）、<code>reduce</code>（收斂成一個結果，像加總）；找一個用 <code>find</code>。",
          "解構省很多字：<code>const {name, age} = user;</code>；展開複製/合併 <code>[...arr]</code>。",
          "async 在解決什麼？跟伺服器要資料要「等」，不能卡住畫面。<code>await</code> 就是「等這件事做完再往下」：<code>const data = await (await fetch(url)).json();</code>。",
          "⚠️ 忘了 await，你拿到的是「還沒完成的 Promise」不是資料，印出來 <code>[object Promise]</code> 就是這個。",
        ),
      },
      {
        title: "React 一句話：畫面 = 狀態的函式",
        chapter_id: 8,
        content: P(
          "React 最重要就這句：你不是自己去改畫面，而是改「狀態」，React 幫你重畫。",
          "<code>const [count, setCount] = useState(0)</code>——更新一定要用 <code>setCount</code>，直接 <code>count = 1</code> React 不會知道要重畫。",
          "<code>useEffect(fn, [deps])</code>：deps 裡的值變了才重跑（抓資料、訂閱、計時器）。",
          "用 map 畫清單，每個要有獨一無二的 <code>key</code>。",
          "⚠️ 我踩過：useEffect 裡改了狀態、又把那狀態放進依賴陣列，無限重跑。先想「這效果什麼時候該重跑」再填依賴。",
        ),
      },
      {
        title: "串 API：前端怎麼跟後端要資料",
        chapter_id: 4,
        content: P(
          "心智模型：前端「發問（request）」、後端「回答（response）」，fetch 就是發問工具。",
          "GET：<code>const res = await fetch(url); const data = await res.json();</code>。",
          "POST 要講明送 JSON：<code>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})</code>。",
          "三種狀態都要處理：loading / 成功 / 失敗，至少 <code>if(!res.ok)</code> 再往下用。",
          "⚠️ 本機開發常撞 CORS 被擋——那是後端要允許你的來源，不是前端寫錯；看 Console 紅字就知道。",
        ),
      },
      {
        title: "瀏覽器 DevTools 三招（前端 debug 神器）",
        chapter_id: 4,
        content: P(
          "按 F12 打開，先會這三個分頁就夠：",
          "Elements：看畫面對應的 HTML/CSS，可以當場改樣式試效果，重整就還原、很安全。",
          "Console：程式紅字都在這；也能直接打 JS 試、用 <code>console.log()</code> 印。",
          "Network：看每個 API 打去哪、回什麼、狀態碼多少。API 沒資料先來這看是「沒送出」還是「回錯」。",
          "⚠️ 畫面沒更新先想是不是快取——DevTools 開著可勾 Disable cache，或用無痕測。",
        ),
      },
      {
        title: "盒模型：為什麼加了 padding 版面就爆",
        chapter_id: 2,
        content: P(
          "剛學 CSS 我最常「加個 padding 結果整個跑版」，後來懂盒模型就好了。",
          "一個元素的實際寬度 = 內容 + padding + border。預設情況你設 <code>width:200px</code> 再加 <code>padding:20px</code>，它其實佔 240px，於是就撐爆了。",
          "解法一行：<code>*{ box-sizing:border-box; }</code>——改成「padding/border 算進 width 裡面」，設 200 就是 200，直覺多了。",
          "margin（外距）是「和別人的距離」、padding（內距）是「內容和自己邊框的距離」，別搞混。",
          "⚠️ 兩個上下相鄰元素的 margin 會「合併」（取大的那個、不是相加），這叫 margin collapse，版面對不齊時想到它。",
        ),
      },
      {
        title: "position 到底怎麼運作（relative / absolute / fixed / sticky）",
        chapter_id: 2,
        content: P(
          "定位是切版第二個大魔王。白話講四種：",
          "<code>relative</code>：以「自己原本的位置」微調，位子還佔著。常拿來當 absolute 的定位基準。",
          "<code>absolute</code>：飛出正常流、以「最近一個有 position 的祖先」為原點。父層記得設 <code>position:relative</code>，不然它會亂飄到整頁。",
          "<code>fixed</code>：釘在「螢幕」上、捲動不跟走（做回到頂端按鈕、固定 header）。",
          "<code>sticky</code>：平常正常、捲到臨界點就黏住（<code>position:sticky; top:0</code>）。",
          "⚠️ absolute 找不到定位基準就會以整個頁面算，跑到你意想不到的地方——先檢查父層有沒有 relative。",
        ),
      },
      {
        title: "事件處理與冒泡：一個監聽器管一整串",
        chapter_id: 4,
        content: P(
          "點按鈕要做事：<code>btn.addEventListener('click', fn)</code>。事件物件 <code>e</code> 裡有一堆資訊，<code>e.target</code> 是被點的元素。",
          "冒泡（bubbling）：你點子元素，事件會一路往父層傳。善用這點做「事件委派」——在父層裝一個監聽器，就能管裡面所有子元素（尤其動態新增的），不用每個都裝。",
          "擋掉預設行為（表單送出、連結跳頁）用 <code>e.preventDefault()</code>；不想再往上冒泡用 <code>e.stopPropagation()</code>。",
          "⚠️ 迴圈裡綁事件、又直接用迴圈變數，常拿到最後一個值。用事件委派或 <code>let</code> 區塊作用域解決。",
        ),
      },
      {
        title: "localStorage：把資料存在瀏覽器",
        chapter_id: 4,
        content: P(
          "想「重整後還記得」使用者的設定/草稿，最簡單用 localStorage（存在這台瀏覽器、關掉也還在）。",
          "存 <code>localStorage.setItem('key', 值)</code>、讀 <code>localStorage.getItem('key')</code>、刪 <code>removeItem</code>。",
          "只能存字串！物件要 <code>JSON.stringify</code> 存、<code>JSON.parse</code> 讀。",
          "sessionStorage 用法一樣，但「關掉分頁就清掉」，適合暫存。",
          "⚠️ 別存密碼/token 這類機密（同網站的 JS 都讀得到）；也別存太大，有容量上限（約 5MB）。",
        ),
      },
      {
        title: "無障礙 a11y：順手做、對所有人好",
        chapter_id: 3,
        content: P(
          "無障礙不是額外功夫，是「本來就該做對」。幾個低成本高回報的：",
          "圖片給 <code>alt</code>、按鈕用真正的 <code>&lt;button&gt;</code>（不要用 div 假裝，鍵盤和讀螢幕器才認得）。",
          "表單欄位配 <code>&lt;label&gt;</code>；只有圖示的按鈕加 <code>aria-label</code> 說明它是幹嘛的。",
          "顏色對比要夠（淺灰字配白底看不清）；別只靠顏色傳達資訊（紅=錯，也給文字/圖示）。",
          "⚠️ 能用鍵盤 Tab 走完整個流程嗎？試一次，很多互動元件會卡在這關。",
        ),
      },
      {
        title: "CSS 選擇器與優先級：為什麼我的樣式沒生效",
        chapter_id: 2,
        content: P(
          "「明明寫了樣式卻沒變」十之八九是<b>優先級（specificity）</b>被別的規則壓過去了。",
          "由弱到強大致：標籤(<code>div</code>) < class(<code>.box</code>) < id(<code>#main</code>) < 行內 style < <code>!important</code>。越具體的贏。",
          "同分時「後面寫的」贏，所以引入 CSS 的順序也有影響。",
          "查法：DevTools 的 Styles 面板會把「被劃掉的規則」顯示出來，一眼看出誰蓋掉誰。",
          "⚠️ 別動不動用 <code>!important</code> 硬蓋——它會讓之後更難覆蓋、越滾越亂。先想能不能用更精準的選擇器。",
        ),
      },
      {
        title: "CSS 單位：px / rem / em / % / vw vh 怎麼選",
        chapter_id: 2,
        content: P(
          "單位選錯，RWD 跟無障礙都會出問題。給我自己的原則：",
          "<code>px</code>：固定死值（邊框 1px、小圓角）。<code>rem</code>：相對「網頁根字級」，字體、間距用它，使用者調大字級時整體會跟著放大（對無障礙友善）。",
          "<code>em</code>：相對「自己的字級」，做「跟著文字比例縮放」的元件好用，但巢狀會層層相乘、容易亂。",
          "<code>%</code>：相對父元素（寬度常用）。<code>vw</code>/<code>vh</code>：螢幕寬/高的百分比（滿版區塊、hero 高度）。",
          "⚠️ 字體別用 px 寫死——用 rem，使用者放大字級才有效。",
        ),
      },
      {
        title: "CSS 變數與深色模式：一處改、全站變",
        chapter_id: 2,
        content: P(
          "CSS 變數（custom properties）讓你把顏色、間距集中管理，改一個地方全站跟著變。",
          "定義在 <code>:root{ --accent: #22c55e; }</code>，用的時候 <code>color: var(--accent);</code>。",
          "深色模式超好做：在 <code>@media (prefers-color-scheme: dark)</code> 或某個 <code>[data-theme=\"dark\"]</code> 底下，把同一組變數換值，畫面整套就變了、不用改每個元件。",
          "⚠️ 顏色別散落在各元件寫死；集中成變數，改主題、調品牌色才不會漏東漏西。",
        ),
      },
      {
        title: "transition 與 animation：讓介面順順地動",
        chapter_id: 2,
        content: P(
          "介面「瞬間跳」很生硬，加一點過渡就質感大升。",
          "<code>transition</code>：狀態改變時「補間」。<code>button{ transition: all .2s; }</code>，之後 hover 變色/放大就會平滑過去。",
          "<code>@keyframes</code> + <code>animation</code>：自訂多階段動畫（loading 轉圈、淡入）。",
          "只動 <code>transform</code>（位移/縮放）和 <code>opacity</code> 最順——它們不會觸發重新排版，效能好。",
          "⚠️ 動畫別太久太多，會拖慢感受、也可能讓人不舒服。尊重 <code>prefers-reduced-motion</code>（有人會暈）。",
        ),
      },
      {
        title: "z-index 與堆疊脈絡：彈窗被蓋住怎麼辦",
        chapter_id: 2,
        content: P(
          "「我 z-index 設 9999 了怎麼還是被蓋住」是經典坑。",
          "關鍵：z-index 只在「同一個堆疊脈絡（stacking context）」裡比大小。父層一旦有 <code>transform</code>、<code>opacity < 1</code>、<code>position + z-index</code> 等，就會開一個新脈絡，子元素的 z-index 再大也跳不出這個父層的層級。",
          "所以彈窗/下拉常見解法：把它<b>放到 body 底下</b>（portal）、脫離會限制它的父層。",
          "⚠️ z-index 要生效，元素通常得有 <code>position</code>（relative/absolute/fixed）。狂加大數字沒用時，先看是不是卡在某個父層的脈絡裡。",
        ),
      },
      {
        title: "表單：受控元件與基本驗證",
        chapter_id: 8,
        content: P(
          "表單是前端最常做、也最多細節的地方。",
          "受控元件（React）：input 的值綁 state、<code>onChange</code> 更新——這樣「畫面的值」永遠等於「你資料裡的值」，好驗證好送出。",
          "先用瀏覽器內建驗證省力：<code>required</code>、<code>type=\"email\"</code>、<code>minlength</code>，再補程式邏輯驗證。",
          "送出一定要 <code>e.preventDefault()</code>（不然頁面會整個重整）；送出中把按鈕 disable、避免連點兩次送兩筆。",
          "⚠️ 前端驗證只是體驗好——後端一定要再驗一次，前端的檢查使用者繞得過。",
        ),
      },
      {
        title: "this 是什麼：箭頭函式差在哪",
        chapter_id: 4,
        content: P(
          "JS 的 <code>this</code> 讓很多人抓狂，因為它「看你怎麼呼叫」而不是「在哪定義」。",
          "一般函式：<code>this</code> 取決於呼叫方式，當 callback 傳出去常常就「丟失」變成 undefined。",
          "箭頭函式：<b>沒有自己的 this</b>，會沿用外層的——所以 callback、event handler 用箭頭函式最省事，不會突然拿到奇怪的 this。",
          "React 元件裡幾乎都用箭頭函式，就是為了少踩這個坑。",
          "⚠️ 物件的「方法」如果用箭頭函式定義，this 不會指向那個物件——需要指向自己的方法用一般函式寫。",
        ),
      },
      {
        title: "模組 import / export：前端怎麼拆檔",
        chapter_id: 4,
        content: P(
          "現代前端（ES Modules）跟 Python 的 import 概念很像，一個檔匯出、另一個匯入。",
          "具名匯出：<code>export function add(){}</code> → <code>import { add } from './utils'</code>（名字要對）。",
          "預設匯出：<code>export default Button</code> → <code>import Button from './Button'</code>（名字自己取）。",
          "一個檔一個預設匯出、其餘用具名；路徑相對用 <code>./</code>、<code>../</code>。",
          "⚠️ 具名匯入的大括號別漏、名字要一模一樣；預設匯入不用大括號。搞混這兩個是最常見的 import 錯誤。",
        ),
      },
      {
        title: "圖片與效能：別讓大圖拖垮頁面",
        chapter_id: 1,
        content: P(
          "圖片常是頁面最肥的東西，幾招就能快很多。",
          "尺寸別亂塞：需要 400px 寬就別放 4000px 原圖，先壓縮/裁切。用對格式（照片 jpg/webp、圖示 svg）。",
          "延遲載入：<code>&lt;img loading=\"lazy\"&gt;</code>，畫面外的圖等捲到再載。",
          "給 <code>width</code>/<code>height</code>（或固定容器）避免圖載入時版面「跳一下」（CLS）。",
          "⚠️ 首屏最大那張圖別 lazy（會延後顯示、感覺變慢）；反而要優先載。",
        ),
      },
      {
        title: "debounce / throttle：搜尋框別狂打 API",
        chapter_id: 4,
        content: P(
          "使用者打字很快，每個字都打一次 API 會炸。這兩招節流。",
          "<b>debounce（防抖）</b>：等「停手一下下」才觸發。搜尋輸入最適合——停打 300ms 才送查詢，中間狂打不送。",
          "<b>throttle（節流）</b>：固定「每隔一段時間最多一次」。捲動、視窗縮放這種連續事件適合。",
          "React 裡常配合 <code>useEffect</code> 的 cleanup 或現成 hook 實作。",
          "⚠️ 沒做這個，搜尋/自動完成會送出大量請求，前端卡、後端也被打爆。",
        ),
      },
      {
        title: "狀態放哪：什麼時候把 state 往上提",
        chapter_id: 8,
        content: P(
          "React 新手常煩惱「這個 state 要放哪個元件」。原則很簡單。",
          "state 放在「需要用到它的元件們，最近的共同父層」。只有自己用 → 放自己；兄弟元件要共用 → 提到它們的父層（lift state up），再用 props 傳下去。",
          "全站到處都要（登入狀態、主題）→ 才用 Context 或狀態管理工具，別一開始就上重工具。",
          "⚠️ 同一份資料別在兩個地方各存一份（會不同步）——存一處、其他人用 props 拿。",
        ),
      },
      {
        title: "破版救星：overflow 與 min-width:0",
        chapter_id: 2,
        content: P(
          "手機版「有東西被撐出去、整頁能左右滑」是最常見的破版，幾個固定招數。",
          "長內容（程式碼、長網址、表格）用 <code>overflow-x: auto</code> 讓它「自己那塊」可捲，而不是把整頁撐開。",
          "flex/grid 子元素文字不換行撐爆時，加 <code>min-width: 0</code>（flex 子項預設 min-width 是內容寬、會頂破）。",
          "圖片一律 <code>max-width: 100%</code>；容器該收的地方加 <code>overflow: hidden</code>。",
          "⚠️ 檢查破版：DevTools 開手機寬度，看 body 有沒有水平捲軸——有就是有東西超出，順著找那個元素。",
        ),
      },
      {
        title: "useState 進階：函式更新與批次",
        chapter_id: 8,
        content: P(
          "用久 useState 會遇到「連續更新拿到舊值」的坑，懂這兩點就過關。",
          "<b>用函式更新</b>：更新要「根據前一個值」時，用 <code>setCount(c =&gt; c + 1)</code> 而不是 <code>setCount(count + 1)</code>——後者可能拿到還沒更新的舊 count。",
          "<b>批次更新</b>：React 會把同一個事件裡的多次 setState 合併、一次重畫（省效能）。所以同一函式裡連 <code>setCount(count+1)</code> 三次只會 +1；要 +3 就用函式更新版。",
          "⚠️ state 別直接改（<code>arr.push(x)</code>）——要給「新的」：<code>setArr([...arr, x])</code>，React 靠「換了新物件」才知道要重畫。",
        ),
      },
      {
        title: "useEffect 進階：依賴、cleanup、什麼時候跑",
        chapter_id: 8,
        content: P(
          "useEffect 是最多人踩雷的 hook，抓住三件事就穩。",
          "<b>依賴陣列</b>決定何時重跑：<code>[]</code> 只跑一次（掛載時）、<code>[x]</code> x 變了才跑、不給陣列每次都跑。放進去的值要「effect 裡有用到的」。",
          "<b>cleanup</b>：return 一個函式做收尾（清計時器、取消訂閱、abort 請求）——下次重跑前、或元件卸載時會呼叫。",
          "⚠️ 兩大雷：① 依賴放不齊 → 拿到舊值（stale）；② effect 裡改了自己依賴的 state 又沒條件 → 無限迴圈。先想清楚「這效果什麼時候該重跑」。",
        ),
      },
      {
        title: "自訂 hook：把重複邏輯抽出來",
        chapter_id: 72,
        content: P(
          "好幾個元件都在做「抓資料 + loading + error」？抽成自訂 hook 共用。",
          "規則就兩條：函式名以 <code>use</code> 開頭、裡面可以用其他 hook。例：<code>function useUser(id){ const [user,setUser]=useState(); useEffect(...); return user; }</code>。",
          "元件裡 <code>const user = useUser(id)</code> 一行搞定，重複邏輯集中在一處、好維護好測。",
          "⚠️ hook 只能在「元件或其他 hook 的最上層」呼叫——不能放在 if/迴圈裡（順序要固定，React 靠順序記狀態）。",
        ),
      },
      {
        title: "元件組合：props 與 children",
        chapter_id: 8,
        content: P(
          "React 的精神是「把 UI 拆成小積木、再拼起來」。",
          "<b>props</b>：父傳給子的資料/設定，子唯讀（不能改 props）。像函式參數。",
          "<b>children</b>：包在元件標籤中間的東西，用 <code>props.children</code> 拿到——做 Card、Modal、Layout 這種「殼」超好用：<code>&lt;Card&gt;裡面任何內容&lt;/Card&gt;</code>。",
          "重複的 UI 抽成元件、用 props 客製差異，別複製貼上一堆相似的 JSX。",
          "⚠️ props 往下傳太多層（prop drilling）很煩時，才考慮 Context——別一開始就上。",
        ),
      },
      {
        title: "清單渲染與 key：為什麼一定要 key",
        chapter_id: 8,
        content: P(
          "用 <code>map</code> 畫一串元素時，每個要有獨一無二的 <code>key</code>，這不是可有可無。",
          "React 靠 key 認出「誰是誰」，才能在資料變動時只更新變的、不整串重畫。",
          "key 要用「穩定且唯一」的值——通常是資料的 <code>id</code>。",
          "⚠️ <b>別用陣列 index 當 key</b>（除非清單永不增刪排序）——插入/刪除時 index 會錯位，導致 input 值錯亂、動畫跳掉這類詭異 bug。",
        ),
      },
      {
        title: "受控 vs 非受控 input：兩種表單寫法",
        chapter_id: 8,
        content: P(
          "React 的 input 有兩派，先搞懂差別再選。",
          "<b>受控</b>：值綁 state（<code>value={x} onChange={...}</code>），畫面永遠等於資料——好即時驗證、好連動，是主流。",
          "<b>非受控</b>：值交給 DOM 自己管，要用時用 <code>ref</code> 去讀（<code>ref.current.value</code>）——程式碼少、適合簡單表單或整合非 React 的東西。",
          "⚠️ 同一個 input 別一下給 <code>value</code> 一下不給——React 會警告「受控/非受控切換」。要嘛全程受控（給空字串當初始）、要嘛全程非受控。",
        ),
      },
      {
        title: "Context：跨層傳值，但別濫用",
        chapter_id: 72,
        content: P(
          "登入狀態、主題、語言這種「很多層、很多元件都要用」的東西，用 props 一層層傳很痛苦，Context 解決這個。",
          "三步：<code>createContext</code> 建、外層 <code>&lt;XProvider&gt;</code> 包起來提供值、內層 <code>useContext(X)</code> 直接拿。",
          "適合：全域、少變動的東西（auth、theme、i18n）。",
          "⚠️ Context 的值一變，「所有用到它的元件」都會重畫——別把「常變動的大物件」全塞一個 Context，會拖效能。頻繁變動的狀態用別的方案。",
        ),
      },
      {
        title: "Flexbox 常見版型速成",
        chapter_id: 2,
        content: P(
          "把最常用的幾種 flex 版型記成「口訣」，切版超快。",
          "水平置中一個東西：父層 <code>display:flex; justify-content:center;</code>。垂直也置中再加 <code>align-items:center;</code>。",
          "兩端對齊（logo 左、選單右）：<code>justify-content:space-between;</code>。",
          "一排放不下自動換行：<code>flex-wrap:wrap;</code> + 子項 <code>flex:1 1 200px</code>（最小 200、能長能縮）。",
          "⚠️ 子項被內容頂破不縮，加 <code>min-width:0</code>；等分不平均，檢查是不是有子項設了固定寬。",
        ),
      },
      {
        title: "CSS Grid 進階：用 template-areas 排版",
        chapter_id: 2,
        content: P(
          "整頁佈局（header/側欄/內容/footer）用 Grid 的「命名區域」最直覺。",
          "父層畫地圖：<code>grid-template-areas: \"header header\" \"nav main\" \"footer footer\";</code> 再定義欄寬列高。",
          "子項認位置：<code>.header{ grid-area: header; }</code>——像在填字，一眼看懂版面。",
          "RWD 超好改：在 media query 裡「重畫一張 areas 地圖」，整個版面就換佈局，不用動 HTML。",
          "⚠️ areas 裡每一列的欄數要一致（用 <code>.</code> 佔位空格）；名字對不上會整個失效。",
        ),
      },
      {
        title: "sticky header 與捲動行為",
        chapter_id: 2,
        content: P(
          "「捲動時頂部導覽黏住」用 sticky 最簡單，但有幾個常見卡點。",
          "作法：<code>position:sticky; top:0; z-index:10;</code>——平常正常排，捲到頂就黏住。",
          "要生效：sticky 元素的「捲動祖先」不能有 <code>overflow:hidden/auto</code>（會把它關在裡面黏不住）；也要有 <code>top</code> 值。",
          "錨點被 header 蓋住：用 <code>scroll-margin-top</code> 給目標留出 header 高度。",
          "⚠️ 「我 sticky 沒黏住」十之八九是某個父層有 overflow 或高度不夠——順著父層檢查。",
        ),
      },
      {
        title: "響應式圖片：object-fit 與 aspect-ratio",
        chapter_id: 2,
        content: P(
          "圖片在不同尺寸容器裡「不變形、不破版」的幾招。",
          "<code>object-fit:cover</code>：填滿容器、超出裁掉（不變形），做封面圖、頭像最常用；<code>contain</code> 是完整顯示、留白。",
          "<code>aspect-ratio:16/9</code>：固定長寬比，容器寬度變、高度自動跟著算——避免圖載入前後版面跳動。",
          "圖片基本永遠加 <code>max-width:100%; height:auto;</code> 別溢出。",
          "⚠️ 用 <code>object-fit</code> 前圖片要有明確的寬高或 aspect-ratio，不然它不知道要 fit 進多大的框。",
        ),
      },
      {
        title: "CSS 偽類：:hover :focus :nth-child :not",
        chapter_id: 2,
        content: P(
          "偽類讓你「依狀態/位置」套樣式，不用加一堆 class。",
          "狀態：<code>:hover</code> 滑過、<code>:focus</code> 被聚焦（鍵盤/點擊）、<code>:disabled</code>、<code>:checked</code>。",
          "位置：<code>:first-child</code>、<code>:last-child</code>、<code>:nth-child(2n)</code> 偶數列（斑馬紋超好用）。",
          "排除：<code>:not(.active)</code> 除了 active 的都套。",
          "⚠️ 無障礙：互動元素一定也要有 <code>:focus</code> 樣式（很多人只做 hover），鍵盤使用者才看得到「現在選到哪」。別 <code>outline:none</code> 卻不補替代焦點樣式。",
        ),
      },
      {
        title: "localStorage vs cookie vs sessionStorage",
        chapter_id: 4,
        content: P(
          "三種瀏覽器存資料的方式，用途不一樣。",
          "<b>localStorage</b>：存瀏覽器、關掉還在、只給前端 JS 用。適合：主題、草稿、非機密偏好。約 5MB。",
          "<b>sessionStorage</b>：一樣但「關掉分頁就清」。適合：一次性暫存。",
          "<b>cookie</b>：會「自動跟著每個請求送到伺服器」。適合：登入 token（設 <code>HttpOnly</code> 讓 JS 讀不到、更安全）。但每次請求都帶、別塞大東西。",
          "⚠️ 登入憑證別放 localStorage（JS 讀得到＝XSS 能偷）——放 HttpOnly cookie。localStorage 只放不敏感的東西。",
        ),
      },
      {
        title: "載入 / 錯誤 / 空：三種狀態都要畫",
        chapter_id: 8,
        content: P(
          "抓資料的畫面，新手常只做「成功」那一種，其他三種一發生就白畫面或壞掉。",
          "至少處理：<b>loading</b>（骨架/轉圈）、<b>error</b>（友善訊息 + 重試按鈕）、<b>empty</b>（「還沒有資料」的空狀態）、成功。",
          "順序：先判 loading → 再判 error → 再判 empty → 最後才畫資料。",
          "⚠️ 別假設「一定有資料」——<code>data.map</code> 在 data 還是 undefined（載入中）時會直接爆。先給預設 <code>data ?? []</code> 或先擋 loading。",
        ),
      },
      {
        title: "memo / useMemo / useCallback：別過早優化",
        chapter_id: 72,
        content: P(
          "這三個是「避免不必要的重算/重畫」的效能工具，但先講重點：<b>大部分時候你不需要它們</b>。",
          "<code>useMemo</code> 記住「算很久的結果」、<code>useCallback</code> 記住「函式本體」、<code>React.memo</code> 讓元件「props 沒變就不重畫」。",
          "什麼時候才用：真的量出來卡（很大的清單、很重的計算、傳給 memo 子元件的函式）再加，對症下藥。",
          "⚠️ 到處亂包 useMemo/useCallback 反而增加負擔、程式更難讀——先寫簡單版、真的慢再優化。過早優化是萬惡之源。",
        ),
      },
      {
        title: "TypeScript 是什麼、型別註記入門",
        chapter_id: 5,
        content: P(
          "TypeScript（TS）＝「加了型別的 JavaScript」，最後還是編譯成 JS 跑。好處是「錯誤在你打字時就被抓到」，不用等執行才爆。",
          "基本註記：<code>let age: number = 18;</code>、<code>function greet(name: string): string {...}</code>——參數、回傳都能標型別。",
          "常用型別：<code>string / number / boolean / string[]（陣列）/ {name: string}（物件）</code>。",
          "編輯器會即時提示、你傳錯型別當場紅線，重構時超有安全感。",
          "⚠️ 別到處用 <code>any</code>（等於關掉型別檢查、失去 TS 的意義）；不確定型別時想辦法標對，或用 <code>unknown</code> 逼自己先檢查。",
        ),
      },
      {
        title: "interface 與 type：TS 描述物件的形狀",
        chapter_id: 5,
        content: P(
          "要描述「一個物件長什麼樣」，兩種寫法：",
          "<code>interface User { name: string; age: number; }</code> 或 <code>type User = { name: string; age: number; }</code>——日常兩者幾乎可互換。",
          "習慣：物件/類別的形狀用 <code>interface</code>（可被 extends、可被 merge）；聯合型別、別名、複雜組合用 <code>type</code>（如 <code>type Status = \"on\" | \"off\"</code>）。",
          "可選欄位加 <code>?</code>：<code>age?: number</code>（可有可無）。",
          "⚠️ 別糾結選哪個——團隊一致就好。先把常用的資料形狀定義出來，函式簽名接上，型別就會幫你擋掉一堆低級錯。",
        ),
      },
      {
        title: "泛型 generics：可重用又保留型別",
        chapter_id: 5,
        content: P(
          "看到 <code>Array&lt;string&gt;</code>、<code>useState&lt;number&gt;()</code> 那個角括號就是泛型。它讓函式/型別「先不指定型別、用的時候才代入」。",
          "例：<code>function first&lt;T&gt;(arr: T[]): T { return arr[0]; }</code>——傳字串陣列回字串、傳數字陣列回數字，型別自動跟著走、不用寫很多份。",
          "用途：容器（清單、Map）、API 回傳包裝、可重用工具函式。",
          "⚠️ 泛型是「進階但很值得」——一開始會用內建的（Array、Promise、useState 帶型別）就好，自己寫泛型等有「同一段邏輯要吃很多種型別」時再學。",
        ),
      },
      {
        title: "TS 常用招：union / optional / as",
        chapter_id: 5,
        content: P(
          "幾個天天會用到的 TS 小技巧。",
          "<b>聯合型別 |</b>：<code>type Id = string | number</code>（可以是其中一種）；<code>status: \"pending\" | \"done\"</code> 限定幾個字面值。",
          "<b>可選與預設</b>：參數 <code>name?: string</code>、可空 <code>string | null</code>；用前先用 <code>?.</code> 或 if 收窄。",
          "<b>型別斷言 as</b>：你比 TS 更清楚型別時 <code>el as HTMLInputElement</code>——但別亂用來壓過警告。",
          "⚠️ 用聯合型別要「收窄」（<code>if (typeof x === 'string')</code>）才能安全用；<code>as any</code> 是逃避、不是解法。",
        ),
      },
      {
        title: "Tailwind 心法：utility-first",
        chapter_id: 2,
        content: P(
          "Tailwind 把「一堆小 class」直接寫在 HTML 上（<code>class=\"flex items-center gap-2 p-4\"</code>），一開始覺得醜，用了回不去。",
          "好處：不用想 class 命名、不用切到 CSS 檔、樣式就在眼前、刪 HTML 樣式跟著走不留孤兒 CSS。",
          "重複的組合抽成元件（不是抽 CSS class）——React 元件就是你的「樣式重用單位」。",
          "響應式與狀態用前綴：<code>md:flex</code>（中螢幕以上）、<code>hover:bg-black</code>、<code>dark:text-white</code>。",
          "⚠️ class 長到眼花時，代表該把那塊抽成元件了；別跟 Tailwind 對抗到處寫 inline style。",
        ),
      },
      {
        title: "clamp() 與流體排版：少寫 media query",
        chapter_id: 2,
        content: P(
          "想讓字級/間距「隨螢幕平順縮放」，不用切一堆斷點，用 <code>clamp()</code>。",
          "<code>font-size: clamp(1rem, 4vw, 2rem);</code>——最小 1rem、理想跟著螢幕寬（4vw）、最大 2rem，中間自動流體變化。",
          "配合 <code>min()</code> / <code>max()</code> 控制容器寬：<code>width: min(90%, 1200px)</code>（最多 1200、但小螢幕留 10% 邊）。",
          "⚠️ clamp 好用但別完全取代斷點——版面「佈局要換」時（單欄變雙欄）還是用 media query 或容器查詢。",
        ),
      },
      {
        title: "深色模式怎麼實作",
        chapter_id: 2,
        content: P(
          "深色模式其實不難，核心是「一組會切換的顏色變數」。",
          "方式一（跟系統）：<code>@media (prefers-color-scheme: dark)</code> 底下換 CSS 變數的值。",
          "方式二（可手動切）：在 <code>&lt;html&gt;</code> 加一個 <code>class=\"dark\"</code> 或 <code>data-theme=\"dark\"</code>，底下換色；用 JS 切換那個 class、存 localStorage 記住選擇。",
          "顏色集中成變數（前面教過），深色只是「換一組值」，元件不用改。",
          "⚠️ 別只改背景不改文字/邊框對比（會有看不清的地方）；圖片/陰影在深色下也常要微調。兩種模式都實測一遍。",
        ),
      },
      {
        title: "SVG 與圖示：向量、可縮放、能改色",
        chapter_id: 2,
        content: P(
          "圖示別用圖片檔（放大糊、改色難），用 <b>SVG</b>——向量、無限縮放不糊、能用 CSS 改顏色。",
          "用法：直接 inline <code>&lt;svg&gt;</code>（能用 <code>fill: currentColor</code> 跟著文字顏色變）、或用圖示庫（lucide、heroicons）。",
          "多個圖示考慮 sprite 或元件化，別每個都貼一大坨 path。",
          "⚠️ 使用者上傳的 SVG 要小心——SVG 可以藏 <code>&lt;script&gt;</code>（XSS 風險），別直接當可信內容渲染；自己用的圖示才 inline。",
        ),
      },
      {
        title: "Intersection Observer：進畫面才做事",
        chapter_id: 4,
        content: P(
          "「捲到某元素出現在畫面時才觸發」（圖片延遲載入、無限捲動、動畫進場），用 Intersection Observer 比監聽 scroll 事件高效得多。",
          "概念：建一個 observer 盯著某元素，它「進入/離開視窗」時回呼你。<code>new IntersectionObserver(cb).observe(el)</code>。",
          "比一直算 scroll 位置省效能（瀏覽器幫你算、非同步不卡）。",
          "⚠️ 用完記得 <code>disconnect()</code>（React 在 useEffect 的 cleanup 做）；別對「幾百個元素」各建一個 observer，用一個 observer 觀察多個。",
        ),
      },
      {
        title: "無限捲動 / 分頁載入",
        chapter_id: 4,
        content: P(
          "資料很多時，別一次載完，做「捲到底自動載下一頁」。",
          "作法：在列表底部放一個「哨兵」元素，用 Intersection Observer 偵測它進畫面 → 載下一頁（配後端 cursor 分頁）。",
          "要處理 loading（轉圈）、沒有更多了（停止觸發）、失敗重試三種狀態。",
          "⚠️ 無限捲動對「找回某筆、SEO、頁尾」不友善——內容型網站有時「載更多按鈕」或傳統分頁更好。看情境選。",
        ),
      },
      {
        title: "拖放 drag & drop 基礎",
        chapter_id: 4,
        content: P(
          "排序卡片、拖檔案上傳這種互動，用拖放。",
          "原生 HTML5：元素設 <code>draggable</code>、監聽 <code>dragstart / dragover（要 preventDefault 才能放）/ drop</code>。上傳檔案監聽容器的 drop 拿 <code>e.dataTransfer.files</code>。",
          "複雜排序（清單重排、跨區拖曳）用現成庫（dnd-kit 等）省很多事、也顧到無障礙。",
          "⚠️ 別忘了「鍵盤也能操作」（純拖曳對某些使用者不友善）；行動裝置的觸控拖曳要另外處理或用庫。",
        ),
      },
      {
        title: "code splitting 與 lazy import",
        chapter_id: 4,
        content: P(
          "整個網站的 JS 打包成一大包、首頁就全載＝慢。把「用到才載」的東西切出去。",
          "React：<code>const Heavy = lazy(() =&gt; import('./Heavy'))</code> 配 <code>&lt;Suspense fallback={...}&gt;</code>——那個元件的 JS 等真的要顯示才下載。",
          "路由層級切分最有感：每個頁面各自一包，首頁不用載到「設定頁」的程式碼。",
          "⚠️ 別過度切（切太碎反而很多小請求）；切「大又不常用」的東西（圖表庫、編輯器、彈窗）最划算。",
        ),
      },
      {
        title: "bundle 太大怎麼辦",
        chapter_id: 4,
        content: P(
          "頁面載很慢、JS 檔很肥，幾個方向查。",
          "<b>量它</b>：用 bundle analyzer 看「誰最肥」——常是某個大套件（moment、整包 lodash、圖表庫）。",
          "<b>對症</b>：只 import 用到的部分（<code>import debounce from 'lodash/debounce'</code> 而不是整包）、換更輕的替代品、把大東西 lazy import。",
          "圖片、字體也算資產大小，一起顧。",
          "⚠️ 加套件前想一下「值不值得這個大小」——為一個小功能裝一包幾百 KB 常常不划算，自己幾行寫掉更好。",
        ),
      },
      {
        title: "PWA 與 Service Worker 是什麼",
        chapter_id: 14,
        content: P(
          "PWA（漸進式網頁應用）＝「讓網站像 App」：能加到主畫面、離線也能開、能推播。",
          "核心是 <b>Service Worker</b>：一個在背景跑的腳本，攔截網路請求、做快取，所以能離線、能加速重複造訪。",
          "還需要一個 <code>manifest.json</code>（App 名稱、圖示、啟動畫面）讓它能「安裝」。",
          "⚠️ Service Worker 的快取很容易「改了沒更新」——要有版本控制與更新策略，不然使用者一直看到舊版。它是強大但要小心的工具。",
        ),
      },
    ],
  },
  {
    title: "🗄️ 後端開發筆記（官方免費）",
    desc: "從「前後端到底怎麼溝通」講起，再帶 HTTP / SQL / Supabase / 安全 / 部署。都是我實際做專案記下來的。免費。",
    notes: [
      {
        title: "參數化查詢：SQL injection 我第一天就被講到怕",
        chapter_id: 12,
        content: P(
          "剛學後端我最愛用字串拼 SQL：<code>\"select * from users where name='\" + name + \"'\"</code>。看起來很直覺，其實是天大的洞。",
          "如果有人把 name 填成 <code>' or '1'='1</code>，你的查詢就變成「永遠成立」，整張表被撈光；填 <code>'; drop table users;--</code> 還能刪你的表。使用者輸入的東西，你當它是「資料」，它卻被當成「指令」執行了。",
          "正解是<b>參數化查詢</b>：把值用 <code>$1</code> / <code>?</code> 佔位，資料另外傳。<code>select * from users where name = $1</code>，值走另一條路，資料庫永遠把它當純資料、不會拿去當指令跑。",
          "⚠️ 我踩過：以為「我有先 replace 掉單引號就安全」。別自己過濾——漏洞百出。只要有拼字串進 SQL 的地方就是紅燈，一律改參數化，一個都別留。",
        ),
      },
      {
        title: "外鍵的 cascade：刪一個爸爸，小孩要怎麼辦",
        chapter_id: 17,
        content: P(
          "設外鍵時你會被問一句「parent 被刪了，指著它的 child 怎麼處理？」這就是 <code>ON DELETE</code> 行為，選錯後患無窮。",
          "常見三種：<code>CASCADE</code>（爸爸刪，小孩一起刪掉）、<code>SET NULL</code>（小孩的外鍵設成 NULL、自己留著）、<code>RESTRICT</code>/<code>NO ACTION</code>（還有小孩就不准刪爸爸、直接擋）。",
          "舉例：刪一個使用者，他的訂單要不要一起消失？多數情況你不想真的連環刪訂單（財務紀錄要留），這時 CASCADE 反而危險。",
          "⚠️ 我踩過：隨手設了 <code>ON DELETE CASCADE</code>，某天刪一筆分類，底下幾千筆商品無聲無息全沒了。cascade 很方便也很致命——刪之前先想清楚連鎖範圍，重要資料寧可用 RESTRICT 擋著。",
        ),
      },
      {
        title: "unique 與 check 約束：讓資料庫幫你守規矩",
        chapter_id: 17,
        content: P(
          "很多「這欄位不能重複」「這數字不能是負的」的規則，新手都寫在程式裡用 <code>if</code> 檔。但程式有漏洞、也擋不住並發，最可靠的守門員是資料庫本身。",
          "<b>UNIQUE</b>：保證欄位不重複，<code>email</code> 加 unique，第二個人用同 email 註冊直接被資料庫擋下。<b>CHECK</b>：限制值的範圍，<code>check (price &gt;= 0)</code> 讓負價格根本存不進去。",
          "好處：不管是哪支程式、哪個後門、還是兩個請求同時進來，資料庫這一關永遠成立。程式的檢查是「體驗」，約束才是「底線」。",
          "⚠️ 雷點：靠程式擋「email 不重複」，兩個請求同一瞬間進來、都查到「沒人用過」、就都寫進去了。唯一性一定要落在資料庫的 UNIQUE 約束上，程式檢查擋不住這種競態。",
        ),
      },
      {
        title: "欄位預設值 default：別讓 NULL 到處亂竄",
        chapter_id: 17,
        content: P(
          "建表時很多欄位其實有「天生的初始值」：建立時間就是現在、狀態就是 <code>pending</code>、計數就是 0。這些用 <code>DEFAULT</code> 交給資料庫填，別每次 insert 都手動帶。",
          "例：<code>created_at timestamptz default now()</code>、<code>status text default 'active'</code>、<code>views int default 0</code>。你 insert 時不寫這些欄位，資料庫自動補上。",
          "好處：少了忘記填的機會、也保證一致。尤其 <code>created_at default now()</code>，比在程式裡到處抓時間可靠多了。",
          "⚠️ 雷點：預設值只在「insert 時完全沒提到這欄位」才生效。如果你程式明確傳了 <code>undefined</code> 或 <code>null</code>，多數 client 會真的寫 NULL 進去、蓋掉預設。想吃 default 就整個別帶那個欄位。",
        ),
      },
      {
        title: "generated 生成欄位：算出來的值別自己維護",
        chapter_id: 17,
        content: P(
          "有些欄位是「別的欄位算出來的」：總價 = 單價 × 數量、全名 = 姓 + 名。新手常在程式裡算完再存一份，然後某天忘了同步就對不上。",
          "更好的是<b>生成欄位（generated column）</b>：直接告訴資料庫「這欄位永遠等於這個公式」，它自動幫你算、幫你維護。<code>total numeric generated always as (price * qty) stored</code>。",
          "你只要改 price 或 qty，total 自動跟著對，永遠不會不一致——因為它根本不是你手動存的。",
          "⚠️ 雷點：生成欄位不能自己寫值（它是算出來的）。還有 <code>stored</code>（存下來、佔空間但查得快）跟 <code>virtual</code>（查詢時才算）差很多，Postgres 目前只支援 stored，別照別的資料庫語法抄。",
        ),
      },
      {
        title: "在 JSON 欄位裡查資料：方便但別當萬用桶",
        chapter_id: 17,
        content: P(
          "Postgres 的 <code>jsonb</code> 欄位可以塞一整包彈性資料，很香——但很多人不知道怎麼「查裡面」，或反過來什麼都往裡塞。",
          "取值：<code>data-&gt;&gt;'name'</code> 拿文字、<code>data-&gt;'addr'</code> 拿子物件。條件查：<code>where data-&gt;&gt;'city' = 'Taipei'</code>、或用 <code>@&gt;</code> 包含運算子 <code>where data @&gt; '{\"vip\":true}'</code>。",
          "要查得快，對 jsonb 建 <b>GIN 索引</b>：<code>create index on t using gin (data)</code>，不然一樣是全表掃描。",
          "⚠️ 雷點：把「經常要查、要 join、要約束」的欄位塞進 JSON 是自找麻煩——沒型別、沒外鍵、沒預設好用的索引。JSON 適合放「結構常變、只整包讀寫」的附屬資料，核心欄位還是拆成正規欄位。",
        ),
      },
      {
        title: "全文搜尋 full text：別再用 LIKE '%關鍵字%'",
        chapter_id: 17,
        content: P(
          "做站內搜尋，新手第一招都是 <code>where title like '%关键字%'</code>。小資料看不出問題，資料一多會慢到爆——前面加 % 讓索引完全用不上，只能整表掃。",
          "Postgres 內建<b>全文搜尋</b>：把文字轉成 <code>tsvector</code>（拆成詞、去掉語助詞），查詢用 <code>tsquery</code> 比對，還會處理詞形。<code>where to_tsvector(body) @@ to_tsquery('cat &amp; dog')</code>。",
          "配 GIN 索引就快，還能排相關性（<code>ts_rank</code>）。真的要更強（中文分詞、模糊、拼錯容錯）再上 Elasticsearch/Meilisearch。",
          "⚠️ 雷點：Postgres 內建全文搜尋對<b>中文分詞</b>支援很弱（它靠空白斷詞，中文不空白）。做中文站要嘛裝中文分詞外掛（如 zhparser）、要嘛用專門的搜尋引擎，別以為內建就搞定中文。",
        ),
      },
      {
        title: "upsert：有就更新、沒有就新增，一句搞定",
        chapter_id: 17,
        content: P(
          "「這筆資料在就更新、不在就插入」——新手常寫成「先 select 看在不在、再決定 insert 還 update」，兩趟查詢還有競態問題。",
          "資料庫有一句話解決：<b>upsert</b>，Postgres 寫成 <code>insert ... on conflict (key) do update set ...</code>。撞到唯一鍵就改、沒撞到就新增，一趟、原子。",
          "只想「撞到就當沒事、別報錯」用 <code>on conflict do nothing</code>。常用在「記一次就好」的場景（按讚、每日簽到）。",
          "⚠️ 雷點：<code>on conflict</code> 要指定「衝突判定的欄位」，而那欄位<b>必須有 unique 約束或索引</b>，不然資料庫不知道怎麼算衝突、會直接報錯。先確認唯一鍵存在再用 upsert。",
        ),
      },
      {
        title: "returning 子句：insert 完直接拿回結果，別再多查一次",
        chapter_id: 17,
        content: P(
          "新增一筆資料後，你常需要它的「自動產生的 id / created_at」。新手做法：insert 完再 <code>select</code> 一次去撈。多此一舉、還可能撈錯筆。",
          "Postgres 的 <code>RETURNING</code> 讓你在同一句就把結果帶回來：<code>insert into users(name) values('小明') returning id, created_at;</code>。一趟拿到新資料。",
          "update 和 delete 也能用：<code>update ... returning *</code> 拿到「改完後長怎樣」、<code>delete ... returning id</code> 知道「刪掉了哪些」。",
          "⚠️ 雷點：批次 insert 多筆時 <code>returning</code> 回來的<b>順序不保證</b>跟你插入的順序一致（尤其並發下）。要對應回原本哪筆，靠回傳的 id 對，別靠陣列位置。",
        ),
      },
      {
        title: "CTE（with）：把複雜查詢拆成看得懂的步驟",
        chapter_id: 17,
        content: P(
          "一句 SQL 巢狀塞了三層子查詢，寫的人痛、讀的人更痛。CTE（Common Table Expression，就是 <code>WITH</code>）能把它拆成「一步一步」的具名區塊。",
          "寫法：<code>with active as (select * from users where status='active') select * from active where age &gt; 18;</code>。先定義 <code>active</code> 這個暫時結果、後面直接引用，像變數一樣。",
          "好處：可讀性大增，複雜報表查詢可以一層層疊上去、每層有名字，改起來也好定位。",
          "⚠️ 雷點：早期 Postgres 會把 CTE 當「最佳化邊界」（先算完整段再往下），大資料下可能比等價子查詢慢。Postgres 12 後預設會 inline 優化，但若你想強制物化，記得 CTE 不等於「一定比較快」，慢的時候用 EXPLAIN 看它到底怎麼跑。",
        ),
      },
      {
        title: "window function 視窗函式：分組又不失明細",
        chapter_id: 17,
        content: P(
          "我以前遇到「每個部門的員工，各自標上部門排名」這種需求，用 GROUP BY 就卡住——一 group 明細就沒了。答案是<b>視窗函式</b>。",
          "它讓你在「一整組」上算聚合，但<b>不會把明細壓成一列</b>。<code>rank() over (partition by dept order by salary desc)</code>：每一列都保留，但多帶一欄「在自己部門的薪水排名」。",
          "超好用的幾個：<code>row_number()</code> 編號、<code>rank()</code> 排名、<code>sum() over (...)</code> 累計、<code>lag()/lead()</code> 拿前一列/後一列（算環比、找連續）。",
          "⚠️ 雷點：<code>over ()</code> 裡的 <code>partition by</code>（分組）和 <code>order by</code>（組內排序）是兩件事、別搞混。還有視窗函式不能放在 <code>WHERE</code> 裡（那時還沒算），要篩它的結果得包一層子查詢或 CTE 再篩。",
        ),
      },
      {
        title: "子查詢 subquery：查詢裡面再塞一個查詢",
        chapter_id: 17,
        content: P(
          "子查詢就是「把一個查詢的結果，拿去當另一個查詢的條件或來源」。看懂它，很多需求就不用分兩趟做了。",
          "常見三種：當條件 <code>where id in (select user_id from orders)</code>（有下過單的人）；當單一值 <code>where price &gt; (select avg(price) from products)</code>（高於平均）；當一張暫時的表放在 <code>FROM</code> 裡。",
          "還有<b>相關子查詢</b>：內層會用到外層的欄位，逐列去算（如 <code>exists</code> 檢查「這人有沒有訂單」）。",
          "⚠️ 雷點：相關子查詢會「外層每一列都跑一次內層」，資料一多就是隱形的 N+1、慢到不行。很多時候改寫成 <code>JOIN</code> 快非常多——慢的子查詢先想想能不能 join 掉。",
        ),
      },
      {
        title: "EXPLAIN：查詢到底慢在哪，別用猜的",
        chapter_id: 17,
        content: P(
          "查詢很慢，新手都在瞎猜「是不是資料太多」。其實資料庫可以直接告訴你它「打算怎麼執行」——用 <code>EXPLAIN</code>。",
          "<code>EXPLAIN ANALYZE select ...</code> 會印出執行計畫 + 實際耗時。你要看的關鍵字：<b>Seq Scan</b>（全表掃描，資料多就是它慢）、<b>Index Scan</b>（有走索引，好）、還有每一步「預估 vs 實際」的筆數。",
          "看到該走索引卻在 Seq Scan，通常就是「沒建索引」或「查詢寫法讓索引用不上」（欄位被函式包住、前綴模糊比對）。",
          "⚠️ 雷點：<code>EXPLAIN</code>（不加 ANALYZE）只給「預估」、不真的跑；<code>EXPLAIN ANALYZE</code> 會<b>真的執行</b>那句 SQL。對 <code>UPDATE/DELETE</code> 加 ANALYZE 是真的會改資料的——要嘛包在交易裡 rollback，別在正式庫直接 ANALYZE 一句 delete。",
        ),
      },
      {
        title: "複合索引的欄位順序：擺錯就白建了",
        chapter_id: 19,
        content: P(
          "一個索引蓋多個欄位叫複合索引，很多人以為「欄位有進去就會用到」，其實<b>順序</b>決定它能不能被用上。",
          "把複合索引想成電話簿（先姓、後名）：查「姓王」很快、查「姓王名小明」也快，但只查「名叫小明」（不給姓）就用不上——因為它是先照姓排的。這叫<b>最左前綴原則</b>。",
          "所以建 <code>index (a, b)</code>：查 <code>where a=?</code> 或 <code>where a=? and b=?</code> 都吃得到；只查 <code>where b=?</code> 吃不到。順序要照「最常單獨拿來查的欄位」放前面。",
          "⚠️ 雷點：等值條件放前、範圍條件放後。<code>where a=? and b&gt;?</code> 用 <code>(a,b)</code> 很好；但 <code>where a&gt;? and b=?</code> 用 <code>(a,b)</code> 時，一遇到範圍 <code>a&gt;?</code>，後面的 b 就用不上索引了。範圍欄位擺最後。",
        ),
      },
      {
        title: "覆蓋索引：查詢不用回表，快上加快",
        chapter_id: 19,
        content: P(
          "一般走索引是：先在索引找到位置、再「回主表」把整列資料撈出來（回表）。如果你要的欄位「索引裡就有」，連回表都省了——這叫<b>覆蓋索引</b>。",
          "例：<code>index (user_id, status)</code>，查 <code>select status from t where user_id = ?</code>，要的 status 索引裡就有，資料庫直接從索引回你、不碰主表，超快。",
          "Postgres 可以用 <code>INCLUDE</code> 把「只是要一起帶回、但不參與排序」的欄位塞進索引：<code>create index on t(user_id) include (status)</code>。",
          "⚠️ 雷點：覆蓋索引是拿「索引變胖、寫入變慢、佔更多空間」換查詢快。別為了覆蓋而把一堆欄位塞進索引——只在「這個查詢超高頻、又只要少數幾欄」時才值得。",
        ),
      },
      {
        title: "部分索引 partial index：只索引你真的會查的那部分",
        chapter_id: 19,
        content: P(
          "如果一張表裡「你 99% 只查某一小撮資料」（例如只查 <code>status = 'active'</code> 的、已刪的從不查），對整張表建索引很浪費。用<b>部分索引</b>只索引那一撮。",
          "寫法加個 <code>WHERE</code>：<code>create index on orders(created_at) where status = 'pending';</code>。索引只收 pending 的列，體積小、更新快、查 pending 時飛快。",
          "很適合軟刪除：<code>... where deleted_at is null</code>，索引只管「活著」的資料，已刪的不佔位。",
          "⚠️ 雷點：查詢的條件要「對得上」索引的 <code>WHERE</code> 才會被用到。你建的是 <code>where status='pending'</code> 的部分索引，查 <code>where status='active'</code> 就用不上它。條件不吻合，等於沒建。",
        ),
      },
      {
        title: "死鎖 deadlock：兩個人互相等對方先放手",
        chapter_id: 17,
        content: P(
          "死鎖不是資料庫壞了，是兩個交易「卡成死結」：A 鎖了第 1 筆要第 2 筆、B 鎖了第 2 筆要第 1 筆，兩邊都在等對方先放、永遠等不到。",
          "資料庫夠聰明，偵測到死結會<b>主動犧牲其中一個交易</b>（回傳 deadlock 錯誤讓它 rollback），另一個就能過。所以你會偶爾在 log 看到 deadlock detected。",
          "最有效的預防：讓所有交易<b>用固定的順序</b>去鎖資料（例如永遠先鎖 id 小的）。大家都照同方向排隊，就不會頭尾對撞。",
          "⚠️ 雷點：死鎖多半不是 bug、而是並發下的正常現象——所以踩到 deadlock 錯誤的交易要<b>能自動重試</b>。別讓一次死鎖就直接回使用者 500，捕捉到就退一步、重跑一次通常就過了。",
        ),
      },
      {
        title: "隔離級別 isolation level：交易之間要多「絕緣」",
        chapter_id: 17,
        content: P(
          "多個交易同時跑，彼此會不會看到對方「做到一半」的資料？這個「絕緣程度」就是隔離級別，級別越高越乾淨、但越可能卡。",
          "由鬆到嚴會擋掉不同的怪現象：<b>髒讀</b>（讀到別人還沒 commit 的）、<b>不可重複讀</b>（同一筆讀兩次值變了）、<b>幻讀</b>（同一條件讀兩次筆數變了）。常見級別：Read Committed、Repeatable Read、Serializable。",
          "Postgres 預設是 <b>Read Committed</b>（每句看到的都是「已提交」的最新資料），日常夠用。需要一整個交易內「看到的世界不變」就用 Repeatable Read。",
          "⚠️ 雷點：級別不是越高越好。<code>Serializable</code> 最安全，但並發衝突時會直接讓交易失敗（序列化錯誤）、要你重試。用高級別的程式一定要配「衝突自動重試」，不然使用者一堆莫名其妙的錯誤。",
        ),
      },
      {
        title: "statement timeout：別讓一句爛查詢拖垮整台",
        chapter_id: 17,
        content: P(
          "一句沒帶好條件的查詢，可能跑十分鐘、把資料庫連線和 CPU 全佔住，後面所有請求跟著卡死。防這個最簡單的閘門就是<b>語句逾時</b>。",
          "設 <code>statement_timeout</code>：超過設定時間還沒跑完的 SQL，資料庫直接砍掉它、回一個 timeout 錯誤。<code>set statement_timeout = '5s'</code>，或在連線設定裡給。",
          "好處：一句失控的查詢最多拖 5 秒就被斬斷，不會無限吃資源拖累別人。等於幫資料庫裝了保險絲。",
          "⚠️ 雷點：別把 timeout 設得太齊頭。「使用者面向的即時查詢」設短（幾秒）；但「後台報表、批次匯入」本來就慢，套同一個短 timeout 會一直被砍。針對不同用途的連線設不同 timeout。",
        ),
      },
      {
        title: "大量插入：一筆一筆 insert 慢到你懷疑人生",
        chapter_id: 19,
        content: P(
          "要匯入十萬筆資料，新手寫個迴圈「一次 insert 一筆」，跑了半小時還沒完。慢的不是資料庫，是你「來回一萬趟」的成本。",
          "改法一：<b>批次 insert</b>，一句塞多筆 <code>insert into t values (...),(...),(...)</code>，一趟送幾百上千筆，網路來回和交易成本瞬間攤平。",
          "改法二（最快）：用 <code>COPY</code>。它是 Postgres 專門為大量灌資料設計的通道，比 insert 快好幾倍。<code>COPY t FROM STDIN</code> 直接餵資料流。",
          "⚠️ 雷點：一次塞太多也會出事——單句參數有上限、交易太大會吃爆記憶體和 WAL。實務上「分批」（每批幾千筆各自 commit）最穩，別想著一句話塞完一百萬筆。灌大量資料前也可考慮先卸索引、灌完再建。",
        ),
      },
      {
        title: "keyset 分頁：資料越後面 OFFSET 越慢，換個做法",
        chapter_id: 19,
        content: P(
          "<code>LIMIT 20 OFFSET 100000</code> 看起來只要 20 筆，但資料庫其實得「先數過前面十萬筆再丟掉」，越翻後面越慢。這是 offset 分頁的死穴。",
          "<b>keyset 分頁</b>（又叫 seek）換個思路：記住「上一頁最後一筆的排序值」，下一頁直接查「比它更後面的」。<code>where (created_at, id) &lt; ($1, $2) order by created_at desc, id desc limit 20</code>。不管翻到第幾頁都一樣快。",
          "關鍵是排序欄位要建索引，資料庫就能「跳到位置直接讀 20 筆」，不用數過前面。",
          "⚠️ 雷點：排序欄位若有重複值（例如很多筆同一秒 created_at），只靠它當游標會漏資料或重複。要<b>加一個唯一欄位當 tie-breaker</b>（通常是 id），用 <code>(created_at, id)</code> 一組當游標才穩。",
        ),
      },
      {
        title: "ETag 與條件請求：沒變的東西別重傳一遍",
        chapter_id: 75,
        content: P(
          "同一份資料，使用者重新整理十次就重傳十次、很浪費頻寬。ETag 讓「沒變就別傳」變可能。",
          "運作：後端回應時附一個 <code>ETag</code>（這份內容的指紋，內容變指紋才變）。瀏覽器下次請求帶 <code>If-None-Match: 那個指紋</code>，後端一比對「沒變」，就回 <b>304 Not Modified</b>、空 body，瀏覽器直接用本地快取。",
          "省的是「重傳整包內容」的頻寬和時間，尤其大 JSON、圖片很有感。<code>Last-Modified</code> + <code>If-Modified-Since</code> 是時間版的同套機制。",
          "⚠️ 雷點：ETag 要能「內容變、指紋就變」才有意義。用「內容 hash」當 ETag 最準；別拿「當下時間」之類每次都不同的東西當 ETag，那樣永遠比對不中、304 永遠不觸發，等於白做。",
        ),
      },
      {
        title: "內容協商：同一個網址，回你看得懂的格式/語言",
        chapter_id: 75,
        content: P(
          "同一支 API，有人要 JSON、有人要 CSV；有人要中文錯誤訊息、有人要英文。內容協商（content negotiation）讓「同一個網址」按客戶端偏好回不同版本。",
          "客戶端用請求標頭表達偏好：<code>Accept: application/json</code>（要什麼格式）、<code>Accept-Language: zh-TW</code>（要什麼語言）。後端讀這些標頭、回對應版本，並用 <code>Content-Type</code> 標明「我回的是什麼」。",
          "好處：一個資源一個網址，不用開 <code>/data.json</code>、<code>/data.csv</code> 一堆分身。",
          "⚠️ 雷點：有做內容協商就要回應 <code>Vary: Accept</code> 標頭，告訴快取/CDN「這個回應會因 Accept 不同而不同」。忘了設，CDN 可能把「給某人的 JSON 版」快取起來、回給想要 CSV 的下一個人。",
        ),
      },
      {
        title: "gzip 壓縮：回應在路上先瘦身再傳",
        chapter_id: 75,
        content: P(
          "一包 200KB 的 JSON，文字重複性很高，壓縮後可能只剩 20KB。傳輸量少一個數量級，使用者載得更快——這幾乎是免費的效能。",
          "運作：瀏覽器帶 <code>Accept-Encoding: gzip, br</code> 說「我能解壓」，後端就把 body 壓縮後傳、附 <code>Content-Encoding: gzip</code>，瀏覽器自動解開。文字類（JSON/HTML/CSS/JS）壓縮率很高。",
          "多數框架/反向代理（nginx、Caddy）或 CDN 開個設定就有，不用自己動手壓。<code>br</code>（Brotli）通常比 gzip 更小。",
          "⚠️ 雷點：別壓「已經壓過的東西」（jpg/png/mp4/zip），CPU 花了、體積幾乎不變甚至變大。還有壓縮 + 機密內容 + 攻擊者可注入的組合有 BREACH 這類側信道風險，敏感回應要留意。",
        ),
      },
      {
        title: "HTTP/2：一條連線同時跑很多請求",
        chapter_id: 75,
        content: P(
          "HTTP/1.1 時代，瀏覽器對同一網域的並發連線有限，很多請求得排隊（隊頭阻塞）。HTTP/2 主要就是來解「連線太少、請求塞車」。",
          "它用<b>多工（multiplexing）</b>：同一條 TCP 連線上，多個請求/回應同時交錯傳，不用一個等一個。還有標頭壓縮、伺服器推送等優化。",
          "對你的意義：以前為了繞開並發限制而做的「合併檔案、圖片精靈圖、分散多網域」等土炮優化，在 HTTP/2 下大多不必要了。",
          "⚠️ 雷點：HTTP/2 幾乎都跑在 TLS 上（要 HTTPS）。還有它解的是「HTTP 層」的隊頭阻塞，底層 TCP 丟包時仍會卡——這是 HTTP/3（走 QUIC/UDP）才進一步解決的，別以為升 HTTP/2 就萬事無阻。",
        ),
      },
      {
        title: "TLS / HTTPS：不只是網址列那把鎖",
        chapter_id: 75,
        content: P(
          "HTTPS = HTTP + TLS 加密。它做三件事：<b>加密</b>（中間人看不到內容）、<b>完整性</b>（傳輸中被竄改會被發現）、<b>身分驗證</b>（憑證證明「你連的真的是這個網站」）。",
          "運作靠憑證：網站出示由受信任 CA 簽發的憑證，瀏覽器驗證通過才建立加密連線。現在憑證能免費自動申請（Let's Encrypt），沒理由不上 HTTPS。",
          "沒 HTTPS 的站，使用者在公共 Wi-Fi 打的密碼、cookie 都可能被旁邊的人抓走——這是底線，不是加分。",
          "⚠️ 雷點：憑證會<b>過期</b>（Let's Encrypt 90 天）。忘了自動續約，某天全站突然「不安全」警告、使用者全被擋。一定要設好自動續期 + 到期前告警，別靠人工記。",
        ),
      },
      {
        title: "HSTS：逼瀏覽器只走 HTTPS，別給降級機會",
        chapter_id: 75,
        content: P(
          "就算你全站上了 HTTPS，使用者第一次打 <code>http://你的站</code>（或被攻擊者引導走 http），那一下仍是明文、可被中間人劫持再導去假站。HSTS 就是來堵這個縫。",
          "作法：回一個標頭 <code>Strict-Transport-Security: max-age=31536000; includeSubDomains</code>。瀏覽器記住後，接下來一整年「這個網域一律強制 HTTPS」，連 http 的網址都自動改成 https 才發出去，根本不給明文機會。",
          "等於跟瀏覽器說：「我這站永遠只走加密，別再試 http。」",
          "⚠️ 雷點：HSTS 是「說出去就收不回」的承諾——設了長 max-age，期間內瀏覽器<b>拒絕</b>用 http 連你的站。萬一你某子網域還沒好 HTTPS 卻加了 <code>includeSubDomains</code>，那個子網域會直接連不上。先確定全站（含子網域）都穩穩 HTTPS 再開，preload 更是幾乎不可逆。",
        ),
      },
      {
        title: "CSP 標頭：就算被塞了惡意腳本也跑不起來",
        chapter_id: 75,
        content: P(
          "XSS 的可怕在於「攻擊者的 JS 在你的頁面上執行」。CSP（Content Security Policy）是最後一道防線：告訴瀏覽器「只准載入/執行我允許來源的東西」。",
          "用回應標頭設白名單：<code>Content-Security-Policy: default-src 'self'; script-src 'self'</code> 意思是「腳本只准來自我自己的網域」。攻擊者注入的 inline script 或外部惡意腳本，瀏覽器直接拒絕執行。",
          "它擋不住漏洞本身，但能大幅降低「就算被注入也造成不了危害」——是深度防禦的一層。",
          "⚠️ 雷點：CSP 很容易一設就把自家正常資源也擋掉（第三方分析、字型、inline style），畫面全壞。先用 <code>Content-Security-Policy-Report-Only</code> 模式「只回報不阻擋」，看清楚會擋到什麼、調好白名單，再正式啟用。別直接上 enforce。",
        ),
      },
      {
        title: "cookie 的三個關鍵屬性：Secure / HttpOnly / SameSite",
        chapter_id: 75,
        content: P(
          "登入 token 放 cookie 很方便，但沒設好這三個屬性，等於門沒鎖。它們各擋一種攻擊。",
          "<b>HttpOnly</b>：JS 讀不到這個 cookie——就算頁面被 XSS 注入腳本，也偷不走你的登入 token。<b>Secure</b>：只在 HTTPS 下才送，防明文外洩。<b>SameSite</b>：控制「跨站請求要不要帶這 cookie」，<code>Lax</code>/<code>Strict</code> 能擋掉大部分 CSRF。",
          "對登入 session cookie，標配就是 <code>HttpOnly; Secure; SameSite=Lax</code>。這是幾乎不用思考的預設。",
          "⚠️ 雷點：<code>SameSite=None</code>（允許跨站帶 cookie，某些第三方嵌入需要）<b>必須</b>同時加 <code>Secure</code>，否則現代瀏覽器直接拒收。還有把 token 放 <code>localStorage</code> 反而更危險——那是 JS 讀得到的，XSS 一注入就被撈走，比 HttpOnly cookie 差。",
        ),
      },
      {
        title: "CSRF：有人借你的登入狀態，替你送出請求",
        chapter_id: 12,
        content: P(
          "CSRF（跨站請求偽造）很陰險：你登入了 A 網站，瀏覽器存著登入 cookie。攻擊者誘你點開他的頁面，那頁偷偷對 A 發一個「轉帳/改密碼」請求——瀏覽器會<b>自動帶上你的 cookie</b>，A 以為是你本人。",
          "重點：攻擊者看不到你的 cookie，但能「借用」它替你發請求。防的核心是「證明這個請求真的是從你的網站發出、不是別站偷發」。",
          "兩個主流解法：<b>SameSite cookie</b>（跨站請求不帶 cookie，擋掉大半）＋<b>CSRF token</b>（表單/請求要帶一個伺服器發的隨機值，第三方網站拿不到）。",
          "⚠️ 雷點：純 token 驗證的 API（token 放 Authorization 標頭、不靠 cookie）天生對 CSRF 免疫——因為第三方頁面沒辦法自動帶上你的 Authorization 標頭。CSRF 只在「靠 cookie 自動帶身分」時才是問題，別無腦到處加 CSRF token。",
        ),
      },
      {
        title: "後端也要防 XSS：輸出的時候編碼",
        chapter_id: 12,
        content: P(
          "很多人以為 XSS 是前端的事，其實「資料進 DB、再吐回頁面」這條路是後端在管。使用者存了一段 <code>&lt;script&gt;偷cookie&lt;/script&gt;</code> 當暱稱，下次別人看他的檔案就中招。",
          "防的關鍵是<b>輸出編碼（output encoding）</b>：把資料放進 HTML 前，把 <code>&lt; &gt; &amp; \"</code> 這些字元轉成 <code>&amp;lt; &amp;gt;</code> 等實體，瀏覽器就當「文字」顯示、不當「標籤」執行。",
          "現代前端框架（React 等）預設會幫你編碼，但你用 <code>dangerouslySetInnerHTML</code>、後端自己拼 HTML、或回傳富文本時，就得自己顧。",
          "⚠️ 雷點：防 XSS 要在<b>「輸出到哪個情境」</b>做對應編碼——放進 HTML、放進屬性、放進 URL、放進 JS 裡，編碼規則各不同。還有「存進去時就過濾」不如「輸出時才編碼」可靠，因為同一份資料可能輸出到不同情境。要接受富文本（HTML）就用成熟的清洗庫（DOMPurify 之類），別自己寫黑名單。",
        ),
      },
      {
        title: "SSRF：你的伺服器被騙去打內部網路",
        chapter_id: 12,
        content: P(
          "SSRF（伺服器端請求偽造）常出現在「讓使用者給一個網址、後端去抓」的功能（抓縮圖、匯入遠端圖片、webhook 測試）。攻擊者不給正常網址，給的是 <code>http://169.254.169.254/</code>（雲端的內部中繼資料位址）或 <code>http://localhost:內部服務</code>。",
          "後端傻傻照著打，就替攻擊者存取了「只有內網打得到」的東西——雲端金鑰、內部管理介面、資料庫。你的伺服器變成他的跳板。",
          "防法：對使用者給的網址做<b>白名單</b>（只允許特定網域）、解析出 IP 後擋掉內網/保留位址（127.x、10.x、169.254.x…）、禁跟隨重導向到內網。",
          "⚠️ 雷點：只檢查「網址字串」擋不住——攻擊者用重導向、DNS rebinding（網域先解析成外部 IP、真連時再變內網 IP）繞過。要在<b>真正發連線的那一刻</b>檢查解析出來的 IP，不是只看使用者填的字串。",
        ),
      },
      {
        title: "路徑穿越 path traversal：../ 讓人跳出你的資料夾",
        chapter_id: 12,
        content: P(
          "只要你的程式「用使用者給的檔名去讀/寫檔案」，就要小心路徑穿越。使用者不給 <code>photo.jpg</code>，給 <code>../../../../etc/passwd</code>，用一堆 <code>../</code> 往上跳，就讀到系統敏感檔了。",
          "根源是「把使用者輸入直接接到檔案路徑」。<code>readFile('/uploads/' + userInput)</code> 看起來鎖在 uploads 裡，其實 <code>../</code> 能一路往上爬出去。",
          "防法：不信任使用者給的檔名——自己產生檔名（UUID）；真的要用就把路徑正規化後，檢查它「仍在允許的根目錄底下」再動手。",
          "⚠️ 雷點：光 replace 掉 <code>../</code> 擋不乾淨——有 URL 編碼（<code>%2e%2e%2f</code>）、絕對路徑（<code>/etc/...</code>）、Windows 反斜線等變形。正解是「解析成絕對路徑後，驗證它的前綴確實是你允許的目錄」，別玩字串過濾的貓抓老鼠。",
        ),
      },
      {
        title: "mass assignment：一次收整包，連不該改的欄位也被改了",
        chapter_id: 12,
        content: P(
          "圖方便，很多人把前端傳來的整包 body 直接倒進資料庫：<code>update user set ...req.body</code>。問題是——使用者可以在 body 裡多塞一個 <code>\"role\":\"admin\"</code> 或 <code>\"is_verified\":true</code>，一併被寫進去。",
          "這叫<b>mass assignment（過度綁定）</b>：你以為使用者只會改暱稱，他卻連「權限、餘額、已驗證」這些欄位一起偷改了，因為你來者不拒地全收。",
          "防法：用<b>白名單</b>——明確列出「這個 API 只准改哪幾個欄位」，只挑那幾個出來用，其餘一律無視。schema 驗證工具（zod 等）定義好允許的形狀最省事。",
          "⚠️ 雷點：黑名單（列「不准改的」）幾乎一定會漏——你今天新增一個敏感欄位、忘了加進黑名單就破功。永遠用「只允許這些」的白名單，別用「除了這些都可以」的黑名單。",
        ),
      },
      {
        title: "retry 要配指數退避：別失敗就馬上狂重試",
        chapter_id: 16,
        content: P(
          "呼叫外部 API 偶爾失敗很正常，加重試很合理。但新手常寫「失敗就立刻重試、連試五次」——結果對方正好在忙/掛掉，你的猛烈重試反而把它壓得更慘（雪上加霜）。",
          "正解是<b>指數退避（exponential backoff）</b>：每次失敗等的時間翻倍——1 秒、2 秒、4 秒、8 秒…給對方喘息，也降低你自己的壓力。",
          "再加一點<b>抖動（jitter）</b>：在等待時間上加隨機偏移。不然「一萬個 client 同時失敗、又同時在第 2 秒重試」會形成一波波同步的衝擊。",
          "⚠️ 雷點：只重試「暫時性錯誤」（逾時、503、429、連線中斷）。像 400 參數錯、401 沒授權這種「重試幾次都一樣錯」的，重試只是浪費、還可能把壞資料送更多次。重試前先分清楚錯誤能不能靠重試解決。",
        ),
      },
      {
        title: "斷路器 circuit breaker：對方掛了就先別一直去撞",
        chapter_id: 16,
        content: P(
          "下游服務掛了，你每個請求都還傻傻去呼叫、每個都等到 timeout 才失敗——連線、執行緒被大量占住，連你自己也被拖垮。斷路器就是來停損的。",
          "它像家裡的跳電開關：短時間內失敗次數超過門檻，就「跳閘（open）」——接下來一段時間直接快速失敗、根本不去打對方，讓它有空間恢復，也保住你自己的資源。",
          "過一陣子進「半開（half-open）」狀態：放幾個試探請求過去，成功就「合閘」恢復正常，還在失敗就繼續跳著。",
          "⚠️ 雷點：斷路器跳閘時，你要有<b>降級方案（fallback）</b>——回快取的舊資料、回預設值、或友善提示「稍後再試」。只是跳閘卻沒後路，使用者一樣看到錯誤，只是換個方式壞而已。",
        ),
      },
      {
        title: "timeout 預算：每一層都要有時間上限",
        chapter_id: 16,
        content: P(
          "一個請求進來，可能要呼叫 DB、再呼叫外部 API、再算一堆。如果每一環都「沒設 timeout、無限等」，只要一環卡住，整條請求就永遠掛著、連線被占死，堆積起來全站癱瘓。",
          "每個對外的呼叫（DB 查詢、HTTP 請求、佇列）都要設<b>合理的 timeout</b>。更進一步是<b>timeout 預算</b>：整個請求我只給 3 秒，那分給 DB 1.5 秒、外部 API 1 秒…下游拿到的時間要比上游短。",
          "這樣一環卡住，會在預算內被斬斷、回一個明確的錯，而不是無止盡地等下去拖累全部。",
          "⚠️ 雷點：內層的 timeout 若比外層還長，就白設了——外層早就放棄回錯給使用者了，內層還在傻傻地跑、白占資源。timeout 要「越往下游越短」，並把「上游已經放棄」的取消訊號（context/AbortSignal）往下傳，讓下游也一起停手。",
        ),
      },
      {
        title: "優雅關閉 graceful shutdown：關機前先把手上的事做完",
        chapter_id: 22,
        content: P(
          "部署更新時要停掉舊的伺服器程序。如果直接砍掉，那些「正在處理到一半的請求」就斷了——使用者收到錯誤、甚至資料寫一半。優雅關閉就是「好好收尾再走」。",
          "流程：收到關閉訊號後，① 先停止接收新請求（從負載平衡摘掉）、② 把「手上還沒處理完的請求」做完、③ 關掉 DB 連線、背景 worker 也把當前任務做完，④ 才真正退出。",
          "多數框架/runtime 都有 hook 讓你註冊「關閉前要做什麼」，把清理邏輯放進去。",
          "⚠️ 雷點：平台通常給你「寬限時間」（例如 30 秒），逾時就強制砍（SIGKILL）。所以收尾邏輯要能在寬限期內完成——長任務別想在關閉那一刻硬做完，該設計成「可中斷 + 之後能續作」，別指望無限的收尾時間。",
        ),
      },
      {
        title: "signal 訊號處理：作業系統怎麼跟你的程式說「該停了」",
        chapter_id: 22,
        content: P(
          "上一則的「優雅關閉」是怎麼被觸發的？靠<b>訊號（signal）</b>——作業系統/容器編排傳給你程序的通知。你的程式要「聽」這些訊號才知道該收尾。",
          "最常見兩個：<b>SIGTERM</b>（「請你正常結束」，Docker/K8s 停容器、部署換版時發的，可以攔截來做清理）；<b>SIGKILL</b>（「立刻死」，攔不了、也清不了，是寬限期過後的強制手段）。<code>Ctrl+C</code> 送的是 SIGINT。",
          "所以你在程式裡註冊「收到 SIGTERM 就跑優雅關閉」，才接得住部署時的停機通知。",
          "⚠️ 雷點：SIGKILL（<code>kill -9</code>）無法被攔截、不會給你任何收尾機會——所以「一定要做的清理」不能只寄望於關閉 hook，要設計成「就算被硬砍，重啟後也能恢復/續作」。還有：容器裡若你的程式不是 PID 1，訊號可能傳不到它，記得處理好轉發。",
        ),
      },
      {
        title: "零停機部署：換版的時候使用者不該看到錯誤",
        chapter_id: 22,
        content: P(
          "最土炮的部署是「關掉舊的、開新的」，中間那幾秒到幾十秒，使用者全吃 502。稍有規模就不能這樣——要做到換版期間服務不中斷，這叫零停機部署。",
          "核心手法：<b>先起後停（rolling）</b>——新版本先啟動、通過 health check、被加進負載平衡，才把舊的一台台摘掉、關閉（配合優雅關閉收尾）。任何一刻都有「活著且健康」的實例在服務。",
          "配套要件：health check 要準（別把還沒 ready 的算成健康）、優雅關閉要做好、以及「新舊版本同時在線」那段要能共存。",
          "⚠️ 雷點：零停機部署期間<b>新舊版本會同時在跑</b>。如果這次更新改了資料庫結構，舊版程式碰到新結構（或反之）可能爆掉。所以 migration 要「向後相容、分兩步走」（先加相容的欄位、兩版都能跑，之後再清理），不能程式和 DB 一刀切一起換。",
        ),
      },
      {
        title: "藍綠部署：兩套環境切換，出事秒回滾",
        chapter_id: 22,
        content: P(
          "藍綠部署是零停機的一種漂亮做法：同時養兩套完整環境——<b>藍</b>（目前對外的）和<b>綠</b>（新版本）。新版先整套部署到綠、在綠上驗好，再把流量「一次切」過去。",
          "最大好處是<b>回滾超快</b>：綠上線後發現有問題，把流量切回藍就好——藍原封不動還在，幾秒回到穩定版，不用手忙腳亂重新部署舊版。",
          "跟 rolling（一台台換）相比，藍綠是「整批切換」，切換乾脆、驗證環境完整；代價是要準備兩套資源、比較花錢。",
          "⚠️ 雷點：藍綠切換時，兩套環境<b>共用同一個資料庫</b>是常態——所以 DB schema 一樣要向後相容，切回藍時綠寫進去的新資料/新結構不能讓藍爆掉。還有 session、進行中的長連線在切換瞬間怎麼接手，也要先想好。",
        ),
      },
      {
        title: "feature flag：功能先上線、但用開關控制誰看得到",
        chapter_id: 22,
        content: P(
          "想上一個新功能，但怕出事、想先給少數人試。傳統做法是拉一個 branch 慢慢憋，越憋越難合。feature flag 換個思路：<b>程式碼照常合併上線，但用一個開關決定它開不開</b>。",
          "程式裡包一層 <code>if (flags.newCheckout) { 新流程 } else { 舊流程 }</code>。開關的值放設定/資料庫，可以隨時改，甚至「只對 5% 使用者開」「只對內部帳號開」。出事把開關關掉就好，不用回滾部署。",
          "好處：部署和「放出功能」解耦、能灰度放量、能做 A/B 測試、出問題止血超快。",
          "⚠️ 雷點：flag 是技術債，用完要<b>清掉</b>。很多團隊留了一堆「早就全開/全關、卻沒刪」的 flag，程式碼裡到處是死掉的 if 分支，越積越亂。每個 flag 該有「壽命」和「清理負責人」。",
        ),
      },
      {
        title: "設定的優先序：同一個值，該聽誰的",
        chapter_id: 22,
        content: P(
          "同一個設定（例如 <code>PORT</code>）可能在好幾個地方都有：程式寫死的預設、設定檔、環境變數、啟動時的命令列參數。它們同時存在時，到底用哪個？要有明確的優先序，不然行為飄忽你會抓狂。",
          "常見且合理的順序（後者蓋前者）：<b>寫死的預設 &lt; 設定檔 &lt; 環境變數 &lt; 命令列參數/執行時覆寫</b>。越「靠近這次實際執行」的，優先級越高。",
          "這樣的好處：預設能跑、設定檔給常態、部署時用環境變數覆寫、臨時除錯用命令列蓋一下——層層可覆蓋、又可預測。",
          "⚠️ 雷點：「線上明明改了設定卻沒生效」十之八九是<b>被更高優先序的來源蓋掉了</b>（你改了設定檔，但環境變數還有一份舊的在蓋它）。排查設定問題，先搞清楚這套系統的優先序、逐層對，別只盯著你改的那一份。",
        ),
      },
      {
        title: "12-Factor：讓 app 天生就適合雲端部署的一套原則",
        chapter_id: 22,
        content: P(
          "12-Factor 是一份「雲端時代的 app 該怎麼寫」的經典守則。不用背全部，抓幾個對日常最有感的心法就受用。",
          "幾個核心：<b>設定放環境變數</b>（不寫死、不進 git）；<b>app 要無狀態</b>（別把資料存單台本機記憶體/硬碟，才好水平擴展）；<b>把後端服務當附加資源</b>（DB、快取、佇列都用連線字串接，可替換）；<b>log 當作事件流</b>（往 stdout 印，交給平台收集，別自己寫檔案管理）。",
          "跟著這些走，你的 app 自然就好部署、好擴展、好搬家。",
          "⚠️ 雷點：最常被違反、也最傷的是「<b>無狀態</b>」那條——把 session、上傳的檔案、快取存在單台本機。單機時沒事，一水平擴展成多台就爆（請求落到別台就找不到）。從一開始就把狀態放共用的地方（Redis、物件儲存），別等要擴展了才痛苦重構。",
        ),
      },
      {
        title: "correlation ID：一次請求橫跨好幾個服務，怎麼串起來",
        chapter_id: 24,
        content: P(
          "一個請求可能經過「前端 → API → 下游服務 → 佇列 → worker」好幾站。出事時，這些站各自的 log 散落各處，你根本對不起來「這一筆」到底在哪掛的。correlation ID 就是解這個。",
          "作法：請求一進來就產一個唯一 id（correlation / request id），<b>一路傳下去</b>——放進 log、呼叫下游時放進標頭往下帶、丟進佇列的訊息也帶著。之後用這個 id 一搜，整條鏈路的 log 全串起來。",
          "跟結構化 log 是絕配：每行 log 都帶這個 id，追一筆請求就像拉一條線，不會斷。",
          "⚠️ 雷點：這個 id 必須<b>跨服務邊界時被顯式傳遞</b>——最常斷在「丟進佇列/呼叫外部服務時忘了帶」。只要有一站沒往下傳，那之後的 log 就跟前面接不上了。每一個「跨越邊界」的地方都要記得把它塞進去。",
        ),
      },
      {
        title: "分散式 tracing：不只知道慢，還知道慢在哪一段",
        chapter_id: 24,
        content: P(
          "correlation ID 讓你「串起同一筆請求的 log」，但要看「這筆請求在每一段各花多久、哪一段是瓶頸」，就要更進一步的<b>分散式追蹤（distributed tracing）</b>。",
          "概念：一次請求是一個 <b>trace</b>，裡面每一段工作（一次 DB 查詢、一次外部呼叫）是一個 <b>span</b>，span 之間有父子關係。串起來就是一張「這筆請求的時間瀑布圖」，一眼看出「原來 80% 時間卡在那支外部 API」。",
          "業界標準是 <b>OpenTelemetry</b>（統一的埋點規格），資料送進 Jaeger、Tempo、或各家 APM 呈現。",
          "⚠️ 雷點：每一筆都完整追蹤，資料量和開銷會很可觀。生產環境通常做<b>取樣（sampling）</b>——只追一部分請求。取樣策略要挑好（例如「錯誤的、慢的一定留」），不然剛好想查的那筆沒被取樣、什麼都看不到。",
        ),
      },
      {
        title: "metrics 可觀測性：不是等使用者哭，是你先看到儀表板變色",
        chapter_id: 24,
        content: P(
          "log 是「一件件事的細節」，metrics 是「彙總後的數字趨勢」——像儀表板上的轉速、油溫。有它你才能『在使用者發現前』就看到不對勁。",
          "後端最該盯的幾個（業界叫黃金訊號）：<b>流量</b>（每秒幾個請求）、<b>錯誤率</b>（5xx 佔比）、<b>延遲</b>（回應時間，看 p95/p99 不是只看平均）、<b>飽和度</b>（CPU/記憶體/連線池快滿了沒）。",
          "常見組合：程式吐 metrics → Prometheus 收集 → Grafana 畫圖 + 設告警（錯誤率飆高就通知你）。",
          "⚠️ 雷點：延遲<b>只看平均會騙你</b>。平均 100ms 很漂亮，但可能有 5% 的使用者卡了 5 秒——那 5% 全被平均稀釋掉了。一定要看 p95/p99（尾端延遲），那才是「最慘的一批使用者」的真實體驗。",
        ),
      },
      {
        title: "dead letter queue：一直處理失敗的訊息，先移到一旁",
        chapter_id: 16,
        content: P(
          "用佇列跑背景任務時，總有些訊息「怎麼重試都失敗」（資料壞了、格式不對、觸發到 bug）。如果讓它一直卡在佇列頭反覆重試，會塞住後面所有正常訊息，還一直空轉燒資源。",
          "解法是<b>死信佇列（DLQ）</b>：一則訊息重試超過 N 次還失敗，就把它「搬到旁邊的死信佇列」、放它過去，讓主佇列繼續處理後面正常的。",
          "死信佇列裡的訊息不是丟掉、而是「隔離起來待調查」——你事後去看它們為什麼失敗、修好問題後可以重新投遞。",
          "⚠️ 雷點：DLQ 設了就要<b>有人盯</b>、要有告警。很多團隊訊息默默進了死信佇列卻沒人看，等於資料/任務靜靜地掉了、還以為系統一切正常。DLQ 堆積本身就該觸發警報。",
        ),
      },
      {
        title: "at-least-once vs exactly-once：訊息可能被處理不只一次",
        chapter_id: 16,
        content: P(
          "分散式訊息系統有個殘酷真相：大多數保證的是 <b>at-least-once（至少一次）</b>——訊息保證會送達，但可能<b>重複送</b>（網路抖動、ack 遺失導致重投）。真正的 exactly-once（精準一次）極難、代價很高。",
          "為什麼會重複：worker 處理完、正要回報「我做完了」時斷線，系統以為沒做完、就再投一次給另一個 worker。同一則訊息被做了兩遍。",
          "所以務實的做法不是「追求絕不重複」，而是<b>讓重複不造成傷害</b>——也就是讓你的處理邏輯冪等（同一則訊息做幾次結果都一樣）。",
          "⚠️ 雷點：別天真假設「訊息只會來一次」就直接扣款/發獎/寄信。一定要用「訊息 id 去重」或冪等鍵：處理前先查「這則 id 處理過沒」，處理過就跳過。這是分散式訊息的基本功，不是加分項。",
        ),
      },
      {
        title: "訊息順序：別假設佇列一定按順序給你",
        chapter_id: 16,
        content: P(
          "「先加入購物車、再結帳」——如果這兩個事件到 worker 手上順序反了，就會出錯。但很多人不知道：一般佇列在多消費者/多分區下，<b>不保證全域順序</b>。",
          "為什麼順序會亂：為了吞吐，佇列常把訊息分散給多個 worker 並行處理，A 先發但 B 先做完是常有的事。要順序，就得犧牲一部分並行。",
          "常見解法：<b>同一個實體的事件走同一個分區</b>（例如用 <code>user_id</code> 當 partition key），保證「同一個使用者的事件」有序，不同使用者之間則可並行。這是吞吐和順序的折衷。",
          "⚠️ 雷點：更穩的設計是「別依賴順序」——在訊息裡帶<b>版本號/時間戳</b>，處理時「比自己記錄的還舊就丟棄」。這樣就算亂序或重複到達也不會用到過期資料，比硬求嚴格順序省心得多。",
        ),
      },
      {
        title: "outbox pattern：資料庫寫了、訊息卻沒發出去怎麼辦",
        chapter_id: 16,
        content: P(
          "常見場景：下單要「寫進資料庫」+「發一則訊息到佇列通知別的服務」。問題是——DB 寫成功了，但發訊息那步失敗（或反過來），兩邊就不一致：訂單存了、下游卻不知道。這兩個動作不在同一個交易裡，沒法一起成敗。",
          "<b>outbox pattern</b> 巧妙地繞過：發訊息時不直接發，而是把「要發的訊息」<b>寫進同一個資料庫的一張 outbox 表</b>，跟業務資料在同一個交易裡——這樣「訂單」和「待發訊息」保證同生共死。",
          "然後有個獨立的程序（或 CDC）不斷把 outbox 表裡的訊息撈出來、真正發到佇列、發成功就標記已送。DB 和訊息就不會再對不上。",
          "⚠️ 雷點：outbox 的投遞是 at-least-once——那個轉發程序可能「發了、但還沒來得及標記已送就掛了」，重啟後又發一次。所以<b>消費端一樣要冪等/去重</b>。outbox 解的是「不漏發」，不是「不重發」。",
        ),
      },
      {
        title: "saga：跨多個服務的交易，靠一連串補償",
        chapter_id: 16,
        content: P(
          "單一資料庫裡「要嘛全成、要嘛全退」有交易罩著。但「訂機票 + 訂飯店 + 租車」分散在三個不同服務/資料庫時，沒有一個大交易能一起 rollback。saga 就是處理這種跨服務流程的模式。",
          "作法：把大流程拆成一連串本地小交易，<b>每一步都配一個「補償動作」</b>。訂機票成功、訂飯店也成功、租車失敗了——就依序執行補償：取消飯店、退機票，把已完成的步驟一步步「倒帶」回去。",
          "它換來的不是「原子性」，而是「最終要嘛全部完成、要嘛全部被補償抵銷」的一致性。",
          "⚠️ 雷點：補償動作本身也可能失敗、也要能重試、也要冪等——「退款」重複執行不能退兩次。而且有些步驟「做了就補償不回來」（信已經寄出去了），這類不可逆的動作要盡量往流程<b>最後</b>擺，別排在前面。saga 比想像中難寫對。",
        ),
      },
      {
        title: "最終一致性：不是不一致，是「稍等一下就一致」",
        chapter_id: 16,
        content: P(
          "強一致性（寫完馬上到處都讀得到最新值）在單機資料庫很自然，但一旦資料跨多台/多地複製，硬要「每次都全球即時一致」會慢到不能用。於是很多系統選<b>最終一致性</b>。",
          "意思是：更新後，各個副本會「在很短的時間內」陸續同步到最新——不是永遠不一致，是「有一個短暫的窗口，不同地方讀到的可能還不一樣，但終究會收斂到一致」。",
          "生活例子：你改了個人頭像，自己馬上看到新的，但朋友那邊過幾秒才更新。這體驗完全可接受——用最終一致換來了速度和可用性。",
          "⚠️ 雷點：最經典的坑是<b>「讀自己剛寫的」</b>——使用者剛送出留言、頁面重整卻看不到（讀到還沒同步的舊副本），以為壞了。對「自己的操作」要保證能立刻讀到（讀主庫或讀寫黏同一節點）；能容忍延遲的（別人的資料）才放給最終一致。分清楚哪些能等、哪些不能。",
        ),
      },
      {
        title: "advisory lock：用資料庫當「全應用共用的鎖」",
        chapter_id: 17,
        content: P(
          "多台伺服器同時跑，你想確保「某件事同一時間只有一台在做」（例如同一個排程任務別被兩台重複執行）。在記憶體裡加鎖沒用（各台記憶體不通）。Postgres 的 <b>advisory lock</b> 剛好能當這個跨機共用鎖。",
          "它是「應用自己定義意義」的鎖，不綁定某一列資料。<code>pg_try_advisory_lock(key)</code>：搶到回 true、沒搶到回 false（不會等）。搶到的那台去做事、做完 <code>pg_advisory_unlock</code> 釋放，其他台搶不到就跳過。",
          "常用來做：分散式互斥、「同一資源同時只准一個 worker 處理」、防止排程重複跑。",
          "⚠️ 雷點：<b>session 級</b>的 advisory lock 綁在連線上——連線一斷（程序崩了、連線池回收）鎖會自動釋放，可能你以為還鎖著、其實早放了。而且用連線池時，unlock 要用「當初 lock 的同一條連線」，池子換連線就對不上。搞不清就用「交易級」（<code>pg_advisory_xact_lock</code>），交易結束自動放，比較不會漏。",
        ),
      },
      {
        title: "row level security（RLS）：權限直接寫在資料庫那一列",
        chapter_id: 17,
        content: P(
          "一般權限檢查寫在應用層（每支 API 自己判斷「這個人能不能看這筆」）。RLS 把這道關<b>下沉到資料庫</b>：直接定義「哪個使用者能讀/寫哪些列」，繞不過去。",
          "作法：對表開啟 RLS，寫 policy，例如「使用者只能 select <code>user_id = 當前登入者</code> 的列」。之後不管是哪支查詢、哪個後門進來，資料庫都只吐出符合政策的列。這是 Supabase 安全的核心。",
          "好處：就算某支 API 忘了做權限檢查，資料庫這層仍擋著——多一道不可繞過的防線。",
          "⚠️ 雷點：兩個常見致命錯——① 開了 RLS 卻<b>忘了寫 policy</b>，預設是「什麼都讀不到」，功能整個壞掉還以為程式錯了；② 用 <code>service_role</code> / 超級權限的連線會<b>直接繞過 RLS</b>，別把這種金鑰用在面向使用者的路徑上，等於門開著。上線前逐表確認 policy。",
        ),
      },
      {
        title: "讀寫分離：查詢分流到副本，別全壓在主庫",
        chapter_id: 19,
        content: P(
          "網站讀多寫少（看的人遠比改的人多）。當單一資料庫扛不住，一個經典解法是<b>讀寫分離</b>：一台<b>主庫（primary）</b>負責所有寫入，資料同步複製到多台<b>副本（replica）</b>，把大量的讀查詢分流到副本上。",
          "這樣主庫專心處理寫、不被海量讀查拖累；讀的容量也能靠「多加幾台副本」水平擴充。很多雲資料庫（含 Supabase）都提供唯讀副本。",
          "程式端要做的：寫走主庫連線、讀走副本連線，把查詢導對地方。",
          "⚠️ 雷點：主庫到副本的複製<b>有延遲</b>（通常毫秒級，但存在）。使用者「剛寫完、馬上讀」若讀到副本，可能讀到還沒同步的舊值（就是前面說的最終一致性坑）。對「寫後要立刻讀到」的操作，強制走主庫；能容忍一點延遲的讀才放去副本。",
        ),
      },
      {
        title: "sharding 分片：一張表大到單機裝不下，就拆到多台",
        chapter_id: 19,
        content: P(
          "讀寫分離解「讀」的壓力，但「寫」和「總資料量」還是全壓在一台主庫。當資料大到單機的磁碟/記憶體都裝不下，就要<b>分片（sharding）</b>——把資料<b>水平切開、分散到多台獨立的資料庫</b>。",
          "怎麼切：挑一個<b>分片鍵（shard key）</b>（例如 <code>user_id</code>），用它決定「這筆資料放哪一台」（雜湊或範圍）。查某使用者的資料，就去他所在的那台。每台只存全部的一部分，各自扛自己那份的讀寫。",
          "這是「水平擴展寫入」的終極手段，超大規模（很多筆、很多寫）才需要。",
          "⚠️ 雷點：sharding 是複雜度炸彈，<b>能不分就別分</b>。跨分片的查詢（要 join 不同台的資料、跨片交易、全域排序分頁）會變得極難；分片鍵選錯導致資料/流量集中在某台（熱點）更慘；日後要「重新分片」是惡夢。先把單機優化（索引、快取、讀副本、分區）榨乾，真的到瓶頸再考慮。",
        ),
      },
      {
        title: "分區 partitioning：一張大表，資料庫內部切成好幾塊",
        chapter_id: 19,
        content: P(
          "分片是「拆到多台機器」，<b>分區（partitioning）</b>是輕量版——<b>同一台資料庫裡</b>，把一張邏輯上的大表，內部依規則切成好幾個小塊（分區），但你查起來還是當它一張表。",
          "最常見是<b>按時間分區</b>：日誌/訂單表按月切，<code>logs_2026_01</code>、<code>logs_2026_02</code>…。查「上個月的」時，資料庫只掃那一個分區、跳過其他（叫 partition pruning），快很多。",
          "另一大好處：清舊資料超快——要刪掉一整個月的舊 log，直接 <code>drop</code> 掉那個分區（瞬間），比 <code>delete ... where</code> 慢慢刪好上百倍。",
          "⚠️ 雷點：分區的好處只有在「查詢條件帶到分區鍵」時才吃得到（按月分區、查詢就要帶時間範圍，資料庫才能只掃相關分區）。查詢沒帶分區鍵，等於掃全部分區、沒省到。還有唯一約束、索引在分區表上有些限制，設計時要一併想清楚。",
        ),
      },
      {
        title: "物化視圖 materialized view：把慢查詢的結果先算好存起來",
        chapter_id: 19,
        content: P(
          "有些報表查詢很重（多表 join + 大量聚合），每次即時算要好幾秒。如果這結果「不需要每秒最新、允許有點延遲」，就可以用<b>物化視圖</b>把算好的結果實體存下來，查的時候直接讀。",
          "跟一般 view 的差別：普通 view 是「每次查都重新跑一次底層 SQL」（只是存了語句），物化視圖是<b>真的把結果算出來存成一張表</b>，查它就像查一般表一樣快。",
          "適合：儀表板統計、排行榜、每日彙總這種「算很久、但不用即時、可以定時更新」的資料。",
          "⚠️ 雷點：物化視圖的資料<b>不會自動更新</b>——底層資料變了，它還是舊的，要你手動或排程 <code>REFRESH MATERIALIZED VIEW</code> 重算。而且一般的 refresh 會<b>鎖住整張</b>（refresh 期間不能查），資料量大要用 <code>REFRESH ... CONCURRENTLY</code>（要有唯一索引）才不擋讀。別忘了排 refresh，不然使用者看到的永遠是舊數字。",
        ),
      },
      {
        title: "vacuum：Postgres 為什麼要定期「打掃」",
        chapter_id: 19,
        content: P(
          "Postgres 的 <code>UPDATE</code>/<code>DELETE</code> 不是真的當場改掉/清掉舊資料——它是把舊版本標記為「死掉的（dead tuple）」、另寫新版本（這是它做多版本並發控制 MVCC 的方式）。這些死掉的舊資料會一直佔著空間，得靠 <b>VACUUM</b> 來回收。",
          "所以更新頻繁的表會「膨脹（bloat）」：實際有效資料沒多少，但檔案越長越大、查詢越來越慢。VACUUM 就是回收這些死 tuple 的空間、讓它能被重用。它平常由 <b>autovacuum</b> 自動在背景做。",
          "另一個關鍵任務：VACUUM 會更新統計資訊（給查詢規劃器參考）、還防止一個叫 transaction ID 環繞的嚴重問題。",
          "⚠️ 雷點：大量更新/刪除的表，autovacuum 可能<b>追不上</b>膨脹速度，表越來越肥、查詢越來越慢。症狀是「資料筆數沒暴增、但查詢莫名變慢、磁碟一直漲」。這時要調 autovacuum 更積極，或針對熱點表手動 VACUUM。注意 <code>VACUUM FULL</code> 會鎖表、慎用。",
        ),
      },
      {
        title: "PITR 時間點還原：救回「刪掉前那一秒」的資料",
        chapter_id: 19,
        content: P(
          "每日備份能救「昨天」，但如果今天下午三點有人手滑跑了個沒帶 where 的 <code>delete</code>，你只能還原到昨天午夜、今天一整天的資料全沒了。<b>PITR（時間點還原）</b>能把你救到「災難發生前的任意一秒」。",
          "原理：一份基底備份 + 之後<b>持續累積的交易日誌（WAL）</b>。還原時，先套用基底備份、再把 WAL「重放」到你指定的那個時間點就停——精準回到「下午 2:59:59」，剛好在那個手滑 delete 之前。",
          "很多雲資料庫（含 Supabase 較高方案）提供 PITR，讓你選一個時間戳去還原。",
          "⚠️ 雷點：PITR 通常是還原成「一個新的資料庫實例」、不是就地倒回——你要把救回的資料再搬回正式庫，中間服務怎麼處理要先想好。而且它有「保留窗口」（例如只能回到 7 天內），過期就救不回。最重要的老話：<b>先演練過還原，別等真出事才第一次用</b>。",
        ),
      },
      {
        title: "線上加欄位：一個 ALTER TABLE 差點鎖垮全站",
        chapter_id: 19,
        content: P(
          "正式環境幫大表加欄位，看起來人畜無害的 <code>ALTER TABLE</code>，卻可能瞬間鎖住整張表、讓所有讀寫卡住、全站掛掉。加欄位這件小事，在大表上要很小心。",
          "好消息：現代 Postgres 加「<b>可為 NULL、或帶常數預設值</b>」的欄位是很快的（只改中繼資料、不重寫全表）。<code>add column note text</code>、<code>add column status text default 'active'</code> 都很輕。",
          "危險的是「加欄位<b>同時</b>要回填一個非常數的值」（例如預設值是個函式、或加 NOT NULL 又要算舊資料）——那可能要掃/改寫整張表，大表上就是長時間鎖表。",
          "⚠️ 雷點：安全的做法是<b>拆成多步</b>——① 先加可空的新欄位（快）；② 分批回填舊資料（別一句 update 全表）；③ 資料補齊後再視需要加約束/NOT NULL。加約束時用 <code>NOT VALID</code> 先掛上、再 <code>VALIDATE</code>（不鎖寫）。別在正式大表上一句 ALTER 打天下。",
        ),
      },
      {
        title: "安全地移除欄位：drop column 前先「假裝它不存在」",
        chapter_id: 19,
        content: P(
          "一個欄位不用了想刪掉。直接 <code>drop column</code> 看似乾脆，但在零停機部署下——「還在跑的舊版程式」可能仍會讀寫這個欄位，你一刪，舊版當場報錯。移除欄位比新增更要小心順序。",
          "安全的<b>擴展-收縮（expand-contract）</b>做法：① 先改程式，讓<b>所有版本都不再用</b>這個欄位（但欄位還留著）；② 部署、確認線上沒有任何程式碼碰它了；③ 再真正 <code>drop column</code>。",
          "順序反過來（先刪欄位、再改程式）就是災難——中間那段舊程式找不到欄位、狂噴錯。",
          "⚠️ 雷點：drop 之前<b>務必確認沒有殘留依賴</b>——view、觸發器、外鍵、生成欄位、程式裡的 <code>select *</code> 或 ORM 模型可能都還指著它。還有一刪就<b>資料真的沒了</b>，先確認有備份、且短期內不會想反悔。不確定就先「停用」一陣子（改名加前綴、確認無人使用），再刪。",
        ),
      },
      {
        title: "API 版本管理：改壞舊客戶端是大忌",
        chapter_id: 20,
        content: P(
          "API 上線後就有人在用（前端、App、第三方）。你一改回傳格式或拿掉欄位，那些還在用舊版的客戶端當場壞掉。API 版本管理就是讓你「能演進、又不砸爛既有使用者」。",
          "最常見是<b>放在網址</b>：<code>/api/v1/users</code>、<code>/api/v2/users</code>。要做破壞性變更就開 v2，v1 維持不動，客戶端各自按步調遷移。也有用標頭帶版本的做法。",
          "關鍵心法：分清楚<b>相容 vs 破壞</b>。「加一個新欄位、加一個選填參數」是相容的（舊客戶端不受影響），可以直接改；「刪欄位、改欄位意義、把選填改必填」是破壞性的，才需要升版本。",
          "⚠️ 雷點：開了新版本不代表舊版能立刻殺掉——要<b>公告棄用（deprecation）時程、給遷移期</b>，並想辦法知道「還有誰在用 v1」（看 log/用量）。沒人用了再下線。悄悄關掉舊版，等於突襲所有還沒遷移的使用者。",
        ),
      },
      {
        title: "批次 API：讓前端一次送多筆，別打一百次",
        chapter_id: 20,
        content: P(
          "前端要一次建立/更新 50 筆資料，如果 API 只能「一次一筆」，它就得發 50 個請求——網路來回、連線、驗證各重複 50 次，慢又浪費。批次 API 就是「一個請求收多筆」。",
          "設計：接受一個陣列 <code>POST /items/batch { items: [...] }</code>，後端一次處理完回結果。內部盡量用批次 insert/upsert，別自己在迴圈裡一筆筆打 DB（又變 N+1）。",
          "好處：大幅減少往返次數、後端能包成一個交易保證一致、整體吞吐好很多。",
          "⚠️ 雷點：批次最尷尬的是<b>「部分成功」</b>——50 筆裡第 30 筆壞了，怎麼回？要嘛「全有全無」（包交易，一筆錯整批 rollback），要嘛「逐筆回報成敗」（回一個陣列，標明哪幾筆成功哪幾筆失敗、各自原因）。<b>一定要講清楚是哪種語意</b>，別讓前端猜。另外要限制單批筆數上限，防有人一次塞十萬筆打爆你。",
        ),
      },
      {
        title: "樂觀鎖實作：用一個 version 欄位擋掉「後蓋前」",
        chapter_id: 17,
        content: P(
          "兩個人同時打開同一筆資料編輯，A 先存、B 後存——B 是拿「A 改之前的舊底稿」去覆蓋，A 的修改就被靜默蓋掉了（lost update）。樂觀鎖用一個小小的 version 欄位就能擋住這種悲劇，這裡講怎麼實作。",
          "作法：表加一個 <code>version int</code> 欄位。讀資料時連 version 一起讀（例如讀到 version = 5）。更新時把它當條件、並讓它 +1：<code>update t set ..., version = version + 1 where id = ? and version = 5</code>。",
          "關鍵在看「<b>更新影響的筆數</b>」：如果是 1，代表沒人在你之前改過（version 還是 5），更新成功；如果是 <b>0</b>，代表在你讀完到要存之間、別人已經改過（version 早就不是 5 了），這次更新就撲空——你回報衝突，讓使用者「重新載入最新版再改」。",
          "⚠️ 雷點：一定要<b>檢查 affected rows</b> 來判斷成敗——很多人寫了 <code>where version = ?</code> 卻不看回傳筆數，更新 0 筆也當成功，等於白做、衝突照樣發生。也可以用 <code>updated_at</code> 時間戳代替 version，但精度不夠時（同毫秒）會誤判，用整數 version 最穩。",
        ),
      },
      {
        title: "先懂全貌：一次請求的旅程",
        chapter_id: 16,
        content: P(
          "後端很多概念，理解這張圖就通一半：使用者點按鈕 → 前端送 request 到後端某網址(API) → 後端處理(可能查 DB) → 回 response(通常 JSON) → 前端更新畫面。",
          "API 就是後端「對外開放的窗口」。前端不直接碰資料庫，透過窗口要資料——安全、也好維護。",
          "JSON 是前後端傳資料的通用格式，長得像 JS 物件 <code>{\"name\":\"小明\",\"age\":15}</code>。",
          "⚠️ 最重要的心法：該在後端做的事（驗證、算錢、權限）別放前端——前端的東西使用者都能改，絕不能信。",
        ),
      },
      {
        title: "HTTP 方法與狀態碼：看數字就知道發生什麼",
        chapter_id: 75,
        content: P(
          "方法（動詞）：GET 取、POST 新增、PUT/PATCH 改、DELETE 刪。網址「資源用名詞、動作交給方法」：<code>GET /users/123</code>、<code>DELETE /users/123</code>。",
          "狀態碼大分類：2xx 成功、4xx 你(前端)錯、5xx 後端錯。",
          "常見：200 成功、201 已建立、400 參數錯、401 未登入、403 沒權限、404 找不到、500 伺服器爆。",
          "怎麼用：401 去查登入態、404 查網址、500 去翻後端 log。",
          "⚠️ 別把所有錯誤都回 200，前端無法判斷成敗。錯就回對應的 4xx/5xx。",
        ),
      },
      {
        title: "SQL 入門：資料庫就是一堆表格",
        chapter_id: 17,
        content: P(
          "把關聯式資料庫想成很多張 Excel，SQL 是你「用文字下指令」去查去改。",
          "查：<code>select * from users where age &gt; 18 order by created_at desc limit 10;</code>（挑年齡&gt;18、新到舊、只要前 10 筆）。",
          "接兩張表(join)：<code>select u.name, o.amount from users u join orders o on o.user_id = u.id;</code>。",
          "彙總：<code>select city, count(*) from users group by city;</code>。",
          "⚠️ 查詢變慢多半是「常 where/join 的欄位沒建 index」。先看有沒有索引，別急著怪資料庫。",
        ),
      },
      {
        title: "Supabase 速用（Postgres + 現成後端）",
        chapter_id: 17,
        content: P(
          "Supabase 把 Postgres 資料庫、登入驗證、檔案儲存都包好，讓你少寫很多後端。",
          "查 <code>supabase.from('t').select('*').eq('col', val)</code>；寫 <code>.insert({...})</code> / <code>.update({...}).eq(...)</code> / <code>.delete().eq(...)</code>。",
          "RLS(Row Level Security)：直接在資料庫層設「誰能讀寫哪些列」，是它安全的核心。",
          "⚠️ RLS 忘了開或寫太鬆，等於門戶大開。上線前一定確認每張表的政策。",
        ),
      },
      {
        title: "安全基本功：永遠不要相信前端",
        chapter_id: 12,
        content: P(
          "這是我覺得後端最重要的一句，先記住。",
          "後端要再驗一次：前端檢查只是體驗好，真正把關在後端——前端傳來的任何東西使用者都能偽造。",
          "密鑰放環境變數、絕不進 git：API key、DB 密碼放 <code>.env.local</code> 並 gitignore，commit 上去就是公開。",
          "防注入顧密碼：SQL 用參數化查詢、別把使用者輸入直接拼字串；密碼一定 hash 後存、絕不存明碼。",
          "⚠️ 機密不小心 push 上 GitHub，就算馬上刪也要當它外洩、立刻換掉那把 key。",
        ),
      },
      {
        title: "環境變數與部署：讓它在別人電腦也跑得起來",
        chapter_id: 22,
        content: P(
          "為什麼要環境變數？因為「設定」（DB 網址、金鑰）不該寫死在程式裡，換環境不用改碼。",
          "本機放 <code>.env.local</code>；上線在平台的 runtime env 貼一份。",
          "public 前綴要小心：有 <code>NEXT_PUBLIC_</code> 的才會送到前端瀏覽器——機密絕對不要加這前綴。",
          "部署後先打一支 API、看 log，確認真的有起來再宣布完成。",
          "⚠️ 「本機好好上線就掛」十之八九是環境變數沒設或設錯，先比對兩邊 env。",
        ),
      },
      {
        title: "後端常見錯誤與怎麼查 log",
        chapter_id: 24,
        content: P(
          "500 先看 log、不要猜——內部錯誤的真正原因都在後端 log。養成「出事先翻 log」。",
          "CORS 被擋：前端 Console 出現 CORS 字樣＝後端沒允許這來源，去設允許清單。",
          "忘了 await：非同步沒 await，拿到 Promise 不是資料，後面全錯。",
          "時區：DB 存 UTC、顯示再轉當地，才不會差 8 小時。",
          "⚠️ 錯誤直接吞掉(catch 什麼都不做)出事完全查不到，至少記進 log。",
        ),
      },
      {
        title: "RESTful：API 網址怎麼取名才不亂",
        chapter_id: 20,
        content: P(
          "剛做 API 時我亂取名 <code>/getUser</code>、<code>/createUserNow</code>，越做越亂。RESTful 給了一套規矩就整齊了。",
          "核心：<b>網址用名詞（資源）、動作交給 HTTP 方法</b>。同一個 <code>/users/123</code>：GET 是查、PUT/PATCH 是改、DELETE 是刪。",
          "複數 + 階層：<code>/users/123/orders</code> = 「123 號使用者的訂單」。查詢條件用 query string：<code>/users?role=admin&page=2</code>。",
          "版本放前面：<code>/api/v1/...</code>，之後改版不會弄壞舊的呼叫端。",
          "⚠️ 別把動詞塞進網址（<code>/deleteUser</code>）；也別用 GET 去改資料——GET 應該是「安全、可重複、不改東西」的。",
        ),
      },
      {
        title: "認證 vs 授權：兩件常被搞混的事",
        chapter_id: 21,
        content: P(
          "面試也常考：<b>認證（authentication）</b>是「你是誰」、<b>授權（authorization）</b>是「你能做什麼」。先確認身分，再看權限。",
          "對應狀態碼：沒登入（不知道你是誰）回 <b>401</b>；登入了但沒權限回 <b>403</b>。看到哪個就知道往哪查。",
          "常見做法：登入後給一張 token（JWT）或 session，之後每次請求都帶著它證明身分；後端每個要保護的動作再檢查權限。",
          "⚠️ 授權一定要在<b>後端</b>做。前端把「刪除按鈕」藏起來只是體驗，真正的權限檢查在 API，不然有人直接打 API 就繞過了。",
        ),
      },
      {
        title: "密碼要「雜湊」不是「加密」（用 bcrypt）",
        chapter_id: 21,
        content: P(
          "新手最危險的一個誤會：把密碼「加密」存起來。加密是可以解回來的——一旦金鑰外洩，全部密碼曝光。",
          "正解是<b>雜湊（hash）</b>：單向、解不回去。使用者登入時，把他輸入的密碼再 hash 一次、跟資料庫比對。你（開發者）永遠不知道原始密碼。",
          "用專門的密碼雜湊函式 <code>bcrypt</code> / <code>argon2</code>，它們刻意「算得慢」+ 自帶「加鹽（salt）」，防止暴力破解與彩虹表。別用 MD5/SHA1 存密碼。",
          "⚠️ 絕不自己發明加密演算法、也不要把密碼寫進 log。安全的東西用現成、被驗證過的函式庫。",
        ),
      },
      {
        title: "N+1 查詢：迴圈裡打 DB 的隱形殺手",
        chapter_id: 19,
        content: P(
          "頁面越來越慢、DB 快爆掉，很多時候是 N+1：先查一次拿到 N 筆，再對每一筆各查一次 DB（1 + N 次）。",
          "例：查出 100 篇文章（1 次），再迴圈對每篇「查作者」（100 次）＝ 101 次查詢。資料一多就卡死。",
          "解法：一次撈齊。用 join、或「先收集所有作者 id、一次 <code>where id in (...)</code> 撈回來」再在程式裡配對。ORM 通常有 eager load / include 選項。",
          "⚠️ 開發時資料少感覺不出來，上線資料一多就爆。看到「迴圈裡面在查資料庫」就要警覺。",
        ),
      },
      {
        title: "dev / staging / prod：為什麼要分環境",
        chapter_id: 22,
        content: P(
          "剛開始我都直接在正式站改東西，遲早出事。分環境就是「給你安全犯錯的地方」。",
          "<b>dev</b>（你電腦）隨便玩；<b>staging</b>（測試站）跟正式幾乎一樣、上線前先在這驗；<b>prod</b>（正式站）真實用戶在用，最小心。",
          "每個環境用各自的設定（資料庫、金鑰）＝各自的環境變數，程式碼不用改，換 env 就好。",
          "測試資料別碰到正式資料庫；正式的資料備份要有。",
          "⚠️ 最痛的雷：拿正式資料庫的連線在本機亂測，一個手滑 <code>delete</code> 沒帶條件就災難。連線字串看清楚是哪個環境再動手。",
        ),
      },
      {
        title: "JWT vs session：登入狀態怎麼記住",
        chapter_id: 21,
        content: P(
          "HTTP 每次請求都是「陌生人」，伺服器怎麼知道「你就是剛剛登入的那個」？兩種主流做法。",
          "<b>Session</b>：伺服器存一份「誰登入了」，發一個 session id 給瀏覽器（放 cookie），之後每次帶回來對。狀態在伺服器、要登出很容易（刪掉就好）。",
          "<b>JWT（token）</b>：伺服器發一張「簽名過、內含你身分」的票，瀏覽器收好、每次請求帶著。伺服器不用存、驗簽名就好，適合多台伺服器/API。",
          "⚠️ JWT 一旦發出去、到期前很難「立刻作廢」（因為伺服器沒存）——所以設短效期 + refresh token。token 別放能被 JS 讀的地方（防 XSS 偷走）。",
        ),
      },
      {
        title: "CORS 到底是什麼、為什麼一直擋我",
        chapter_id: 75,
        content: P(
          "前端呼叫後端 API 被瀏覽器擋、Console 一堆紅字 CORS——這幾乎每個人都遇過。",
          "CORS 是<b>瀏覽器的安全機制</b>：預設不讓「A 網站的 JS」去打「B 網站的 API」，除非 B 明講「我允許 A」。",
          "解法在<b>後端</b>：回應加上 <code>Access-Control-Allow-Origin</code> 等標頭、把你的前端來源列進允許清單。不是前端寫錯。",
          "有些請求前瀏覽器會先發一個 <code>OPTIONS</code>「預檢」，後端要正確回它。",
          "⚠️ 別為了方便設 <code>Allow-Origin: *</code> 又同時要帶 cookie——這組合瀏覽器會拒絕，而且也不安全。正式環境列明確來源。",
        ),
      },
      {
        title: "資料庫索引 index：查詢慢的第一個解法",
        chapter_id: 19,
        content: P(
          "資料一多查詢就變慢，九成先看「有沒有索引」。",
          "索引像書的目錄：沒索引，資料庫要「一列一列翻」（全表掃描）；有索引，直接跳到位置，快好幾個數量級。",
          "怎麼加：對「常拿來 <code>WHERE</code>、<code>JOIN</code>、<code>ORDER BY</code> 的欄位」建索引。<code>create index idx_users_email on users(email);</code>。",
          "驗證：<code>EXPLAIN</code> 你的查詢，看它是走索引還是全表掃描。",
          "⚠️ 索引不是越多越好——每個索引都會讓「寫入」變慢、也佔空間。加在「真的常查」的欄位就好。",
        ),
      },
      {
        title: "交易 transaction：要嘛全部成功、要嘛全部退回",
        chapter_id: 17,
        content: P(
          "轉帳：A 扣錢、B 加錢。如果 A 扣了、B 還沒加就當機——錢就消失了。交易就是防這個。",
          "交易把「好幾個動作綁成一組」：全部成功才 <code>COMMIT</code>（生效）；中途出錯就 <code>ROLLBACK</code>（整組退回、當沒發生）。",
          "這就是 ACID 的 A（原子性）——一組操作不可分割。",
          "實務：任何「多步驟、少一步就資料不一致」的操作（下單扣庫存、轉點數）都該包在交易裡。",
          "⚠️ 交易別包太久太大（會鎖住資料、卡住別人）；只把「必須一起成敗」的那幾步包進去。",
        ),
      },
      {
        title: "分頁 pagination：別一次撈全部",
        chapter_id: 20,
        content: P(
          "資料表有十萬筆，前端一次 <code>select *</code> 全撈——頁面卡死、後端也累。要分頁。",
          "最單純：<code>LIMIT 20 OFFSET 40</code>（第 3 頁、每頁 20）。好懂但資料很多時 OFFSET 大了會變慢。",
          "更穩的做法：<b>cursor 分頁</b>——記住「上一頁最後一筆的時間/id」，下一頁查「比它更後面的 20 筆」（<code>where created_at &lt; ? limit 20</code>），大資料也快。",
          "⚠️ 提醒：Supabase/PostgREST 預設一次最多回 1000 筆，撈整表要自己分頁（`.range()`），不然會被默默截斷。",
        ),
      },
      {
        title: "快取 caching：算過的別再算一次",
        chapter_id: 18,
        content: P(
          "同樣的資料被重複要、同樣的計算被重複做，很浪費。快取就是「存起來、下次直接用」。",
          "常見層：瀏覽器/CDN 快取靜態檔；後端把「算很久或很常查」的結果暫存（記憶體/Redis）；資料庫查詢結果快取。",
          "關鍵是<b>失效（invalidation）</b>：資料變了，快取要跟著更新或清掉，不然給到舊資料。常用「設一個過期時間」最簡單。",
          "⚠️ 名言：「電腦科學兩大難題之一就是快取失效。」先確定「這東西真的常被重複要、且不常變」再快取，別過度優化。",
        ),
      },
      {
        title: "Rate limiting：防止被打爆/被濫用",
        chapter_id: 20,
        content: P(
          "API 沒有限流，有人（或壞掉的前端迴圈）狂打，伺服器就掛了，也可能被刷爆成本。",
          "作法：限「每個使用者/IP 每段時間最多幾次」，超過就回 <b>429 Too Many Requests</b>。",
          "登入、寄信、AI 呼叫這種「貴或敏感」的端點特別要限。",
          "⚠️ 回 429 時最好附「多久後可再試」（<code>Retry-After</code>），讓前端知道等一下再送、而不是一直重打。",
        ),
      },
      {
        title: "Webhook：不是你去問、是它主動通知你",
        chapter_id: 20,
        content: P(
          "一般 API 是「你主動問」（拉）。Webhook 反過來：<b>事情發生時，對方主動打你的一個網址通知你</b>（推）。",
          "金流最典型：使用者付款成功，金流商 webhook 打你的 <code>/api/webhook</code>，你才知道「這筆真的付了」→ 開通權限。",
          "你要做的：提供一個 URL 接收、<b>驗證簽名</b>確認真的是對方發的（不是別人偽造）、快速回 200。",
          "⚠️ 兩個雷：① 一定要驗簽名，不然有人偽造「付款成功」白嫖；② 同一事件可能重送（要冪等，見下一則），別重複開通兩次。",
        ),
      },
      {
        title: "冪等性 idempotency：同一個請求做兩次結果一樣",
        chapter_id: 20,
        content: P(
          "網路會重試、webhook 會重送、使用者會連點——同一個操作可能來兩次。冪等就是「做幾次結果都一樣、不會重複扣款/重複建」。",
          "GET/DELETE 天生冪等；<b>POST（建立）最危險</b>——重送就多建一筆。",
          "常見解法：讓請求帶一個唯一的 <code>idempotency key</code>，伺服器記住「這個 key 處理過了」，重來就回上次結果、不再執行。",
          "⚠️ 金流、下單、發獎勵這種「重複做會出事」的，一定要設計冪等。webhook 收到先查「這事件 id 處理過沒」。",
        ),
      },
      {
        title: "Secret 管理：金鑰別散落、別進 git",
        chapter_id: 22,
        content: P(
          "API key、資料庫密碼這些機密，管不好就是資安破口。",
          "原則：放<b>環境變數</b>、程式從 env 讀，絕不寫死在程式碼、絕不 commit 進 git。給一份 <code>.env.example</code> 列「需要哪些變數」但不放真值。",
          "上線在平台的 secret 管理（Zeabur/Vercel 的 env、或雲的 Secrets Manager）設；不同環境不同值。",
          "只有伺服器該看到的機密，別加會外洩到前端的前綴（如 <code>NEXT_PUBLIC_</code>）。",
          "⚠️ 一旦懷疑外洩（不小心 push、貼錯地方）——當它已經洩了，<b>立刻換掉那把 key</b>，別心存僥倖。",
        ),
      },
      {
        title: "後端一定要再驗一次：schema 驗證",
        chapter_id: 12,
        content: P(
          "前端傳來的 JSON 你不能信——欄位可能缺、型別可能錯、可能被人塞惡意值。後端進來第一件事就是驗。",
          "用 schema 驗證工具（如 zod）定義「這個 API 收什麼形狀」，一進來就 parse：不合格直接回 400、附清楚哪裡錯。",
          "好處：後面的程式碼可以放心假設資料是乾淨的、型別也對，少一堆 <code>if</code> 檢查。",
          "⚠️ 別只驗「有沒有」，也要驗「合不合理」（價格不能負、email 要像 email、字串長度上限）。沒驗長度上限，有人塞 10MB 字串進來也會出事。",
        ),
      },
      {
        title: "檔案上傳：別讓它變成資安/成本破口",
        chapter_id: 12,
        content: P(
          "讓使用者上傳頭像、圖片，看似簡單，坑不少。",
          "限制：檔案<b>大小上限</b>（不然有人塞超大檔）、<b>型別白名單</b>（只收 jpg/png，別收 .exe/.svg 帶腳本）。",
          "別信副檔名——檢查真正的檔案內容（magic bytes）；檔名重新產生（別用使用者給的原檔名，可能有路徑攻擊）。",
          "存哪：大檔存物件儲存（S3/R2/Supabase Storage），資料庫只存「網址」，別把檔案本體塞進 DB。",
          "⚠️ 上傳的檔案若能被公開存取，等於開了一個「任何人能放東西上你網域」的口——型別、大小、掃描都要顧。",
        ),
      },
      {
        title: "非同步任務與佇列：慢的事別卡住請求",
        chapter_id: 16,
        content: P(
          "使用者按「送出」，如果後面要寄信、產 PDF、跑 AI——這些很慢，別讓他乾等 10 秒。",
          "作法：請求先「把工作丟進佇列（queue）」就馬上回「收到、處理中」，背景的 worker 再慢慢做。",
          "使用者體驗好（不卡）、也能分散尖峰負載、失敗還能重試。",
          "小專案沒到要上 Redis/佇列服務時，先用「排程 cron 定期處理」或平台的背景任務也行。",
          "⚠️ 背景任務要能「失敗重試 + 冪等」，不然重試會重複做（重複寄信）。做完要有地方看狀態/log。",
        ),
      },
      {
        title: "SQL JOIN 三種：inner / left / right",
        chapter_id: 17,
        content: P(
          "JOIN 是「把兩張表接起來一起查」，差別在「沒對到的資料留不留」。",
          "<b>INNER JOIN</b>：只留「兩邊都有對到」的。查「有下過訂單的使用者」。",
          "<b>LEFT JOIN</b>：左表全留，右表沒對到補 NULL。查「所有使用者 + 他的訂單（沒訂單也要列出來）」——最常用。",
          "<b>RIGHT JOIN</b>：反過來（右表全留），少用，通常把表對調改用 LEFT。",
          "⚠️ JOIN 條件（<code>ON a.id = b.a_id</code>）忘了寫，會變成「每一列配每一列」的笛卡兒積、爆量。JOIN 的欄位記得建索引。",
        ),
      },
      {
        title: "GROUP BY 與聚合：分組算總數/平均",
        chapter_id: 17,
        content: P(
          "「每個城市有幾人」「每個月營收多少」這種統計，用 GROUP BY + 聚合函式。",
          "聚合函式：<code>COUNT(*)</code> 數量、<code>SUM()</code> 加總、<code>AVG()</code> 平均、<code>MAX/MIN</code>。",
          "<code>SELECT city, COUNT(*) FROM users GROUP BY city;</code>——依 city 分組、各組數量。",
          "要對「分組後的結果」再篩選用 <code>HAVING</code>（不是 WHERE）：<code>... GROUP BY city HAVING COUNT(*) &gt; 100</code>。",
          "⚠️ 有 GROUP BY 時，SELECT 只能放「分組欄位」或「聚合函式」——放別的欄位會報錯或給你意外的值。WHERE 在分組前篩、HAVING 在分組後篩。",
        ),
      },
      {
        title: "資料庫關聯：一對多、多對多怎麼設",
        chapter_id: 17,
        content: P(
          "設計資料表，先想「東西之間怎麼關聯」。",
          "<b>一對多</b>（一個使用者有多筆訂單）：在「多」的那張表（orders）放一個 <code>user_id</code> 指回去（外鍵）。最常見。",
          "<b>多對多</b>（學生選多門課、一門課多個學生）：開一張「中間表」<code>enrollments(student_id, course_id)</code> 記配對。",
          "<b>外鍵</b>：讓資料庫幫你把關「這個 user_id 一定存在」、也能設連動刪除。",
          "⚠️ 別把「一串東西」硬塞進一個欄位用逗號分隔（<code>tags=\"a,b,c\"</code>）——之後要查/改超痛苦。該用關聯表或陣列型別。",
        ),
      },
      {
        title: "正規化：同一份資料別存兩份",
        chapter_id: 17,
        content: P(
          "正規化的核心一句話：<b>同一個事實只存一個地方</b>。",
          "反例：訂單表裡每一筆都存一份「使用者的名字、地址」——使用者改地址，你要改一百筆、還可能漏改變成不一致。",
          "正解：訂單只存 <code>user_id</code>，名字地址在 users 表存一份，要用時 JOIN 出來。改一次、到處都對。",
          "反正規化（故意存重複）是為了查詢快的<b>取捨</b>，等你真的遇到效能瓶頸、清楚代價再做。",
          "⚠️ 新手先學好正規化（別重複存）；「為了快而複製資料」是進階、且要自己維護同步，別一開始就搞。",
        ),
      },
      {
        title: "Migration：資料庫結構怎麼版控",
        chapter_id: 19,
        content: P(
          "程式碼有 git，資料庫的「結構變更」也要有紀錄、能重現——這就是 migration。",
          "每次改結構（加欄位、建表、改型別）寫成一個 migration 檔（一段 SQL 或 ORM 指令），依序套用。",
          "好處：新環境/新同事一鍵把 DB 建到最新狀態；每個變更有歷史、能回溯。",
          "寫法要<b>冪等或只前進</b>：<code>add column if not exists</code>、<code>create table if not exists</code>，重跑不出錯。",
          "⚠️ 別直接上正式資料庫手動改結構、不留紀錄——換環境就對不上、也沒人知道改過什麼。所有結構變更都走 migration。",
        ),
      },
      {
        title: "ORM vs 原生 SQL：怎麼選",
        chapter_id: 19,
        content: P(
          "跟資料庫講話有兩種：ORM（用物件/方法）或直接寫 SQL。",
          "<b>ORM</b>（Prisma、Supabase client…）：<code>db.user.findMany()</code>，好寫、有型別、跨資料庫。日常 CRUD 用它最順。",
          "<b>原生 SQL</b>：複雜查詢（多表 JOIN、視窗函式、效能調校）ORM 反而綁手綁腳，直接寫 SQL 更清楚更快。",
          "實務：九成用 ORM，遇到 ORM 寫不漂亮或很慢的那一成，用它的 raw query 跳去寫 SQL。",
          "⚠️ 用 ORM 也要懂它「背後跑什麼 SQL」——不然容易寫出 N+1 或很肥的查詢還不知道。",
        ),
      },
      {
        title: "統一回應格式與錯誤處理",
        chapter_id: 16,
        content: P(
          "API 回傳長得亂七八糟，前端接得很痛苦。定一套統一格式。",
          "成功/失敗都用固定結構：例如成功 <code>{ ok: true, data: ... }</code>、失敗 <code>{ ok: false, error: \"...\", code: \"...\" }</code>，配對的 HTTP 狀態碼。",
          "在後端設一個「統一錯誤處理」的地方，把各種錯誤轉成這個格式 + 對的狀態碼，而不是每個 route 各寫各的。",
          "⚠️ 別把「內部錯誤細節/堆疊」直接回給前端（洩漏資訊、也沒意義）——給使用者友善訊息，細節記進伺服器 log。",
        ),
      },
      {
        title: "分層測試：單元 / 整合 / E2E",
        chapter_id: 16,
        content: P(
          "測試不是只有一種，分層各司其職。",
          "<b>單元測試</b>（最多）：測「單一函式」的邏輯，快、好定位。例如算稅、驗證格式。",
          "<b>整合測試</b>：測「幾個部分接起來」，例如 API + 資料庫一起跑。",
          "<b>E2E</b>（最少）：模擬真人從頭點到尾（開頁面、填表、送出），最貼近真實但最慢最脆。",
          "這叫「測試金字塔」：底層單元多、上層 E2E 少。",
          "⚠️ 別只寫 E2E（慢又常壞）也別只寫單元（接起來還是可能爆）。核心邏輯多寫單元、關鍵流程補幾條 E2E。",
        ),
      },
      {
        title: "結構化 logging：log 要能被搜尋",
        chapter_id: 24,
        content: P(
          "出事時，log 是你唯一的線索。log 寫得好，debug 快十倍。",
          "別只 <code>print(\"出錯了\")</code>——記「什麼時間、哪個使用者、哪個請求、什麼錯」。用<b>結構化 log</b>（JSON 格式）之後才好搜尋/過濾。",
          "分級別：debug / info / warn / error，正式環境只留 info 以上，避免噪音。",
          "每個請求給一個 <code>request id</code>、串起同一次請求的所有 log，追問題不會斷線。",
          "⚠️ log 裡<b>別印機密</b>（密碼、token、完整個資）——log 常被很多人看得到、也會被存很久。",
        ),
      },
      {
        title: "health check：讓平台知道你還活著",
        chapter_id: 24,
        content: P(
          "部署平台/負載平衡器需要一個方法「確認你的服務有在正常跑」，這就是 health check。",
          "做一個超輕量的端點 <code>GET /health</code>，正常就回 200 + <code>{ ok: true }</code>。",
          "進階：<code>/ready</code> 檢查「相依的東西（資料庫、快取）也通」再回 OK，platform 才把流量導進來。",
          "⚠️ health check 要<b>快、別打重的查詢</b>（它會被頻繁呼叫）；也別在裡面做會失敗的複雜邏輯，不然平台以為你掛了一直重啟。",
        ),
      },
      {
        title: "背景排程 cron：定時做事",
        chapter_id: 16,
        content: P(
          "「每天半夜寄報表」「每小時清過期資料」這種定時任務，用 cron 排程。",
          "cron 表達式定「多久跑一次」：<code>0 3 * * *</code> = 每天 03:00。網路上有 crontab 產生器幫你看懂。",
          "實作：有的用系統 crontab、有的用平台的 Scheduled Job、或用 GitHub Actions 的 schedule 打一個 API 端點。",
          "⚠️ 排程任務要<b>冪等 + 有 log</b>（萬一重跑或漏跑好查）；跑很久的別卡住、注意時區（cron 常是 UTC，別排錯時間）。",
        ),
      },
      {
        title: "寄 email：別讓它卡住請求、也別進垃圾桶",
        chapter_id: 16,
        content: P(
          "註冊驗證信、通知信是常見需求，但自己架郵件伺服器是坑，用現成服務（Resend、SendGrid…）。",
          "寄信有點慢，<b>別在請求裡同步等它寄完</b>——丟進背景/佇列，使用者不用乾等。",
          "進垃圾桶問題：設好 SPF / DKIM / DMARC（網域驗證），寄件人用你自己的網域，內容別太廣告味。",
          "⚠️ 別把「一定要送達」的東西（重設密碼）當背景就忘了——要有重試 + 失敗告警。測試環境別真的寄到使用者信箱。",
        ),
      },
      {
        title: "連線池：別每個請求都開一條新連線",
        chapter_id: 19,
        content: P(
          "連資料庫「開連線」本身很花時間。每個請求都開一條、用完關，高流量下會拖垮。",
          "<b>連線池（connection pool）</b>：預先開好一組連線重複用，請求來借一條、用完還回去，省掉反覆開關的成本。",
          "大多 ORM/資料庫 client 內建連線池，你設好「池子大小上限」就好。",
          "⚠️ serverless（函式每次冷啟）特別容易「連線爆量」——用平台提供的 pooler（如 Supabase 的 pgbouncer 連線字串），別每個函式各開一堆。",
        ),
      },
      {
        title: "API 文件：讓別人（和未來的你）會用",
        chapter_id: 20,
        content: P(
          "API 沒文件，別人（含三個月後的你）根本不知道怎麼呼叫。",
          "至少寫清楚：端點網址、方法、要帶什麼參數/body、回傳長怎樣、可能的錯誤。",
          "工具化：用 <b>OpenAPI（Swagger）</b> 規格描述，能自動生互動式文件頁、甚至自動產 client。",
          "⚠️ 文件要跟程式碼一起更新——過時的文件比沒文件更害人。能「從程式碼/型別自動生文件」最好，不會忘了改。",
        ),
      },
      {
        title: "資料備份與還原：出事時的救命稻草",
        chapter_id: 19,
        content: P(
          "資料一旦誤刪/毀損又沒備份，就是災難。備份是「必須」不是「加分」。",
          "自動、定期備份（多數雲資料庫如 Supabase 內建每日備份）；重要的還要「異地」放一份。",
          "光備份不夠——<b>要定期演練「還原」</b>，確認備份真的能救回來（很多人備份了卻從沒試過還原，出事才發現壞的）。",
          "⚠️ 上正式環境跑「危險操作」（大量 delete/update、改結構）前，先備份/先在 staging 試。<code>delete</code> 沒帶 <code>where</code> 是經典災難。",
        ),
      },
      {
        title: "SQL vs NoSQL：資料庫怎麼選",
        chapter_id: 18,
        content: P(
          "資料庫兩大類，新手先懂差別、別跟風。",
          "<b>SQL（關聯式，如 PostgreSQL）</b>：資料有固定結構（表格 + 欄位）、強一致性、能做複雜 JOIN 查詢。大多數應用（電商、後台、SaaS）先選它準沒錯。",
          "<b>NoSQL（如 MongoDB、Redis）</b>：結構彈性、水平擴展容易、特定場景快。適合「結構常變、超大量、簡單查詢」。",
          "⚠️ 新手常被「NoSQL 比較潮」帶偏——多數專案 PostgreSQL 就綽綽有餘（它還能存 JSON）。等你真的遇到 SQL 解不了的規模/彈性問題再考慮 NoSQL。",
        ),
      },
      {
        title: "Redis：快取以外還能幹嘛",
        chapter_id: 18,
        content: P(
          "Redis 是「存在記憶體、超快」的資料庫，最常當快取，但用途不只這個。",
          "<b>快取</b>：把「算很久/很常查」的結果暫存，設過期時間。",
          "<b>Session 存放</b>、<b>rate limit 計數</b>、<b>排行榜</b>（有序集合超適合）、<b>簡單佇列</b>、<b>分散式鎖</b>。",
          "因為在記憶體、快但貴、容量有限、重開可能掉資料（可設持久化）。",
          "⚠️ 別把「必須永久保存」的主資料只放 Redis——它是加速/暫存層，真資料還是放主資料庫。",
        ),
      },
      {
        title: "GraphQL vs REST：差在哪",
        chapter_id: 20,
        content: P(
          "兩種設計 API 的風格。",
          "<b>REST</b>：一個資源一個網址（<code>/users/1</code>、<code>/users/1/posts</code>）。簡單、快取友善、最常見。缺點：常「拿太多或拿不夠」，要打好幾支才湊齊一頁資料。",
          "<b>GraphQL</b>：一個端點，前端用查詢語言「精準指定要哪些欄位」，一次拿齊。缺點：快取/複雜度較高、要防「一個查詢拖垮伺服器」。",
          "⚠️ 新手先把 REST 做好——它 90% 場景夠用、生態成熟。GraphQL 是「前端要的資料很多變、避免 over-fetch」時的解，別為用而用。",
        ),
      },
      {
        title: "WebSocket：即時雙向通訊",
        chapter_id: 20,
        content: P(
          "一般 HTTP 是「你問一次、它答一次」。要「伺服器主動推、即時雙向」（聊天、即時通知、協作、遊戲），用 WebSocket。",
          "它建立一條「一直開著的連線」，兩邊隨時能互傳訊息，不用一直重新請求。",
          "實務：很多人用 Socket.IO 這類庫（自動重連、房間），或平台的 realtime（如 Supabase Realtime）。",
          "⚠️ 長連線要管理（斷線重連、擴展時多台伺服器怎麼共享）；不是每個「即時」都要 WebSocket——偶爾更新用輪詢或 SSE 更簡單。",
        ),
      },
      {
        title: "Docker：容器是什麼",
        chapter_id: 22,
        content: P(
          "「在我電腦好好的、到別台就掛」——Docker 就是來解這個。",
          "<b>容器</b>把「你的程式 + 它需要的環境（特定版本的 Node/Python、系統套件）」打包成一個標準盒子，到哪台機器跑起來都一樣。",
          "跟虛擬機不同：容器共用主機的作業系統、輕量、啟動快。",
          "你寫一個 <code>Dockerfile</code> 描述「怎麼組這個盒子」，build 成 image、跑成 container。",
          "⚠️ 新手不用一開始就 Docker（多數平台幫你處理）；但團隊協作、要跟正式環境一致時，它很省事。先會「用別人的 image」再學寫 Dockerfile。",
        ),
      },
      {
        title: "CI / CD：自動化測試與部署",
        chapter_id: 22,
        content: P(
          "每次改 code 都手動測、手動上傳部署，又慢又容易出錯。CI/CD 自動化這條線。",
          "<b>CI（持續整合）</b>：你 push code，自動跑測試 / lint / build——壞了馬上擋下、通知你，別把爛 code 合進去。",
          "<b>CD（持續部署）</b>：測試過了，自動部署到測試/正式環境。",
          "常用 GitHub Actions：寫一個 workflow（.yml），定義「push 時要跑什麼」。",
          "⚠️ 至少先做 CI（自動跑測試 + build），品質最有感；CD 自動上正式要有把握（配 staging、能快速 rollback）再開。",
        ),
      },
      {
        title: "擴展：水平 vs 垂直",
        chapter_id: 23,
        content: P(
          "使用者變多、一台伺服器撐不住，兩種長大方式。",
          "<b>垂直擴展</b>：把那台機器升級（更強 CPU、更多記憶體）。簡單、但有上限、也貴。",
          "<b>水平擴展</b>：多開幾台、用負載平衡分流。理論上無限、但程式要「無狀態」（別把資料存在單台記憶體）才好加。",
          "⚠️ 想水平擴展，session/檔案/快取別放在單台本機——放共用的地方（Redis、物件儲存），任何一台都能服務任何請求。這是「能不能擴展」的關鍵。",
        ),
      },
      {
        title: "微服務 vs 單體：別太早拆",
        chapter_id: 16,
        content: P(
          "架構潮語，但新手/小專案別被帶跑。",
          "<b>單體（monolith）</b>：一個應用包含所有功能。簡單、好開發、好部署——<b>絕大多數專案該從這開始</b>。",
          "<b>微服務</b>：拆成很多小服務各自跑。適合「大團隊、超大規模、各部分要獨立擴展/部署」。代價是複雜度暴增（網路、部署、除錯、資料一致）。",
          "⚠️ 「還沒幾個使用者就拆微服務」是經典過度工程——先把單體寫好、模組分清楚，真的遇到規模/團隊瓶頸再拆。",
        ),
      },
      {
        title: "CDN：把內容放到離使用者近的地方",
        chapter_id: 23,
        content: P(
          "使用者在世界各地，你的伺服器在一個機房——遠的人載很慢。CDN 解這個。",
          "<b>CDN</b>（內容傳遞網路）在全球有很多節點，把你的「靜態資源」（圖片、JS、CSS、影片）快取到離使用者最近的節點，就近拿、超快。",
          "也能擋部分流量與攻擊（DDoS 緩衝）、省你主機頻寬。",
          "現代部署平台（Vercel、Cloudflare）通常內建。",
          "⚠️ CDN 有快取——改了靜態檔沒更新，多半要「破快取」（檔名加 hash / 版本）或清 CDN。動態、個人化的內容別亂 CDN 快取。",
        ),
      },
      {
        title: "負載平衡：一台不夠就分給多台",
        chapter_id: 23,
        content: P(
          "水平擴展後有很多台伺服器，誰來決定「這個請求給哪一台」？負載平衡器（load balancer）。",
          "它坐在使用者和伺服器群中間，把請求平均分下去（輪流、看誰比較閒…），一台掛了就不導流量給它（配 health check）。",
          "好處：分散負載、單台故障不影響整體、能無縫加減機器。",
          "⚠️ 有負載平衡就要面對「請求可能落在不同台」——所以前面說的「別把狀態存單台本機」在這裡是必須的。",
        ),
      },
      {
        title: "並發更新：樂觀鎖 vs 悲觀鎖",
        chapter_id: 17,
        content: P(
          "兩個人同時改同一筆資料，怎麼不互相覆蓋？兩種策略。",
          "<b>悲觀鎖</b>：改之前先「鎖住」這筆，別人得等。安全但會卡、降低並發。適合衝突很常見的場景。",
          "<b>樂觀鎖</b>：不鎖，但每筆帶一個「版本號」。存的時候檢查「版本還是我讀的那個嗎？」——變了代表別人先改了，讓你重試。適合衝突少的場景（多數 Web）。",
          "⚠️ 「後蓋前」的靜默覆蓋（lost update）是常見 bug——多人會同時編輯的資料，用版本號/樂觀鎖擋一下。",
        ),
      },
      {
        title: "軟刪除 soft delete：別真的刪掉",
        chapter_id: 17,
        content: P(
          "使用者按「刪除」，你真的從資料庫 <code>DELETE</code> 掉，之後想復原/查紀錄就沒了。很多情況改用「軟刪除」。",
          "作法：加一個 <code>deleted_at</code> 欄位，刪除＝填上時間；查詢預設只撈 <code>deleted_at is null</code> 的。資料還在、可復原、可稽核。",
          "GDPR「真的要刪」時，再排程硬刪（這專案的帳號刪除就是這樣）。",
          "⚠️ 軟刪除後，所有查詢都要記得過濾掉已刪的（很容易漏，導致「刪了還看得到」）；唯一性約束也要考慮（同 email 軟刪後能不能再註冊）。",
        ),
      },
      {
        title: "稽核紀錄 audit log：誰在什麼時候做了什麼",
        chapter_id: 17,
        content: P(
          "重要操作（改權限、動錢、刪資料）要留「誰、何時、做了什麼、改前改後」的紀錄——出事能追、也是合規需求。",
          "作法：一張 audit_logs 表，記 user_id、action、target、before/after、時間、IP。關鍵動作發生時寫一筆。",
          "跟一般 log 不同：audit log 是「業務事件的正式紀錄」，要保留久、不可竄改。",
          "⚠️ 別把敏感內容（密碼、完整卡號）寫進去；量會很大，考慮分表/歸檔。金流、權限這種一定要有。",
        ),
      },
      {
        title: "API 查詢慣例：過濾 / 排序 / 分頁",
        chapter_id: 20,
        content: P(
          "列表型 API 幾乎都要「篩選、排序、分頁」，用一套一致的 query 慣例前端才好接。",
          "過濾：<code>?status=active&role=admin</code>。排序：<code>?sort=created_at&order=desc</code>（或 <code>?sort=-created_at</code>）。分頁：<code>?page=2&limit=20</code> 或 cursor。",
          "回傳除了資料，附上分頁資訊（總數 / 有沒有下一頁 / next cursor）讓前端好做「載更多」。",
          "⚠️ 過濾/排序的欄位要「白名單」——別讓使用者對任意欄位排序/查詢（效能與資安風險）；有索引的欄位才開放排序。",
        ),
      },
    ],
  },
  {
    title: "🧰 課程沒特別教、但你天天會用到（新手必備基本功）",
    desc: "這些「沒人專門教、卻決定你走多快」的基本功，我踩過才知道多重要：終端機、Git、看錯誤、DevTools、怎麼問問題、讀文件。免費。",
    notes: [
      {
        title: "grep：在一堆檔案裡秒找那行字",
        chapter_id: 0,
        content: P(
          "我以前找「這個字串到底寫在哪個檔」都用滑鼠一個個開來看，蠢到爆。後來會了 grep 才發現三秒能解決。",
          "grep 就是「幫你在文字堆裡撈出含關鍵字的行」。找單檔：<code>grep TODO app.js</code>；整個資料夾遞迴找：<code>grep -r \"API_KEY\" .</code>。加 <code>-n</code> 顯示行號、<code>-i</code> 不分大小寫。",
          "常搭配管道：<code>cat log.txt | grep ERROR</code> 只留錯誤行。想看前後文用 <code>-C 3</code>（上下各三行）。",
          "⚠️ 我踩過：<code>grep -r</code> 沒排除就把 <code>node_modules</code> 也掃了、跑超久還一堆雜訊。用 <code>--exclude-dir=node_modules</code>，或直接學 <code>rg</code>（ripgrep）預設就會跳過。",
        ),
      },
      {
        title: "find：按名字、時間、大小把檔案挖出來",
        chapter_id: 0,
        content: P(
          "grep 是找「檔案內容」，find 是找「檔案本身」。我第一次要清掉一堆散落的暫存檔，就是靠它。",
          "最常用：<code>find . -name \"*.log\"</code> 找當前資料夾以下所有 .log。想按時間：<code>-mtime -7</code>（七天內改過）；按大小：<code>-size +100M</code>（大於 100MB）。",
          "威力在 <code>-exec</code>：找到直接處理，例 <code>find . -name \"*.tmp\" -delete</code> 一次刪光。",
          "⚠️ <code>-delete</code> 和 <code>-exec rm</code> 不會問你、刪了就沒了。我習慣先不加刪除、跑一次看「印出來的清單」對不對，確認了再加動作。",
        ),
      },
      {
        title: "sed：不用開編輯器就把字換掉",
        chapter_id: 0,
        content: P(
          "有時候我只是要把一個檔裡的某個字全換掉，開編輯器嫌慢，sed 一行搞定。",
          "基本替換：<code>sed 's/舊字/新字/g' 檔案</code>——<code>s</code> 是 substitute、結尾 <code>g</code> 是「一行內全部換」（不加只換每行第一個）。這樣只是印出來、不改原檔。",
          "真的要寫回檔案要加 <code>-i</code>（in-place）：<code>sed -i 's/http:/https:/g' config.txt</code>。",
          "⚠️ <code>-i</code> 直接動原檔、沒有還原鍵。我一定先不加 <code>-i</code> 預覽結果，或先 <code>git commit</code> 存個檔，改壞了還能 <code>git checkout</code> 救回來。",
        ),
      },
      {
        title: "chmod：檔案權限那串 rwx 到底在講什麼",
        chapter_id: 0,
        content: P(
          "第一次 <code>ls -l</code> 看到 <code>-rwxr-xr--</code> 一串我完全看不懂，其實拆開超簡單。",
          "分三組人：<b>擁有者 / 群組 / 其他人</b>。每組三個位：<code>r</code> 讀、<code>w</code> 寫、<code>x</code> 執行。想成一棟房子的三串鑰匙，各自能開哪些門。",
          "數字寫法：r=4、w=2、x=1 相加。<code>chmod 755 檔</code>＝擁有者 7(rwx)、其他人 5(r-x)。腳本要能跑就得有 <code>x</code>：<code>chmod +x deploy.sh</code>。",
          "⚠️ 別為了「省事」一律 <code>chmod 777</code>——那是「任何人都能改能執行」，等於門全開。上傳目錄、金鑰檔給 777 是很經典的資安漏洞。",
        ),
      },
      {
        title: "SSH 金鑰：別再每次都打密碼",
        chapter_id: 0,
        content: P(
          "以前我 <code>git push</code> 每次都要輸帳密，煩死。設好 SSH 金鑰之後就再也不用了。",
          "金鑰是一對的：<b>私鑰</b>留在你電腦（像你家鑰匙、絕不外流）、<b>公鑰</b>貼到 GitHub/伺服器（像門上的鎖）。對得上就放行。",
          "產一把：<code>ssh-keygen -t ed25519 -C \"你的email\"</code>，然後把 <code>~/.ssh/id_ed25519.pub</code> 的內容貼到 GitHub 設定的 SSH keys。",
          "⚠️ 私鑰（沒有 <code>.pub</code> 的那個）<b>絕對不能</b>貼出去、不能進 git。我看過有人把整個 <code>.ssh</code> 資料夾 commit 上去——等於把家裡鑰匙貼在公佈欄，趕快換掉。",
        ),
      },
      {
        title: "scp / rsync：把檔案傳到另一台機器",
        chapter_id: 0,
        content: P(
          "要把本機檔案丟到伺服器、或從伺服器拉回來，我以前用 FTP 工具點半天，其實命令列一行就好。",
          "<b>scp</b> 像「複製貼上到遠端」：<code>scp 本機檔 user@host:/路徑/</code> 上傳、反過來就是下載。單檔、少量很方便。",
          "<b>rsync</b> 更聰明：只傳「有變的部分」，中斷還能續傳，適合大量檔或反覆同步。<code>rsync -avz 資料夾/ user@host:/路徑/</code>。",
          "⚠️ rsync 的來源路徑<b>結尾斜線很要命</b>：<code>dir/</code> 是「把 dir 裡的東西」傳過去、<code>dir</code>（沒斜線）是「把 dir 這個資料夾」傳過去，位置會差一層。先加 <code>-n</code>（dry-run）看它「打算做什麼」再真的跑。",
        ),
      },
      {
        title: "curl：不開瀏覽器就測一支 API",
        chapter_id: 0,
        content: P(
          "後端寫好一支 API，我要驗它通不通，用 curl 比開 Postman 還快。",
          "最單純：<code>curl https://api.site.com/users</code> 直接把回傳印出來。想看狀態碼與 header 加 <code>-i</code>。",
          "送 POST + JSON：<code>curl -X POST -H \"Content-Type: application/json\" -d '{\"name\":\"小明\"}' 網址</code>。帶身分：<code>-H \"Authorization: Bearer 你的token\"</code>。",
          "⚠️ curl 預設<b>不會</b>印出 4xx/5xx 的錯誤細節、你可能以為成功。加 <code>-i</code> 或 <code>-w \"%{http_code}\"</code> 看真正的狀態碼，別被「有回東西」騙了。",
        ),
      },
      {
        title: "PATH：為什麼有時候「找不到指令」",
        chapter_id: 0,
        content: P(
          "剛裝好一個工具、打指令卻說 <code>command not found</code>，明明就裝了啊——問題幾乎都出在 PATH。",
          "PATH 是一串資料夾清單，你打指令時系統<b>照順序去這些資料夾找</b>那支程式。不在清單裡的，它就當作不存在。",
          "看你的 PATH：<code>echo $PATH</code>（用冒號分隔）。查某指令實際用哪個：<code>which node</code>。裝了找不到，通常是那支程式的資料夾沒被加進 PATH。",
          "⚠️ 改 PATH 要寫進 shell 設定檔（<code>.bashrc</code> / <code>.zshrc</code>）才會永久生效；在當前視窗 <code>export PATH=...</code> 只對這個視窗有用，關掉就沒了。順序也有影響——排前面的同名程式會先被找到。",
        ),
      },
      {
        title: "shell 別名與 dotfiles：把常打的指令變短",
        chapter_id: 0,
        content: P(
          "我每天打 <code>git status</code> 幾十次，後來設個別名 <code>gs</code> 就好，手指少受罪。",
          "別名（alias）就是幫長指令取小名。在 <code>.zshrc</code> / <code>.bashrc</code> 加 <code>alias gs=\"git status\"</code>、<code>alias ll=\"ls -la\"</code>，存檔後 <code>source ~/.zshrc</code> 生效。",
          "這些設定檔（開頭是點的 <code>.zshrc</code>、<code>.gitconfig</code>…）合稱 <b>dotfiles</b>。很多人把它們放一個 git repo 管理，換新電腦 clone 一下、環境秒還原。",
          "⚠️ 別把含金鑰、token 的設定檔也推上公開 repo。dotfiles 要上 GitHub 前，先確認裡面沒有密碼、公司內網位址這種東西。",
        ),
      },
      {
        title: "cron：讓電腦定時自動幫你做事",
        chapter_id: 0,
        content: P(
          "要「每天半夜備份一次」「每小時抓一次資料」這種排程，靠 cron，設好就自動跑、不用你守著。",
          "用 <code>crontab -e</code> 編輯，每行是「五個時間欄位 + 要跑的指令」。五欄依序是<b>分 時 日 月 星期</b>，<code>*</code> 代表「每」。",
          "例：<code>0 3 * * * /path/backup.sh</code>＝每天 03:00 跑備份；<code>*/15 * * * *</code>＝每 15 分鐘一次。記不起來就用 crontab.guru 這網站邊調邊看白話解釋。",
          "⚠️ cron 跑的環境很乾淨、<b>沒有你平常的 PATH 和變數</b>，本機能跑的腳本在 cron 裡常因「找不到指令」而默默失敗。指令用絕對路徑、把輸出導到 log（<code>&gt;&gt; /tmp/job.log 2&gt;&amp;1</code>）才查得到問題。",
        ),
      },
      {
        title: "ps / top / kill：看誰在跑、把卡死的關掉",
        chapter_id: 0,
        content: P(
          "程式當掉、port 被佔住、風扇狂轉——這些都要先「看清楚是哪個程序在搞」，再處理。",
          "<b>top</b>（或 <code>htop</code>）：即時看哪個程序吃 CPU/記憶體，像工作管理員。<b>ps</b>：列出程序清單，<code>ps aux | grep node</code> 找出你的 node 程序和它的 PID（程序編號）。",
          "關掉：<code>kill PID</code> 好好請它結束；不理你就 <code>kill -9 PID</code> 強制砍。查是誰佔了某個 port：<code>lsof -i :3000</code>。",
          "⚠️ <code>kill -9</code> 是「直接拔電源」、程式來不及善後（存檔、關連線）可能留下壞狀態。先試普通 <code>kill</code>，真的不動了再 <code>-9</code>。也別亂砍不認識的系統程序。",
        ),
      },
      {
        title: "df / du：硬碟滿了，找出誰在吃空間",
        chapter_id: 0,
        content: P(
          "有次伺服器突然狂報錯，查半天原來是<b>硬碟滿了</b>。這種問題不先想到、會 debug 到懷疑人生。",
          "<b>df</b> 看「整體還剩多少」：<code>df -h</code>（<code>-h</code> = 人看得懂的 GB/MB），看哪個磁碟用到 100%。",
          "<b>du</b> 看「是誰在佔」：<code>du -sh *</code> 列出當前資料夾各項多大，一路往裡追到肥的那個。",
          "⚠️ 硬碟滿了常是 <b>log 檔無限長大</b>或一堆暫存沒清。刪之前先確認那真的是可丟的東西；也別忘了有些程式「檔案刪了但沒放手」，空間要重啟該程序才真的釋放。",
        ),
      },
      {
        title: "tar / zip：打包壓縮，別再手動一個個傳",
        chapter_id: 0,
        content: P(
          "要把整個資料夾傳給別人、或備份起來，先打包成一個檔最省事。",
          "Linux/Mac 常用 <b>tar</b>：壓 <code>tar -czf out.tar.gz 資料夾/</code>、解 <code>tar -xzf out.tar.gz</code>。記法：<code>c</code>reate / e<code>x</code>tract、<code>z</code> 用 gzip 壓、<code>f</code> 指定檔名。",
          "跨平台給人（尤其 Windows 用戶）用 <b>zip</b> 最保險：<code>zip -r out.zip 資料夾/</code> 壓、<code>unzip out.zip</code> 解。",
          "⚠️ 我最常記反的是解壓：拿到別人的 <code>.tar.gz</code> 要 <code>-x</code>（extract）不是 <code>-c</code>（create）——打 <code>-c</code> 會反而<b>覆蓋掉</b>那個檔！看到 <code>.tar.gz</code> 就是 <code>xzf</code>、記死。",
        ),
      },
      {
        title: "符號連結 symlink：一個捷徑指到別的地方",
        chapter_id: 0,
        content: P(
          "symlink（軟連結）你就想成桌面的「捷徑」：它本身不是檔案，只是一個「指向真正檔案的箭頭」。",
          "建立：<code>ln -s /真正的/路徑 捷徑名</code>。之後讀寫這個捷徑，實際上動的是它指到的那個檔或資料夾。",
          "很多工具靠它運作，例如 <code>node_modules/.bin</code> 裡一堆指令、nvm 切 node 版本，背後都是換 symlink 指向。",
          "⚠️ 兩個雷：一是<b>刪捷徑不會刪到本體</b>，但有些指令加了斜線或 <code>-r</code> 會誤刪到裡面的東西；二是<b>指向的目標被搬走/刪掉，捷徑就變死連結</b>（dangling），指令會報「檔案不存在」但你明明看到那個名字在。用 <code>ls -l</code> 可看到箭頭指去哪。",
        ),
      },
      {
        title: "exit code：0 是成功，非 0 是出事",
        chapter_id: 0,
        content: P(
          "寫腳本或看 CI 常聽到「回傳碼」，其實概念超簡單：每個指令跑完都會留一個數字，說它成不成功。",
          "<b>0 = 成功</b>，任何<b>非 0 = 有問題</b>（不同數字代表不同錯誤）。看上一個指令的結果：<code>echo $?</code>。",
          "這就是 <code>指令A &amp;&amp; 指令B</code> 的原理——A 回 0（成功）才做 B；<code>||</code> 則是失敗才做。CI 判斷「這步過了沒」也是看 exit code。",
          "⚠️ 自己寫腳本時，出錯要記得 <code>exit 1</code> 讓外面知道失敗，不然它<b>預設回 0</b>、CI 會以為一切正常照樣往下跑、把壞東西部署上去。",
        ),
      },
      {
        title: "stdout / stderr：把正常輸出和錯誤分開",
        chapter_id: 0,
        content: P(
          "程式的輸出其實有兩條管道：<b>stdout</b>（標準輸出，正常結果）和 <b>stderr</b>（標準錯誤，錯誤訊息）。分開是有用的。",
          "導向：<code>&gt;</code> 只接 stdout。<code>指令 &gt; out.txt</code> 把正常輸出存檔，但<b>錯誤還是會噴到畫面</b>——因為錯誤走 stderr。",
          "要一起收：<code>指令 &gt; all.txt 2&gt;&amp;1</code>（<code>2</code> 是 stderr、<code>1</code> 是 stdout，意思是「把 stderr 也併到 stdout 去的地方」）。只想把錯誤丟掉：<code>2&gt;/dev/null</code>。",
          "⚠️ 「我明明有 <code>&gt; log</code> 存檔，怎麼 log 裡沒有錯誤？」就是這個坑——錯誤走 stderr 沒被接到。要抓完整記錄一定要 <code>2&gt;&amp;1</code>。",
        ),
      },
      {
        title: "rebase vs merge：兩種把分支併起來的方式",
        chapter_id: 0,
        content: P(
          "同樣是「把 main 的更新弄進我的分支」，merge 和 rebase 結果不一樣，搞懂差別才不會亂用。",
          "<b>merge</b>：把兩條線接起來、多生一個「合併 commit」。歷史保留真實的分岔樣貌，像「兩條路匯流」。",
          "<b>rebase</b>：把你的 commit「一個個搬到 main 最新的後面」，歷史變成一條漂亮直線，像「把你的積木重新疊到最新的塔頂」。",
          "⚠️ 鐵律：<b>不要 rebase 已經 push、別人也在用的分支</b>。rebase 會重寫 commit，公共歷史被改掉，同事會對不上、天下大亂。自己本機、還沒分享的分支才 rebase 整理。",
        ),
      },
      {
        title: "cherry-pick：只挑某一個 commit 搬過來",
        chapter_id: 0,
        content: P(
          "有時我在某分支修好一個 bug，但另一條分支也急著要那個修正——不用整條合過去，挑那一顆就好。",
          "<code>git cherry-pick &lt;commit的hash&gt;</code>＝把那一個 commit 的改動「複製」一份、套到你現在的分支上。像從一整籃水果裡只夾走你要的那顆。",
          "常見用途：hotfix 要同時上到 main 和 release 分支；或某功能還沒好，但其中一個小修正想先拿來用。",
          "⚠️ cherry-pick 是<b>複製</b>不是搬移，會產生一顆「內容一樣但 hash 不同」的新 commit。之後兩條分支真的合併時可能撞到「同樣的改動出現兩次」。挑幾顆救急可以，別拿它當日常合併手段。",
        ),
      },
      {
        title: "git bisect：二分法揪出哪次 commit 弄壞的",
        chapter_id: 0,
        content: P(
          "「上週還好好的、現在壞了，中間幾百個 commit 到底哪個害的？」一個個試會瘋掉，bisect 幫你二分法找。",
          "原理像猜數字：你給它一個「還正常的舊版」和「已壞的新版」，它自動跳到中間那個 commit 讓你測，你回報「好/壞」，它再切一半，幾步就鎖定兇手。",
          "流程：<code>git bisect start</code> → <code>git bisect bad</code>（現在壞的）→ <code>git bisect good &lt;舊commit&gt;</code>，然後每次測完 <code>git bisect good</code> 或 <code>bad</code>，最後 <code>git bisect reset</code> 收工。",
          "⚠️ 幾百個 commit 用線性找是 O(n)、bisect 是 O(log n)——500 個 commit 大概九次就找到。前提是每個測試點你都能<b>明確判斷「好還壞」</b>，判斷標準先想清楚，不然會誤導它。",
        ),
      },
      {
        title: "git reflog：以為刪掉救不回的，它記得",
        chapter_id: 0,
        content: P(
          "我曾經 <code>git reset --hard</code> 手滑、把一整天的 commit 弄不見，冷汗直流——結果 reflog 全救回來了。",
          "reflog 是 Git 偷偷記的「你 HEAD 去過哪」的流水帳，連你 reset、rebase 掉的 commit 都還留著參照，一段時間內不會真的被清掉。",
          "救援：<code>git reflog</code> 找到你想回去的那一步（像 <code>HEAD@{5}</code> 或某個 hash），<code>git reset --hard 那個hash</code> 或 <code>git checkout -b 救回來 那個hash</code>。",
          "⚠️ reflog 是<b>本機</b>的、別台電腦看不到；而且它有保留期限（預設幾十天）會被回收。出事要救趁早，別拖。也因此它救不了「從沒 commit 過」的改動——那種是真的沒了。",
        ),
      },
      {
        title: "git tag：幫重要版本插一支旗子",
        chapter_id: 0,
        content: P(
          "commit hash 一串亂碼沒人記得住，要標「這就是 v1.0.0 上線的版本」，用 tag 給它一個好記的名字。",
          "打標籤：<code>git tag -a v1.0.0 -m \"首次上線\"</code>，然後 <code>git push origin v1.0.0</code>（tag 預設<b>不會</b>跟著 push，要自己推）。",
          "之後隨時能回到那個版本、GitHub 也會用 tag 生 Release、很多發版工具靠它判斷版號。命名通常配 semver：<code>v1.2.3</code>。",
          "⚠️ 常忘記「tag 要另外 push」——本機打了標籤、GitHub 上卻沒有，CI/發版就抓不到。還有 tag 不像分支會動，它<b>釘死在那個 commit</b>，這正是我們要的「這個版本永遠指這裡」。",
        ),
      },
      {
        title: "git blame：這行是誰、什麼時候改的",
        chapter_id: 0,
        content: P(
          "看到一行很怪的 code 想罵人之前，先用 blame 查清楚它的來歷——常常那個人就是三個月前的自己。",
          "<code>git blame 檔名</code>＝每一行左邊標出「最後改它的 commit、作者、日期」。編輯器（VS Code 裝 GitLens）通常滑到那行就直接顯示，更方便。",
          "真正的用途不是甩鍋，是<b>考古</b>：找到那個 commit，看它的訊息和當時一起改了什麼，就懂「為什麼會寫成這樣」，別急著改壞。",
          "⚠️ 純排版、改個縮排的 commit 會把 blame「洗掉」、蓋掉真正有意義的那次改動，害你追錯人。可以用 <code>git blame -w</code> 忽略空白變動，追得比較準。",
        ),
      },
      {
        title: "Conventional Commits：讓 commit 訊息有規矩",
        chapter_id: 43,
        content: P(
          "團隊久了會發現 commit 訊息五花八門很難讀，Conventional Commits 就是一套大家講好的格式。",
          "格式：<code>類型: 說明</code>。常見類型 <code>feat</code>（新功能）、<code>fix</code>（修 bug）、<code>docs</code>（文件）、<code>refactor</code>（重構不改行為）、<code>chore</code>（雜項）。例：<code>fix: 修好登入按鈕在手機點不到</code>。",
          "好處不只整齊——工具能靠這些類型<b>自動產生 changelog、自動決定版號</b>（feat 升 minor、fix 升 patch、破壞性改動升 major）。",
          "⚠️ 別為了套格式硬塞——重點還是「說明要講清楚做了什麼」。<code>feat: 更新</code> 有前綴也是廢話。破壞性改動記得標 <code>!</code> 或寫 <code>BREAKING CHANGE:</code>，不然自動升版會判錯。",
        ),
      },
      {
        title: "monorepo：多個專案放同一個 repo",
        chapter_id: 43,
        content: P(
          "以前每個服務一個 repo，改一個共用的東西要開五個 repo 分別 commit，超痛苦。monorepo 是「把相關的多個專案放進同一個倉庫」。",
          "想像一棟公寓（一個 repo）裡有很多戶（前端、後端、共用元件庫），共用的水電（工具設定、shared 套件）一次搞定，跨戶改動一個 PR 就涵蓋。",
          "工具幫你管：pnpm/yarn workspaces、Turborepo、Nx——處理套件共享、只重建有變的部分。",
          "⚠️ monorepo 不是萬靈丹：小團隊、少專案用它反而多一層複雜度和學習成本。而且整包會越長越大、CI 可能變慢（要靠「只測有改到的部分」來救）。沒那個規模別跟風。",
        ),
      },
      {
        title: "npm / yarn / pnpm / bun：套件管理器選哪個",
        chapter_id: 64,
        content: P(
          "JS 世界一堆套件管理器，新手會被搞混，其實它們做的事一樣：照 package.json 幫你裝套件。差在速度和細節。",
          "<b>npm</b>：Node 內建、最通用，不用另裝。<b>yarn</b>：早年比 npm 快、帶起很多概念。<b>pnpm</b>：用「硬連結共享」省超多硬碟空間、又快，現在很多人主推。<b>bun</b>：新星，超快、還想一手包辦執行環境。",
          "怎麼選：<b>跟著專案已經在用的那個走</b>（看 lockfile 是 <code>package-lock.json</code>/<code>yarn.lock</code>/<code>pnpm-lock.yaml</code>）。自己新開專案，圖穩用 npm、圖快省空間用 pnpm。",
          "⚠️ <b>一個專案只能用一種</b>、別混。混用會產生多個互相打架的 lockfile，「我這台好好的、他那台裝壞了」十次有八次是這原因。lockfile 要選一種、進 git、全隊統一。",
        ),
      },
      {
        title: "lockfile 衝突：合併時 lockfile 打架怎麼辦",
        chapter_id: 64,
        content: P(
          "兩個人各自裝了新套件、合併時 <code>package-lock.json</code> 一大片衝突，看得頭皮發麻——其實不用手改。",
          "lockfile 是<b>自動產生</b>的，手動去解那些 hash 衝突幾乎必錯。正解是：讓工具重生一份。",
          "做法：先解 <code>package.json</code> 的衝突（那個是人寫的、要好好合），然後刪掉衝突的 lockfile、重跑 <code>npm install</code>（pnpm/yarn 同理），它會照合好的 package.json 重新產出乾淨的 lockfile，再 commit。",
          "⚠️ 千萬別用滑鼠在 lockfile 裡「選我的/選他的」硬解——很可能裝出一個實際上跑不起來的依賴組合。記住：<b>lockfile 衝突 = 重生，不是手改</b>。",
        ),
      },
      {
        title: "peerDependencies：外掛跟宿主的版本約定",
        chapter_id: 64,
        content: P(
          "裝套件時偶爾跳出 <code>peer dependency</code> 警告，看不懂就跳過，結果東西壞掉。這個概念值得搞懂。",
          "peerDependency 是套件說：「我需要你的專案<b>已經</b>裝了某個東西的某版本，我不自己帶、跟你共用那一份。」最典型是各種 React 外掛——它們要你專案裡的 React，而不是自己再裝一份。",
          "為什麼要共用？因為像 React 這種<b>同時存在兩份會出鬼</b>（hooks 錯亂）。peer 就是強制「大家用同一份宿主」。",
          "⚠️ 常見的坑是「外掛要 React 18、你專案是 React 17」的版本不合警告。別無視——它常常正是「畫面莫名壞掉」的根因。要嘛升級對齊，要嘛換相容版本的外掛。",
        ),
      },
      {
        title: "dependencies vs devDependencies：正式用還是開發用",
        chapter_id: 64,
        content: P(
          "package.json 裡套件分兩區，新手常隨便裝、其實分清楚很重要。",
          "<b>dependencies</b>：程式<b>跑起來</b>就需要的（React、Express、資料庫驅動）。<b>devDependencies</b>：只有<b>開發/建置</b>時要、上線後不需要的（測試框架、打包工具、ESLint、型別定義 <code>@types/*</code>）。",
          "指令差在旗標：<code>npm install 套件</code> 進正式、<code>npm install -D 套件</code> 進 dev。",
          "⚠️ 放錯會出事：把「正式要用」的套件裝成 <code>-D</code>，上正式環境（跑 <code>npm install --production</code> 時只裝 dependencies）就<b>缺套件掛掉</b>。反過來把打包工具塞進正式區，也讓 production 依賴變肥。裝之前想一下：「上線後還需要它嗎？」",
        ),
      },
      {
        title: "npm scripts：把常用指令收進 package.json",
        chapter_id: 64,
        content: P(
          "每次要打一長串啟動指令，記不住又容易打錯。npm scripts 讓你把它們取個短名字收好。",
          "在 package.json 的 <code>scripts</code> 區寫 <code>\"dev\": \"next dev -p 3000\"</code>，之後只要 <code>npm run dev</code>。專案怎麼跑、怎麼測、怎麼 build，一看 scripts 就懂。",
          "有幾個保留名可省略 run：<code>npm start</code>、<code>npm test</code>。也能串接，例 <code>\"build\": \"tsc &amp;&amp; vite build\"</code>。",
          "⚠️ 別把 scripts 寫成只有你電腦跑得動的怪路徑或 OS 專屬指令（Windows 的 <code>rm</code> 和 Mac 不一樣）。要跨平台就用 <code>cross-env</code>、<code>rimraf</code> 這類工具，不然隊友 clone 下來第一個指令就爆。",
        ),
      },
      {
        title: "npx：不用裝就跑一次的工具",
        chapter_id: 64,
        content: P(
          "有些工具我一輩子只用一次（建專案的鷹架），為它 <code>npm install -g</code> 裝到全域很浪費，npx 幫你「跑完就走」。",
          "<code>npx create-next-app</code>＝下載、執行、用完不留在系統。像叫外送吃一餐，不用把整間餐廳搬回家。",
          "也能指定版本跑：<code>npx cowsay@2 hi</code>；專案本機裝的工具也能 <code>npx</code> 跑（會優先用 <code>node_modules/.bin</code> 裡那份，版本跟專案一致）。",
          "⚠️ npx 會<b>去網路抓來直接執行</b>——名字打錯或抄到來路不明的套件，等於執行陌生人的程式。跑之前確認套件名沒拼錯、是官方的，別複製奇怪教學裡的 <code>npx 某某某</code>。",
        ),
      },
      {
        title: "nvm 與 .nvmrc：多個 Node 版本切著用",
        chapter_id: 64,
        content: P(
          "A 專案要 Node 18、B 專案要 Node 20，全域只能裝一個版本很痛。nvm 讓你隨時切換。",
          "nvm（Node Version Manager）像「Node 版本的遙控器」：<code>nvm install 20</code> 裝、<code>nvm use 20</code> 切。Windows 用 nvm-windows 或 fnm。",
          "在專案根目錄放一個 <code>.nvmrc</code>（裡面就寫版本號如 <code>20</code>），隊友進來 <code>nvm use</code> 就自動切成專案要的版本，不用問。",
          "⚠️ 「本機好好的、CI/隊友那邊裝不起來」很常是 <b>Node 版本不一致</b>——某套件只支援特定版本。專案一定要放 <code>.nvmrc</code> 或在 package.json 的 <code>engines</code> 標明版本，把這個變因鎖死。",
        ),
      },
      {
        title: "tsconfig：TypeScript 設定看這幾個就好",
        chapter_id: 64,
        content: P(
          "第一次打開 <code>tsconfig.json</code> 幾十個選項會嚇到，其實新手真正要在意的沒幾個。",
          "<b>strict</b>：開了它，TS 才會真的幫你抓 null、型別對不上這些問題——<b>務必開</b>，不然等於白用 TS。<b>target</b>：編譯成哪個 JS 版本。<b>paths</b>：設路徑別名（讓 <code>@/utils</code> 指到 <code>src/utils</code>，不用寫一堆 <code>../../</code>）。",
          "<b>include / exclude</b>：管哪些檔要編譯。多數框架（Next、Vite）已幫你設好一份合理的，不用從零寫。",
          "⚠️ 為了「少一點紅線」而把 <code>strict</code> 關掉，是把 TS 最值錢的部分丟掉——那些紅線正是它在幫你擋 runtime bug。寧可一個個修，別關 strict。",
        ),
      },
      {
        title: "ESLint 與 Prettier：一個抓錯、一個排版",
        chapter_id: 64,
        content: P(
          "很多人把這兩個搞混或以為只要一個。它們分工不同、最好一起用。",
          "<b>Prettier</b>：管「長相」——縮排、引號、分號、換行，存檔自動排整齊，讓全隊 code 風格一致，不用再為「單引號還雙引號」吵架。",
          "<b>ESLint</b>：管「品質」——抓可能的 bug 和壞習慣（宣告了沒用的變數、可能是 undefined、危險寫法），有些還能 <code>--fix</code> 自動修。",
          "⚠️ 兩個都碰排版時會打架（互相把對方改回去）。標準解是讓 <b>Prettier 管格式、ESLint 只管邏輯</b>（用 <code>eslint-config-prettier</code> 關掉 ESLint 的排版規則）。設定檔記得進 git，隊友才會一致。",
        ),
      },
      {
        title: "EditorConfig：連沒裝外掛的人也能統一縮排",
        chapter_id: 64,
        content: P(
          "隊裡有人用 Tab、有人用空白，有人檔案結尾沒換行，diff 一片亂。<code>.editorconfig</code> 是最底層的解法。",
          "在專案根放一個 <code>.editorconfig</code>，寫好「用空白、縮排 2、結尾留一個換行、去掉行尾空白」，<b>大多數編輯器原生支援或裝一下就吃</b>，不分 VS Code 還是別的。",
          "它跟 Prettier 不衝突、是互補：EditorConfig 管你「打字當下」的基本行為，Prettier 管「存檔時」的完整排版。",
          "⚠️ 這是最容易被跳過、卻最省事的一個檔。沒有它，光是 <b>Tab vs 空白、CRLF vs LF</b> 就能讓 PR 出現一堆「其實沒改什麼」的雜訊 diff，review 的人白費眼力。新專案順手加。",
        ),
      },
      {
        title: "source map：壓縮後的 code 怎麼還能 debug",
        chapter_id: 64,
        content: P(
          "上線的 JS 都被壓成一行亂碼，出錯時 console 說「錯在第 1 行第 88293 個字」——完全沒用。source map 就是來救這個的。",
          "它是一張「對照表」，把壓縮後的位置<b>映射回你原本好讀的原始碼</b>行號。瀏覽器 DevTools 有它，就能顯示「其實是 <code>Cart.tsx</code> 第 42 行」。",
          "打包工具（Vite、webpack）都能產 source map，DevTools 自動抓來用，你 debug 時看到的是原始碼不是亂碼。",
          "⚠️ 別把「含原始碼內容」的 source map 公開部署到正式站——等於把你的原始碼攤給所有人看。要嘛正式環境不出、要嘛只上傳到錯誤監控服務（Sentry 那種）私下對照。",
        ),
      },
      {
        title: "HTTP 快取標頭：瀏覽器為什麼記住舊檔",
        chapter_id: 25,
        content: P(
          "「我明明重新部署了、使用者卻還是看到舊版」——很多時候是 HTTP 快取標頭在作怪，值得懂原理。",
          "伺服器回檔案時會附標頭告訴瀏覽器「這個可以存多久」：<code>Cache-Control: max-age=31536000</code> 就是「放一年別再問我」。<code>ETag</code> 則像檔案的指紋，瀏覽器拿它問「變了沒」，沒變伺服器回 304、省下重傳。",
          "現代做法：HTML 設「不快取或短快取」、JS/CSS/圖這種靜態檔設「快取超久」但<b>檔名帶 hash</b>（<code>app.a1b2c3.js</code>）——內容一變檔名就變，自然抓新的。",
          "⚠️ 把 HTML 也設成長快取是災難——使用者會一直卡在舊版、還抓不到新檔名。原則記牢：<b>會變的別快取、不變的（帶 hash 的）狠狠快取</b>。",
        ),
      },
      {
        title: "DNS 紀錄 A / CNAME：網域怎麼指到你的站",
        chapter_id: 25,
        content: P(
          "買了網域要讓它指到你的網站，就要設 DNS 紀錄。剛開始被 A、CNAME 這些搞混，其實對照一下就懂。",
          "<b>A 紀錄</b>：把網域直接指到一個 <b>IP 位址</b>（<code>example.com → 1.2.3.4</code>）。<b>CNAME</b>：把網域指到<b>另一個網域名</b>（<code>www → example.com</code> 或指到平台給的網址），像「改名轉寄」。",
          "常見設法：主網域用 A 指 IP、<code>www</code> 用 CNAME 指主網域；用 Vercel/Zeabur 這類平台則多半照它給的 CNAME 設。",
          "⚠️ 兩個坑：一是 DNS 改了<b>不會馬上生效</b>，有 TTL 快取，可能等幾分鐘到幾小時，別以為沒設好一直重弄。二是<b>根網域（裸網域）通常不能用 CNAME</b>，要用 A 或平台的 ALIAS/ANAME。",
        ),
      },
      {
        title: "SSL 憑證與 Let's Encrypt：免費把網站變 https",
        chapter_id: 25,
        content: P(
          "以前裝憑證要花錢又麻煩，現在 Let's Encrypt 免費、還能自動續，https 已經沒有藉口不做。",
          "憑證的作用：<b>加密</b>（別人攔不到你和使用者之間的資料）+ <b>證明身分</b>（這真的是你的站，瀏覽器才不標「不安全」）。",
          "現在多數平台（Vercel、Zeabur、Cloudflare）幫你<b>全自動</b>申請和續期，你只要把網域設好就有 https。自架伺服器可用 <code>certbot</code> 一鍵搞定。",
          "⚠️ Let's Encrypt 憑證<b>90 天就到期</b>，一定要設自動續期。我看過站台憑證過期整個掛掉、瀏覽器紅色警告嚇跑使用者——自動續好、順便設個到期監控。",
        ),
      },
      {
        title: "反向代理：nginx 站在你的服務前面幹嘛",
        chapter_id: 25,
        content: P(
          "自己架站常聽到「用 nginx 做反向代理」，反向代理到底在做什麼？其實就是個「門口櫃檯」。",
          "使用者不直接碰你的 node 程式，而是先到 nginx，nginx 再<b>轉發</b>給後面真正的服務。像大樓櫃檯：訪客先到櫃檯，櫃檯再幫你轉到正確樓層。",
          "櫃檯順便做很多雜事：<b>掛 https 憑證</b>、把 <code>80/443</code> 導到你程式的 <code>3000</code>、發靜態檔、把流量分給多台後端（負載平衡）、擋一點壞流量。",
          "⚠️ 很多「本機好好的、上正式 502/404」都出在反向代理設定：轉發的 port 打錯、路徑沒對上、或程式根本沒起來。查問題先看 <b>nginx 的 error log</b>，再確認後面的服務真的在跑。",
        ),
      },
      {
        title: "防火牆與 port：只開該開的門",
        chapter_id: 25,
        content: P(
          "架了台伺服器，防火牆決定「外面能連進哪些 port」。設錯不是連不上、就是門戶大開。",
          "把伺服器想成一棟樓，每個 port 是一扇門。防火牆是保全，決定哪些門對外開。網站通常只需要開 <code>80</code>（http）、<code>443</code>（https），還有給你自己連的 <code>22</code>（SSH）。",
          "其他像資料庫的 <code>5432</code>、你程式的 <code>3000</code>，應該<b>只開給內部</b>、不對公開網路開。",
          "⚠️ 最常見的災難：把<b>資料庫 port 對全世界開、還用預設密碼</b>——幾小時內就會被掃到、資料被偷或被勒索。原則是「預設全關、只開必要的、來源能限制就限制」。雲平台的 security group 也是同一回事。",
        ),
      },
      {
        title: "Docker 基礎：把環境打包成一個箱子",
        chapter_id: 22,
        content: P(
          "「我這台跑得動、你那台跑不動」的環境地獄，Docker 就是來終結它的。概念其實不難。",
          "把 Docker 想成<b>貨櫃</b>：你的程式、它需要的 Node 版本、系統套件、設定，全裝進一個標準箱子（image）。搬到任何有 Docker 的機器，箱子一開、跑起來都一樣。",
          "三個詞：<b>Dockerfile</b>（怎麼組箱子的食譜）→ build 成 <b>image</b>（打包好的箱子）→ run 起來變 <b>container</b>（正在跑的實例）。",
          "⚠️ 新手常把 image 弄到超肥（幾 GB）——因為 base image 選太大、又把 <code>node_modules</code> 和一堆沒用的東西都塞進去。用小的 base（<code>-alpine</code>）、寫 <code>.dockerignore</code> 排掉 <code>node_modules</code>/<code>.git</code>、善用多階段 build，箱子才輕。",
        ),
      },
      {
        title: "密鑰輪替：金鑰要定期換，不是設一次就好",
        chapter_id: 12,
        content: P(
          "很多人金鑰、密碼設好就放十年，這其實很危險。輪替（rotation）＝定期換掉，是重要的自保習慣。",
          "道理跟門鎖一樣：就算沒被偷過，用久了外流風險累積（進過 log、給過廠商、離職員工看過）。定期換一把新的，舊的失效，把風險歸零。",
          "怎麼做順一點：金鑰別寫死在 code、集中放<b>環境變數或密鑰管理服務</b>，換的時候改一個地方就好，不用翻遍程式。",
          "⚠️ 最該立刻輪替的時機：<b>金鑰不小心進了 git / 貼到聊天室 / 出現在截圖</b>——即使馬上刪掉，也要當它已外洩、<b>立刻換新的</b>。git 歷史刪不乾淨，舊金鑰還在那躺著等人挖。",
        ),
      },
      {
        title: "密碼熵：為什麼「短又亂」不如「長」",
        chapter_id: 12,
        content: P(
          "大家都以為密碼要「有大小寫數字符號」才安全，其實真正決定強度的是<b>熵</b>——白話說就是「要猜多少種可能」。",
          "熵越高越難暴力破解，而拉高熵最有效的是<b>長度</b>，不是硬塞奇怪符號。<code>Tr0ub4dor&3</code> 這種又難記又其實不夠強；四個隨機單字 <code>correct horse battery staple</code> 又長又好記、熵反而更高。",
          "所以現代建議：<b>用密碼片語（passphrase）或密碼管理器產的長隨機字串</b>，把長度堆上去。",
          "⚠️ 熵只算「隨機性」——你拿生日、寵物名、<code>P@ssw0rd</code> 這種可猜的東西，再長也沒用，因為攻擊者先猜這些。真正安全＝<b>夠長 + 真的隨機 + 每站不同</b>，這三個一起才成立。",
        ),
      },
      {
        title: "HTTPS 到處都要用：不是只有登入頁",
        chapter_id: 12,
        content: P(
          "以前很多人覺得「只有登入、付款頁才需要 https，看看內容的頁面 http 就好」——現在這觀念過時且危險。",
          "沒加密的 http，中間任何一站（公共 Wifi、電信商、路由器）都能<b>看光你傳的東西、甚至偷改</b>（塞廣告、注入惡意腳本）。不只是偷密碼的問題。",
          "現在的共識是 <b>HTTPS Everywhere</b>：全站一律 https。憑證免費（Let's Encrypt）、平台自動裝，成本幾乎是零。",
          "⚠️ 常見的坑是<b>混合內容（mixed content）</b>：頁面是 https、卻還載入一張 http 的圖或 script，瀏覽器會擋掉或警告、東西壞掉。全站資源都要用 https（或用不指定協定的相對路徑）。",
        ),
      },
      {
        title: "釣魚辨識：那封「快來驗證帳號」的信",
        chapter_id: 12,
        content: P(
          "工程師帳號（GitHub、雲平台）被盜，很多不是被硬破解，是<b>自己被騙著把密碼交出去</b>——這就是釣魚。",
          "手法：一封長得跟官方一模一樣的信/訊息，用「帳號異常、限時、要驗證」製造緊張，連結點過去是<b>假的登入頁</b>，你一輸入帳密就送到壞人手上。",
          "破解招數就一個：<b>永遠自己手動打官網網址進去</b>，不要點信裡的連結。順便看寄件網域對不對、網址是不是差一個字母（<code>g1thub.com</code>）。",
          "⚠️ 最容易上鉤的時刻是「你正在急、正在等某個通知」時。開了 2FA 也別鬆懈——進階釣魚會連你的 2FA 驗證碼一起騙。慢一秒、用書籤或自己打網址，就躲掉九成。",
        ),
      },
      {
        title: "npm audit：一鍵掃出依賴裡的已知漏洞",
        chapter_id: 12,
        content: P(
          "你的專案裝了幾百個套件，其中某個舊版可能有已知安全漏洞你根本不知道。<code>npm audit</code> 幫你掃。",
          "跑 <code>npm audit</code> 會列出「哪個套件的哪個版本有什麼等級的漏洞、建議升到哪版」。CI 裡加一步，有高危漏洞就擋下來。",
          "多數能自動修：<code>npm audit fix</code> 會在<b>不破壞相容</b>的範圍內幫你升級。修不動的通常是要跨大版本、得手動處理。",
          "⚠️ 別看到一堆警告就狂按 <code>npm audit fix --force</code>——<code>--force</code> 會裝進破壞性的大版本升級，很可能<b>直接把你專案弄壞</b>。先看嚴重度，很多「漏洞」其實在你的用法下根本觸發不到，別被數字嚇到亂升。",
        ),
      },
      {
        title: "供應鏈安全：你信的不只你自己的 code",
        chapter_id: 12,
        content: P(
          "你 <code>npm install</code> 一個套件，其實是把「那個作者、以及他依賴的所有作者」的程式，全請進你的專案裡跑——這就是供應鏈風險。",
          "出過真實事故：熱門套件被駭客或不爽的作者<b>植入惡意程式</b>，或用相近名字騙你裝錯（typosquatting，如 <code>croos-env</code> 假冒 <code>cross-env</code>）。一裝就中招。",
          "自保：裝之前看一下這套件（下載量、維護狀況、名字有沒有拼對）；<b>commit lockfile</b> 鎖死版本、別讓它偷偷升級；定期 <code>npm audit</code>；CI 用鎖定安裝 <code>npm ci</code>。",
          "⚠️ 最危險的一句話是「反正大家都在用」。用得多不代表不會出事——愛用的套件被入侵，波及範圍反而最大。能自己幾行寫的小功能，別為它請一整包陌生依賴進門。",
        ),
      },
      {
        title: "changelog：升級前先讀「這版改了什麼」",
        chapter_id: 64,
        content: P(
          "我以前升級套件都直接升、然後東西壞了才回頭查。後來養成習慣：升級前先讀 changelog，省超多時間。",
          "changelog 就是套件作者寫的「每版做了什麼」清單，重點看 <b>Breaking Changes</b>（破壞性改動）和 <b>Migration Guide</b>（升級指南）——那裡會講「哪個 API 改名了、你要跟著改什麼」。",
          "通常在 repo 的 <code>CHANGELOG.md</code>、GitHub Releases 頁、或官方 blog。配合 semver 看：跳大版本（major）就一定要讀。",
          "⚠️ 「一次升好幾個大版本」最痛——中間每一版的破壞性改動疊在一起，壞了都不知道是哪個害的。要嘛<b>一版一版升、每步都測</b>，要嘛升前把相關 changelog 都掃過再動手。",
        ),
      },
      {
        title: "處理 deprecation：看到「已棄用」警告別當沒看到",
        chapter_id: 64,
        content: P(
          "console 或安裝時常跳 <code>deprecated</code>（已棄用）警告，很多人習慣性無視——這其實是作者在<b>提前通知你</b>，善待它未來會少很多痛。",
          "deprecated 的意思是「這東西還能用，但已經不建議、未來某版會拿掉」。它通常會告訴你<b>該改用什麼替代</b>。",
          "正確態度：不用當下慌張全改，但<b>記下來、排進待辦</b>，趁還相容時從容遷移。等它哪天真的被移除，你就是被迫在壓力下緊急處理。",
          "⚠️ 最坑的是「棄用警告積了一兩年沒理」，某次大升級一次全爆、你面對一堆同時失效的舊 API。棄用警告是<b>免費的預警</b>——小步跟上，別欠這種債。",
        ),
      },
      {
        title: "向後相容：改東西別讓舊的人碎掉",
        chapter_id: 43,
        content: P(
          "當你的 API/函式/套件<b>有別人在用</b>，改它就要顧「向後相容」——白話說：舊的用法不要突然壞掉。",
          "比喻：你家餐廳把招牌菜換了名字沒公告，老客人照舊菜名點餐就撲空。程式也一樣——別人依賴你原本的參數、回傳格式、網址，你一改他就爆。",
          "相容的改法：<b>加</b>新的（新參數給預設值、新欄位）而不是<b>改/刪</b>舊的；真要淘汰，先標 deprecated、給過渡期、再於<b>大版本（major）</b>才移除，並寫進 changelog。",
          "⚠️ 「這欄位應該沒人用吧」是最危險的猜測——你看不到所有用你東西的人。有疑慮就當有人在用，走「先加不刪、破壞性留給 major」這條穩路。",
        ),
      },
      {
        title: "時區處理：存時間的血淚教訓",
        chapter_id: 7,
        content: P(
          "時間相關的 bug 特別陰險，因為在你電腦（同一時區）測都對，換個時區的使用者就錯亂。這坑我踩過不只一次。",
          "鐵則：<b>資料庫和後端一律存 UTC</b>（世界統一時間），只在「顯示給使用者看」的最後一刻，才轉成他當地的時區。像所有帳目先用同一種貨幣記、要給客人看才換算。",
          "存的時候帶時區資訊（用 <code>timestamptz</code>、ISO 8601 的 <code>2026-07-08T10:00:00Z</code>），別存一個沒說是哪個時區的「裸時間」。",
          "⚠️ 幾個經典雷：夏令時間（DST）一年會有一小時重複/消失；<b>「日期」跟「時間點」不一樣</b>（生日、國定假日是純日期，別硬塞時區反而算錯一天）；還有月份從 0 開始（JS）害你差一個月。時間邏輯多、就用成熟的日期函式庫，別自己硬算。",
        ),
      },
      {
        title: "Unicode 與 emoji：一個字元不一定是一個字",
        chapter_id: 7,
        content: P(
          "以前我以為「字串長度 = 字數」，直到處理 emoji 和中文才發現沒那麼單純，還因此切壞過字。",
          "電腦裡文字用 Unicode 編號，但「一個你看到的字」可能由<b>好幾個編碼單位</b>組成。很多 emoji（尤其膚色、國旗、家庭那種）是好幾個碼點用「連接符」黏起來的一坨。",
          "後果：<code>\"👨‍👩‍👧\".length</code> 在 JS 可能是 8 不是 1；你用「取前 10 個字元」截字串，很可能<b>從一個 emoji 中間切開</b>，變成亂碼方框。",
          "⚠️ 要「按人眼看到的字」處理，別用最原始的長度/索引硬切。用語言提供的字素分割（JS 的 <code>Intl.Segmenter</code>）或現成函式庫。還有——DB 存 emoji 要用 <b>utf8mb4</b>，用舊的 utf8 會存不進去或變亂碼。",
        ),
      },
      {
        title: "CRLF vs LF：換行符號害的跨平台 diff 地獄",
        chapter_id: 0,
        content: P(
          "有次我拉了隊友的 code，git 顯示「整個檔都改了」但明明沒動幾行——元兇是換行符號。",
          "看不見的換行字元有兩派：<b>Windows 用 CRLF</b>（<code>\\r\\n</code>）、<b>Mac/Linux 用 LF</b>（<code>\\n</code>）。同一個檔在不同系統存，換行全變、git 就以為每行都改過。",
          "解法：專案根放 <code>.gitattributes</code> 寫 <code>* text=auto eol=lf</code>，強制倉庫裡統一存 LF；再配 <code>.editorconfig</code> 讓編輯器也乖乖用 LF。",
          "⚠️ 這種「假 diff」會把 PR 淹沒、code review 完全沒法看、還可能引發假衝突。而且 <code>.sh</code> 腳本若被存成 CRLF，在 Linux 會<b>直接跑不起來</b>（報奇怪的 <code>\\r</code> 錯誤）。新專案第一天就把 <code>.gitattributes</code> 設好。",
        ),
      },
      {
        title: "Tab vs 空白：這場聖戰你只要記一條",
        chapter_id: 64,
        content: P(
          "縮排用 Tab 還是空白，工程師吵了幾十年。與其選邊站，你只要記住真正重要的那條原則。",
          "<b>整個專案一致</b>比選哪個重要一百倍。混用是災難——你的 Tab 在別人編輯器顯示成 8 格、他的空白顯示成 2 格，同一段 code 縮排看起來忽寬忽窄、亂成一團。",
          "怎麼一致：交給工具、別靠自律。用 <code>.editorconfig</code> + Prettier 定好規則，存檔自動統一，誰打什麼都會被轉成專案標準。",
          "⚠️ 有個例外要知道：<b>Python 和 Makefile 對縮排是認真的</b>——Python 混用 Tab 和空白會直接語法錯誤、Makefile 規則<b>必須用 Tab</b>。這兩個場合別亂來。其他語言則是「一致就好、別開戰」。",
        ),
      },
      {
        title: "魔法數字：程式裡憑空出現的 86400 是什麼",
        chapter_id: 58,
        content: P(
          "讀到別人 code 裡突然冒出 <code>if (x > 86400)</code>、<code>* 0.07</code> 這種沒頭沒尾的數字，完全不知道在幹嘛——這就是魔法數字（magic number）。",
          "問題是它<b>沒有名字、沒有解釋</b>：86400 是一天的秒數？0.07 是稅率還是手續費？三個月後連寫的人都忘了，改動時還可能有好幾處要一起改、漏一個就出錯。",
          "解法很簡單：<b>給它一個有意義的常數名</b>。<code>const SECONDS_PER_DAY = 86400;</code>、<code>const TAX_RATE = 0.07;</code>——名字本身就是註解，改也只改一處。",
          "⚠️ 不是每個數字都要抽——<code>i + 1</code>、<code>* 2</code> 這種語意自明的別過度包裝。判準是：<b>「這個數字代表什麼」不看上下文說不出來，就該給它名字</b>。",
        ),
      },
      {
        title: "DRY 與 YAGNI：別重複，但也別想太多",
        chapter_id: 58,
        content: P(
          "這兩句是我覺得最實用的寫 code 原則，而且它們剛好互相拉住對方、避免走極端。",
          "<b>DRY</b>（Don't Repeat Yourself）：同一段邏輯複製貼上三個地方，之後改就要改三處、還會漏。重複的東西抽成一個函式/常數，改一處就好。",
          "<b>YAGNI</b>（You Aren't Gonna Need It）：別為了「以後搞不好會用到」現在就寫一堆用不上的彈性和抽象。多數「以後」根本不會來，那些提前寫的複雜反而變包袱。",
          "⚠️ 兩者要平衡：太追 DRY 會<b>過度抽象</b>（把其實只是「剛好長得像」的兩段硬湊成一個，之後需求一分岔就綁死）。務實準則：<b>重複第三次</b>再抽、抽的是「真的同一件事」而不只是「看起來像」。",
        ),
      },
      {
        title: "童子軍原則：離開時比來的時候乾淨一點",
        chapter_id: 58,
        content: P(
          "童子軍有句話：離開營地時，讓它比你來的時候更乾淨一點。套到寫 code 上，是我覺得最能對抗技術債的習慣。",
          "意思是：你為了改 bug、加功能而<b>經過</b>某段 code 時，順手做一點小清理——改個爛名字、補一句註解、拆掉一段太長的、刪掉沒用的死 code。",
          "威力在<b>複利</b>：不用專門排「大重構」（那種往往永遠排不到），靠每次經過的一點點小改善，codebase 會慢慢變好而不是慢慢爛掉。",
          "⚠️ 關鍵是<b>「順手、小範圍」</b>。別在修一個小 bug 的 PR 裡順便重構半個模組——那會讓 review 的人分不清「哪些是修 bug、哪些是整理」，也容易夾帶新 bug。清理要小、要跟主要改動分得清。",
        ),
      },
      {
        title: "小黃鴨除錯法：講給一隻鴨子聽",
        chapter_id: 71,
        content: P(
          "卡關卡到懷疑人生時，最有效的一招不是 Google，是<b>把問題從頭到尾講一遍給一隻塑膠鴨聽</b>——我第一次聽也覺得很蠢，用了才知道真的有效。",
          "原理是：當你被迫「一行一行、一步一步用嘴巴解釋」你的程式在幹嘛、你以為它會怎樣，你的大腦會<b>從「快速掃過」切換成「認真檢查」</b>，那個你自動略過的假設常常就在講的過程中露餡。",
          "不用真的有鴨——對著同事、對著空氣、寫進一份文件、打字問 AI，效果一樣。很多人打到問題一半自己就「啊我知道了」然後把訊息刪掉。",
          "⚠️ 重點是<b>真的逐步、具體地講</b>，不是含糊地想「應該是哪裡怪怪的」。把「這行我預期 x 是 5」這種明確假設講出來，才會撞到「可是它其實是 undefined」的真相。",
        ),
      },
      {
        title: "番茄鐘：25 分鐘專心，別再邊寫邊滑手機",
        chapter_id: 58,
        content: P(
          "寫 code 最怕的不是難，是<b>一直被打斷、心一直飄</b>。番茄鐘是我用過最簡單有效的專注法。",
          "做法：設 <b>25 分鐘</b>只做一件事、其他通知全關；時間到<b>休息 5 分鐘</b>（真的離開螢幕）；每四輪休長一點。就這樣。",
          "為什麼有用：25 分鐘短到「再撐一下就好」不會抗拒開始；而且它逼你<b>一次只做一件事</b>，切斷「寫兩行就去看訊息」的碎片化——那是效率最大的殺手。",
          "⚠️ 別把休息拿去滑社群媒體——那只會把注意力扯更散、回不來。休息就是<b>離開螢幕</b>（站起來、喝水、看遠方）。也別為了「湊完一顆番茄」而在已經卡死時硬撐，卡住時休息一下換腦袋反而快。",
        ),
      },
      {
        title: "做筆記與間隔複習：學過的別讓它漏光",
        chapter_id: 58,
        content: P(
          "學程式最挫折的不是學不會，是「上週明明查過、這週又忘光重查一次」。這是因為沒有把它<b>留下來</b>。",
          "<b>用自己的話記</b>：查到解法別只收藏連結，寫一兩句「我遇到什麼問題、怎麼解的、為什麼」。用自己的話重述一遍，記憶會深很多，之後也搜得到。",
          "<b>間隔複習</b>：記憶會隨時間衰退，但在快忘記時<b>再看一次</b>就能大幅拉長保存。所以隔幾天、隔一週回頭翻自己的筆記，比一次狂讀有用得多。",
          "⚠️ 別做成「抄一堆卻從不回看」的收藏家——收藏 100 篇文章 ≠ 學會。筆記的價值在<b>「未來的你會回來查、而且看得懂」</b>。記得簡短、可搜尋、寫下「為什麼」，比記一堆語法有用。",
        ),
      },
      {
        title: "冒牌者症候群：覺得自己是不是在混，其實大家都這樣",
        chapter_id: 58,
        content: P(
          "「我是不是根本不會、只是運氣好還沒被發現？」——如果你有過這種念頭，先跟你說：這叫冒牌者症候群，而且<b>越認真的人越常有</b>。",
          "為什麼會這樣：這行永遠有你不會的東西、你只看到別人「已經會」的成果、卻拿它跟自己「正在掙扎」的過程比。這比較本身就不公平。",
          "怎麼緩解：<b>記錄你的成長</b>——翻翻三個月前的 code，你會發現進步很多。把「我不會這個」改成「我還沒學這個」。而且，會 Google、會查、會問，本來就是這行的正常工作方式，不是弱點。",
          "⚠️ 別讓這種感覺害你<b>不敢問、不敢承接、不敢秀作品</b>——那才是真的擋住成長。連做很久的資深工程師都天天在查東西、在覺得自己不夠懂。你不孤單，繼續做就對了。",
        ),
      },
      {
        title: "什麼時候該求助：卡多久算太久",
        chapter_id: 58,
        content: P(
          "新手常有兩個極端：一種卡 5 分鐘就狂問、一種硬撐三天不肯開口。兩個都不好，中間有個甜蜜點。",
          "我的原則是<b>「15 分鐘規則」的變形</b>：卡住先自己認真試——讀錯誤、搜尋、看文件、拆小重現。如果<b>試了一段時間（比如 30 分鐘到一小時）完全沒進展、也想不出新方向</b>，就該問了。",
          "問之前先「把卡點整理清楚」：你想做什麼、試了哪些、完整錯誤是什麼。這個整理過程本身常常讓你自己找到答案；就算沒有，對方也能秒懂、秒回。",
          "⚠️ 「怕被覺得笨所以不問」害你浪費一整天、還可能走歪；「什麼都不查直接問」則讓人不想幫你、你也學不會查。健康的做法是<b>先誠實嘗試、卡到沒方向就帶著整理好的資訊求助</b>——這是能力，不是丟臉。",
        ),
      },
      {
        title: "怎麼開始一個新專案：別急著寫第一行 code",
        chapter_id: 58,
        content: P(
          "開新專案最讓人卡的往往是「第一步」。我的經驗是：別急著開編輯器狂敲，先花十分鐘想清楚幾件事。",
          "先問<b>「最小能動的版本是什麼」</b>：不是想像最終功能全開的樣子，而是「一個小到不可能失敗、但看得到結果」的起點（畫面能顯示一行字、按鈕能印出 log）。先讓它動，再長大。",
          "起手式：建資料夾、<code>git init</code>、開 README 寫一句「這要做什麼」、設好 <code>.gitignore</code>，用框架的 <code>create</code> 指令生鷹架、跑起來確認能開，<b>第一個 commit</b> 存下這個乾淨起點。",
          "⚠️ 兩個新手陷阱：一是<b>過度規劃</b>——還沒寫就先設計十張資料表、選一堆之後用不到的技術；二是<b>過度追新</b>——為了學而硬塞最潮的框架，結果卡在工具而不是做事。先小、先動、先能跑，再迭代。",
        ),
      },
      {
        title: "備份你的程式與資料：3-2-1 原則",
        chapter_id: 12,
        content: P(
          "「等出事才後悔沒備份」是這行的通用悲劇。硬碟會壞、手滑會刪、勒索軟體會鎖——備份不是選配。",
          "程式碼的備份靠 <b>git + 推到遠端</b>（GitHub/GitLab）就有一份異地副本；但別忘了 <b>git 不管的東西</b>——資料庫、使用者上傳的檔案、<code>.env</code> 設定，這些才是真的救不回的。",
          "老經驗是 <b>3-2-1 原則</b>：至少 <b>3</b> 份、放 <b>2</b> 種不同媒介、其中 <b>1</b> 份異地（雲端/離線）。重要資料庫設<b>自動定期備份</b>，別靠手動。",
          "⚠️ 最狠的一句話：<b>「沒還原測試過的備份，等於沒備份」</b>。我看過備份跑了兩年、真的要用時發現全是壞檔或根本沒包到關鍵資料。定期<b>真的把備份還原一次</b>驗證，才叫有備份。",
        ),
      },
      {
        title: "當機/當掉先看什麼：別急著亂改",
        chapter_id: 71,
        content: P(
          "服務掛了、頁面白了、程式沒反應——越慌越容易亂改把事情弄更糟。我的第一動作永遠是<b>先看，不是先改</b>。",
          "第一步<b>讀 log</b>：伺服器 log、瀏覽器 console、部署平台的 log——錯誤訊息通常直接告訴你哪裡爆、哪一行。這一步能省掉九成瞎猜。",
          "接著問<b>「剛剛改了什麼」</b>：剛部署？剛升級套件？剛改設定？最近一次變動幾乎都是頭號嫌犯（<code>git log</code> 看、必要時先 revert 回上一個好版本止血）。再排除環境因素：硬碟滿了？記憶體爆了？外部服務掛了？",
          "⚠️ 生產環境出事，<b>先止血、再找根因</b>——先回滾到能動的版本讓使用者可用，別在正式站上邊燒邊實驗。也別「重開機看看好了就算了」——沒找到根因，它一定會再來一次，下次可能更難搞。",
        ),
      },
      {
        title: "學習資源怎麼篩：不是收藏越多越強",
        chapter_id: 58,
        content: P(
          "剛入門時我拚命囤教學、收藏一堆「必看清單」，結果看不完、也記不住。後來才學會<b>篩</b>比囤重要。",
          "篩的第一關是<b>看日期</b>：這行變很快，一篇 2018 年的框架教學可能整個過時、照做只會踩一堆已被修掉的坑。優先看<b>官方文件</b>和近一兩年、對得上你版本的資源。",
          "第二關是<b>對準你現在的目標</b>：你正在做的事需要什麼就學什麼，別被「這個好像很重要」牽著到處開分頁。一次跟完<b>一個</b>好資源，勝過同時開五個都半途而廢。",
          "⚠️ 別掉進「收藏 = 學會」的錯覺——躺在書籤裡沒看的教學，價值是零。也別追「最完整的終極教學」遲遲不開始。挑一個夠新、對得上目標的，<b>邊做邊學</b>，缺什麼再回頭補，比先囤一堆有用得多。",
        ),
      },
      {
        title: "終端機不可怕：先會這幾個就能出發",
        chapter_id: 0,
        content: P(
          "黑黑的命令列只是「用打字代替點滑鼠」操作電腦，會幾個就夠。",
          "看路：<code>pwd</code>（我在哪）、<code>ls</code>（Win：<code>dir</code>，這裡有什麼）。",
          "移動：<code>cd 資料夾</code> 進去、<code>cd ..</code> 回上層。建立：<code>mkdir 名字</code>。",
          "跑程式：<code>python 檔.py</code>、<code>node 檔.js</code>。",
          "⚠️ 路徑有空白要用引號 <code>cd \"My Project\"</code>；卡住不動時 <code>Ctrl + C</code> 中斷。",
        ),
      },
      {
        title: "Git：把「存檔點」的概念用起來",
        chapter_id: 0,
        content: P(
          "Git 幫你的專案存「進度存檔點」，隨時能回到之前任一版本，也能跟別人協作不互相蓋掉。",
          "最小流程：<code>git status</code>（看改了啥）→ <code>git add .</code>（挑進去）→ <code>git commit -m \"改了啥\"</code>（存一個點）→ <code>git push</code>（推上 GitHub）。",
          "commit 訊息要有意義：「修好登入按鈕」而不是「更新」，未來的你會感謝你。",
          "還沒 commit 想丟掉某檔改動：<code>git checkout -- 檔名</code>。",
          "⚠️ 別把 <code>.env</code>、<code>node_modules</code> commit 上去——用 <code>.gitignore</code> 擋掉機密和一大坨依賴。",
        ),
      },
      {
        title: "怎麼問問題／查錯誤：省一半卡關時間",
        chapter_id: 71,
        content: P(
          "會查會問比什麼都值錢。我的順序：",
          "1. 先讀錯誤訊息本身——最後一行的「類型 + 說明」通常就是答案。",
          "2. 複製錯誤去搜尋——把那行(去掉自己的檔名路徑)貼進 Google，通常前幾篇就有。",
          "3. 問人/問 AI 給三樣：你想做什麼、你試了什麼、完整錯誤訊息。資訊給齊，答案又快又準。",
          "做最小重現：把問題縮到「最短、還能重現」的一段，很多時候縮的過程自己就找到原因了。",
          "⚠️ 只說「壞了、不會動」沒人幫得了你。貼錯誤、貼程式、講清楚預期 vs 實際。",
        ),
      },
      {
        title: "編輯器效率：少打字、少手殘（以 VS Code 為例）",
        chapter_id: 0,
        content: P(
          "工具順手寫起來才不痛苦。",
          "存檔自動排版：裝 Prettier、開 Format On Save，別再手動對齊。",
          "天天用的快捷鍵：找檔案 <code>Ctrl/Cmd+P</code>、找指令 <code>Ctrl/Cmd+Shift+P</code>、多游標 <code>Alt+點按</code>、整行移動 <code>Alt+↑/↓</code>。",
          "裝對應語言的外掛(Python、ESLint)，會即時抓錯、錯字當場看到。",
          "⚠️ 紅色波浪底線不是裝飾，是編輯器提前告訴你「這裡會出錯」，別忽略。",
        ),
      },
      {
        title: "讀官方文件的方法：一輩子受用",
        chapter_id: 58,
        content: P(
          "教學影片會過時，官方文件才是最新最準。學會讀它，就不用一直等別人教。",
          "先找 Getting Started / Quickstart：照著跑一遍，先讓最小的東西動起來，再回頭理解細節。",
          "用內建搜尋、看 Example：複製範例來改比從零寫快。",
          "看函式簽名：它會寫「吃什麼參數、回什麼」，看懂就知道怎麼用。",
          "⚠️ Google 到的舊文章 API 可能改了；跑不動時回官方文件對一下版本與寫法。",
        ),
      },
      {
        title: "專案的檔案怎麼放（別全塞一個資料夾）",
        chapter_id: 43,
        content: P(
          "小專案還好，一大就會「找不到檔案在哪」。早點養成分資料夾的習慣。",
          "常見分法：<code>src/</code> 放程式碼、<code>public/</code> 或 <code>assets/</code> 放圖片靜態檔、設定放根目錄。程式碼再按功能分（components、utils、api…）。",
          "原則：<b>相關的東西放一起</b>、一個檔只做一件事、檔名看得出內容。找檔案靠「猜得到在哪」而不是全域搜尋。",
          "⚠️ 一個 <code>index.js</code> 塞兩千行遲早崩潰。覺得檔案太長就是該拆的訊號。",
        ),
      },
      {
        title: "README 要寫什麼（寫給三個月後的自己）",
        chapter_id: 43,
        content: P(
          "README 是專案的門面，也是「未來的你」回來時的救命稻草。至少寫這幾段：",
          "1. 這專案是幹嘛的（一兩句）。2. 怎麼跑起來（安裝、環境變數、啟動指令）。3. 需要哪些前置（Node 版本、DB…）。",
          "把「怎麼從零跑起來」寫清楚，別人（和三個月後失憶的你）照著就能動，省下大量問人時間。",
          "⚠️ 別把真實金鑰貼進 README。給 <code>.env.example</code> 列出需要哪些變數、但不放真值。",
        ),
      },
      {
        title: "小步提交：commit 小一點、常一點",
        chapter_id: 0,
        content: P(
          "新手常常寫一整天、最後一次 commit 一大包，訊息還寫「更新」。出事很難回頭。",
          "改成<b>小步提交</b>：一個完整的小改動就 commit 一次，訊息寫清楚做了什麼（「加上登入表單驗證」）。",
          "好處：出錯時可以精準退回某一步、看歷史像看故事、跟別人合併衝突也少。",
          "一個 commit 只做一件事——修 bug 跟改排版別混在同一個 commit。",
          "⚠️ 別等到「全部做完」才 commit。存檔點越密，你越敢大膽改。",
        ),
      },
      {
        title: "為什麼要寫測試（最簡單的觀念）",
        chapter_id: 58,
        content: P(
          "測試聽起來很進階，其實觀念很簡單：<b>寫一段程式，自動檢查你的程式對不對</b>，這樣改東西時不怕弄壞別的地方。",
          "最基本的單元測試：給一個輸入、檢查輸出是不是預期。像 <code>expect(add(1,2)).toBe(3)</code>。",
          "價值在「改 code 之後跑一下測試」——綠燈代表沒把舊功能弄壞，你就敢重構。手動每次點來點去測，遲早漏。",
          "新手起步：先對「最容易出錯、最重要」的函式寫幾個測試就好，不用一開始追求 100%。",
          "⚠️ 沒測試不是罪，但「改東西都靠祈禱」遲早出事。從一兩個關鍵函式開始加。",
        ),
      },
      {
        title: "資安自保：新手最容易犯的幾個",
        chapter_id: 12,
        content: P(
          "還沒上線也要有的基本自保意識：",
          "1. 金鑰/密碼<b>絕不</b>進 git。已經進去了就當它外洩、立刻換掉。用 <code>.gitignore</code> 擋 <code>.env</code>。",
          "2. 重要帳號（GitHub、雲平台、信箱）開<b>兩步驟驗證 2FA</b>。",
          "3. 不信任使用者輸入：該驗證、該轉義的都做（防注入、防 XSS）。",
          "4. 相依套件也會有漏洞，定期更新、看有沒有安全警告。",
          "⚠️ 「先能動、之後再顧安全」是最常見的坑——有些洞補起來很貴。基本的一開始就順手做。",
        ),
      },
      {
        title: "命令列進階：管道 | 與幾個組合技",
        chapter_id: 0,
        content: P(
          "會了基本 cd/ls 之後，這幾招讓命令列真的變生產力。",
          "<b>管道 <code>|</code></b>：把前一個指令的輸出，餵給下一個。<code>cat log.txt | grep ERROR</code> = 印出檔案、只留含 ERROR 的行。",
          "<code>grep 關鍵字 檔案</code> 找內容、<code>找 | wc -l</code> 數幾行、<code>| head</code> 只看前幾筆。",
          "<code>&gt;</code> 把輸出存到檔（覆蓋）、<code>&gt;&gt;</code> 附加。上一個指令的結尾用 <code>&amp;&amp;</code> 串「成功才做下一個」。",
          "⚠️ <code>&gt;</code> 會覆蓋掉原檔！別手滑把重要檔案洗掉；不確定先用 <code>&gt;&gt;</code> 或先複製一份。",
        ),
      },
      {
        title: "Git 分支與合併衝突：不用怕",
        chapter_id: 0,
        content: P(
          "分支（branch）＝「開一條平行線做新功能，不影響主線」。做壞了砍掉就好。",
          "流程：<code>git switch -c feature-x</code> 開分支做事 → 好了合回主線 <code>git switch main</code> + <code>git merge feature-x</code>。",
          "<b>合併衝突</b>不可怕：兩邊改到同一行，Git 會標出 <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> 你的 / <code>=======</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> 對方的，你決定留哪個、刪掉標記、再 commit。",
          "⚠️ 別怕衝突而不敢合——越晚合、分支差越多、衝突越大。小步、常合最省事。",
        ),
      },
      {
        title: "Git 救援三招：reset / revert / stash",
        chapter_id: 0,
        content: P(
          "手滑了別慌，Git 幾乎都救得回來。",
          "<b>還沒 push、想反悔上一個 commit</b>：<code>git reset --soft HEAD~1</code>（保留改動、只退掉 commit）。",
          "<b>已 push、要安全撤銷</b>：<code>git revert &lt;commit&gt;</code>——生一個「反向 commit」，歷史留著、不會弄亂別人。",
          "<b>做到一半要切去修別的</b>：<code>git stash</code> 先把改動收起來，處理完 <code>git stash pop</code> 拿回來。",
          "⚠️ <code>git reset --hard</code> 會<b>丟掉</b>未 commit 的改動、救不回；動它前先確認你不要那些改動。",
        ),
      },
      {
        title: ".gitignore 該放什麼",
        chapter_id: 0,
        content: P(
          "有些東西<b>絕對不該</b>進版控，用 .gitignore 擋掉。",
          "必擋：<code>.env</code>／各種金鑰檔（機密）、<code>node_modules/</code>（一大坨、裝一下就有）、build 產物（<code>dist/</code>、<code>.next/</code>）、系統雜檔（<code>.DS_Store</code>）、log。",
          "找現成的：GitHub 有各語言的 gitignore 範本，直接抄一份改。",
          "⚠️ 已經 commit 上去才加 gitignore <b>不會</b>把它移除——要 <code>git rm --cached 檔案</code> 才會從版控拿掉（本機保留）。機密若已進 git，當它外洩、換掉。",
        ),
      },
      {
        title: "Pull Request 與 code review 文化",
        chapter_id: 43,
        content: P(
          "團隊協作不是各改各的直接推 main，而是走 <b>PR（Pull Request）</b>。",
          "流程：開分支做 → 推上去開 PR → 同事 review 給意見 → 改到 OK → 合併。",
          "PR 描述寫清楚「改了什麼、為什麼、怎麼測」，reviewer 才好看。PR 小一點、好 review。",
          "被 review 別玻璃心——那是在幫你抓漏、也是在對齊團隊寫法。review 別人時對事不對人、問問題而不是命令。",
          "⚠️ 別開巨大 PR（改 50 個檔）——沒人 review 得動，只會被草率 approve。",
        ),
      },
      {
        title: "語意化版本 semver：1.2.3 是什麼意思",
        chapter_id: 43,
        content: P(
          "套件版本 <code>主版本.次版本.修訂</code>（<code>MAJOR.MINOR.PATCH</code>），數字怎麼跳有意義。",
          "<b>PATCH</b>（1.2.<b>3</b>→4）：修 bug、不破壞相容。<b>MINOR</b>（1.<b>2</b>→3）：加新功能、仍相容。<b>MAJOR</b>（<b>1</b>→2）：<b>破壞性</b>改動、升級可能要改你的 code。",
          "<code>package.json</code> 的 <code>^1.2.3</code> = 允許升到 2.0 前的最新；<code>~1.2.3</code> = 只升 patch。",
          "⚠️ 大版本升級前先看 changelog / migration guide——MAJOR 跳號常常會弄壞你的東西。",
        ),
      },
      {
        title: "Markdown 語法：寫 README/筆記/PR 都用它",
        chapter_id: 43,
        content: P(
          "Markdown 是「用純文字寫出排版」的輕量語法，GitHub、筆記軟體、這個平台都吃它。",
          "標題 <code>#</code>／<code>##</code>；<b>粗體</b> <code>**字**</code>、<i>斜體</i> <code>*字*</code>；清單 <code>- 項目</code> 或 <code>1. 項目</code>。",
          "行內程式 用反引號包起來；一段程式用三個反引號框住（還能標語言上色）；連結 <code>[文字](網址)</code>；圖片前面加 <code>!</code>。",
          "⚠️ 換行要「空一行」才會分段（單純按 enter 有時不會換）；表格、清單前後留空行比較保險。",
        ),
      },
      {
        title: "正則表達式入門：先看懂幾個符號",
        chapter_id: 64,
        content: P(
          "正則（regex）是「用一個 pattern 去比對/抓文字」的迷你語言，看起來像亂碼但很強。",
          "常用：<code>\\d</code> 數字、<code>\\w</code> 字母數字底線、<code>.</code> 任意字、<code>+</code> 一個以上、<code>*</code> 零個以上、<code>?</code> 零或一個。",
          "位置：<code>^</code> 開頭、<code>$</code> 結尾。例：<code>^\\d{4}-\\d{2}-\\d{2}$</code> 比對 YYYY-MM-DD 日期。",
          "不用硬背——需要時用 regex101.com 邊試邊看它解釋每一段，或直接請 AI 幫你寫、你看懂再用。",
          "⚠️ 別拿正則去解析 HTML/JSON（用專門的 parser）；複雜正則也很難維護，能用字串方法解決就別上正則。",
        ),
      },
      {
        title: "JSON 與 YAML：設定檔與資料交換格式",
        chapter_id: 6,
        content: P(
          "兩個你天天會碰到的資料格式，先認得長相。",
          "<b>JSON</b>：前後端傳資料、很多設定檔用它。<code>{\"name\":\"小明\",\"tags\":[\"a\",\"b\"]}</code>——大括號物件、中括號陣列、鍵要雙引號、最後一項後面<b>不能有逗號</b>。",
          "<b>YAML</b>：靠縮排、更好讀，CI 設定、docker-compose 常用。冒號配值、<code>-</code> 開頭是清單項。",
          "⚠️ JSON 最常見錯：多一個逗號、少一個引號 → 整個 parse 失敗。YAML 最常見錯：縮排用到 Tab（YAML 只吃空白）。存檔前用工具驗一下。",
        ),
      },
      {
        title: "HTTP 與網址：URL 每一段在幹嘛",
        chapter_id: 75,
        content: P(
          "看得懂一個網址的結構，debug 網路問題會快很多。",
          "<code>https://api.site.com/users/123?page=2#top</code>：<code>https</code> 協定（有加密）、<code>api.site.com</code> 主機、<code>/users/123</code> 路徑（資源）、<code>?page=2</code> query 參數、<code>#top</code> 錨點（只在瀏覽器、不送伺服器）。",
          "請求還帶 <b>headers</b>（像 <code>Authorization</code> 帶身分、<code>Content-Type</code> 說明格式）與 <b>body</b>（POST 送的資料）。",
          "⚠️ 敏感資料別放在網址的 query（會被記進 log、瀏覽器歷史）；放 header 或 body。",
        ),
      },
      {
        title: "什麼是 API（講給完全新手）",
        chapter_id: 20,
        content: P(
          "API 這個詞很嚇人，其實概念很日常。",
          "把它想成餐廳的<b>服務生</b>：你（前端）不會自己衝進廚房（資料庫），而是跟服務生點餐（呼叫 API），廚房做好、服務生端出來（回傳資料）。",
          "API 就是「一組講好的窗口與規則」：打這個網址、帶這些參數，就會回這種資料。前後端、不同系統靠它溝通。",
          "你會「用別人的 API」（金流、地圖、天氣），也會「做自己的 API」給前端用。",
          "⚠️ 用第三方 API 注意：要不要 key、有沒有次數限制、回傳格式長怎樣——先讀它的文件。",
        ),
      },
      {
        title: "三層架構：前端 / 後端 / 資料庫怎麼分工",
        chapter_id: 16,
        content: P(
          "一個網站背後大致三層，理解分工就不會亂。",
          "<b>前端</b>（瀏覽器）：畫面與互動，跑在使用者的裝置上。<b>後端</b>（伺服器）：邏輯、驗證、權限，決定「能做什麼」。<b>資料庫</b>：存資料。",
          "一次流程：前端發請求 → 後端處理（查資料庫）→ 回結果 → 前端顯示。",
          "為什麼要分：安全（機密與規則在後端、使用者碰不到）、維護（各司其職）、可擴充（各層可獨立長大）。",
          "⚠️ 新手最常錯：把「該後端把關的事」（算錢、驗權限）寫在前端——使用者改得動前端，等於門戶大開。",
        ),
      },
      {
        title: "部署與網域：程式怎麼變成一個網址",
        chapter_id: 15,
        content: P(
          "本機跑得動，怎麼變成別人也能開的網站？",
          "<b>部署</b>：把程式放到一台 24 小時開機的伺服器/平台（Zeabur、Vercel、雲主機）跑起來。",
          "<b>網域（domain）</b>：花錢租一個名字（<code>mysite.com</code>），透過 <b>DNS</b>（網路的電話簿）把它指到你伺服器的位址。",
          "<b>HTTPS</b>：裝憑證讓網址變 <code>https</code>（加密、瀏覽器才不會標不安全）——現在多數平台自動幫你弄。",
          "⚠️ 「本機好好的、上線就掛」多半是環境變數沒設、或路徑/埠不對——先看部署平台的 log。",
        ),
      },
      {
        title: "為什麼網站會慢：先找對地方",
        chapter_id: 15,
        content: P(
          "「網站好慢」很籠統，先分清楚慢在哪一段再對症下藥。",
          "常見兇手：圖片太大/太多、一次載入太多 JS、API 太慢（常是 N+1 或沒索引的 DB 查詢）、沒有快取每次都重算、瀑布式一個等一個。",
          "怎麼找：DevTools 的 <b>Network</b> 看哪個請求最久/最肥、<b>Performance/Lighthouse</b> 給你整體評分與建議。",
          "先量再改——別憑感覺亂優化。80% 的慢常常來自 20% 的地方（那張大圖、那支慢查詢）。",
          "⚠️ 「過早優化」也是坑：先把最明顯的大石頭搬掉（壓圖、加索引），再談細節。",
        ),
      },
      {
        title: "怎麼有效學程式：專案導向 + 別停在看",
        chapter_id: 58,
        content: P(
          "最後一則講方法，因為方法對，走得比誰都遠。",
          "<b>動手做</b>：看懂 ≠ 會做。看完一個觀念，馬上自己打一次、改一點看會怎樣。只看不練，很快就忘。",
          "<b>做專案</b>：與其刷一堆零散教學，不如做一個你真的想要的小東西（待辦、記帳、爬蟲），過程中缺什麼學什麼，記得最牢。",
          "<b>卡住是正常的</b>：每個工程師都天天在 Google、問 AI。學會查、學會拆問題，比背語法重要。",
          "⚠️ 別掉進「教學地獄」——一直買課一直看卻不動手。看 20 分鐘、做 40 分鐘，比例抓對。",
        ),
      },
      {
        title: "環境變數 .env：設定與機密放這裡",
        chapter_id: 12,
        content: P(
          "程式裡會用到「資料庫網址、API 金鑰」這些會變、又不該寫死的東西——放環境變數。",
          "本機放一個 <code>.env</code> 檔（<code>KEY=value</code> 一行一個），程式從環境讀。<b>加進 .gitignore</b>、絕不上傳。",
          "給一份 <code>.env.example</code>（只列 key、不放真值）讓別人知道要設哪些。",
          "上線在部署平台的 env 設定填一份、不同環境不同值。",
          "⚠️ 機密（service key、密碼）別加會外洩到前端的前綴（如 <code>NEXT_PUBLIC_</code>）；也別把 .env 貼到聊天室/截圖。",
        ),
      },
      {
        title: "localhost 與 port：本機是怎麼跑起來的",
        chapter_id: 15,
        content: P(
          "跑起專案看到 <code>http://localhost:3000</code>，這兩個詞先搞懂。",
          "<b>localhost</b>（等於 127.0.0.1）＝「這台電腦自己」。只有你看得到，別人連不到。",
          "<b>port（埠）</b>＝同一台電腦上不同服務的「門牌號」。<code>:3000</code> 前端、<code>:5432</code> 資料庫…各佔一個。",
          "常見錯誤 <code>port already in use</code>＝那個門牌被別的程式佔了：關掉舊的、或換一個 port 跑。",
          "⚠️ 要讓手機/別人連到你本機測，得用區網 IP 或用 ngrok 這類工具「打洞」——localhost 只有自己。",
        ),
      },
      {
        title: "npm / package.json / lockfile 是什麼",
        chapter_id: 64,
        content: P(
          "JS 專案的依賴管理，這三個天天見。",
          "<b>package.json</b>：專案的身分證——名稱、指令（scripts）、用到哪些套件。<code>npm run dev</code> 就是跑這裡定義的指令。",
          "<b>npm install</b>：照 package.json 把套件裝到 <code>node_modules</code>。裝新套件 <code>npm install 名字</code>。",
          "<b>lockfile</b>（package-lock.json）：把「實際裝的每個套件的精確版本」鎖住，確保每台電腦裝的一模一樣。要 commit 進 git。",
          "⚠️ 別手改 lockfile；「我的能跑他的不行」常常是 lockfile 沒同步或被亂刪——重新 <code>npm install</code> 對齊。",
        ),
      },
      {
        title: "node_modules 與依賴：別怕那個大資料夾",
        chapter_id: 64,
        content: P(
          "<code>node_modules</code> 動輒幾萬個檔、幾百 MB，很嚇人，但概念很單純。",
          "它就是「你用到的套件、以及那些套件又用到的套件…」全部裝在這。所以會很大很多。",
          "<b>不要 commit</b>（放 .gitignore）——別人 <code>npm install</code> 就會依 package.json 自己長出來。",
          "壞掉的萬用解：刪掉 <code>node_modules</code> + lockfile 再 <code>npm install</code> 重裝一次，很多詭異問題會好。",
          "⚠️ 依賴不是越多越好——每個套件都是「別人的程式跑在你專案裡」，有安全與維護成本。能自己幾行寫的小功能別為它裝一包。",
        ),
      },
      {
        title: "瀏覽器怎麼把一個網址變成畫面",
        chapter_id: 75,
        content: P(
          "打一個網址到看到頁面，中間發生什麼？有這張圖，前端後端都更好懂。",
          "1. <b>DNS</b> 把網域（site.com）查成伺服器 IP。2. 瀏覽器對那台發 <b>HTTP 請求</b>。3. 伺服器回 <b>HTML</b>。",
          "4. 瀏覽器邊讀 HTML 邊「再去要」它引用的 CSS、JS、圖片。5. 組成 <b>DOM</b>、套 CSS、跑 JS → 畫成畫面、變得能互動。",
          "所以「頁面白一下才出現」常是 JS/資料還在載；「載很久」看 Network 面板哪一步卡住。",
          "⚠️ 理解這條鏈，遇到問題才知道往哪找：是 DNS？請求沒回？HTML 對但 JS 沒跑？分段排查。",
        ),
      },
      {
        title: "改了沒變？先想是不是快取",
        chapter_id: 25,
        content: P(
          "「我明明改了、畫面/資料怎麼還是舊的」——十次有八次是快取。",
          "瀏覽器快取：硬重整 <code>Ctrl/Cmd + Shift + R</code>、或開無痕視窗、或 DevTools 開著勾 Disable cache。",
          "CDN 快取：靜態檔（圖、JS）可能被 CDN 存著，要等過期或手動清。",
          "程式的快取：後端/資料快取沒失效，也會給舊資料。",
          "⚠️ debug 前先「排除快取」這個變因——不然你會對著沒問題的新 code 懷疑人生。",
        ),
      },
      {
        title: "亂碼與編碼：UTF-8 幾乎是唯一解",
        chapter_id: 7,
        content: P(
          "中文變成 <code>ä½ å¥½</code> 或 <code>???</code>，就是編碼沒對上。",
          "現代一律用 <b>UTF-8</b>：存檔用 UTF-8、開檔指定 UTF-8、網頁 <code>&lt;meta charset=\"utf-8\"&gt;</code>、資料庫欄位用 utf8mb4。",
          "程式讀寫中文檔記得 <code>encoding='utf-8'</code>（Python）；CSV 給 Excel 開亂碼是它預設不吃 UTF-8 的老問題。",
          "⚠️ 亂碼幾乎都是「某一環沒用 UTF-8」——從來源、傳輸到顯示，一路確認同一種編碼就好了。",
        ),
      },
      {
        title: "命名慣例：camelCase / snake_case / kebab",
        chapter_id: 58,
        content: P(
          "取名不只是好看——一致的命名讓 code 好讀、也少出錯。",
          "<b>camelCase</b>（<code>userName</code>）：JS/Java 變數、函式。<b>snake_case</b>（<code>user_name</code>）：Python 變數、資料庫欄位。",
          "<b>PascalCase</b>（<code>UserCard</code>）：類別、React 元件。<b>kebab-case</b>（<code>user-card</code>）：檔名、CSS class、網址。<b>UPPER_CASE</b>：常數。",
          "重點是「跟著你用的語言/團隊慣例、全專案一致」。",
          "⚠️ 名字要「看得懂在幹嘛」——<code>d</code>、<code>tmp2</code>、<code>data3</code> 這種未來的你會恨。好名字是最便宜的註解。",
        ),
      },
      {
        title: "註解怎麼寫：寫「為什麼」不是「做什麼」",
        chapter_id: 58,
        content: P(
          "新手常寫一堆廢註解（<code>i = i + 1  # i 加一</code>）——code 自己看得出來，這種只是噪音。",
          "好註解寫<b>「為什麼」</b>：為什麼用這個奇怪做法、為什麼是這個數字、這裡有什麼坑不能動。",
          "最好的註解其實是「好名字 + 小函式」——code 讀起來就像說明。真的需要解釋時才補註解。",
          "特殊標記：<code>TODO</code>（待辦）、<code>FIXME</code>（已知問題）、<code>HACK</code>（暫時的醜解）方便日後搜。",
          "⚠️ 註解要跟 code 一起更新——過時、說謊的註解比沒註解更害人。",
        ),
      },
      {
        title: "技術債：先借後還的概念",
        chapter_id: 58,
        content: P(
          "「先求能動、之後再整理」就像借錢——<b>技術債</b>。適度是正常的、但別假裝它不存在。",
          "利息＝之後每次改這塊都變慢、更容易出 bug。債越積越多，最後動不了。",
          "健康做法：趕時間先欠（並<b>寫下來</b>：留 TODO、開 issue），事後找時間還（重構）。",
          "⚠️ 別為了「趕快」把整個地基搞爛——有些債利息太高（沒測試、亂設計）會壓垮專案。分清「可接受的捷徑」和「以後會後悔的爛招」。",
        ),
      },
      {
        title: "怎麼拆任務與估時",
        chapter_id: 58,
        content: P(
          "「做一個登入功能」太大、無從下手也估不準。學會拆。",
          "把大任務拆成「半天內能完成、看得到結果」的小塊：畫表單 → 接 API → 存 token → 錯誤處理 → 樣式。一塊塊做、一塊塊有成就感。",
          "估時：對每個小塊估，加總再抓個緩衝（新手先估、做完對答案，慢慢校準——一開始都會低估）。",
          "⚠️ 卡在「不知道怎麼開始」時，先拆到「小到不可能失敗」的第一步（先讓表單顯示出來就好），動起來就順了。",
        ),
      },
      {
        title: "怎麼讀別人的程式碼（陌生 codebase）",
        chapter_id: 58,
        content: P(
          "工作有 8 成時間在讀別人（含過去的你）的 code，不是從零寫。讀的能力超重要。",
          "別想「一次讀懂全部」——找一個「入口」（首頁、某個 API、某個按鈕）順著追一條線。",
          "善用工具：全域搜尋關鍵字、「跳到定義 / 找引用」、跑起來邊點邊對照。",
          "改之前先「小改一下看會怎樣」（改個字、印個 log），用實驗建立理解。",
          "⚠️ 讀不懂很正常、不是你笨——大專案本來就複雜。一次搞懂一小塊，慢慢連成面。",
        ),
      },
      {
        title: "AI 工具用得好：prompt 的基本功",
        chapter_id: 48,
        content: P(
          "2026 了，會用 AI 寫程式是基本功，但「用得好」有訣竅。",
          "給<b>脈絡</b>：說清楚你在做什麼、用什麼技術、貼相關 code 與完整錯誤訊息——資訊越齊、答案越準。",
          "<b>拆小步</b>問：別叫它「做一個完整系統」，一步步來、每步你都看懂再往下。",
          "<b>一定要 review</b>：AI 會自信地寫出錯的東西。把它當「很強但會犯錯的實習生」，產出你要負責看懂、驗證。",
          "⚠️ 別貼公司機密/金鑰進去；也別 AI 說什麼就照抄——看不懂的 code 上線＝未爆彈。用它加速學習，不是取代理解。",
        ),
      },
      {
        title: "個人資安：密碼管理器與 2FA",
        chapter_id: 12,
        content: P(
          "會寫程式更要顧好自己的帳號——GitHub、雲平台、信箱被盜，損失很大。",
          "<b>密碼管理器</b>（Bitwarden、1Password…）：每個網站用不同的強密碼、它幫你記。別再到處用同一組密碼。",
          "<b>兩步驟驗證 2FA</b>：重要帳號一定開，就算密碼外洩也多一道關卡。用 authenticator app 比簡訊安全。",
          "小心釣魚：登入前看清楚網址是不是真的官網、別點來路不明的連結。",
          "⚠️ 一組密碼到處用 = 一個網站外洩、全部淪陷。這是最常見也最容易避免的資安災難。",
        ),
      },
      {
        title: "開源授權 license：能不能拿來用",
        chapter_id: 67,
        content: P(
          "在 GitHub 看到好用的專案，不是「公開的就能隨便用」——要看它的 license。",
          "常見寬鬆型（<b>MIT</b>、Apache）：幾乎隨便用（含商用），通常只要保留版權聲明。多數你會遇到的是這種。",
          "<b>GPL</b> 類（copyleft）：你用了、你的專案通常也得開源，商用要小心。",
          "沒放 license＝<b>預設保留所有權利</b>，嚴格說你不能拿來用。",
          "⚠️ 商用專案引入套件前看一下 license；圖片、字體、素材也有授權，別隨手抓來用踩到侵權。",
        ),
      },
      {
        title: "cookie 是什麼、跟登入的關係",
        chapter_id: 75,
        content: P(
          "cookie 是「網站存在你瀏覽器、每次請求會自動帶回去給伺服器」的小資料，最常拿來記住登入狀態。",
          "流程：你登入成功，伺服器種一個 cookie（裝 session id 或 token），之後每次請求瀏覽器自動帶著，伺服器就認得你。",
          "重要屬性：<code>HttpOnly</code>（JS 讀不到、防 XSS 偷）、<code>Secure</code>（只走 https）、<code>SameSite</code>（防 CSRF）。",
          "⚠️ 登入憑證放 <b>HttpOnly cookie</b> 比放 localStorage 安全；但 cookie 每個請求都帶，別塞大東西進去。",
        ),
      },
      {
        title: "SSR / CSR / SSG：網頁是怎麼被產生的",
        chapter_id: 15,
        content: P(
          "同一個網頁可以用不同方式「生出來」，影響速度與 SEO。",
          "<b>CSR（前端渲染）</b>：伺服器給空殼 + JS，瀏覽器跑 JS 才畫出內容。首屏較慢、SEO 較弱（純 SPA）。",
          "<b>SSR（伺服器渲染）</b>：伺服器先把 HTML 組好給你，快、SEO 好，但每次都要伺服器算。",
          "<b>SSG（靜態產生）</b>：build 時就把頁面產成靜態 HTML，最快、可放 CDN，適合不常變的內容（部落格、文件）。",
          "⚠️ Next.js 這種框架讓你混用——列表/文章用 SSR/SSG（要 SEO）、後台互動用 CSR。依「要不要 SEO、內容多久變一次」選。",
        ),
      },
      {
        title: "SEO 基礎：讓 Google 找得到你",
        chapter_id: 13,
        content: P(
          "做網站想被人搜到，幾個基本功先做。",
          "<b>能被抓</b>：內容要在 HTML 裡（純 CSR 對爬蟲不友善）；設好 <code>title</code>、<code>meta description</code>、語意標籤。",
          "<b>結構</b>：一頁一個 <code>h1</code>、清楚的標題階層、圖片 <code>alt</code>、乾淨好讀的網址。",
          "<b>技術</b>：sitemap.xml、robots.txt、載入速度（Google 在乎）、手機友善。",
          "⚠️ SEO 是長期的、沒有捷徑——最根本是「有人真的想看的好內容」。別買黑帽外掛，會被懲罰。",
        ),
      },
      {
        title: "錢別用 float：金額怎麼存",
        chapter_id: 7,
        content: P(
          "處理金額最經典的坑：<code>0.1 + 0.2 != 0.3</code>——浮點數有精度誤差，拿來算錢會少一分多一分，出事。",
          "正解：用<b>整數存「最小單位」</b>（把元換算成分，$12.34 存成 1234），或用專門的 Decimal 型別。",
          "資料庫用 <code>decimal/numeric</code> 型別存金額，別用 float/double。",
          "⚠️ 只要牽涉到錢、計費、庫存這種「不能有誤差」的數字，就別碰浮點數。顯示時再除回去加小數點。",
        ),
      },
      {
        title: "UX 基本：別讓使用者猜",
        chapter_id: 3,
        content: P(
          "工程師也該懂一點 UX——好不好用，決定東西有沒有人用。",
          "<b>給回饋</b>：按了按鈕要有反應（loading、成功提示），別讓人不知道發生了沒。",
          "<b>防呆</b>：危險操作要二次確認、可復原（undo）；表單錯誤講清楚哪裡錯、怎麼改。",
          "<b>降低負擔</b>：少一個步驟、少一個必填、預設幫填好——每多一步就少一些人完成。",
          "⚠️ 別用工程師視角想「這很明顯」——找一個沒看過的人試用一次，你會看到一堆你以為理所當然、其實會卡住人的地方。",
        ),
      },
      {
        title: "隱私與個資：處理使用者資料的基本責任",
        chapter_id: 57,
        content: P(
          "只要存使用者資料，就有責任。基本觀念先有。",
          "<b>最小蒐集</b>：只收「你真的需要」的資料，別什麼都要。",
          "<b>使用者的權利</b>（GDPR 等）：能查看、能下載（可攜）、能刪除自己的資料。",
          "<b>保護</b>：機密加密、密碼雜湊、權限控管、別亂 log 個資。",
          "⚠️ 「先都收起來以後可能有用」是危險心態——資料是負債也是責任，外洩會出大事。收得少、保護好、給使用者掌控權。",
        ),
      },
      {
        title: "敏捷與看板：怎麼把工作推進",
        chapter_id: 43,
        content: P(
          "團隊怎麼協作推進，聽過幾個詞先懂概念。",
          "<b>敏捷（Agile）</b>：小步快跑、常交付、依回饋調整，而不是一次規劃到底。",
          "<b>看板（Kanban）</b>：一張板子分「待辦 / 進行中 / 完成」，工作卡片在欄位間移動，一眼看到進度與卡點。",
          "<b>Sprint</b>：固定一段時間（如兩週）完成一批目標，結束回顧改進。",
          "⚠️ 工具/儀式是手段不是目的——核心是「小批交付、快回饋、持續改進」。個人專案也能用一張看板管自己。",
        ),
      },
      {
        title: "Git 工作流：feature branch 與 main",
        chapter_id: 0,
        content: P(
          "團隊怎麼用 Git 不打架，最常見的簡單流程。",
          "<code>main</code> 永遠保持「可上線」；做任何功能開一條 <code>feature/xxx</code> 分支，做完開 PR、review、合回 main。",
          "別直接往 main 推；別讓分支活太久（越久越難合、衝突越大）。",
          "commit 訊息清楚、一個 commit 一件事；合併前先 pull 最新的 main。",
          "⚠️ 大團隊有更完整的流程（gitflow、release 分支），但小團隊「main + 短命 feature 分支 + PR」就很夠用，別過度複雜化。",
        ),
      },
      {
        title: "怎麼寫好的 bug report / issue",
        chapter_id: 43,
        content: P(
          "回報問題寫得好，別人才修得動、也修得快。至少寫這幾項：",
          "<b>1. 預期</b>：本來應該怎樣。<b>2. 實際</b>：結果怎樣（附錯誤訊息、截圖）。<b>3. 重現步驟</b>：怎麼一步步做出這個 bug。",
          "<b>4. 環境</b>：什麼裝置/瀏覽器/版本。<b>5. 影響</b>：多嚴重、多常發生。",
          "⚠️ 「壞了、不能用」這種回報沒人幫得了你。花五分鐘寫清楚，省下來回問十次的時間——這也是工程師很重要的溝通力。",
        ),
      },
      {
        title: "非同步協作與寫文件",
        chapter_id: 43,
        content: P(
          "遠端/跨時區工作越來越多，「非同步溝通」是關鍵能力。",
          "重要決定、討論結果、怎麼跑起來——<b>寫下來</b>（README、wiki、issue），別只在會議/口頭講完就沒了。",
          "問問題給足脈絡（你想做什麼、試了什麼、卡在哪），對方不用來回追問就能答。",
          "把「未來的人（含你自己）會需要知道的」留成文件，是團隊效率的複利。",
          "⚠️ 沒寫下來的知識＝只存在某個人腦裡的風險（他請假/離職就斷了）。花點時間寫文件，長期超值。",
        ),
      },
      {
        title: "Core Web Vitals：使用者感受到的效能",
        chapter_id: 15,
        content: P(
          "Google 用幾個指標量「使用者實際感受的快不快」，也影響 SEO。",
          "<b>LCP</b>（最大內容載入）：主要內容多快出現——壓圖、優先載首屏。",
          "<b>CLS</b>（版面位移）：東西有沒有亂跳——圖片/廣告先留好位置（設寬高/aspect-ratio）。",
          "<b>INP</b>（互動反應）：點下去多快有反應——別讓 JS 卡住主執行緒。",
          "⚠️ 用 Lighthouse / PageSpeed 量、對照這幾項改。別只看「我電腦很快」——真實使用者的網路和裝置差很多。",
        ),
      },
      {
        title: "a11y 進階：語意與 ARIA",
        chapter_id: 1,
        content: P(
          "無障礙再深一點，讓讀螢幕器、鍵盤使用者都能用。",
          "<b>優先用語意元素</b>：真的 <code>&lt;button&gt;</code>、<code>&lt;a&gt;</code>、<code>&lt;nav&gt;</code>——它們天生就有正確的角色與鍵盤行為。",
          "<b>ARIA 是補丁</b>：語意元素做不到時才補（<code>aria-label</code> 給只有圖示的按鈕、<code>aria-live</code> 讓動態訊息被念出來）。",
          "<b>焦點管理</b>：彈窗打開把焦點移進去、關掉移回來；能用 Tab 走完流程。",
          "⚠️ 「用 div 加一堆 ARIA」不如「直接用對的語意元素」。ARIA 用錯比不用更糟——先語意、再 ARIA 補。",
        ),
      },
      {
        title: "開發環境設定：一次設好、到處能用",
        chapter_id: 0,
        content: P(
          "把開發環境弄順，長期省超多時間。",
          "編輯器設定、格式化（Prettier）、lint（ESLint）——放進專案（配置檔進 git），全隊一致、新人 clone 就有。",
          "常用工具裝好：git、node（用 nvm 管版本）、對應語言的環境。個人的 shell 別名、設定可整理成 dotfiles。",
          "專案寫清楚「怎麼從零跑起來」（README + .env.example），少一堆「我這邊跑不起來」。",
          "⚠️ 別每台電腦手動設一遍又忘記設了什麼——把設定「程式化、版本化」，換機/新人都快。",
        ),
      },
      {
        title: "作品集怎麼準備（給想接案/求職的你）",
        chapter_id: 58,
        content: P(
          "學了要能證明。作品集比「我上過什麼課」更有說服力。",
          "<b>做完整的小東西</b>：一兩個「真的能用、你自己會用」的專案，勝過十個半成品 demo。",
          "<b>放上線 + 原始碼</b>：能點開玩的連結 + GitHub；README 寫清楚做了什麼、用了什麼、解決什麼問題。",
          "<b>講故事</b>：不只貼截圖，說「為什麼做、遇到什麼難題、怎麼解」——這才看得出思考。",
          "⚠️ 別只堆教學跟著做的東西（面試官看得出來）——有一個「你自己想出來、從頭做到尾」的，最加分。",
        ),
      },
    ],
  },
];

// 便利貼配色輪播：讓官方筆記在筆記牆上像真人手作的一疊彩色便利貼（用到筆記的背景/配色系統）
const STICKY = ["yellow", "green", "blue", "pink", "purple", "orange"];

// 冪等：先刪這批（產品 + 該賣家這批 notes）
const titles = PACKS.map((p) => p.title);
await c.query("delete from public.note_products where seller_id=$1 and title = any($2)", [SELLER, titles]);
await c.query("delete from public.notes where user_id=$1 and category=$2", [SELLER, CAT]);

let products = 0, notesCount = 0;
for (const pack of PACKS) {
  const noteIds = [];
  for (const n of pack.notes) {
    const color = STICKY[notesCount % STICKY.length];
    const { rows } = await c.query(
      "insert into public.notes (user_id, title, content, category, tags, is_public, color, chapter_id) values ($1,$2,$3,$4,$5,true,$6,$7) returning id",
      [SELLER, n.title, n.content, CAT, ["官方", "開發筆記"], color, n.chapter_id ?? null]
    );
    noteIds.push(rows[0].id); notesCount++;
  }
  await c.query(
    "insert into public.note_products (seller_id, title, description, price_z, note_ids, is_active) values ($1,$2,$3,0,$4::uuid[],true)",
    [SELLER, pack.title, pack.desc, noteIds]
  );
  products++;
}

const { rows: cnt } = await c.query("select count(*)::int n from public.note_products where is_active");
console.log(`✓ 筆記市集種子：${products} 個免費筆記包 / ${notesCount} 則筆記（賣家=AI 島官方、price_z=0）`);
console.log(`  現況 → 上架中商品 ${cnt[0].n}`);
await c.end();
