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
        title: "環境先搞定，不然後面一直卡",
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
        content: P(
          "以前我都 <code>\"你好\" + name + \"，共\" + str(n) + \"筆\"</code> 接一長串，醜又容易漏 str()。",
          "後來只用 f-string：<code>f\"你好 {name}，共 {n} 筆\"</code>。前面加個 f，大括號裡直接放變數就好。",
          "小技巧：debug 想印變數，<code>print(f\"{x=}\")</code> 會印成 <code>x=值</code>，超省事。",
          "⚠️ 大括號要放變數/運算式，不是隨便的文字；要印一個真正的大括號要打兩個 <code>{{ }}</code>。",
        ),
      },
      {
        title: "推導式：一行做出一個新清單（看不懂就拆回 for）",
        content: P(
          "<code>[x*2 for x in nums if x>0]</code> 我第一次看也傻眼，唸法是「把 nums 裡每個 x，只留大於 0 的，乘 2 收進新清單」。",
          "它其實等於：開一個空 list、for 迴圈、if 判斷、append。只是濃縮成一行。看不懂就把它拆回四行想，馬上懂。",
          "字典也能推導：<code>{k: v*2 for k, v in d.items()}</code>。",
          "⚠️ 別為了炫技把三層邏輯塞一行，自己回頭看不懂就失去意義了。複雜就乖乖寫迴圈。",
        ),
      },
      {
        title: "資料結構怎麼選：list / dict / set / tuple",
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
        content: P(
          "以前要編號我都 <code>for i in range(len(items))</code> 再 <code>items[i]</code>，醜。",
          "<code>for i, x in enumerate(items)</code> 一次給你「第幾個 + 值」，需要編號時直接用。",
          "兩串一起跑用 zip：<code>for name, score in zip(names, scores)</code>，配對超乾淨。",
          "⚠️ zip 會以「最短那串」為準，長度不一樣時後面會被吃掉，記得。",
        ),
      },
      {
        title: "字典安全取值：.get() 比中括號安全",
        content: P(
          "<code>d[\"age\"]</code> 找不到 key 會直接噴 <code>KeyError</code> 讓程式掛掉。",
          "<code>d.get(\"age\", 預設值)</code> 找不到就回你給的預設，不會爆。處理來路不明的資料（API 回傳）特別好用。",
          "要「沒有就建一個」可以用 <code>d.setdefault(k, [])</code>，或 <code>collections.defaultdict</code>。",
          "⚠️ 想改字典又同時在迭代它，會出錯；先把要改的收集起來、迴圈跑完再改。",
        ),
      },
      {
        title: "函式：參數、回傳、預設值的雷",
        content: P(
          "<code>def greet(name, greeting=\"嗨\"):</code>——有預設值的參數要放後面。呼叫時 <code>greet(\"小明\", greeting=\"哈囉\")</code> 用名字帶參數，讀起來清楚。",
          "回傳多個值其實是回一個 tuple：<code>return x, y</code>，接的時候 <code>a, b = fn()</code>。",
          "⚠️ 超經典大雷：預設值別用可變物件 <code>def f(items=[])</code>——那個 list 會被所有呼叫共用、越跑越髒。要用 <code>def f(items=None): items = items or []</code>。",
        ),
      },
      {
        title: "看懂錯誤訊息（這招最值錢）",
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
        content: P(
          "最省力的心法：需求出現時，先想「內建有沒有現成工具」，常常不用自己造輪子。",
          "<code>pathlib</code> 處理路徑（跨系統不出錯）、<code>json</code> 讀寫 JSON、<code>datetime</code> 日期時間。",
          "<code>collections.Counter</code> 一行統計每個東西幾次；<code>itertools</code> 各種迭代/組合工具。",
          "⚠️ 別把自己的檔名取得跟標準庫一樣（<code>json.py</code>、<code>random.py</code>），會 import 到自己、噴莫名的錯。",
        ),
      },
      {
        title: "try / except：程式別一出錯就整個掛掉",
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
        content: P(
          "Python 不強制型別，但你可以「標註」給人和工具看：<code>def add(a: int, b: int) -> int:</code>——參數是 int、回傳也是 int。",
          "好處：編輯器會即時提示、你傳錯型別當場看到紅線，不用等執行才爆。變數也能標 <code>name: str = \"小明\"</code>。",
          "常見寫法：<code>list[int]</code>、<code>dict[str, int]</code>、可有可無用 <code>str | None</code>。",
          "⚠️ 它只是「提示」，不會真的擋你亂傳（Python 執行時不檢查）。要真的檢查得配 mypy 這類工具，但光是有提示，開發就順很多。",
        ),
      },
      {
        title: "開檔案用 with：記得關，別讓它一直開著",
        content: P(
          "讀寫檔案最容易忘的就是「關檔」。忘了關可能資料沒寫進去、或占著檔案不放。",
          "用 <code>with</code> 就不用自己關：<code>with open('a.txt', 'r', encoding='utf-8') as f: data = f.read()</code>——離開這個區塊，Python 自動幫你關。",
          "模式：<code>'r'</code> 讀、<code>'w'</code> 覆蓋寫、<code>'a'</code> 附加。中文檔一定加 <code>encoding='utf-8'</code>，不然容易亂碼。",
          "⚠️ 這個「進來自動開、離開自動收」的東西叫 context manager，資料庫連線、鎖也常這樣用，看到 <code>with</code> 就知道它會幫你收尾。",
        ),
      },
      {
        title: "切片 slicing：[start:stop:step] 三個數字的魔法",
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
        content: P(
          "承接前面「可變物件共用」的雷，遇到巢狀（list 裡有 list、dict 裡有 dict）會更微妙。",
          "<code>a.copy()</code> 是<b>淺</b>拷貝：外層複製了，但裡面的子 list 還是「共用同一份」——改子 list 兩邊還是一起變。",
          "要整份獨立：<code>import copy; b = copy.deepcopy(a)</code>——連裡面每一層都複製一份，改 b 完全不影響 a。",
          "⚠️ 沒有巢狀時淺拷貝就夠、也比較快；有巢狀又想完全隔離才用 deepcopy。搞不清楚「改一個另一個也變」時，先想是不是拷貝層數不夠。",
        ),
      },
      {
        title: "自訂例外與 raise：主動丟錯，讓問題早點爆",
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
        content: P(
          "「數每個東西出現幾次」「把東西依類別分組」是超常見需求，用對工具一行搞定。",
          "<b>Counter</b>：<code>from collections import Counter; c = Counter(words)</code>——直接得到每個字的次數。<code>c.most_common(3)</code> 拿前三多的。",
          "<b>defaultdict</b>：分組不用先檢查 key 存不存在。<code>from collections import defaultdict; groups = defaultdict(list)</code>，然後 <code>groups[city].append(name)</code> 直接加，key 不存在會自動生一個空 list。",
          "⚠️ 用一般 dict 做這些要先 <code>if k not in d: d[k]=…</code> 很囉唆；看到「計數」想 Counter、「分組」想 defaultdict。",
        ),
      },
      {
        title: "set 運算：交集 / 聯集 / 差集實戰",
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
        content: P(
          "簡單的「這樣就 A、否則 B」，不用寫四行 if-else。",
          "語法：<code>值A if 條件 else 值B</code>。例：<code>status = \"成人\" if age &gt;= 18 else \"未成年\"</code>。",
          "常拿來給預設值、或在 f-string / 推導式裡做小分支：<code>[\"even\" if x%2==0 else \"odd\" for x in nums]</code>。",
          "⚠️ 別把三層三元疊在一行（<code>a if x else b if y else c</code> 讀到瞎）——複雜就乖乖寫 if-elif-else。",
        ),
      },
      {
        title: "*args 與 **kwargs：接任意數量的參數",
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
        content: P(
          "f-string 大括號裡加 <code>:</code> 後面可以下「格式規格」，報表輸出超好用。",
          "小數位：<code>f\"{price:.2f}\"</code> → 兩位小數。千分位：<code>f\"{n:,}\"</code> → 1,234,567。百分比：<code>f\"{rate:.1%}\"</code>。",
          "對齊/補寬：<code>f\"{name:&lt;10}\"</code> 靠左補到 10 寬、<code>:&gt;10</code> 靠右、<code>:^10</code> 置中；補零 <code>f\"{n:03d}\"</code> → 007。",
          "⚠️ 這些只是「顯示格式」、不改原本的值；要真的四捨五入計算用 <code>round()</code>。",
        ),
      },
      {
        title: "pathlib：處理檔案路徑別再拼字串",
        content: P(
          "用 <code>+</code> 拼路徑（<code>dir + \"/\" + name</code>）跨系統會出事（Windows 是反斜線）。用 pathlib。",
          "<code>from pathlib import Path; p = Path(\"data\") / \"a.csv\"</code>——用 <code>/</code> 接路徑，自動處理分隔符。",
          "好用方法：<code>p.exists()</code> 在不在、<code>p.suffix</code> 副檔名、<code>p.stem</code> 檔名（不含副檔）、<code>p.read_text()</code> 直接讀、<code>Path(\"out\").mkdir(exist_ok=True)</code> 建資料夾。",
          "⚠️ 路徑用 pathlib、別手拼字串；跨作業系統跑不掉這關。",
        ),
      },
      {
        title: "datetime：日期時間與那個時區的坑",
        content: P(
          "處理時間遲早會遇到，先會這些。",
          "現在：<code>from datetime import datetime; now = datetime.now()</code>。格式化成字串 <code>now.strftime(\"%Y-%m-%d %H:%M\")</code>；反過來 parse 用 <code>strptime</code>。",
          "算時間差用 <code>timedelta</code>：<code>now + timedelta(days=7)</code> = 一週後。",
          "⚠️ <b>時區大坑</b>：存資料庫用 UTC、顯示時再轉當地，才不會差 8 小時。跨時區務必用「帶時區資訊（aware）」的時間，別用 naive 的裸時間亂比。",
        ),
      },
      {
        title: "json 模組：讀寫設定檔與 API 資料",
        content: P(
          "程式跟外界交換資料，JSON 是通用語言，Python 內建 json 模組處理。",
          "字串↔物件：<code>json.loads(字串)</code> 變 dict/list；<code>json.dumps(物件)</code> 變字串。",
          "檔案：<code>json.load(f)</code> 從檔讀、<code>json.dump(物件, f)</code> 寫檔。存中文加 <code>ensure_ascii=False</code>、要好讀加 <code>indent=2</code>。",
          "⚠️ JSON 只有基本型別——Python 的 datetime、set 不能直接丟進去 dump（要先轉字串/list）。key 一律變字串。",
        ),
      },
      {
        title: "random：抽樣、洗牌、亂數",
        content: P(
          "抽獎、洗牌、隨機測試資料常用。",
          "<code>random.randint(1, 6)</code> 骰子（含兩端）、<code>random.random()</code> 0~1 小數、<code>random.choice(清單)</code> 隨機挑一個。",
          "<code>random.sample(清單, 3)</code> 不重複抽 3 個、<code>random.shuffle(清單)</code> 就地洗牌。",
          "⚠️ 這是「偽亂數」——不能拿來做安全用途（產密碼/token）。要安全的隨機用 <code>secrets</code> 模組。要每次結果一樣（測試）用 <code>random.seed(值)</code> 固定。",
        ),
      },
      {
        title: "sorted 進階：多鍵排序與反向",
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
        content: P(
          "看到函式上面一行 <code>@something</code> 很多人黑人問號。它其實是「幫函式包一層額外行為」。",
          "白話：decorator 是「吃一個函式、回一個加強版函式」的函式。<code>@timer</code> 放在某函式上，就等於「先用 timer 把它包起來」——例如自動計時、自動記 log、自動檢查登入。",
          "常見場景：Web 框架的 <code>@app.route(\"/\")</code>、快取 <code>@cache</code>、權限 <code>@login_required</code>。",
          "⚠️ 初學會用（貼上框架給的 decorator）就夠了；自己寫 decorator 是進階，等你真的需要「很多函式共用同一段前後處理」再學。",
        ),
      },
      {
        title: "變數作用域與 global：函式內外的雷",
        content: P(
          "函式「看得到外面的變數，但預設不能改它」，這個規則不懂會踩雷。",
          "讀取 OK：函式裡可以讀外層/全域變數。但你在函式裡 <code>x = 5</code> 是「新建一個只屬於函式的 x」，不會動到外面的。",
          "真的要改外層全域：<code>global x</code> 宣告（但少用、容易讓程式難追）。改外層函式的變數用 <code>nonlocal</code>。",
          "⚠️ 更好的做法是「用參數傳進來、用 return 傳出去」，而不是靠 global 偷改——這樣函式才單純、好測。看到一堆 global 通常是設計該調整的訊號。",
        ),
      },
      {
        title: "any / all / next：一行做判斷與找第一個",
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
        content: P(
          "<code>assert 條件, \"訊息\"</code>：「我斷定這裡條件一定成立」，不成立就當場報 AssertionError。",
          "用途：在開發/測試時「早點抓到不該發生的狀態」。<code>assert len(a) == len(b), \"兩串長度要一樣\"</code>。",
          "它讓 bug 在「出錯的當下」爆，而不是拖到很後面才拿到怪結果、難追。",
          "⚠️ <b>別拿 assert 做正式的輸入驗證/權限檢查</b>——Python 用 <code>-O</code> 最佳化執行時 assert 會被整個拿掉。那種該用 if + raise。assert 是給開發者的自我檢查，不是給使用者的把關。",
        ),
      },
      {
        title: "整數除法與運算子：// % ** divmod",
        content: P(
          "數學運算有幾個新手容易混的符號。",
          "<code>/</code> 一律回小數（<code>6/2</code> = 3.0）；<code>//</code> 是「整除」丟掉小數（<code>7//2</code> = 3）；<code>%</code> 取餘數（<code>7%2</code> = 1）；<code>**</code> 次方（<code>2**10</code> = 1024）。",
          "判斷奇偶最常用 <code>%</code>：<code>n % 2 == 0</code> 是偶數。一次拿商跟餘數用 <code>divmod(7,2)</code> → <code>(3, 1)</code>。",
          "⚠️ 負數整除會「往下取整」（<code>-7//2</code> = -4 不是 -3）；浮點數 <code>0.1+0.2 != 0.3</code>（電腦二進位的老問題），比小數別用 <code>==</code>、用差值夠小或 <code>math.isclose</code>。",
        ),
      },
      {
        title: "型別轉換的陷阱",
        content: P(
          "在數字與字串之間轉換很常見，但幾個坑要知道。",
          "<code>int(\"3\")</code> OK，但 <code>int(\"3.5\")</code> 會<b>爆</b>（ValueError）——要先 <code>int(float(\"3.5\"))</code>。<code>str(123)</code> 轉字串、<code>float(\"1.5\")</code> 轉小數。",
          "<code>bool</code> 的雷：<code>bool(\"False\")</code> 是 <b>True</b>（非空字串都 True）！從環境變數/表單讀「True/False」要自己判斷字串內容，別直接 bool()。",
          "⚠️ 使用者輸入轉數字一定包 try/except（他可能亂打）；<code>int(\"08\")</code> 在新版 OK 但別依賴前導零。",
        ),
      },
      {
        title: "字串、bytes 與 encode / decode",
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
        content: P(
          "遞迴＝「把大問題拆成同型的小問題」，函式在自己裡面呼叫自己。",
          "兩個要素：<b>基底條件</b>（小到可以直接回答、停止遞迴）+ <b>遞迴步驟</b>（縮小問題再呼叫自己）。",
          "例：階乘 <code>def f(n): return 1 if n&lt;=1 else n*f(n-1)</code>。走樹狀/巢狀資料（資料夾、留言串）特別自然。",
          "⚠️ 忘了基底條件 = 無限遞迴 → <code>RecursionError</code>。Python 遞迴深度有限（預設約 1000），很深的用迴圈或改寫。很多遞迴其實用迴圈更快更省。",
        ),
      },
      {
        title: "閉包 closure：函式記住外層的變數",
        content: P(
          "閉包＝「一個函式，記住了它出生時外層的變數」，即使外層已經結束。",
          "例：<code>def multiplier(n): def mul(x): return x*n; return mul</code>——<code>double = multiplier(2)</code>，之後 <code>double(5)</code> = 10，那個 <code>n=2</code> 被 <code>double</code> 記住了。",
          "用途：做「工廠函式」（產生客製的函式）、裝飾器的底層原理、回呼帶狀態。",
          "⚠️ 迴圈裡建閉包又用迴圈變數，常常全部記到「最後一個值」——需要當下的值就用預設參數 <code>def f(x, n=n)</code> 綁進去。",
        ),
      },
      {
        title: "dataclass：資料類別免寫一堆樣板",
        content: P(
          "要一個「只是裝資料」的類別，用 <code>@dataclass</code> 省掉手寫 <code>__init__</code>。",
          "<code>from dataclasses import dataclass; @dataclass\nclass Point: x: int; y: int</code>——自動幫你生 <code>__init__</code>、好看的 <code>__repr__</code>、還能比較相等。",
          "<code>p = Point(1, 2); print(p)</code> → <code>Point(x=1, y=2)</code>，不用自己寫。可給預設值、設 <code>frozen=True</code> 變不可變。",
          "⚠️ 可變預設（list/dict）要用 <code>field(default_factory=list)</code>、不能直接 <code>=[]</code>（跟函式預設參數同一個雷）。純資料用 dataclass、有複雜行為才寫一般 class。",
        ),
      },
      {
        title: "Enum：別再用魔法字串當狀態",
        content: P(
          "訂單狀態到處寫 <code>\"pending\"</code>、<code>\"paid\"</code> 字串，打錯字也不會報錯——用 Enum 收斂。",
          "<code>from enum import Enum; class Status(Enum): PENDING=\"pending\"; PAID=\"paid\"</code>。",
          "用 <code>Status.PAID</code>，打錯名字會當場報錯（不像字串打錯默默錯）；集中一個地方管所有合法值。",
          "⚠️ 別散落一堆「魔法字串/魔法數字」在程式各處——用 Enum 或常數集中，改一次、到處對，也讓編輯器能自動完成。",
        ),
      },
      {
        title: "namedtuple：輕量、有名字的資料",
        content: P(
          "想要「像 tuple 一樣輕、但欄位有名字」，用 namedtuple。",
          "<code>from collections import namedtuple; Point = namedtuple(\"Point\", \"x y\")</code>；<code>p = Point(1, 2)</code>，可以 <code>p.x</code> 也可以 <code>p[0]</code>。",
          "比 dict 省記憶體、不可變（當 key、當回傳多值很好用），比 dataclass 更輕。",
          "⚠️ 需要「可變 + 方法」用 dataclass 或 class；只是「一組固定欄位的小資料、還要能解包」namedtuple 最順。",
        ),
      },
      {
        title: "CSV 讀寫：處理表格資料",
        content: P(
          "跟 Excel/試算表交換資料最常見的格式，用內建 <code>csv</code> 模組（或 pandas）。",
          "讀：<code>import csv; with open(\"a.csv\", encoding=\"utf-8\") as f: for row in csv.DictReader(f): print(row[\"name\"])</code>——<code>DictReader</code> 讓你用欄位名取值。",
          "寫：<code>csv.DictWriter(f, fieldnames=[...])</code>，先 <code>writeheader()</code> 再 <code>writerow(dict)</code>。",
          "⚠️ 中文一定 <code>encoding=\"utf-8\"</code>；給 Excel 開會亂碼可改 <code>utf-8-sig</code>。欄位裡有逗號/換行別自己拼字串——用 csv 模組它會正確處理引號跳脫。",
        ),
      },
      {
        title: "logging 取代 print：正式一點的輸出",
        content: P(
          "隨手 <code>print</code> debug 沒問題，但正式程式用 <code>logging</code> 更好。",
          "<code>import logging; logging.basicConfig(level=logging.INFO); logging.info(\"開始處理 %s\", name)</code>。",
          "好處：分級別（debug/info/warning/error）可一鍵調要看多細；能同時輸出到檔案；帶時間戳；正式環境關掉 debug 不用刪 print。",
          "⚠️ 到處 print 上線後很難管、也可能不小心印出機密。函式庫/服務端用 logging；一次性小腳本 print 就好。",
        ),
      },
      {
        title: "pytest 入門：怎麼寫第一個測試",
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
        content: P(
          "比 print 更強的除錯：在想檢查的那行放 <code>breakpoint()</code>，程式跑到那會停、進入互動除錯器（pdb）。",
          "停住後可以：打變數名看值、<code>n</code> 下一行、<code>s</code> 進入函式、<code>c</code> 繼續跑、<code>q</code> 離開。",
          "比一直加 print 再刪快多了——現場所有變數隨你查。",
          "⚠️ <code>breakpoint()</code> 是 Python 3.7+ 內建（等同 <code>import pdb; pdb.set_trace()</code>）；別忘了拿掉、也別 commit 進版控（會讓別人的程式卡住）。",
        ),
      },
      {
        title: "GIL 與並行：多執行緒還是多程序",
        content: P(
          "想「同時做很多事」加速，先搞懂 Python 的一個特性。",
          "<b>GIL</b>（全域直譯器鎖）讓 Python「同一時間只有一條執行緒在跑 Python code」——所以多執行緒對「純計算」<b>沒</b>加速。",
          "分兩種情況：等 I/O（下載、讀檔、等 API）用<b>多執行緒 / async</b>——等待時可以切去做別的，有效；純吃 CPU 的計算用<b>多程序</b>（multiprocessing）——真的用到多核。",
          "⚠️ 並行很容易寫出難抓的 bug（競爭條件）。新手先用「asyncio 處理大量 I/O」或「multiprocessing 跑重計算」這兩個明確場景，別盲目上多執行緒。",
        ),
      },
      {
        title: "pythonic 迴圈：直接迭代、別用 index",
        content: P(
          "從別的語言來的人常寫 <code>for i in range(len(items)): items[i]</code>——Python 有更漂亮的方式。",
          "直接跑元素：<code>for item in items:</code>。要編號配 <code>enumerate</code>；兩串一起配 <code>zip</code>；反向 <code>reversed</code>；排序後 <code>sorted</code>。",
          "判斷「在不在」用 <code>if x in items</code>（別自己寫迴圈找）；要「找第一個/有沒有/全部」用 <code>next/any/all</code>。",
          "⚠️ 「用 index 存取」在 Python 通常是壞味道——多半有更直接的寫法。寫得像 Python，讀的人（含你）都輕鬆。",
        ),
      },
      {
        title: "os / sys：跟系統與參數打交道",
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
        title: "先有這張地圖：HTML / CSS / JS 各幹嘛",
        content: P(
          "學前端前先記住這個，後面全部都好懂：HTML 是「內容與結構」（有什麼）、CSS 是「長相」（好不好看）、JS 是「行為」（會不會動）。",
          "DOM 是什麼？瀏覽器讀完 HTML 後，在記憶體裡把它變成一棵「節點樹」，這棵就是 DOM。你畫面上看到的都是 DOM 上的節點。",
          "所以「互動」的本質就是：使用者做動作 → JS 抓 DOM、改內容或樣式 → 畫面跟著變。",
          "⚠️ 我卡過的低級雷：改了檔畫面沒變——沒存檔、沒重整、或改到快取。先確認你改的是「正在看的那份」。",
        ),
      },
      {
        title: "別整頁 div：語意標籤讓大家看懂",
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
        content: P(
          "處理一串資料的三寶：<code>map</code>（每個轉換）、<code>filter</code>（只留符合的）、<code>reduce</code>（收斂成一個結果，像加總）；找一個用 <code>find</code>。",
          "解構省很多字：<code>const {name, age} = user;</code>；展開複製/合併 <code>[...arr]</code>。",
          "async 在解決什麼？跟伺服器要資料要「等」，不能卡住畫面。<code>await</code> 就是「等這件事做完再往下」：<code>const data = await (await fetch(url)).json();</code>。",
          "⚠️ 忘了 await，你拿到的是「還沒完成的 Promise」不是資料，印出來 <code>[object Promise]</code> 就是這個。",
        ),
      },
      {
        title: "React 一句話：畫面 = 狀態的函式",
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
        content: P(
          "點按鈕要做事：<code>btn.addEventListener('click', fn)</code>。事件物件 <code>e</code> 裡有一堆資訊，<code>e.target</code> 是被點的元素。",
          "冒泡（bubbling）：你點子元素，事件會一路往父層傳。善用這點做「事件委派」——在父層裝一個監聽器，就能管裡面所有子元素（尤其動態新增的），不用每個都裝。",
          "擋掉預設行為（表單送出、連結跳頁）用 <code>e.preventDefault()</code>；不想再往上冒泡用 <code>e.stopPropagation()</code>。",
          "⚠️ 迴圈裡綁事件、又直接用迴圈變數，常拿到最後一個值。用事件委派或 <code>let</code> 區塊作用域解決。",
        ),
      },
      {
        title: "localStorage：把資料存在瀏覽器",
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
        content: P(
          "CSS 變數（custom properties）讓你把顏色、間距集中管理，改一個地方全站跟著變。",
          "定義在 <code>:root{ --accent: #22c55e; }</code>，用的時候 <code>color: var(--accent);</code>。",
          "深色模式超好做：在 <code>@media (prefers-color-scheme: dark)</code> 或某個 <code>[data-theme=\"dark\"]</code> 底下，把同一組變數換值，畫面整套就變了、不用改每個元件。",
          "⚠️ 顏色別散落在各元件寫死；集中成變數，改主題、調品牌色才不會漏東漏西。",
        ),
      },
      {
        title: "transition 與 animation：讓介面順順地動",
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
        content: P(
          "「我 z-index 設 9999 了怎麼還是被蓋住」是經典坑。",
          "關鍵：z-index 只在「同一個堆疊脈絡（stacking context）」裡比大小。父層一旦有 <code>transform</code>、<code>opacity < 1</code>、<code>position + z-index</code> 等，就會開一個新脈絡，子元素的 z-index 再大也跳不出這個父層的層級。",
          "所以彈窗/下拉常見解法：把它<b>放到 body 底下</b>（portal）、脫離會限制它的父層。",
          "⚠️ z-index 要生效，元素通常得有 <code>position</code>（relative/absolute/fixed）。狂加大數字沒用時，先看是不是卡在某個父層的脈絡裡。",
        ),
      },
      {
        title: "表單：受控元件與基本驗證",
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
        content: P(
          "React 新手常煩惱「這個 state 要放哪個元件」。原則很簡單。",
          "state 放在「需要用到它的元件們，最近的共同父層」。只有自己用 → 放自己；兄弟元件要共用 → 提到它們的父層（lift state up），再用 props 傳下去。",
          "全站到處都要（登入狀態、主題）→ 才用 Context 或狀態管理工具，別一開始就上重工具。",
          "⚠️ 同一份資料別在兩個地方各存一份（會不同步）——存一處、其他人用 props 拿。",
        ),
      },
      {
        title: "破版救星：overflow 與 min-width:0",
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
        content: P(
          "用久 useState 會遇到「連續更新拿到舊值」的坑，懂這兩點就過關。",
          "<b>用函式更新</b>：更新要「根據前一個值」時，用 <code>setCount(c =&gt; c + 1)</code> 而不是 <code>setCount(count + 1)</code>——後者可能拿到還沒更新的舊 count。",
          "<b>批次更新</b>：React 會把同一個事件裡的多次 setState 合併、一次重畫（省效能）。所以同一函式裡連 <code>setCount(count+1)</code> 三次只會 +1；要 +3 就用函式更新版。",
          "⚠️ state 別直接改（<code>arr.push(x)</code>）——要給「新的」：<code>setArr([...arr, x])</code>，React 靠「換了新物件」才知道要重畫。",
        ),
      },
      {
        title: "useEffect 進階：依賴、cleanup、什麼時候跑",
        content: P(
          "useEffect 是最多人踩雷的 hook，抓住三件事就穩。",
          "<b>依賴陣列</b>決定何時重跑：<code>[]</code> 只跑一次（掛載時）、<code>[x]</code> x 變了才跑、不給陣列每次都跑。放進去的值要「effect 裡有用到的」。",
          "<b>cleanup</b>：return 一個函式做收尾（清計時器、取消訂閱、abort 請求）——下次重跑前、或元件卸載時會呼叫。",
          "⚠️ 兩大雷：① 依賴放不齊 → 拿到舊值（stale）；② effect 裡改了自己依賴的 state 又沒條件 → 無限迴圈。先想清楚「這效果什麼時候該重跑」。",
        ),
      },
      {
        title: "自訂 hook：把重複邏輯抽出來",
        content: P(
          "好幾個元件都在做「抓資料 + loading + error」？抽成自訂 hook 共用。",
          "規則就兩條：函式名以 <code>use</code> 開頭、裡面可以用其他 hook。例：<code>function useUser(id){ const [user,setUser]=useState(); useEffect(...); return user; }</code>。",
          "元件裡 <code>const user = useUser(id)</code> 一行搞定，重複邏輯集中在一處、好維護好測。",
          "⚠️ hook 只能在「元件或其他 hook 的最上層」呼叫——不能放在 if/迴圈裡（順序要固定，React 靠順序記狀態）。",
        ),
      },
      {
        title: "元件組合：props 與 children",
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
        content: P(
          "用 <code>map</code> 畫一串元素時，每個要有獨一無二的 <code>key</code>，這不是可有可無。",
          "React 靠 key 認出「誰是誰」，才能在資料變動時只更新變的、不整串重畫。",
          "key 要用「穩定且唯一」的值——通常是資料的 <code>id</code>。",
          "⚠️ <b>別用陣列 index 當 key</b>（除非清單永不增刪排序）——插入/刪除時 index 會錯位，導致 input 值錯亂、動畫跳掉這類詭異 bug。",
        ),
      },
      {
        title: "受控 vs 非受控 input：兩種表單寫法",
        content: P(
          "React 的 input 有兩派，先搞懂差別再選。",
          "<b>受控</b>：值綁 state（<code>value={x} onChange={...}</code>），畫面永遠等於資料——好即時驗證、好連動，是主流。",
          "<b>非受控</b>：值交給 DOM 自己管，要用時用 <code>ref</code> 去讀（<code>ref.current.value</code>）——程式碼少、適合簡單表單或整合非 React 的東西。",
          "⚠️ 同一個 input 別一下給 <code>value</code> 一下不給——React 會警告「受控/非受控切換」。要嘛全程受控（給空字串當初始）、要嘛全程非受控。",
        ),
      },
      {
        title: "Context：跨層傳值，但別濫用",
        content: P(
          "登入狀態、主題、語言這種「很多層、很多元件都要用」的東西，用 props 一層層傳很痛苦，Context 解決這個。",
          "三步：<code>createContext</code> 建、外層 <code>&lt;XProvider&gt;</code> 包起來提供值、內層 <code>useContext(X)</code> 直接拿。",
          "適合：全域、少變動的東西（auth、theme、i18n）。",
          "⚠️ Context 的值一變，「所有用到它的元件」都會重畫——別把「常變動的大物件」全塞一個 Context，會拖效能。頻繁變動的狀態用別的方案。",
        ),
      },
      {
        title: "Flexbox 常見版型速成",
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
        content: P(
          "抓資料的畫面，新手常只做「成功」那一種，其他三種一發生就白畫面或壞掉。",
          "至少處理：<b>loading</b>（骨架/轉圈）、<b>error</b>（友善訊息 + 重試按鈕）、<b>empty</b>（「還沒有資料」的空狀態）、成功。",
          "順序：先判 loading → 再判 error → 再判 empty → 最後才畫資料。",
          "⚠️ 別假設「一定有資料」——<code>data.map</code> 在 data 還是 undefined（載入中）時會直接爆。先給預設 <code>data ?? []</code> 或先擋 loading。",
        ),
      },
      {
        title: "memo / useMemo / useCallback：別過早優化",
        content: P(
          "這三個是「避免不必要的重算/重畫」的效能工具，但先講重點：<b>大部分時候你不需要它們</b>。",
          "<code>useMemo</code> 記住「算很久的結果」、<code>useCallback</code> 記住「函式本體」、<code>React.memo</code> 讓元件「props 沒變就不重畫」。",
          "什麼時候才用：真的量出來卡（很大的清單、很重的計算、傳給 memo 子元件的函式）再加，對症下藥。",
          "⚠️ 到處亂包 useMemo/useCallback 反而增加負擔、程式更難讀——先寫簡單版、真的慢再優化。過早優化是萬惡之源。",
        ),
      },
      {
        title: "TypeScript 是什麼、型別註記入門",
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
        content: P(
          "看到 <code>Array&lt;string&gt;</code>、<code>useState&lt;number&gt;()</code> 那個角括號就是泛型。它讓函式/型別「先不指定型別、用的時候才代入」。",
          "例：<code>function first&lt;T&gt;(arr: T[]): T { return arr[0]; }</code>——傳字串陣列回字串、傳數字陣列回數字，型別自動跟著走、不用寫很多份。",
          "用途：容器（清單、Map）、API 回傳包裝、可重用工具函式。",
          "⚠️ 泛型是「進階但很值得」——一開始會用內建的（Array、Promise、useState 帶型別）就好，自己寫泛型等有「同一段邏輯要吃很多種型別」時再學。",
        ),
      },
      {
        title: "TS 常用招：union / optional / as",
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
        content: P(
          "想讓字級/間距「隨螢幕平順縮放」，不用切一堆斷點，用 <code>clamp()</code>。",
          "<code>font-size: clamp(1rem, 4vw, 2rem);</code>——最小 1rem、理想跟著螢幕寬（4vw）、最大 2rem，中間自動流體變化。",
          "配合 <code>min()</code> / <code>max()</code> 控制容器寬：<code>width: min(90%, 1200px)</code>（最多 1200、但小螢幕留 10% 邊）。",
          "⚠️ clamp 好用但別完全取代斷點——版面「佈局要換」時（單欄變雙欄）還是用 media query 或容器查詢。",
        ),
      },
      {
        title: "深色模式怎麼實作",
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
        content: P(
          "圖示別用圖片檔（放大糊、改色難），用 <b>SVG</b>——向量、無限縮放不糊、能用 CSS 改顏色。",
          "用法：直接 inline <code>&lt;svg&gt;</code>（能用 <code>fill: currentColor</code> 跟著文字顏色變）、或用圖示庫（lucide、heroicons）。",
          "多個圖示考慮 sprite 或元件化，別每個都貼一大坨 path。",
          "⚠️ 使用者上傳的 SVG 要小心——SVG 可以藏 <code>&lt;script&gt;</code>（XSS 風險），別直接當可信內容渲染；自己用的圖示才 inline。",
        ),
      },
      {
        title: "Intersection Observer：進畫面才做事",
        content: P(
          "「捲到某元素出現在畫面時才觸發」（圖片延遲載入、無限捲動、動畫進場），用 Intersection Observer 比監聽 scroll 事件高效得多。",
          "概念：建一個 observer 盯著某元素，它「進入/離開視窗」時回呼你。<code>new IntersectionObserver(cb).observe(el)</code>。",
          "比一直算 scroll 位置省效能（瀏覽器幫你算、非同步不卡）。",
          "⚠️ 用完記得 <code>disconnect()</code>（React 在 useEffect 的 cleanup 做）；別對「幾百個元素」各建一個 observer，用一個 observer 觀察多個。",
        ),
      },
      {
        title: "無限捲動 / 分頁載入",
        content: P(
          "資料很多時，別一次載完，做「捲到底自動載下一頁」。",
          "作法：在列表底部放一個「哨兵」元素，用 Intersection Observer 偵測它進畫面 → 載下一頁（配後端 cursor 分頁）。",
          "要處理 loading（轉圈）、沒有更多了（停止觸發）、失敗重試三種狀態。",
          "⚠️ 無限捲動對「找回某筆、SEO、頁尾」不友善——內容型網站有時「載更多按鈕」或傳統分頁更好。看情境選。",
        ),
      },
      {
        title: "拖放 drag & drop 基礎",
        content: P(
          "排序卡片、拖檔案上傳這種互動，用拖放。",
          "原生 HTML5：元素設 <code>draggable</code>、監聽 <code>dragstart / dragover（要 preventDefault 才能放）/ drop</code>。上傳檔案監聽容器的 drop 拿 <code>e.dataTransfer.files</code>。",
          "複雜排序（清單重排、跨區拖曳）用現成庫（dnd-kit 等）省很多事、也顧到無障礙。",
          "⚠️ 別忘了「鍵盤也能操作」（純拖曳對某些使用者不友善）；行動裝置的觸控拖曳要另外處理或用庫。",
        ),
      },
      {
        title: "code splitting 與 lazy import",
        content: P(
          "整個網站的 JS 打包成一大包、首頁就全載＝慢。把「用到才載」的東西切出去。",
          "React：<code>const Heavy = lazy(() =&gt; import('./Heavy'))</code> 配 <code>&lt;Suspense fallback={...}&gt;</code>——那個元件的 JS 等真的要顯示才下載。",
          "路由層級切分最有感：每個頁面各自一包，首頁不用載到「設定頁」的程式碼。",
          "⚠️ 別過度切（切太碎反而很多小請求）；切「大又不常用」的東西（圖表庫、編輯器、彈窗）最划算。",
        ),
      },
      {
        title: "bundle 太大怎麼辦",
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
        title: "先懂全貌：一次請求的旅程",
        content: P(
          "後端很多概念，理解這張圖就通一半：使用者點按鈕 → 前端送 request 到後端某網址(API) → 後端處理(可能查 DB) → 回 response(通常 JSON) → 前端更新畫面。",
          "API 就是後端「對外開放的窗口」。前端不直接碰資料庫，透過窗口要資料——安全、也好維護。",
          "JSON 是前後端傳資料的通用格式，長得像 JS 物件 <code>{\"name\":\"小明\",\"age\":15}</code>。",
          "⚠️ 最重要的心法：該在後端做的事（驗證、算錢、權限）別放前端——前端的東西使用者都能改，絕不能信。",
        ),
      },
      {
        title: "HTTP 方法與狀態碼：看數字就知道發生什麼",
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
        content: P(
          "Supabase 把 Postgres 資料庫、登入驗證、檔案儲存都包好，讓你少寫很多後端。",
          "查 <code>supabase.from('t').select('*').eq('col', val)</code>；寫 <code>.insert({...})</code> / <code>.update({...}).eq(...)</code> / <code>.delete().eq(...)</code>。",
          "RLS(Row Level Security)：直接在資料庫層設「誰能讀寫哪些列」，是它安全的核心。",
          "⚠️ RLS 忘了開或寫太鬆，等於門戶大開。上線前一定確認每張表的政策。",
        ),
      },
      {
        title: "安全基本功：永遠不要相信前端",
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
        content: P(
          "面試也常考：<b>認證（authentication）</b>是「你是誰」、<b>授權（authorization）</b>是「你能做什麼」。先確認身分，再看權限。",
          "對應狀態碼：沒登入（不知道你是誰）回 <b>401</b>；登入了但沒權限回 <b>403</b>。看到哪個就知道往哪查。",
          "常見做法：登入後給一張 token（JWT）或 session，之後每次請求都帶著它證明身分；後端每個要保護的動作再檢查權限。",
          "⚠️ 授權一定要在<b>後端</b>做。前端把「刪除按鈕」藏起來只是體驗，真正的權限檢查在 API，不然有人直接打 API 就繞過了。",
        ),
      },
      {
        title: "密碼要「雜湊」不是「加密」（用 bcrypt）",
        content: P(
          "新手最危險的一個誤會：把密碼「加密」存起來。加密是可以解回來的——一旦金鑰外洩，全部密碼曝光。",
          "正解是<b>雜湊（hash）</b>：單向、解不回去。使用者登入時，把他輸入的密碼再 hash 一次、跟資料庫比對。你（開發者）永遠不知道原始密碼。",
          "用專門的密碼雜湊函式 <code>bcrypt</code> / <code>argon2</code>，它們刻意「算得慢」+ 自帶「加鹽（salt）」，防止暴力破解與彩虹表。別用 MD5/SHA1 存密碼。",
          "⚠️ 絕不自己發明加密演算法、也不要把密碼寫進 log。安全的東西用現成、被驗證過的函式庫。",
        ),
      },
      {
        title: "N+1 查詢：迴圈裡打 DB 的隱形殺手",
        content: P(
          "頁面越來越慢、DB 快爆掉，很多時候是 N+1：先查一次拿到 N 筆，再對每一筆各查一次 DB（1 + N 次）。",
          "例：查出 100 篇文章（1 次），再迴圈對每篇「查作者」（100 次）＝ 101 次查詢。資料一多就卡死。",
          "解法：一次撈齊。用 join、或「先收集所有作者 id、一次 <code>where id in (...)</code> 撈回來」再在程式裡配對。ORM 通常有 eager load / include 選項。",
          "⚠️ 開發時資料少感覺不出來，上線資料一多就爆。看到「迴圈裡面在查資料庫」就要警覺。",
        ),
      },
      {
        title: "dev / staging / prod：為什麼要分環境",
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
        content: P(
          "HTTP 每次請求都是「陌生人」，伺服器怎麼知道「你就是剛剛登入的那個」？兩種主流做法。",
          "<b>Session</b>：伺服器存一份「誰登入了」，發一個 session id 給瀏覽器（放 cookie），之後每次帶回來對。狀態在伺服器、要登出很容易（刪掉就好）。",
          "<b>JWT（token）</b>：伺服器發一張「簽名過、內含你身分」的票，瀏覽器收好、每次請求帶著。伺服器不用存、驗簽名就好，適合多台伺服器/API。",
          "⚠️ JWT 一旦發出去、到期前很難「立刻作廢」（因為伺服器沒存）——所以設短效期 + refresh token。token 別放能被 JS 讀的地方（防 XSS 偷走）。",
        ),
      },
      {
        title: "CORS 到底是什麼、為什麼一直擋我",
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
        content: P(
          "資料表有十萬筆，前端一次 <code>select *</code> 全撈——頁面卡死、後端也累。要分頁。",
          "最單純：<code>LIMIT 20 OFFSET 40</code>（第 3 頁、每頁 20）。好懂但資料很多時 OFFSET 大了會變慢。",
          "更穩的做法：<b>cursor 分頁</b>——記住「上一頁最後一筆的時間/id」，下一頁查「比它更後面的 20 筆」（<code>where created_at &lt; ? limit 20</code>），大資料也快。",
          "⚠️ 提醒：Supabase/PostgREST 預設一次最多回 1000 筆，撈整表要自己分頁（`.range()`），不然會被默默截斷。",
        ),
      },
      {
        title: "快取 caching：算過的別再算一次",
        content: P(
          "同樣的資料被重複要、同樣的計算被重複做，很浪費。快取就是「存起來、下次直接用」。",
          "常見層：瀏覽器/CDN 快取靜態檔；後端把「算很久或很常查」的結果暫存（記憶體/Redis）；資料庫查詢結果快取。",
          "關鍵是<b>失效（invalidation）</b>：資料變了，快取要跟著更新或清掉，不然給到舊資料。常用「設一個過期時間」最簡單。",
          "⚠️ 名言：「電腦科學兩大難題之一就是快取失效。」先確定「這東西真的常被重複要、且不常變」再快取，別過度優化。",
        ),
      },
      {
        title: "Rate limiting：防止被打爆/被濫用",
        content: P(
          "API 沒有限流，有人（或壞掉的前端迴圈）狂打，伺服器就掛了，也可能被刷爆成本。",
          "作法：限「每個使用者/IP 每段時間最多幾次」，超過就回 <b>429 Too Many Requests</b>。",
          "登入、寄信、AI 呼叫這種「貴或敏感」的端點特別要限。",
          "⚠️ 回 429 時最好附「多久後可再試」（<code>Retry-After</code>），讓前端知道等一下再送、而不是一直重打。",
        ),
      },
      {
        title: "Webhook：不是你去問、是它主動通知你",
        content: P(
          "一般 API 是「你主動問」（拉）。Webhook 反過來：<b>事情發生時，對方主動打你的一個網址通知你</b>（推）。",
          "金流最典型：使用者付款成功，金流商 webhook 打你的 <code>/api/webhook</code>，你才知道「這筆真的付了」→ 開通權限。",
          "你要做的：提供一個 URL 接收、<b>驗證簽名</b>確認真的是對方發的（不是別人偽造）、快速回 200。",
          "⚠️ 兩個雷：① 一定要驗簽名，不然有人偽造「付款成功」白嫖；② 同一事件可能重送（要冪等，見下一則），別重複開通兩次。",
        ),
      },
      {
        title: "冪等性 idempotency：同一個請求做兩次結果一樣",
        content: P(
          "網路會重試、webhook 會重送、使用者會連點——同一個操作可能來兩次。冪等就是「做幾次結果都一樣、不會重複扣款/重複建」。",
          "GET/DELETE 天生冪等；<b>POST（建立）最危險</b>——重送就多建一筆。",
          "常見解法：讓請求帶一個唯一的 <code>idempotency key</code>，伺服器記住「這個 key 處理過了」，重來就回上次結果、不再執行。",
          "⚠️ 金流、下單、發獎勵這種「重複做會出事」的，一定要設計冪等。webhook 收到先查「這事件 id 處理過沒」。",
        ),
      },
      {
        title: "Secret 管理：金鑰別散落、別進 git",
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
        content: P(
          "前端傳來的 JSON 你不能信——欄位可能缺、型別可能錯、可能被人塞惡意值。後端進來第一件事就是驗。",
          "用 schema 驗證工具（如 zod）定義「這個 API 收什麼形狀」，一進來就 parse：不合格直接回 400、附清楚哪裡錯。",
          "好處：後面的程式碼可以放心假設資料是乾淨的、型別也對，少一堆 <code>if</code> 檢查。",
          "⚠️ 別只驗「有沒有」，也要驗「合不合理」（價格不能負、email 要像 email、字串長度上限）。沒驗長度上限，有人塞 10MB 字串進來也會出事。",
        ),
      },
      {
        title: "檔案上傳：別讓它變成資安/成本破口",
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
        content: P(
          "API 回傳長得亂七八糟，前端接得很痛苦。定一套統一格式。",
          "成功/失敗都用固定結構：例如成功 <code>{ ok: true, data: ... }</code>、失敗 <code>{ ok: false, error: \"...\", code: \"...\" }</code>，配對的 HTTP 狀態碼。",
          "在後端設一個「統一錯誤處理」的地方，把各種錯誤轉成這個格式 + 對的狀態碼，而不是每個 route 各寫各的。",
          "⚠️ 別把「內部錯誤細節/堆疊」直接回給前端（洩漏資訊、也沒意義）——給使用者友善訊息，細節記進伺服器 log。",
        ),
      },
      {
        title: "分層測試：單元 / 整合 / E2E",
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
        content: P(
          "部署平台/負載平衡器需要一個方法「確認你的服務有在正常跑」，這就是 health check。",
          "做一個超輕量的端點 <code>GET /health</code>，正常就回 200 + <code>{ ok: true }</code>。",
          "進階：<code>/ready</code> 檢查「相依的東西（資料庫、快取）也通」再回 OK，platform 才把流量導進來。",
          "⚠️ health check 要<b>快、別打重的查詢</b>（它會被頻繁呼叫）；也別在裡面做會失敗的複雜邏輯，不然平台以為你掛了一直重啟。",
        ),
      },
      {
        title: "背景排程 cron：定時做事",
        content: P(
          "「每天半夜寄報表」「每小時清過期資料」這種定時任務，用 cron 排程。",
          "cron 表達式定「多久跑一次」：<code>0 3 * * *</code> = 每天 03:00。網路上有 crontab 產生器幫你看懂。",
          "實作：有的用系統 crontab、有的用平台的 Scheduled Job、或用 GitHub Actions 的 schedule 打一個 API 端點。",
          "⚠️ 排程任務要<b>冪等 + 有 log</b>（萬一重跑或漏跑好查）；跑很久的別卡住、注意時區（cron 常是 UTC，別排錯時間）。",
        ),
      },
      {
        title: "寄 email：別讓它卡住請求、也別進垃圾桶",
        content: P(
          "註冊驗證信、通知信是常見需求，但自己架郵件伺服器是坑，用現成服務（Resend、SendGrid…）。",
          "寄信有點慢，<b>別在請求裡同步等它寄完</b>——丟進背景/佇列，使用者不用乾等。",
          "進垃圾桶問題：設好 SPF / DKIM / DMARC（網域驗證），寄件人用你自己的網域，內容別太廣告味。",
          "⚠️ 別把「一定要送達」的東西（重設密碼）當背景就忘了——要有重試 + 失敗告警。測試環境別真的寄到使用者信箱。",
        ),
      },
      {
        title: "連線池：別每個請求都開一條新連線",
        content: P(
          "連資料庫「開連線」本身很花時間。每個請求都開一條、用完關，高流量下會拖垮。",
          "<b>連線池（connection pool）</b>：預先開好一組連線重複用，請求來借一條、用完還回去，省掉反覆開關的成本。",
          "大多 ORM/資料庫 client 內建連線池，你設好「池子大小上限」就好。",
          "⚠️ serverless（函式每次冷啟）特別容易「連線爆量」——用平台提供的 pooler（如 Supabase 的 pgbouncer 連線字串），別每個函式各開一堆。",
        ),
      },
      {
        title: "API 文件：讓別人（和未來的你）會用",
        content: P(
          "API 沒文件，別人（含三個月後的你）根本不知道怎麼呼叫。",
          "至少寫清楚：端點網址、方法、要帶什麼參數/body、回傳長怎樣、可能的錯誤。",
          "工具化：用 <b>OpenAPI（Swagger）</b> 規格描述，能自動生互動式文件頁、甚至自動產 client。",
          "⚠️ 文件要跟程式碼一起更新——過時的文件比沒文件更害人。能「從程式碼/型別自動生文件」最好，不會忘了改。",
        ),
      },
      {
        title: "資料備份與還原：出事時的救命稻草",
        content: P(
          "資料一旦誤刪/毀損又沒備份，就是災難。備份是「必須」不是「加分」。",
          "自動、定期備份（多數雲資料庫如 Supabase 內建每日備份）；重要的還要「異地」放一份。",
          "光備份不夠——<b>要定期演練「還原」</b>，確認備份真的能救回來（很多人備份了卻從沒試過還原，出事才發現壞的）。",
          "⚠️ 上正式環境跑「危險操作」（大量 delete/update、改結構）前，先備份/先在 staging 試。<code>delete</code> 沒帶 <code>where</code> 是經典災難。",
        ),
      },
      {
        title: "SQL vs NoSQL：資料庫怎麼選",
        content: P(
          "資料庫兩大類，新手先懂差別、別跟風。",
          "<b>SQL（關聯式，如 PostgreSQL）</b>：資料有固定結構（表格 + 欄位）、強一致性、能做複雜 JOIN 查詢。大多數應用（電商、後台、SaaS）先選它準沒錯。",
          "<b>NoSQL（如 MongoDB、Redis）</b>：結構彈性、水平擴展容易、特定場景快。適合「結構常變、超大量、簡單查詢」。",
          "⚠️ 新手常被「NoSQL 比較潮」帶偏——多數專案 PostgreSQL 就綽綽有餘（它還能存 JSON）。等你真的遇到 SQL 解不了的規模/彈性問題再考慮 NoSQL。",
        ),
      },
      {
        title: "Redis：快取以外還能幹嘛",
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
        content: P(
          "兩種設計 API 的風格。",
          "<b>REST</b>：一個資源一個網址（<code>/users/1</code>、<code>/users/1/posts</code>）。簡單、快取友善、最常見。缺點：常「拿太多或拿不夠」，要打好幾支才湊齊一頁資料。",
          "<b>GraphQL</b>：一個端點，前端用查詢語言「精準指定要哪些欄位」，一次拿齊。缺點：快取/複雜度較高、要防「一個查詢拖垮伺服器」。",
          "⚠️ 新手先把 REST 做好——它 90% 場景夠用、生態成熟。GraphQL 是「前端要的資料很多變、避免 over-fetch」時的解，別為用而用。",
        ),
      },
      {
        title: "WebSocket：即時雙向通訊",
        content: P(
          "一般 HTTP 是「你問一次、它答一次」。要「伺服器主動推、即時雙向」（聊天、即時通知、協作、遊戲），用 WebSocket。",
          "它建立一條「一直開著的連線」，兩邊隨時能互傳訊息，不用一直重新請求。",
          "實務：很多人用 Socket.IO 這類庫（自動重連、房間），或平台的 realtime（如 Supabase Realtime）。",
          "⚠️ 長連線要管理（斷線重連、擴展時多台伺服器怎麼共享）；不是每個「即時」都要 WebSocket——偶爾更新用輪詢或 SSE 更簡單。",
        ),
      },
      {
        title: "Docker：容器是什麼",
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
        content: P(
          "使用者變多、一台伺服器撐不住，兩種長大方式。",
          "<b>垂直擴展</b>：把那台機器升級（更強 CPU、更多記憶體）。簡單、但有上限、也貴。",
          "<b>水平擴展</b>：多開幾台、用負載平衡分流。理論上無限、但程式要「無狀態」（別把資料存在單台記憶體）才好加。",
          "⚠️ 想水平擴展，session/檔案/快取別放在單台本機——放共用的地方（Redis、物件儲存），任何一台都能服務任何請求。這是「能不能擴展」的關鍵。",
        ),
      },
      {
        title: "微服務 vs 單體：別太早拆",
        content: P(
          "架構潮語，但新手/小專案別被帶跑。",
          "<b>單體（monolith）</b>：一個應用包含所有功能。簡單、好開發、好部署——<b>絕大多數專案該從這開始</b>。",
          "<b>微服務</b>：拆成很多小服務各自跑。適合「大團隊、超大規模、各部分要獨立擴展/部署」。代價是複雜度暴增（網路、部署、除錯、資料一致）。",
          "⚠️ 「還沒幾個使用者就拆微服務」是經典過度工程——先把單體寫好、模組分清楚，真的遇到規模/團隊瓶頸再拆。",
        ),
      },
      {
        title: "CDN：把內容放到離使用者近的地方",
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
        content: P(
          "水平擴展後有很多台伺服器，誰來決定「這個請求給哪一台」？負載平衡器（load balancer）。",
          "它坐在使用者和伺服器群中間，把請求平均分下去（輪流、看誰比較閒…），一台掛了就不導流量給它（配 health check）。",
          "好處：分散負載、單台故障不影響整體、能無縫加減機器。",
          "⚠️ 有負載平衡就要面對「請求可能落在不同台」——所以前面說的「別把狀態存單台本機」在這裡是必須的。",
        ),
      },
      {
        title: "並發更新：樂觀鎖 vs 悲觀鎖",
        content: P(
          "兩個人同時改同一筆資料，怎麼不互相覆蓋？兩種策略。",
          "<b>悲觀鎖</b>：改之前先「鎖住」這筆，別人得等。安全但會卡、降低並發。適合衝突很常見的場景。",
          "<b>樂觀鎖</b>：不鎖，但每筆帶一個「版本號」。存的時候檢查「版本還是我讀的那個嗎？」——變了代表別人先改了，讓你重試。適合衝突少的場景（多數 Web）。",
          "⚠️ 「後蓋前」的靜默覆蓋（lost update）是常見 bug——多人會同時編輯的資料，用版本號/樂觀鎖擋一下。",
        ),
      },
      {
        title: "軟刪除 soft delete：別真的刪掉",
        content: P(
          "使用者按「刪除」，你真的從資料庫 <code>DELETE</code> 掉，之後想復原/查紀錄就沒了。很多情況改用「軟刪除」。",
          "作法：加一個 <code>deleted_at</code> 欄位，刪除＝填上時間；查詢預設只撈 <code>deleted_at is null</code> 的。資料還在、可復原、可稽核。",
          "GDPR「真的要刪」時，再排程硬刪（這專案的帳號刪除就是這樣）。",
          "⚠️ 軟刪除後，所有查詢都要記得過濾掉已刪的（很容易漏，導致「刪了還看得到」）；唯一性約束也要考慮（同 email 軟刪後能不能再註冊）。",
        ),
      },
      {
        title: "稽核紀錄 audit log：誰在什麼時候做了什麼",
        content: P(
          "重要操作（改權限、動錢、刪資料）要留「誰、何時、做了什麼、改前改後」的紀錄——出事能追、也是合規需求。",
          "作法：一張 audit_logs 表，記 user_id、action、target、before/after、時間、IP。關鍵動作發生時寫一筆。",
          "跟一般 log 不同：audit log 是「業務事件的正式紀錄」，要保留久、不可竄改。",
          "⚠️ 別把敏感內容（密碼、完整卡號）寫進去；量會很大，考慮分表/歸檔。金流、權限這種一定要有。",
        ),
      },
      {
        title: "API 查詢慣例：過濾 / 排序 / 分頁",
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
        title: "終端機不可怕：先會這幾個就能出發",
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
        content: P(
          "小專案還好，一大就會「找不到檔案在哪」。早點養成分資料夾的習慣。",
          "常見分法：<code>src/</code> 放程式碼、<code>public/</code> 或 <code>assets/</code> 放圖片靜態檔、設定放根目錄。程式碼再按功能分（components、utils、api…）。",
          "原則：<b>相關的東西放一起</b>、一個檔只做一件事、檔名看得出內容。找檔案靠「猜得到在哪」而不是全域搜尋。",
          "⚠️ 一個 <code>index.js</code> 塞兩千行遲早崩潰。覺得檔案太長就是該拆的訊號。",
        ),
      },
      {
        title: "README 要寫什麼（寫給三個月後的自己）",
        content: P(
          "README 是專案的門面，也是「未來的你」回來時的救命稻草。至少寫這幾段：",
          "1. 這專案是幹嘛的（一兩句）。2. 怎麼跑起來（安裝、環境變數、啟動指令）。3. 需要哪些前置（Node 版本、DB…）。",
          "把「怎麼從零跑起來」寫清楚，別人（和三個月後失憶的你）照著就能動，省下大量問人時間。",
          "⚠️ 別把真實金鑰貼進 README。給 <code>.env.example</code> 列出需要哪些變數、但不放真值。",
        ),
      },
      {
        title: "小步提交：commit 小一點、常一點",
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
        content: P(
          "分支（branch）＝「開一條平行線做新功能，不影響主線」。做壞了砍掉就好。",
          "流程：<code>git switch -c feature-x</code> 開分支做事 → 好了合回主線 <code>git switch main</code> + <code>git merge feature-x</code>。",
          "<b>合併衝突</b>不可怕：兩邊改到同一行，Git 會標出 <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> 你的 / <code>=======</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> 對方的，你決定留哪個、刪掉標記、再 commit。",
          "⚠️ 別怕衝突而不敢合——越晚合、分支差越多、衝突越大。小步、常合最省事。",
        ),
      },
      {
        title: "Git 救援三招：reset / revert / stash",
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
        content: P(
          "有些東西<b>絕對不該</b>進版控，用 .gitignore 擋掉。",
          "必擋：<code>.env</code>／各種金鑰檔（機密）、<code>node_modules/</code>（一大坨、裝一下就有）、build 產物（<code>dist/</code>、<code>.next/</code>）、系統雜檔（<code>.DS_Store</code>）、log。",
          "找現成的：GitHub 有各語言的 gitignore 範本，直接抄一份改。",
          "⚠️ 已經 commit 上去才加 gitignore <b>不會</b>把它移除——要 <code>git rm --cached 檔案</code> 才會從版控拿掉（本機保留）。機密若已進 git，當它外洩、換掉。",
        ),
      },
      {
        title: "Pull Request 與 code review 文化",
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
        content: P(
          "套件版本 <code>主版本.次版本.修訂</code>（<code>MAJOR.MINOR.PATCH</code>），數字怎麼跳有意義。",
          "<b>PATCH</b>（1.2.<b>3</b>→4）：修 bug、不破壞相容。<b>MINOR</b>（1.<b>2</b>→3）：加新功能、仍相容。<b>MAJOR</b>（<b>1</b>→2）：<b>破壞性</b>改動、升級可能要改你的 code。",
          "<code>package.json</code> 的 <code>^1.2.3</code> = 允許升到 2.0 前的最新；<code>~1.2.3</code> = 只升 patch。",
          "⚠️ 大版本升級前先看 changelog / migration guide——MAJOR 跳號常常會弄壞你的東西。",
        ),
      },
      {
        title: "Markdown 語法：寫 README/筆記/PR 都用它",
        content: P(
          "Markdown 是「用純文字寫出排版」的輕量語法，GitHub、筆記軟體、這個平台都吃它。",
          "標題 <code>#</code>／<code>##</code>；<b>粗體</b> <code>**字**</code>、<i>斜體</i> <code>*字*</code>；清單 <code>- 項目</code> 或 <code>1. 項目</code>。",
          "行內程式 用反引號包起來；一段程式用三個反引號框住（還能標語言上色）；連結 <code>[文字](網址)</code>；圖片前面加 <code>!</code>。",
          "⚠️ 換行要「空一行」才會分段（單純按 enter 有時不會換）；表格、清單前後留空行比較保險。",
        ),
      },
      {
        title: "正則表達式入門：先看懂幾個符號",
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
        content: P(
          "兩個你天天會碰到的資料格式，先認得長相。",
          "<b>JSON</b>：前後端傳資料、很多設定檔用它。<code>{\"name\":\"小明\",\"tags\":[\"a\",\"b\"]}</code>——大括號物件、中括號陣列、鍵要雙引號、最後一項後面<b>不能有逗號</b>。",
          "<b>YAML</b>：靠縮排、更好讀，CI 設定、docker-compose 常用。冒號配值、<code>-</code> 開頭是清單項。",
          "⚠️ JSON 最常見錯：多一個逗號、少一個引號 → 整個 parse 失敗。YAML 最常見錯：縮排用到 Tab（YAML 只吃空白）。存檔前用工具驗一下。",
        ),
      },
      {
        title: "HTTP 與網址：URL 每一段在幹嘛",
        content: P(
          "看得懂一個網址的結構，debug 網路問題會快很多。",
          "<code>https://api.site.com/users/123?page=2#top</code>：<code>https</code> 協定（有加密）、<code>api.site.com</code> 主機、<code>/users/123</code> 路徑（資源）、<code>?page=2</code> query 參數、<code>#top</code> 錨點（只在瀏覽器、不送伺服器）。",
          "請求還帶 <b>headers</b>（像 <code>Authorization</code> 帶身分、<code>Content-Type</code> 說明格式）與 <b>body</b>（POST 送的資料）。",
          "⚠️ 敏感資料別放在網址的 query（會被記進 log、瀏覽器歷史）；放 header 或 body。",
        ),
      },
      {
        title: "什麼是 API（講給完全新手）",
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
        content: P(
          "中文變成 <code>ä½ å¥½</code> 或 <code>???</code>，就是編碼沒對上。",
          "現代一律用 <b>UTF-8</b>：存檔用 UTF-8、開檔指定 UTF-8、網頁 <code>&lt;meta charset=\"utf-8\"&gt;</code>、資料庫欄位用 utf8mb4。",
          "程式讀寫中文檔記得 <code>encoding='utf-8'</code>（Python）；CSV 給 Excel 開亂碼是它預設不吃 UTF-8 的老問題。",
          "⚠️ 亂碼幾乎都是「某一環沒用 UTF-8」——從來源、傳輸到顯示，一路確認同一種編碼就好了。",
        ),
      },
      {
        title: "命名慣例：camelCase / snake_case / kebab",
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
        content: P(
          "「先求能動、之後再整理」就像借錢——<b>技術債</b>。適度是正常的、但別假裝它不存在。",
          "利息＝之後每次改這塊都變慢、更容易出 bug。債越積越多，最後動不了。",
          "健康做法：趕時間先欠（並<b>寫下來</b>：留 TODO、開 issue），事後找時間還（重構）。",
          "⚠️ 別為了「趕快」把整個地基搞爛——有些債利息太高（沒測試、亂設計）會壓垮專案。分清「可接受的捷徑」和「以後會後悔的爛招」。",
        ),
      },
      {
        title: "怎麼拆任務與估時",
        content: P(
          "「做一個登入功能」太大、無從下手也估不準。學會拆。",
          "把大任務拆成「半天內能完成、看得到結果」的小塊：畫表單 → 接 API → 存 token → 錯誤處理 → 樣式。一塊塊做、一塊塊有成就感。",
          "估時：對每個小塊估，加總再抓個緩衝（新手先估、做完對答案，慢慢校準——一開始都會低估）。",
          "⚠️ 卡在「不知道怎麼開始」時，先拆到「小到不可能失敗」的第一步（先讓表單顯示出來就好），動起來就順了。",
        ),
      },
      {
        title: "怎麼讀別人的程式碼（陌生 codebase）",
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
        content: P(
          "在 GitHub 看到好用的專案，不是「公開的就能隨便用」——要看它的 license。",
          "常見寬鬆型（<b>MIT</b>、Apache）：幾乎隨便用（含商用），通常只要保留版權聲明。多數你會遇到的是這種。",
          "<b>GPL</b> 類（copyleft）：你用了、你的專案通常也得開源，商用要小心。",
          "沒放 license＝<b>預設保留所有權利</b>，嚴格說你不能拿來用。",
          "⚠️ 商用專案引入套件前看一下 license；圖片、字體、素材也有授權，別隨手抓來用踩到侵權。",
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
      "insert into public.notes (user_id, title, content, category, tags, is_public, color) values ($1,$2,$3,$4,$5,true,$6) returning id",
      [SELLER, n.title, n.content, CAT, ["官方", "開發筆記"], color]
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
