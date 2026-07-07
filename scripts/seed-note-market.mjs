/**
 * 筆記市集種子：官方帳號(AI 島官方)提供的「免費」開發筆記包（Python / 前端 / 後端 / 課程常忽略的基本功）。
 * 每個 pack = 一組 notes（實際筆記內容）+ 一個 note_products（price_z=0 免費、is_active）。
 * 冪等：先刪掉這批（依 seller + category / product 標題）再重鋪，可安全重跑。
 * 內容原則：白話講給完全沒基礎的新手聽——每個概念都說「這是什麼／為什麼用／新手常踩什麼雷」，不是只丟一行語法。
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
    desc: "完全沒基礎也看得懂：每個語法都告訴你「這在幹嘛、什麼時候用、新手會踩什麼雷」。從環境、語法、資料處理到爬蟲。免費。",
    notes: [
      {
        title: "第一步：先把環境搞定（虛擬環境是什麼）",
        content: P(
          "還沒寫程式、很多人就卡在「環境」。這則先把它講清楚，你之後才不會一直裝錯。",
          "<b>什麼是虛擬環境（virtual environment）？</b>想像每個專案有自己的一個小房間，房間裡裝的工具（套件）只屬於這個專案。這樣 A 專案要舊版、B 專案要新版，也不會打架。",
          "<b>怎麼開房間：</b><code>python -m venv venv</code> 會建一個叫 venv 的資料夾；接著啟用它（Windows：<code>venv\\Scripts\\activate</code>、Mac/Linux：<code>source venv/bin/activate</code>）。啟用後命令列前面會出現 <code>(venv)</code>，代表你人在房間裡了。",
          "<b>裝工具：</b><code>pip install 套件名稱</code>。想把「這個專案用到哪些套件」記下來給別人／給未來的自己：<code>pip freeze > requirements.txt</code>；換台電腦一次還原：<code>pip install -r requirements.txt</code>。",
          "⚠️ <b>新手雷：</b>忘了先 activate 就 <code>pip install</code>，套件會裝到系統全域、之後版本一團亂。看到前面沒有 <code>(venv)</code> 就先 activate。",
        ),
      },
      {
        title: "Python 基礎語法（帶白話解說，不是只丟一行）",
        content: P(
          "這則把新手最常用、但課本常一句帶過的語法，一個一個講「它在做什麼」。",
          "<b>f-string（字串裡塞變數）：</b><code>f\"你好 {name}，共 {n} 筆\"</code>。前面加個 <code>f</code>，大括號 <code>{ }</code> 裡的東西就會被換成變數的值。用來組訊息、印報表最方便，不用再用 + 一段一段接。",
          "<b>推導式（一行做出一個新清單）：</b><code>[x*2 for x in nums if x>0]</code>。白話唸法是「把 nums 裡每個 x，只留大於 0 的，乘以 2 收進新清單」。它等於一個 for 迴圈 + append，只是濃縮成一行。看不懂時就把它拆回 for 迴圈想。",
          "<b>enumerate（同時要「第幾個」和「值」）：</b><code>for i, x in enumerate(items)</code>。普通 for 只給你值，enumerate 連「索引 i」一起給你，需要編號（第 1 題、第 2 題…）時很好用。",
          "<b>字典遍歷與安全取值：</b><code>for k, v in d.items()</code> 一次拿鍵和值；取值用 <code>d.get(k, 預設)</code> 比 <code>d[k]</code> 安全——找不到 key 時 <code>d[k]</code> 會直接報錯，<code>.get</code> 會回你給的預設值。",
          "⚠️ <b>新手雷：</b>縮排（indent）在 Python 是語法，不是排版。tab 和空白混用會噴 <code>IndentationError</code>；整個檔案只用「4 個空白」最保險。",
        ),
      },
      {
        title: "資料結構怎麼選：list / dict / set / tuple",
        content: P(
          "很多人語法會了，卻不知道「這情況該用哪一種容器」。這則幫你快速決定。",
          "<b>list（清單，有順序、可改）：</b><code>[1, 2, 3]</code>。要照順序存一串東西、之後還會增刪，用它。",
          "<b>dict（字典，用「鍵」查「值」）：</b><code>{\"name\": \"小明\", \"age\": 15}</code>。想用名字快速查資料（像查字典），用它。查一筆超快。",
          "<b>set（集合，不重複、可做交集聯集）：</b><code>{\"a\", \"b\"}</code>。想「去重複」或「判斷有沒有出現過」，用它——<code>x in some_set</code> 比 <code>x in some_list</code> 快非常多。",
          "<b>tuple（元組，像 list 但不能改）：</b><code>(緯度, 經度)</code>。一組固定不會變的資料（座標、回傳多個值）用它，還能當字典的 key。",
          "⚠️ <b>新手雷：</b>要「常常判斷某個東西在不在裡面」卻用 list，資料一多就會很慢；改用 set 或 dict 的 key。",
        ),
      },
      {
        title: "pandas 入門：先懂它在解決什麼問題",
        content: P(
          "<b>pandas 是什麼？</b>把它想成「程式版的 Excel」。它的核心叫 DataFrame（資料表），就是有欄有列的一張表；你用程式對整張表做篩選、排序、彙總，比手動點 Excel 快又能重複執行。",
          "<b>讀資料：</b><code>df = pd.read_csv('a.csv')</code> 把 CSV 檔讀成一張表 df。先 <code>df.head()</code> 看前幾列、<code>df.info()</code> 看每欄型別，養成「先看資料長怎樣」的習慣。",
          "<b>篩選（只留符合條件的列）：</b><code>df[df['age'] > 18]</code>。裡面那段 <code>df['age'] > 18</code> 會對每一列算出 True/False，外面再用它把 True 的列留下。",
          "<b>排序：</b><code>df.sort_values('age')</code>；<b>分組彙總</b>（每個城市加總銷售）：<code>df.groupby('city')['sales'].sum()</code>——「依 city 分組，對 sales 加總」。",
          "<b>處理缺失值：</b><code>df.fillna(0)</code> 把空格補 0、<code>df.dropna()</code> 直接丟掉有空的列。動手前先想：這欄的空值該補還是該丟？",
          "⚠️ <b>新手雷：</b>對篩選出來的子表直接改值常跳 SettingWithCopyWarning；要改就用 <code>df.loc[條件, '欄位'] = 值</code>。",
        ),
      },
      {
        title: "爬蟲入門：網頁是怎麼被抓下來的（含禮貌與法律）",
        content: P(
          "<b>爬蟲在做什麼？</b>你的瀏覽器打開網頁，其實是「跟伺服器要一份 HTML，再畫成畫面」。爬蟲就是用程式做同一件事：把那份 HTML 要下來，再從裡面挑出你要的資料。",
          "<b>抓網頁：</b><code>r = requests.get(url, headers={'User-Agent': '...'})</code>。<code>headers</code> 裡帶個 User-Agent 是告訴對方「我是誰」，有些網站不帶會擋。先檢查 <code>r.status_code</code> 是不是 200（成功）。",
          "<b>解析 HTML：</b><code>soup = BeautifulSoup(r.text, 'html.parser')</code> 把那坨文字變成可以查的結構；<code>soup.select('css 選擇器')</code> 用 CSS 選擇器挑元素（跟前端 querySelector 同一套規則）。",
          "<b>禮貌與規矩（很重要）：</b>先看網站的 <code>robots.txt</code> 有沒有禁止；每次請求之間 <code>time.sleep()</code> 一下、別狂打人家伺服器；很多網站有官方 API，能用 API 就別硬爬。",
          "⚠️ <b>新手雷：</b>版權／個資／服務條款要留意——能抓 ≠ 能拿去用。抓下來只做學習與分析、不要轉散布別人的內容。",
        ),
      },
      {
        title: "最重要卻最少教的技能：看懂錯誤訊息",
        content: P(
          "新手一看到紅字就慌，其實錯誤訊息是在「幫你」——它幾乎已經告訴你哪裡錯了。",
          "<b>先看最後一行。</b>Python 的錯誤訊息（Traceback）由上往下是呼叫過程，<b>最後一行</b>才是重點：它寫「錯誤類型 + 說明」。例如 <code>KeyError: 'age'</code> 代表你去拿一個不存在的字典 key 叫 age。",
          "<b>再看倒數第二段的檔名與行號。</b>它會指到「你的哪個檔、第幾行」出事，直接跳過去那行看。",
          "<b>常見類型翻譯：</b><code>NameError</code>＝用了沒定義的變數（多半打錯字）；<code>TypeError</code>＝型別不對（拿字串去做數字運算）；<code>IndexError</code>＝索引超出範圍；<code>IndentationError</code>＝縮排亂了。",
          "⚠️ <b>新手雷：</b>不要只看紅字就亂改。把「錯誤類型那一整行」複製去搜尋，通常第一篇就有答案。看得懂錯誤，你就贏一半了。",
        ),
      },
      {
        title: "除錯的思路：不是用猜的，是縮小範圍",
        content: P(
          "程式不會動的時候，高手和新手的差別是「方法」，不是天分。",
          "<b>先讓它把話說出來。</b>最簡單的除錯就是印出來：<code>print(f\"{x=}\")</code> 會直接印成 <code>x=值</code>，一次確認變數到底是什麼。",
          "<b>二分法縮範圍。</b>不知道哪裡壞，就在中間印一行「到這裡了」；有印出＝前半段沒事，往後找；沒印出＝問題在前半段。幾次就能夾出兇手。",
          "<b>停下來檢查現場。</b>需要看得更細，用 <code>import pdb; pdb.set_trace()</code> 讓程式停在那行，你可以逐行走、隨時打變數名看值。",
          "<b>把問題講給別人（或鴨子）聽。</b>「小黃鴨除錯法」：一句一句解釋你的程式在做什麼，講到一半常常自己就發現哪裡不對了。",
          "⚠️ <b>新手雷：</b>一次改很多地方，壞了也不知道是哪個造成的。<b>一次只改一處、改完就測</b>。",
        ),
      },
      {
        title: "Python 標準庫寶庫（先問「有沒有現成的」）",
        content: P(
          "寫程式最省力的心法：需求出現時，先想「Python 內建有沒有現成工具」，常常不用自己造輪子。",
          "<b>pathlib</b>：處理檔案路徑，跨系統不出錯，比手動接字串好用。",
          "<b>json</b>：讀寫 JSON（<code>json.load</code> / <code>json.dump</code>），跟 API、設定檔打交道天天用。",
          "<b>datetime</b>：日期時間運算、格式化。",
          "<b>collections.Counter</b>：一行統計每個東西出現幾次；<b>itertools</b>：各種迭代／組合工具。",
          "⚠️ <b>新手雷：</b>檔名不要取跟標準庫一樣（像把自己的檔叫 <code>json.py</code> / <code>random.py</code>），會 import 到自己、噴莫名其妙的錯。",
        ),
      },
    ],
  },
  {
    title: "🎨 前端開發筆記（官方免費）",
    desc: "把 HTML / CSS / JS / React 講成人話：先懂「瀏覽器在幹嘛」，再學切版與互動，切版不再靠亂試。免費。",
    notes: [
      {
        title: "先搞懂：瀏覽器怎麼把 HTML 變成畫面（DOM 是什麼）",
        content: P(
          "學前端前，先有這張心智地圖，後面全部都會更好懂。",
          "<b>三者分工：</b>HTML 是「內容與結構」（有什麼東西）、CSS 是「長相」（好不好看）、JavaScript 是「行為」（會不會動）。三個各司其職。",
          "<b>DOM 是什麼？</b>瀏覽器讀完 HTML 後，會在記憶體裡把它變成一棵「節點樹」，這棵樹就叫 DOM。你在畫面上看到的東西，其實都是 DOM 上的節點。",
          "<b>JS 為什麼能讓畫面動？</b>因為 JS 可以抓 DOM 節點、改它的內容或樣式，畫面就跟著變。所謂「互動」就是：使用者做動作 → JS 改 DOM → 畫面更新。",
          "⚠️ <b>新手雷：</b>以為改了 HTML 檔畫面就會自己變——沒存檔、沒重新整理、或改到快取，都會讓你懷疑人生。先確認你改的是「正在看的那份」。",
        ),
      },
      {
        title: "HTML 語意標籤：為什麼別全部用 div",
        content: P(
          "<b>語意（semantic）是什麼意思？</b>就是「用對名字的標籤」，讓瀏覽器、搜尋引擎、輔助工具都看得懂這塊是幹嘛的。",
          "<b>版面骨架：</b><code>&lt;header&gt;</code> 頁首、<code>&lt;nav&gt;</code> 導覽、<code>&lt;main&gt;</code> 主內容、<code>&lt;section&gt;</code> 段落區塊、<code>&lt;article&gt;</code> 一篇完整內容、<code>&lt;footer&gt;</code> 頁尾。用對它們，別人（和未來的你）一眼看懂結構。",
          "<b>表單小技巧：</b><code>&lt;label for=\"email\"&gt;</code> 的 for 要等於 input 的 id，這樣「點文字」也能選到欄位，手機上特別好按。",
          "<b>圖片一定要 alt：</b><code>&lt;img alt=\"...\"&gt;</code> 是圖片壞掉時的替代文字，也是視障者與 SEO 讀的內容。",
          "⚠️ <b>新手雷：</b>整頁都 <code>&lt;div&gt;</code> 雖然也能動，但無障礙差、SEO 差、自己回頭也看不懂。能用語意標籤就用。",
        ),
      },
      {
        title: "CSS 排版：Flexbox 與 Grid 白話版",
        content: P(
          "排版一直亂試？先記住這兩個工具「各自解決什麼」。",
          "<b>Flexbox 管「一排」：</b>一排東西要怎麼排、要不要置中、間距多少，用它。經典置中：<code>display:flex; justify-content:center; align-items:center;</code>。記法：<code>justify</code> 管主軸（預設橫向）、<code>align</code> 管交叉軸（縱向）。",
          "<b>Grid 管「棋盤」：</b>要切成整齊的格子（相簿、卡片牆），用它：<code>display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;</code>——切三等分、每格間距 12px。",
          "<b>一句話選擇：</b>東西是「一條線」就 Flex、是「二維表格」就 Grid。",
          "⚠️ <b>新手雷：</b>盒模型（box model）沒設 <code>box-sizing: border-box</code> 時，加了 padding 會把寬度撐爆版面。專案第一行常放 <code>*{box-sizing:border-box}</code>。",
        ),
      },
      {
        title: "RWD 響應式：手機優先的思維",
        content: P(
          "<b>RWD 是什麼？</b>同一個網站，在手機、平板、電腦上都好看，就是響應式（Responsive Web Design）。",
          "<b>手機優先（mobile-first）：</b>先把手機版做好，再用「往上加」的方式處理大螢幕：<code>@media (min-width:768px){ ... }</code> 代表「螢幕寬 768px 以上才套用這段」。",
          "<b>圖片別溢出：</b><code>img{ max-width:100%; height:auto; }</code>，圖片最寬只到容器、比例自動。",
          "<b>常用斷點：</b>約 768px（平板）、1024px（桌機）。不用硬記數字，版面在哪裡開始擠、就在那裡加斷點。",
          "⚠️ <b>新手雷：</b>只在大螢幕測、上手機整個爆版。開瀏覽器 DevTools 的手機模式邊做邊看。",
        ),
      },
      {
        title: "JavaScript 常用武器（含 async 白話）",
        content: P(
          "<b>陣列三寶（處理一串資料）：</b><code>map</code>（每個都轉換成新的）、<code>filter</code>（只留符合條件的）、<code>reduce</code>（把整串收斂成一個結果，像加總）。還有 <code>find</code>（找第一個符合的）。",
          "<b>解構與展開：</b><code>const {name, age} = user;</code> 一次把物件裡的欄位取出來當變數；<code>[...arr]</code> 把陣列攤開（複製、合併很好用）。",
          "<b>非同步（async）在解決什麼？</b>跟伺服器要資料要「等」，這段等待不能卡住整個畫面。<code>await</code> 的意思是「等這件事做完再往下」：<code>const data = await (await fetch(url)).json();</code>——先等拿到回應、再等把它轉成 JSON。",
          "⚠️ <b>新手雷：</b>忘了 <code>await</code>，你拿到的會是一個「還沒完成的承諾（Promise）」而不是資料，印出來一片 <code>[object Promise]</code> 就是這個。",
        ),
      },
      {
        title: "React 心智模型：狀態驅動畫面",
        content: P(
          "React 最重要的一句話：<b>畫面 = 狀態（state）的函式</b>。你不是自己去改畫面，而是改狀態，React 幫你重畫。",
          "<b>useState（存會變的資料）：</b><code>const [count, setCount] = useState(0)</code>。要更新一定要用 <code>setCount</code>，不能直接 <code>count = 1</code>，不然 React 不知道要重畫。",
          "<b>useEffect（做副作用）：</b><code>useEffect(fn, [deps])</code>——當 deps 裡的值變了才重跑 fn（抓資料、訂閱、計時器）。依賴陣列放對很重要。",
          "<b>清單要 key：</b>用 <code>map</code> 畫一串元素時，每個要有獨一無二的 <code>key</code>，React 才認得誰是誰。",
          "<b>抽象化：</b>重複的畫面抽成「元件」，重複的邏輯抽成「自訂 hook」。",
          "⚠️ <b>新手雷：</b><code>useEffect</code> 裡改了狀態、又把那個狀態放進依賴陣列，會無限重跑。先想「這效果什麼時候該重跑」再填依賴。",
        ),
      },
      {
        title: "串 API：前端怎麼跟後端要資料",
        content: P(
          "<b>心智模型：</b>前端「發問（request）」、後端「回答（response）」。fetch 就是發問的工具。",
          "<b>GET（拿資料）：</b><code>const res = await fetch(url); const data = await res.json();</code>。",
          "<b>POST（送資料）：</b>要告訴對方「我送的是 JSON」並把資料字串化：<code>fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) })</code>。",
          "<b>三種狀態一定要處理：</b>載入中（loading）、成功、失敗。至少檢查 <code>if (!res.ok)</code> 再往下用資料。",
          "⚠️ <b>新手雷：</b>本機開發常遇到 CORS 被擋——那是後端要允許你的來源，不是你前端寫錯；看 Console 的紅字就知道是不是 CORS。",
        ),
      },
    ],
  },
  {
    title: "🗄️ 後端開發筆記（官方免費）",
    desc: "從「前後端到底怎麼溝通」講起，再帶 HTTP / SQL / Supabase / 安全 / 部署，後端入門最實用的一包。免費。",
    notes: [
      {
        title: "先懂全貌：前後端到底怎麼溝通",
        content: P(
          "後端很多概念，理解這張圖就通了一半。",
          "<b>一次請求的旅程：</b>使用者在前端點按鈕 → 前端送出一個 request 到後端某個網址（API）→ 後端處理（可能查資料庫）→ 回一個 response（通常是 JSON）→ 前端拿到再更新畫面。",
          "<b>API 是什麼？</b>就是後端「對外開放的窗口」。前端不直接碰資料庫，而是透過這些窗口要資料——這樣安全、也好維護。",
          "<b>JSON 是什麼？</b>前後端之間傳資料的通用格式，長得像 JS 物件：<code>{\"name\": \"小明\", \"age\": 15}</code>。幾乎所有 API 都用它。",
          "⚠️ <b>新手雷：</b>把「該在後端做的事」（驗證、算錢、權限）放到前端做——前端的東西使用者都能改，絕不能信。",
        ),
      },
      {
        title: "HTTP 方法與狀態碼：看數字就知道發生什麼",
        content: P(
          "<b>方法（動詞）：</b>GET 取、POST 新增、PUT/PATCH 修改、DELETE 刪除。設計網址時「資源用名詞、動作交給方法」：<code>GET /users/123</code> 拿第 123 號使用者、<code>DELETE /users/123</code> 刪掉他。",
          "<b>狀態碼（結果代號）：</b>2xx 成功、4xx 你（前端）錯、5xx 後端錯。",
          "<b>常見碼：</b>200 成功、201 已建立、400 參數錯、401 未登入、403 已登入但沒權限、404 找不到、500 伺服器爆掉。",
          "<b>怎麼用：</b>看到 401 就去檢查登入態、看到 404 就檢查網址對不對、看到 500 就去翻後端 log。",
          "⚠️ <b>新手雷：</b>把所有錯誤都回 200，前端無法判斷成敗。錯就回對應的 4xx/5xx，訊息才有意義。",
        ),
      },
      {
        title: "SQL 入門：資料庫就是一堆表格",
        content: P(
          "<b>心智模型：</b>關聯式資料庫就是很多張 Excel 表；SQL 是你「用文字下指令」去查、去改這些表。",
          "<b>查詢：</b><code>select * from users where age &gt; 18 order by created_at desc limit 10;</code>——「從 users 表挑出年齡大於 18 的，依建立時間新到舊排，只要前 10 筆」。",
          "<b>join（把兩張表接起來）：</b><code>select u.name, o.amount from users u join orders o on o.user_id = u.id;</code>——用「使用者 id」把使用者表和訂單表對起來。",
          "<b>彙總：</b><code>select city, count(*) from users group by city;</code> 每個城市各有幾人。",
          "⚠️ <b>新手雷：</b>查詢變慢，多半是「常拿來 where / join 的欄位沒建索引（index）」。先看有沒有索引，別急著怪資料庫。",
        ),
      },
      {
        title: "Supabase 速用（Postgres + 現成後端）",
        content: P(
          "<b>Supabase 是什麼？</b>一個把 PostgreSQL 資料庫、登入驗證、檔案儲存都包好的服務，讓你少寫很多後端。",
          "<b>查：</b><code>supabase.from('t').select('*').eq('col', val)</code>；<b>寫：</b><code>.insert({...})</code> / <code>.update({...}).eq(...)</code> / <code>.delete().eq(...)</code>。",
          "<b>RLS（Row Level Security）：</b>直接在資料庫層設「誰能讀寫哪些列」的規則，是 Supabase 安全的核心。",
          "⚠️ <b>新手雷：</b>RLS 忘了開或規則寫太鬆，等於資料庫門戶大開。上線前一定要確認每張表的 RLS 政策。",
        ),
      },
      {
        title: "安全基本功：永遠不要相信前端",
        content: P(
          "這則是所有後端最重要的心法，先記住再說。",
          "<b>後端要再驗一次。</b>前端的檢查只是為了體驗好，真正的把關在後端——因為前端傳來的任何東西，使用者都能偽造。",
          "<b>密鑰放環境變數、絕不進 git。</b>API key、資料庫密碼放 <code>.env.local</code>（並加進 .gitignore），一旦 commit 上去等於公開。",
          "<b>防注入、顧密碼：</b>SQL 用「參數化查詢」而不是把使用者輸入直接拼進字串；密碼一定要雜湊（hash）後再存，絕不存明碼。",
          "⚠️ <b>新手雷：</b>把機密不小心 push 上 GitHub，就算馬上刪，也要當它已外洩、立刻換掉那把 key。",
        ),
      },
      {
        title: "環境變數與部署：讓它在別人電腦也跑得起來",
        content: P(
          "<b>為什麼要環境變數？</b>因為「設定」（資料庫網址、金鑰）不該寫死在程式裡——本機、測試、上線各用各的，換環境不用改程式碼。",
          "<b>本機 vs 上線：</b>本機放 <code>.env.local</code>；上線在部署平台的「runtime env」貼一份。",
          "<b>public 前綴要小心：</b>有 <code>NEXT_PUBLIC_</code> 前綴的變數才會送到前端瀏覽器——機密（service key、密碼）<b>絕對不要</b>加這個前綴。",
          "<b>部署後先驗：</b>上線後先打一支 API、看一下 log，確認服務真的有起來，再宣布完成。",
          "⚠️ <b>新手雷：</b>「本機好好的、上線就掛」十之八九是環境變數沒設或設錯。先比對兩邊的 env。",
        ),
      },
      {
        title: "後端常見錯誤與怎麼查 log",
        content: P(
          "<b>500 先看 log、不要猜。</b>伺服器內部錯誤的真正原因都在後端 log 裡，養成「出事先翻 log」的習慣。",
          "<b>CORS 被擋：</b>前端 Console 出現 CORS 字樣＝後端沒允許這個來源，去後端設定允許清單。",
          "<b>忘了 await：</b>非同步沒 await，你會拿到 Promise 而不是資料，後面全錯。",
          "<b>時區地雷：</b>資料庫存 UTC、顯示時再轉當地時間，才不會差 8 小時。",
          "⚠️ <b>新手雷：</b>錯誤直接吞掉（catch 了什麼都不做），出事完全查不到。至少把錯誤記進 log。",
        ),
      },
    ],
  },
  {
    title: "🧰 課程沒特別教、但你天天會用到（新手必備基本功）",
    desc: "終端機、Git、看錯誤、開發者工具、怎麼問問題——這些「沒人專門教、卻決定你走多快」的基本功，一次補齊。免費。",
    notes: [
      {
        title: "終端機／命令列不可怕：先會這幾個就夠開始",
        content: P(
          "黑黑的命令列（terminal）只是「用打字代替點滑鼠」去操作電腦，會幾個指令就能出發。",
          "<b>看路：</b><code>pwd</code> 我現在在哪個資料夾、<code>ls</code>（Windows：<code>dir</code>）這裡有什麼。",
          "<b>移動：</b><code>cd 資料夾名</code> 進去、<code>cd ..</code> 回上一層。",
          "<b>建立：</b><code>mkdir 名字</code> 開資料夾。",
          "<b>跑程式：</b><code>python 檔名.py</code>、<code>node 檔名.js</code>。",
          "⚠️ <b>新手雷：</b>路徑有空白要用引號包起來（<code>cd \"My Project\"</code>）；指令卡住不動時，<code>Ctrl + C</code> 可以中斷。",
        ),
      },
      {
        title: "Git 版本控制：把「存檔點」的概念用起來",
        content: P(
          "<b>Git 是什麼？</b>幫你的專案存「進度存檔點」的工具，隨時能回到之前任一個版本，也能和別人協作不互相蓋掉。",
          "<b>最小工作流：</b><code>git status</code> 看改了什麼 → <code>git add .</code> 把要存的挑進去 → <code>git commit -m \"說明這次改了啥\"</code> 存一個點 → <code>git push</code> 推到雲端（GitHub）。",
          "<b>commit 訊息要有意義：</b>寫「修好登入按鈕」而不是「更新」，未來的你會感謝現在的你。",
          "<b>還原：</b>還沒 commit 想丟掉某檔改動：<code>git checkout -- 檔名</code>。",
          "⚠️ <b>新手雷：</b>把 <code>.env</code>、<code>node_modules</code> 也 commit 上去——用 <code>.gitignore</code> 把機密和一大坨依賴擋在外面。",
        ),
      },
      {
        title: "怎麼問問題／查錯誤：省下你一半的卡關時間",
        content: P(
          "會查、會問，比什麼都值錢。順序這樣走最快。",
          "<b>1. 先讀錯誤訊息本身</b>——最後一行的「類型 + 說明」通常就是答案。",
          "<b>2. 複製錯誤去搜尋</b>——把那行錯誤（去掉自己的檔名／路徑）貼進搜尋引擎，通常前幾篇就有。",
          "<b>3. 問 AI / 問人時，給三樣東西：</b>你想做什麼、你試了什麼、完整的錯誤訊息。資訊給齊，答案又快又準。",
          "<b>做最小重現：</b>把問題縮到「最短、還能重現」的一段程式，很多時候縮的過程你自己就找到原因了。",
          "⚠️ <b>新手雷：</b>只說「壞了、不會動」沒有人幫得了你；貼錯誤、貼程式、講清楚預期 vs 實際。",
        ),
      },
      {
        title: "瀏覽器開發者工具（DevTools）三招入門",
        content: P(
          "前端 debug 神器，按 F12（或右鍵→檢查）打開，先會這三個分頁。",
          "<b>Elements（元素）：</b>看目前畫面對應的 HTML/CSS，可以當場改樣式試效果，重整就還原、很安全。",
          "<b>Console（主控台）：</b>程式的錯誤紅字都在這；也能直接打 JS 試東西、用 <code>console.log()</code> 印變數。",
          "<b>Network（網路）：</b>看每一個 API 請求：打去哪、回什麼、狀態碼多少。API 沒資料先來這裡看是「沒送出、還是回錯」。",
          "⚠️ <b>新手雷：</b>畫面沒更新先看是不是「快取」——DevTools 開著時可勾 Disable cache，或用無痕視窗測。",
        ),
      },
      {
        title: "編輯器效率：少打字、少手殘",
        content: P(
          "工具順手，寫起來才不痛苦。以 VS Code 為例。",
          "<b>存檔自動排版：</b>裝 Prettier、開「Format On Save」，排版交給工具，別再手動對齊。",
          "<b>幾個天天用的快捷鍵：</b>全域搜尋檔案 <code>Ctrl/Cmd + P</code>、搜尋指令 <code>Ctrl/Cmd + Shift + P</code>、多游標同時改 <code>Alt + 點按</code>、整行移動 <code>Alt + ↑/↓</code>。",
          "<b>善用外掛：</b>對應語言的外掛（Python、ESLint）會即時抓錯、提示，錯字當場就看到。",
          "⚠️ <b>新手雷：</b>紅色波浪底線不是裝飾——那是編輯器在提前告訴你「這裡會出錯」，別忽略。",
        ),
      },
      {
        title: "讀官方文件的方法：一輩子受用",
        content: P(
          "教學影片會過時，官方文件（docs）才是最新、最準的來源。學會讀它，你就不用一直等別人教。",
          "<b>先找 Getting Started / Quickstart：</b>照著跑一遍，先讓最小的東西動起來，再回頭理解細節。",
          "<b>用搜尋、看範例：</b>文件內建搜尋直接找你要的功能；大多有 Example 程式碼，複製來改比從零寫快。",
          "<b>看函式簽名：</b>它會寫這個函式「吃什麼參數、回什麼」，看懂就知道怎麼用。",
          "⚠️ <b>新手雷：</b>Google 到的舊文章 API 可能已經改了；跑不動時回官方文件對一下版本與寫法。",
        ),
      },
    ],
  },
];

// 冪等：先刪這批（產品 + 該賣家這批 notes）
const titles = PACKS.map((p) => p.title);
await c.query("delete from public.note_products where seller_id=$1 and title = any($2)", [SELLER, titles]);
await c.query("delete from public.notes where user_id=$1 and category=$2", [SELLER, CAT]);

let products = 0, notesCount = 0;
for (const pack of PACKS) {
  const noteIds = [];
  for (const n of pack.notes) {
    const { rows } = await c.query(
      "insert into public.notes (user_id, title, content, category, tags, is_public) values ($1,$2,$3,$4,$5,true) returning id",
      [SELLER, n.title, n.content, CAT, ["官方", "開發筆記"]]
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
