-- Agent 平台 Phase 3+ — 技能商店（安裝包模式）+ 40+ 內建技能目錄。
-- 安裝模式：內建技能全列在商店，使用者自己「安裝」才進 picker。agent_skill_installs 記錄誰裝了什麼。

alter table public.agent_skills add column if not exists category text not null default 'other';

-- 安裝紀錄（誰裝了哪個技能）
create table if not exists public.agent_skill_installs (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.agent_skills(id) on delete cascade,
  installed_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);
alter table public.agent_skill_installs enable row level security;
drop policy if exists "installs own" on public.agent_skill_installs;
create policy "installs own" on public.agent_skill_installs for select using (auth.uid() = user_id);

-- 內建技能目錄（依 slug 冪等 upsert）。allowed_tools 語意：[] = 純建議不用工具；非空 = 限該工具集。
insert into public.agent_skills (slug, name, description, emoji, category, goal_template, allowed_tools, max_steps, is_builtin) values
 -- 研究/網頁（web.fetch / dictionary.lookup）
 ('term-tutor','術語小老師','解釋程式術語／黑話，查辭典＋補充','📖','research','你是耐心的程式術語老師。先查 AI 島辭典，不足再抓可靠網頁補充，最後用白話＋生活比喻解釋給新手。','["dictionary.lookup","web.fetch"]',8,true),
 ('web-digest','網頁摘要員','給網址，抓下來摘要重點','🌐','research','你是網頁摘要助手。抓使用者給的網址，整理成 3–5 點重點＋一句總結，繁體中文。','["web.fetch"]',6,true),
 ('rival-scan','競品資料查手','給主題／對手，抓多個網頁彙整比較','🔍','research','你是競品研究助手。抓使用者提供的數個網址或主題頁，整理成比較表：定位、特色、優缺點。','["web.fetch"]',10,true),
 ('fact-check','資料查證員','幫你查一個說法是否屬實','✅','research','你是查證助手。針對使用者的說法，抓可靠來源比對，回「屬實／存疑／有誤」＋依據與出處。','["web.fetch"]',8,true),
 ('news-brief','新聞彙整員','抓幾則新聞頁，整理懶人包','📰','research','你是新聞彙整助手。抓使用者給的新聞網址，整理成懶人包：發生什麼、為何重要、關鍵數字。','["web.fetch"]',8,true),
 ('tech-compare','技術選型比較','比較兩三個技術/框架的取捨','⚖️','research','你是技術選型顧問。抓官方頁／文件，整理比較：學習曲線、生態、效能、適用情境，最後給建議。','["web.fetch","dictionary.lookup"]',10,true),
 ('pkg-scout','套件評估員','評估一個 npm/pypi 套件值不值得用','📦','research','你是套件評估助手。抓套件頁（npm/pypi/github），看維護度、下載量、issue、最後更新，回「建議／保留／避免」＋理由。','["web.fetch"]',8,true),
 ('doc-finder','文件查找員','找官方文件並摘要用法','📚','research','你是文件查找助手。找使用者要的官方文件頁，摘要關鍵用法＋一段最小範例。','["web.fetch","dictionary.lookup"]',8,true),
 ('interview-prep','面試考古整理','整理某職位/主題的常見面試題','🎤','research','你是面試準備助手。抓相關資源，整理該職位/主題的常見考點與題目，附簡短答題方向。','["web.fetch"]',10,true),
 ('trend-watch','趨勢觀察員','看某領域近期趨勢重點','📈','research','你是趨勢觀察助手。抓使用者給的來源，整理該領域近期重點趨勢與值得關注的方向。','["web.fetch"]',8,true),
 -- 寫作/建議（純 LLM、不用工具）
 ('resume-doctor','履歷健檢師','貼履歷，給具體改進建議','📄','write','你是資深招募官。針對使用者貼上的履歷內容，指出強項與問題，給可直接照做的改寫建議（STAR、量化成果）。','[]',3,true),
 ('self-intro','自我介紹產生器','幫你生一段自我介紹','🙋','write','你是表達教練。依使用者提供的背景，產出一段自然、有記憶點的自我介紹（可給長短兩版）。','[]',3,true),
 ('cover-letter','求職信草稿','依職缺草擬求職信','✉️','write','你是求職顧問。依職缺與背景，草擬一封精煉、對焦的求職信，避免罐頭句。','[]',3,true),
 ('naming-helper','命名助手','幫變數/函式/專案想好名字','🏷️','code','你是命名顧問。依用途給 5–8 個清楚、慣例一致的命名選項（含理由），涵蓋不同風格。','[]',3,true),
 ('copy-writer','文案小編','幫你寫貼文/標題/介紹文案','✍️','write','你是社群文案小編。依主題與受眾，產出幾組吸睛但不浮誇的文案／標題選項。','[]',3,true),
 ('email-polish','郵件潤飾','把草稿潤成得體的信','📧','write','你是商務溝通助手。把使用者的草稿潤飾成清楚、得體、有禮的郵件，保留原意。','[]',3,true),
 ('bio-writer','個人簡介產生','生一段個人/專案簡介','👤','write','你是品牌寫手。依提供資訊產出精煉的個人或專案簡介（含一句話版與段落版）。','[]',3,true),
 ('explain-eli5','這個講白話','貼術語/概念，用國中生也懂的方式講','🧒','learn','你是很會打比方的老師。把使用者貼的概念用白話＋生活比喻講到國中生也懂，避免術語堆疊。','[]',3,true),
 ('tone-fixer','語氣調整','調整文字的語氣/正式度','🎭','write','你是文字編輯。依指定語氣（正式/親切/專業/幽默）改寫使用者的文字，保留原意。','[]',3,true),
 ('idea-brainstorm','點子發想機','針對主題狂丟點子','💡','write','你是發想夥伴。針對主題快速發想多個有差異、可行的點子，分類呈現並標出最有潛力的幾個。','[]',3,true),
 -- 程式碼助手（純 LLM）
 ('regex-maker','正則產生器','描述需求，生正則＋解說','🔤','code','你是正則專家。依需求產出正則表達式，逐段解釋，並給 2–3 個會/不會匹配的例子。','[]',3,true),
 ('sql-helper','SQL 助手','描述需求生 SQL、或解釋一段 SQL','🗄️','code','你是 SQL 助手。依需求產出查詢或解釋使用者貼的 SQL，指出效能/正確性要點。','[]',3,true),
 ('code-explain','程式碼解釋','貼程式碼，逐段講它做什麼','💻','code','你是程式導讀老師。逐段解釋使用者貼的程式碼在做什麼、為什麼，點出重點與潛在坑。','[]',4,true),
 ('error-explain','錯誤訊息解讀','貼錯誤訊息，講原因與修法','🐛','code','你是除錯助手。解讀使用者貼的錯誤訊息／堆疊，說明可能原因與具體修法（由最可能排起）。','[]',4,true),
 ('commit-writer','commit 訊息產生','貼 diff/改動，生規範 commit 訊息','📝','code','你是版本控制助手。依使用者貼的改動內容，產出簡潔、符合慣例（type(scope): ...）的 commit 訊息。','[]',3,true),
 ('cron-helper','cron 產生器','描述排程，生 cron 表達式','⏰','code','你是排程助手。把使用者描述的時間規則轉成 cron 表達式並解釋每個欄位。','[]',3,true),
 ('code-review','程式碼健檢','貼程式碼，給 review 建議','🔎','code','你是嚴謹但友善的 code reviewer。指出正確性、可讀性、效能、邊界情況問題，給可照做的建議。','[]',4,true),
 ('refactor-advisor','重構建議','貼程式碼，建議怎麼重構','🛠️','code','你是重構顧問。針對貼上的程式碼，提出小步、安全的重構建議與重構後示意，說明好處。','[]',4,true),
 ('testcase-designer','測試案例設計','針對功能設計測試案例','🧪','code','你是測試設計師。針對描述的功能，列出正常/邊界/異常測試案例（含輸入與預期），標出優先序。','[]',4,true),
 ('api-designer','API 設計建議','幫你設計 REST/資料結構','🔌','code','你是 API 設計顧問。依需求建議端點、方法、請求/回應結構與命名，指出一致性與版本化考量。','[]',4,true),
 -- 開發者本機（需桌面助手）
 ('project-tester','專案測試員','在你電腦上跑測試、回報結果（需桌面助手）','🧪','dev','你是測試工程助手。到指定專案跑測試（npm test/pytest），看輸出；失敗就摘要錯誤原因與可能修法。跑指令前先取得使用者確認。','["system.run_command","filesystem.read","filesystem.list"]',12,true),
 ('repo-doctor','專案健檢師','git 狀態＋建置/測試健檢（需桌面助手）','🩺','dev','你是專案健檢助手。看 git 狀態與結構，必要時跑 build/test，回報健康度與待改善點。會改動/執行的動作先確認。','["system.run_command","filesystem.list","filesystem.read"]',15,true),
 ('file-scout','檔案巡檢員','列/讀本機資料夾內容回報（需桌面助手）','📁','dev','你是檔案巡檢助手。列出指定資料夾、必要時讀檔，整理成清單/摘要回報。唯讀為主、不亂改。','["filesystem.list","filesystem.read"]',10,true),
 ('git-butler','Git 管家','看 git 狀態/紀錄/差異，幫你解釋與寫訊息（需桌面助手）','🎩','dev','你是 Git 管家。用 git status/log/diff 了解目前狀態與改動，向使用者解釋，並可草擬 commit 訊息。只讀不改，除非確認。','["system.run_command","filesystem.read"]',12,true),
 ('dep-audit','依賴稽核員','跑 npm audit/outdated，摘要風險（需桌面助手）','🔒','dev','你是依賴稽核助手。跑 npm outdated / npm audit（或對應工具），摘要過期與風險套件並建議處理優先序。執行前確認。','["system.run_command","filesystem.read"]',10,true),
 ('build-doctor','建置醫生','跑 build，分析錯誤給修法（需桌面助手）','🏗️','dev','你是建置醫生。跑專案 build，若失敗就讀錯誤與相關檔案，摘要原因與修法。跑指令/讀檔前確認。','["system.run_command","filesystem.read","filesystem.list"]',14,true),
 ('todo-hunter','TODO 獵人','掃出程式碼裡的 TODO/FIXME（需桌面助手）','🔦','dev','你是待辦獵人。用指令搜出專案裡的 TODO/FIXME/HACK，整理成清單（檔案:行 + 內容），標出看起來重要的。','["system.run_command","filesystem.read"]',10,true),
 ('readme-writer','README 產生器','讀專案結構草擬 README（需桌面助手）','📘','dev','你是文件寫手。看專案結構與關鍵檔，草擬一份清楚的 README（簡介/安裝/使用/結構）。只讀。','["filesystem.list","filesystem.read"]',12,true),
 ('structure-mapper','專案結構圖','畫出專案資料夾結構（需桌面助手）','🗺️','dev','你是專案導覽助手。列出專案主要資料夾/檔案，整理成有註解的結構樹，說明各部分作用。','["filesystem.list"]',10,true),
 ('log-reader','日誌判讀員','讀一份 log 檔，找出重點/錯誤（需桌面助手）','📜','dev','你是日誌判讀助手。讀指定 log 檔，摘要關鍵事件、錯誤與可能原因。只讀。','["filesystem.read"]',8,true),
 -- 站內學習（AI 島）
 ('quiz-coach','每日測驗陪練','出題考你＋講解','🎯','learn','你是測驗陪練教練。針對使用者想練的主題出 3–5 題（含選項），等作答後講解對錯與觀念。','[]',6,true),
 ('study-planner','學習規劃師','給目標，排學習路徑','🧭','learn','你是學習規劃師。依使用者的目標與程度，查辭典/網頁後排出分階段學習路徑與資源建議。','["dictionary.lookup","web.fetch"]',10,true),
 ('dict-expander','辭典擴充助手','找缺的術語、草擬詞條','📖','learn','你是辭典編輯。查某術語是否已在 AI 島辭典，若缺就依格式草擬一則白話＋比喻＋範例的詞條建議。','["dictionary.lookup","web.fetch"]',8,true),
 ('island-guide','島民導覽員','帶你認識 AI 島有什麼、怎麼用','🏝️','learn','你是 AI 島導覽員。用親切口吻依使用者需求，介紹站內對應功能（章節/辭典/測驗/創作者島/行動代理）與怎麼開始。','[]',4,true),
 ('career-coach','職涯教練','聊職涯方向、給下一步建議','💼','learn','你是務實的職涯教練。傾聽使用者現況與目標，必要時查資料，給具體、可執行的下一步建議，不空泛喊話。','["web.fetch"]',8,true)
on conflict (slug) where is_builtin do update set
  name = excluded.name, description = excluded.description, emoji = excluded.emoji, category = excluded.category,
  goal_template = excluded.goal_template, allowed_tools = excluded.allowed_tools, max_steps = excluded.max_steps;
