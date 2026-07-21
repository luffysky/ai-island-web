/**
 * 一鍵生活助理範本庫 — 把分身島 Agent 從「工程師工具」變成「普通人的生活助理」。
 * 單一資料來源：office 熱門任務 + /agent/templates 範本頁共用（不重複定義）。
 *
 * 點一下 → 導到 /agent?goal=<goal>、預填指令、使用者看過再送出。
 * goal 內用「（在這裡填…）」佔位、引導使用者補上自己的內容。
 *
 * needsDevice：要連本機電腦（檔案/桌面類）。
 * needsOAuth：要連外部帳號（Gmail/Calendar…）＝目前 OAuth 尚未接（todo §4.2）→ UI 標「即將開放」不誤導。
 */

export type TemplateCategory = "life" | "work" | "money" | "learn" | "family";

export const CATEGORY_META: Record<TemplateCategory, { label: string; emoji: string }> = {
  life: { label: "生活", emoji: "🌤️" },
  work: { label: "工作", emoji: "💼" },
  money: { label: "財務", emoji: "💰" },
  learn: { label: "學習", emoji: "📚" },
  family: { label: "家庭", emoji: "🏠" },
};

export type TaskTemplate = {
  id: string;
  emoji: string;
  title: string;
  hint: string;
  goal: string;
  category: TemplateCategory;
  needsDevice?: boolean;
  needsOAuth?: boolean;
  popular?: boolean;   // 在 office「熱門任務」露出
};

