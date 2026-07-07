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
