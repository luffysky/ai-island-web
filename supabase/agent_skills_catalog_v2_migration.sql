-- 分身島技能商店 v2 — 補上「會自己上網搜尋」的技能 + 用到新工具（web.search/web.research/
-- opportunity.search/island.*/browser.render/math.eval）。冪等：依 slug upsert。
-- 語意：allowed_tools 非空 = 限該工具集；[] = 純建議不用工具。

insert into public.agent_skills (slug, name, description, emoji, category, goal_template, allowed_tools, max_steps, is_builtin) values
 -- ===== 會自己搜尋的研究員（用 web.search + web.research，不必使用者貼網址）=====
 ('place-finder','找店找地方','找餐廳/店家/景點，整理地址、營業時間、價格、評價','🍜','research','你是在地美食/地點查手。用 web.search 或 web.research 找使用者要的店家/景點，整理成清單：店名、地址、營業時間、招牌與價格、評價/來源連結。只寫查到的、不編造；資訊不足就說明。','["web.search","web.research","web.fetch"]',7,true),
 ('deep-researcher','主題深研員','一句話主題 → 多來源交叉彙整的研究報告','🔬','research','你是深度研究員。用 web.research 對主題平行抓多個來源，交叉比對後產出結構化報告：重點結論、關鍵數字、不同觀點、來源連結。只用查到的資訊、不編造。','["web.research","web.search","web.fetch"]',7,true),
 ('market-scout','市場調查員','查某產品/產業的市場、對手、趨勢','📊','research','你是市場調查助手。用 web.research/web.search 蒐集某產品或產業的市場規模、主要玩家、定價、趨勢與風險，整理成可決策的摘要＋來源。只寫查到的。','["web.search","web.research","web.fetch"]',7,true),
 ('price-hunter','比價找優惠','查某商品在各通路的價格與優惠','🏷️','research','你是比價助手。用 web.search/web.research 找某商品在各通路的價格、規格與優惠，整理成比較清單（通路｜價格｜連結｜備註），標出目前最划算的。只寫查到的。','["web.search","web.research","web.fetch"]',7,true),
 ('trip-planner','旅遊行程規劃','依天數/預算排行程，含交通、景點、花費','🧳','research','你是行程規劃師。先用 web.research/web.search 查景點/交通/花費，再依天數與預算排出逐日行程，用 math.eval 估算總花費、datetime.now 判斷季節/時段。附來源，只用查到的資訊。','["web.research","web.search","datetime.now","math.eval"]',8,true),
 ('daily-brief','每日簡報員','給主題，整理今天的重點新聞懶人包','📰','research','你是新聞簡報員。用 web.search/web.research 找某主題近期新聞，整理成懶人包：發生什麼、為何重要、關鍵數字、來源連結。只寫查到的、標出日期。','["web.search","web.research","web.fetch"]',7,true),
 -- ===== 接機會島 / 站內資料 =====
 ('contest-hunter','競賽獵人','找適合你的比賽/補助並媒合','🏆','research','你是機會媒合手。先用 opportunity.search 查站內機會島有哪些開放中的競賽/補助，不足再用 web.research 補充外部資訊，依使用者條件挑出最合適的幾個＋符合原因＋截止日。只寫查到的。','["opportunity.search","web.research","web.search"]',8,true),
 ('my-learning-coach','我的學習教練','看你在 AI 島的進度，建議下一步學什麼','🧭','learn','你是個人化學習教練。先用 island.myProfile 看使用者在 AI 島的程度/進度，再用 island.searchLessons 找合適章節、dictionary.lookup 補術語，排出可執行的下一步學習路徑。','["island.myProfile","island.searchLessons","dictionary.lookup"]',8,true),
 ('lesson-finder','站內找課','在 AI 島找相關章節/課程','🔖','learn','你是站內課程搜尋助手。用 island.searchLessons 依使用者想學的主題找出 AI 島相關章節，整理成清單（章節｜重點｜為何推薦）。','["island.searchLessons"]',5,true),
 -- ===== 工具型 =====
 ('calc-helper','計算小幫手','算數字/日期差/單位換算','🧮','code','你是計算助手。用 math.eval 做安全數學運算、datetime.now 處理日期/倒數，把過程與結果講清楚。','["math.eval","datetime.now"]',5,true),
 ('js-page-reader','動態頁擷取員','讀需要跑 JS / 擋爬蟲的網頁','🕸️','research','你是動態網頁擷取助手。一般頁先試 web.fetch；若是需要跑 JS 或會擋爬蟲的頁，改用 browser.render 用真瀏覽器開，取回內文後摘要重點。','["browser.render","web.fetch"]',6,true)
on conflict (slug) where is_builtin do update set
  name = excluded.name, description = excluded.description, emoji = excluded.emoji, category = excluded.category,
  goal_template = excluded.goal_template, allowed_tools = excluded.allowed_tools, max_steps = excluded.max_steps;

-- ===== 升級既有「只吃網址」的研究/學習技能：改成會自己搜尋（加 web.search + web.research）=====
update public.agent_skills set allowed_tools = '["web.search","web.research","web.fetch"]'
  where is_builtin and slug in ('rival-scan','fact-check','news-brief','trend-watch','interview-prep','pkg-scout','doc-finder','tech-compare');
update public.agent_skills set allowed_tools = '["web.search","web.research","dictionary.lookup","web.fetch"]'
  where is_builtin and slug in ('study-planner','term-tutor');
update public.agent_skills set allowed_tools = '["web.search","web.research","web.fetch"]'
  where is_builtin and slug = 'career-coach';
update public.agent_skills set allowed_tools = '["web.fetch","web.search","web.research"]'
  where is_builtin and slug = 'web-digest';
