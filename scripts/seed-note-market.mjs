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