export const TASK_TEMPLATES: TaskTemplate[] = [
  // ── 生活 ───────────────────────────────
  { id: "news-brief", category: "life", popular: true, emoji: "📰", title: "每日新聞摘要", hint: "挑主題、白話整理今天重點",
    goal: "幫我整理今天「（在這裡填主題，例：AI、國際、財經）」的 5 則重點新聞，每則一句話白話說明，附出處連結。" },
  { id: "trip-plan", category: "life", popular: true, emoji: "🧳", title: "旅遊行程規劃", hint: "天數/地點/預算 → 排行程",
    goal: "幫我規劃「（在這裡填地點）」（在這裡填天數）天的旅遊行程，預算約（在這裡填金額），每天排景點、交通、用餐建議，附大概花費。" },
  { id: "meal-plan", category: "life", emoji: "🍱", title: "一週菜單 / 備餐", hint: "人數/口味/預算 → 菜單+採買",
    goal: "幫我排一週晚餐菜單（（在這裡填人數）人、（在這裡填口味/忌口）），每天一道好做的家常菜，最後列一張採買清單。" },
  { id: "gift-idea", category: "life", emoji: "🎁", title: "送禮建議", hint: "對象/預算/場合 → 挑禮物",
    goal: "幫我想送給「（在這裡填對象，例：媽媽、女友、同事）」的禮物，預算（在這裡填金額），場合是（在這裡填場合），給我 5 個具體選項和原因。" },
  { id: "web-summary", category: "life", popular: true, emoji: "🌐", title: "讀網頁整理重點", hint: "貼網址、抓成重點",
    goal: "抓（在這裡貼上網址）的主要內容，整理成 5 個重點給我，太長的話幫我抓最關鍵的。" },
  { id: "translate-polish", category: "life", popular: true, emoji: "🌍", title: "翻譯 / 潤稿", hint: "貼文字、翻譯或改順",
    goal: "幫我把這段文字翻成（在這裡填語言）並潤飾得自然通順：（在這裡貼上文字）" },
  { id: "health-qa", category: "life", emoji: "🩺", title: "健康知識問答", hint: "查衛教資訊（非診斷）",
    goal: "用白話跟我解釋「（在這裡填健康主題）」是什麼、日常怎麼注意，附上可信來源。（提醒：僅供衛教參考、不能取代看醫生）" },

  // ── 工作 ───────────────────────────────
  { id: "research-brief", category: "work", popular: true, emoji: "🔎", title: "查資料做摘要", hint: "讀多來源、白話摘要附出處",
    goal: "幫我查「（在這裡填主題）」的最新重點，讀 2–3 個來源後用白話摘要，並附上出處連結。" },
  { id: "social-post", category: "work", popular: true, emoji: "✍️", title: "寫貼文 / 文案", hint: "口語有 hook、附標籤",
    goal: "幫我把「（在這裡填主題）」寫成一則社群貼文草稿，口語、開頭有 hook，最後附 3 個標籤。（先給我看過再決定要不要發）" },
  { id: "email-draft", category: "work", emoji: "📧", title: "寫一封 email", hint: "對象/目的/語氣 → 草稿",
    goal: "幫我寫一封 email 給「（在這裡填對象）」，目的是（在這裡填目的），語氣（在這裡填：正式/客氣/簡潔），先給我草稿看過。" },
  { id: "meeting-notes", category: "work", emoji: "🗒️", title: "會議記錄整理", hint: "貼逐字/筆記 → 摘要+待辦",
    goal: "幫我把這段會議內容整理成「決議事項」和「待辦（誰、做什麼、期限）」：（在這裡貼上會議筆記）" },
  { id: "compare-options", category: "work", popular: true, emoji: "⚖️", title: "幫我比較 / 做決定", hint: "列選項 → 優缺點表",
    goal: "幫我比較「（在這裡填選項 A）」和「（在這裡填選項 B）」，做成優缺點對照表，最後給我一個建議和理由。" },
  { id: "slides-outline", category: "work", emoji: "📊", title: "簡報大綱", hint: "主題/時長 → 分頁大綱",
    goal: "幫我把「（在這裡填主題）」做成一份（在這裡填分鐘）分鐘簡報的大綱，列出每一頁標題和要點。" },
  { id: "org-files", category: "work", emoji: "🗂️", title: "整理本機檔案", hint: "先列清單、不直接動手", needsDevice: true,
    goal: "幫我看（在這裡填資料夾路徑）裡的檔案，列出可以整理或刪除的清單。先別動手，列給我看再說。" },
  { id: "inbox-brief", category: "work", emoji: "📥", title: "整理信箱重點", hint: "挑出要回的、摘要", needsOAuth: true,
    goal: "幫我看今天的信箱，挑出需要回覆或注意的，各用一句話摘要，並排出優先順序。" },

  // ── 財務 ───────────────────────────────
  { id: "subsidy-finder", category: "money", popular: true, emoji: "🏛️", title: "查政府補助 / 福利", hint: "身分/需求 → 可申請清單",
    goal: "幫我找「（在這裡填身分/情況，例：新手爸媽、租屋族、小店家）」可以申請的政府補助或福利，列出名稱、資格、金額、申請方式和來源連結。" },
  { id: "price-compare", category: "money", popular: true, emoji: "🛒", title: "比價找最便宜", hint: "指定商品 → 各通路比較",
    goal: "幫我查「（在這裡填商品）」在幾個常見通路的價格，做成比較，並提醒有沒有要注意的（運費、真偽、規格差異）。" },
  { id: "price-drop", category: "money", emoji: "🔔", title: "追蹤降價（教我設）", hint: "先給追蹤方法與比價",
    goal: "我想追蹤「（在這裡填商品）」降價。先幫我查目前各通路價格，並教我怎麼設定降價通知。" },
  { id: "budget-help", category: "money", emoji: "🧮", title: "記帳 / 預算規劃", hint: "收入/目標 → 分配建議",
    goal: "我每月收入約（在這裡填金額），想存到（在這裡填目標）。幫我做一個簡單的預算分配建議（生活/儲蓄/彈性）。（僅供參考、非投資建議）" },
  { id: "contract-plain", category: "money", emoji: "📄", title: "合約 / 條款白話解讀", hint: "貼條文 → 白話+風險",
    goal: "幫我用白話解讀這段合約/條款，重點提醒對我不利或要注意的地方：（在這裡貼上條文）。（僅供參考、不是法律意見）" },

  // ── 學習 ───────────────────────────────
  { id: "explain-term", category: "learn", popular: true, emoji: "📖", title: "解釋術語（白話比喻）", hint: "白話＋生活比喻＋小範例",
    goal: "用白話加一個生活比喻解釋「（在這裡填術語）」，並給一個超簡單的小範例。" },
  { id: "learn-plan", category: "learn", emoji: "🗺️", title: "學習計畫", hint: "目標/時間 → 分階段路線",
    goal: "我想學「（在這裡填主題）」，每週大約有（在這裡填時數）小時。幫我排一個分階段的學習計畫和每階段的具體目標。" },
  { id: "recommend-lesson", category: "learn", emoji: "🎓", title: "找適合我的課", hint: "依程度推薦下一步",
    goal: "根據我的學習程度，推薦我接下來該學哪幾節課，並簡短說明每一節為什麼適合我。" },
  { id: "quiz-me", category: "learn", emoji: "❓", title: "出題考我", hint: "主題 → 小測驗+解析",
    goal: "針對「（在這裡填主題）」出 5 題小測驗考我，我答完後再幫我批改並解釋。" },
  { id: "read-digest", category: "learn", emoji: "📕", title: "讀長文 / 論文摘要", hint: "貼內容 → 重點+白話",
    goal: "幫我把這篇長文的重點整理成白話摘要，並列出 3 個我該記住的關鍵：（在這裡貼上內容或網址）" },

  // ── 家庭 ───────────────────────────────
  { id: "parenting-qa", category: "family", popular: true, emoji: "🍼", title: "育兒問答", hint: "年齡/狀況 → 建議+來源",
    goal: "我的孩子（在這裡填年齡），遇到（在這裡填狀況）。用白話給我幾個可行的做法，附上可信來源。（僅供參考、必要時請諮詢專業）" },
  { id: "schedule-plan", category: "family", emoji: "📅", title: "行程 / 時間規劃", hint: "把待辦排進一天/一週",
    goal: "幫我把這些事情排進（在這裡填今天/這週）的行程，考慮輕重緩急：（在這裡列出你要做的事）。" },
  { id: "elder-care", category: "family", emoji: "👵", title: "長輩照顧資源", hint: "查照顧/補助/服務",
    goal: "幫我找「（在這裡填需求，例：長照 2.0、居家服務、共餐據點）」的相關資源與申請方式，附上來源連結。" },
  { id: "family-activity", category: "family", emoji: "🎡", title: "親子 / 家庭活動", hint: "地點/預算 → 週末點子",
    goal: "幫我想這個週末在「（在這裡填地點）」適合（在這裡填成員，例：帶小孩/陪長輩）的活動，預算（在這裡填金額），給我 5 個點子。" },
  { id: "add-calendar", category: "family", emoji: "🗓️", title: "把事情加進行事曆", hint: "整理成行程項目", needsOAuth: true,
    goal: "幫我把這些安排整理成行事曆項目（標題、日期時間、地點）：（在這裡填你的安排）。" },
];

export function popularTemplates(): TaskTemplate[] {
  return TASK_TEMPLATES.filter((t) => t.popular);
}
export function templatesByCategory(cat: TemplateCategory): TaskTemplate[] {
  return TASK_TEMPLATES.filter((t) => t.category === cat);
}
