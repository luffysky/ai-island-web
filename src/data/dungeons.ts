// 5 大副本課程資料
// 每個副本 = AI Island 一個課程方向

export interface DungeonModule {
  title: string;
  desc: string;
  skills: string[];
  lessonContent?: string;   // 完整教學內文（markdown）
  practice?: {              // 模組練習
    task: string;
    hint: string;
  };
}

export interface DungeonTool {
  name: string;
  desc: string;
  url: string;
  price: "free" | "paid" | "freemium";
}

export interface Dungeon {
  slug: string;
  no: number;
  name: string;
  emoji: string;
  subtitle: string;
  tagline: string;
  boss: {
    name: string;
    symptom: string;
    weakness: string;
    howToBeat: string;
  };
  color: string;       // tailwind gradient
  border: string;
  accentHex: string;
  heroImg: string;
  intro: string;
  whoFor: string[];
  outcomes: string[];
  modules: DungeonModule[];
  tools: DungeonTool[];
  relatedChapters: { id: number; title: string }[];
  proTips: string[];
}

export const DUNGEONS: Dungeon[] = [
  // ============ 1. 文案副本 ============
  {
    slug: "ai-writing",
    no: 1,
    name: "文案副本",
    emoji: "✍️",
    subtitle: "文字的力量",
    tagline: "讓 AI 幫你寫出打動人心的文字",
    boss: {
      name: "空洞文案怪",
      symptom: "寫出來的文案沒人想看、自己都覺得無聊、套模板套到無感。",
      weakness: "具體 + 情感 + 受眾",
      howToBeat: "先想清楚「寫給誰看」、用具體場景取代空泛形容詞、每句話都帶一個畫面或情緒。",
    },
    color: "from-green-400 to-emerald-500",
    border: "border-green-400/30 bg-green-400/5",
    accentHex: "#34d399",
    heroImg: "/mascot/mission-dungeons.png",
    intro:
      "文字是所有內容的根。會寫文案、你的想法才能傳出去——不管是社群貼文、產品介紹、電子報還是小說。AI 不是幫你「代寫」、是幫你「想更快、改更狠、產更多」。這個副本教你怎麼跟 AI 一起寫出有溫度、有記憶點的文字。",
    whoFor: [
      "想經營社群但每次發文都卡住的人",
      "做電商 / 接案、需要寫產品文案的人",
      "想寫部落格、小說、但不知從何下筆的人",
      "工作要寫 email、報告、提案的上班族",
    ],
    outcomes: [
      "用 AI 在 10 分鐘內產出一篇有架構的貼文草稿",
      "建立自己的「文字風格」、讓 AI 模仿你的語氣寫",
      "學會改稿工法：把 AI 的初稿改成「像人寫的」",
      "寫出有 hook 的開頭、讓人想看下去",
    ],
    modules: [
      {
        title: "認識 AI 寫作的能與不能",
        desc: "AI 擅長發想、擴寫、改寫；不擅長真實經驗、獨特觀點。先抓對人機分工。",
        skills: ["AI 寫作定位", "人機分工"],
      },
      {
        title: "Prompt 寫作工法",
        desc: "角色 + 任務 + 受眾 + 風格 + 格式的五層結構、用 few-shot 範例讓 AI 抓到調性。",
        skills: ["結構化 prompt", "few-shot 範例"],
      },
      {
        title: "建立你的風格庫",
        desc: "餵 AI 你過去寫的東西、讓它學你的語氣、打造個人語氣 prompt。",
        skills: ["風格萃取", "語氣 prompt"],
      },
      {
        title: "各類文案實戰",
        desc: "社群貼文、產品介紹、電子報、標題、CTA——每種文案的公式與 AI 協作法。",
        skills: ["社群文案", "銷售文案", "標題工法"],
      },
      {
        title: "改稿與潤飾",
        desc: "AI 初稿常「太完美所以很假」。學會加入口語、節奏、不完美感、讓文字像人寫的。",
        skills: ["人味改稿", "節奏控制"],
      },
    ],
    tools: [
      { name: "ChatGPT", desc: "最廣用、發想擴寫都行", url: "https://chatgpt.com/", price: "freemium" },
      { name: "Claude", desc: "長文、語氣自然、寫作首選", url: "https://claude.ai/", price: "freemium" },
      { name: "Notion AI", desc: "在筆記裡直接寫、整理一條龍", url: "https://www.notion.so/product/ai", price: "paid" },
      { name: "Gamma", desc: "把文字一鍵變簡報 / 網頁", url: "https://gamma.app/", price: "freemium" },
    ],
    relatedChapters: [
      { id: 63, title: "附錄 C：AI / Prompt 工法大全" },
      { id: 66, title: "附錄 F：創作 / 設計速查" },
    ],
    proTips: [
      "AI 寫完先問自己：「這句話換成我朋友會這樣說嗎？」不會就改掉。",
      "不要一次要 AI 寫完整篇、分段寫（先大綱、再逐段）品質好很多。",
      "把你看過覺得「寫得真好」的文章丟給 AI 當範例、模仿它的結構。",
      "標題寫 10 個選 1 個、不要第一個就用。",
    ],
  },

  // ============ 2. 圖像副本 ============
  {
    slug: "ai-design",
    no: 2,
    name: "圖像副本",
    emoji: "🎨",
    subtitle: "視覺的魔法",
    tagline: "把腦中的畫面變成真實的圖",
    boss: {
      name: "模糊指令魔",
      symptom: "生出來的圖跟想像差很多、一直重 roll 也 roll 不到、不知道怎麼描述。",
      weakness: "精準描述 + 風格參考",
      howToBeat: "把畫面拆成「主體 + 動作 + 場景 + 風格 + 光線 + 構圖」六要素、附參考圖、一次到位。",
    },
    color: "from-blue-400 to-cyan-500",
    border: "border-blue-400/30 bg-blue-400/5",
    accentHex: "#22d3ee",
    heroImg: "/mascot/mission-dungeons.png",
    intro:
      "以前做圖要會 Photoshop、要請設計師。現在你用文字就能生出專業級的圖。但「會用工具」跟「生出好圖」是兩回事——關鍵在你怎麼「描述」。這個副本教你把腦中模糊的畫面、變成 AI 聽得懂的精準指令。",
    whoFor: [
      "需要做社群圖、banner、縮圖的內容創作者",
      "做電商、需要商品情境圖的賣家",
      "想做品牌視覺但沒預算請設計師的人",
      "對 AI 繪圖好奇、想玩出名堂的人",
    ],
    outcomes: [
      "用 6 要素工法、生出接近想像的圖",
      "建立一致的品牌視覺風格（不是每張都長不一樣）",
      "學會局部修改、去背、放大等後製技巧",
      "知道各家工具的強項、選對工具做對的事",
    ],
    modules: [
      {
        title: "AI 繪圖原理速懂",
        desc: "為什麼有時生很爛？理解 AI 怎麼「猜」你要什麼、就知道怎麼下指令。",
        skills: ["生成原理", "提示詞概念"],
      },
      {
        title: "6 要素提示工法",
        desc: "主體 / 動作 / 場景 / 風格 / 光線 / 構圖——把畫面拆解成 AI 能執行的指令。",
        skills: ["畫面拆解", "風格詞庫"],
      },
      {
        title: "風格一致性",
        desc: "用 reference image、style code、種子值、讓一系列圖風格統一。",
        skills: ["風格鎖定", "系列圖製作"],
      },
      {
        title: "後製技巧",
        desc: "局部重繪（inpainting）、去背、放大、修手指——讓圖真正能用。",
        skills: ["inpainting", "去背放大"],
      },
      {
        title: "商業應用實戰",
        desc: "商品情境圖、社群素材、品牌 mood board——用 GLACÉRA 陶瓷品牌當案例。",
        skills: ["商品圖", "品牌視覺"],
      },
    ],
    tools: [
      { name: "Midjourney", desc: "畫質頂級、藝術感最強", url: "https://www.midjourney.com/", price: "paid" },
      { name: "ChatGPT 繪圖", desc: "對話式生圖、好溝通", url: "https://chatgpt.com/", price: "freemium" },
      { name: "Leonardo AI", desc: "有免費額度、可訓練風格", url: "https://leonardo.ai/", price: "freemium" },
      { name: "Canva", desc: "生圖 + 排版一條龍", url: "https://www.canva.com/", price: "freemium" },
      { name: "Ideogram", desc: "文字渲染最強、做含字的圖", url: "https://ideogram.ai/", price: "freemium" },
    ],
    relatedChapters: [
      { id: 63, title: "附錄 C：AI / Prompt 工法大全" },
      { id: 66, title: "附錄 F：創作 / 設計速查" },
    ],
    proTips: [
      "先找一張你喜歡的參考圖、再描述、比純文字準很多。",
      "風格詞放後面、主體放前面——AI 對前面的字比較重視。",
      "生不出來不要一直加字、有時候是「減字」才對。",
      "同一個 prompt 多生幾張、AI 有隨機性、別第一張就放棄。",
    ],
  },

  // ============ 3. 影片副本 ============
  {
    slug: "ai-video",
    no: 3,
    name: "影片副本",
    emoji: "🎬",
    subtitle: "影像的敘事",
    tagline: "不用攝影機、也能說好一個故事",
    boss: {
      name: "剪輯混亂獸",
      symptom: "素材一堆但剪不出來、節奏鬆散、做到一半就放棄、不知道怎麼開頭。",
      weakness: "分鏡 + 腳本先行",
      howToBeat: "先寫腳本、再分鏡、最後才生素材。不要邊做邊想、那是混亂的根源。",
    },
    color: "from-purple-400 to-pink-500",
    border: "border-purple-400/30 bg-purple-400/5",
    accentHex: "#c084fc",
    heroImg: "/mascot/mission-dungeons.png",
    intro:
      "影片是這個時代傳播力最強的格式。以前做影片要器材、要剪輯、要後製、門檻很高。現在 AI 能生影片、配音、字幕、剪輯——一個人就能做出一支完整的片。這個副本教你用 AI 做影片的完整流程：從腳本到成片。",
    whoFor: [
      "想做短影音 / YouTube 但沒拍攝設備的人",
      "想用影片介紹產品、服務的創業者",
      "Nami 這類想做 AI 影像創作的人",
      "想把文字內容轉成影片擴大觸及的創作者",
    ],
    outcomes: [
      "寫出有節奏的影片腳本（hook → 內容 → CTA）",
      "用 AI 生成影片素材、配音、字幕",
      "學會分鏡思維、讓影片不鬆散",
      "完成一支 30 秒到 1 分鐘的完整短片",
    ],
    modules: [
      {
        title: "影片敘事基礎",
        desc: "黃金 3 秒原則、影片節奏、為什麼觀眾會滑掉——先懂觀眾再做片。",
        skills: ["敘事結構", "節奏掌握"],
      },
      {
        title: "腳本與分鏡",
        desc: "用 AI 寫腳本、拆分鏡表。先有藍圖再動工、避免「剪輯混亂獸」。",
        skills: ["腳本寫作", "分鏡規劃"],
      },
      {
        title: "AI 影片生成",
        desc: "文字生影片、圖生影片、影片風格轉換——各工具的特性與用法。",
        skills: ["文字轉影片", "圖轉影片"],
      },
      {
        title: "配音與字幕",
        desc: "AI 配音（擬真人聲）、自動字幕、多語言——讓影片更專業。",
        skills: ["AI 配音", "自動字幕"],
      },
      {
        title: "剪輯與成片",
        desc: "AI 剪輯工具、轉場、配樂、輸出規格——把素材組成完整作品。",
        skills: ["AI 剪輯", "成片輸出"],
      },
    ],
    tools: [
      { name: "Runway", desc: "AI 影片生成天花板、Gen-4", url: "https://runwayml.com/", price: "freemium" },
      { name: "Pika", desc: "文字轉影片、好上手", url: "https://pika.art/", price: "freemium" },
      { name: "Descript", desc: "像編輯文件一樣剪影片", url: "https://www.descript.com/", price: "freemium" },
      { name: "CapCut", desc: "免費剪輯 + AI 功能多", url: "https://www.capcut.com/", price: "freemium" },
      { name: "ElevenLabs", desc: "AI 配音、超擬真", url: "https://elevenlabs.io/", price: "freemium" },
    ],
    relatedChapters: [
      { id: 63, title: "附錄 C：AI / Prompt 工法大全" },
      { id: 66, title: "附錄 F：創作 / 設計速查" },
    ],
    proTips: [
      "腳本先寫好再生素材、不要邊生邊想——這是省時間的關鍵。",
      "前 3 秒決定生死、開頭一定要有 hook（問題、衝突、好奇）。",
      "AI 生的影片片段通常 3-5 秒、用剪輯把它們串成故事。",
      "配樂佔影片質感 50%、別省這步。",
    ],
  },

  // ============ 4. 自動化副本 ============
  {
    slug: "ai-automation",
    no: 4,
    name: "自動化副本",
    emoji: "⚙️",
    subtitle: "流程的解放",
    tagline: "把重複的工作丟給機器人",
    boss: {
      name: "重複勞動怪",
      symptom: "每天做一樣的事——複製貼上、轉檔、回覆訊息、整理資料——時間都被吃掉。",
      weakness: "流程拆解 + 串接",
      howToBeat: "找出「每天 / 每週都做、且步驟固定」的事、拆成觸發 → 動作、用工具串起來。",
    },
    color: "from-orange-400 to-yellow-500",
    border: "border-orange-400/30 bg-orange-400/5",
    accentHex: "#fb923c",
    heroImg: "/mascot/mission-dungeons.png",
    intro:
      "你每天有多少時間花在「機器也能做」的事上？收信分類、資料搬運、發通知、定時貼文——這些都能自動化。這個副本教你不用寫 code（或寫一點點）、就能打造自己的自動化流程、把時間還給自己。",
    whoFor: [
      "每天被重複雜務淹沒的上班族",
      "一人公司 / 接案者、想用自動化當分身",
      "經營社群、想自動排程發文的人",
      "想串接多個工具、打造個人工作流的人",
    ],
    outcomes: [
      "找出自己工作中可以自動化的環節",
      "用 n8n / Make 做出第一個自動化流程",
      "串接 AI、讓自動化流程「會思考」（不只搬資料）",
      "打造個人的自動化工具箱、每週省下數小時",
    ],
    modules: [
      {
        title: "自動化思維",
        desc: "什麼該自動化、什麼不該。觸發（trigger）→ 動作（action）的基本模型。",
        skills: ["流程辨識", "觸發-動作模型"],
      },
      {
        title: "no-code 自動化工具",
        desc: "Zapier / Make / n8n 的差異與選擇、拉拉拉就能做出流程。",
        skills: ["工具選擇", "視覺化流程"],
      },
      {
        title: "串接 AI 節點",
        desc: "在流程中插入 AI——自動分類郵件、生成回覆、摘要內容、讓流程會判斷。",
        skills: ["AI 節點", "智慧流程"],
      },
      {
        title: "實戰自動化場景",
        desc: "社群自動發文、表單自動處理、資料自動匯整、通知自動發送。",
        skills: ["社群自動化", "資料自動化"],
      },
      {
        title: "進階：自架與 webhook",
        desc: "用 n8n 自架、webhook 串接、打造不受平台限制的自動化系統。",
        skills: ["n8n 自架", "webhook"],
      },
    ],
    tools: [
      { name: "n8n", desc: "可自架、開源、最彈性", url: "https://n8n.io/", price: "freemium" },
      { name: "Make", desc: "視覺化流程、功能強", url: "https://www.make.com/", price: "freemium" },
      { name: "Zapier", desc: "整合最多服務、好上手", url: "https://zapier.com/", price: "freemium" },
      { name: "Activepieces", desc: "開源 Zapier 替代", url: "https://www.activepieces.com/", price: "freemium" },
    ],
    relatedChapters: [
      { id: 63, title: "附錄 C：AI / Prompt 工法大全" },
      { id: 64, title: "附錄 D：開發工具速查" },
    ],
    proTips: [
      "先記錄一週、看哪些事重複做最多次、那就是第一個該自動化的。",
      "從簡單的開始（如收到表單→存試算表）、跑通了再加複雜度。",
      "自動化流程也會壞、一定要設「失敗通知」、不然出錯你不知道。",
      "n8n 可以自架在 Zeabur、不受免費額度限制——適合你的 SnowRealm 生態。",
    ],
  },

  // ============ 5. 程式副本 ============
  {
    slug: "ai-coding",
    no: 5,
    name: "程式副本",
    emoji: "💻",
    subtitle: "邏輯的宇宙",
    tagline: "用 AI 把想法變成能跑的產品",
    boss: {
      name: "BUG 混沌蟲",
      symptom: "程式跑不動、錯誤訊息看不懂、改一個地方壞三個、卡住就放棄。",
      weakness: "讀錯誤訊息 + 拆問題",
      howToBeat: "錯誤訊息是線索不是噪音——複製給 AI、一次只改一個地方、拆小步驟驗證。",
    },
    color: "from-pink-400 to-rose-500",
    border: "border-pink-400/30 bg-pink-400/5",
    accentHex: "#f472b6",
    heroImg: "/mascot/mission-dungeons.png",
    intro:
      "會寫程式、你就能把任何想法變成真實的產品。以前學程式要花好幾年、現在有 AI 當你的隨身導師、入門速度快 10 倍。這個副本教你用 AI 輔助寫 code——不是讓 AI 全寫（你會看不懂）、是讓 AI 加速你的學習與開發。",
    whoFor: [
      "想做自己的 app / 網站、但沒學過程式的人",
      "vibe coding——想用 AI 快速做出 MVP 的人",
      "已經會一點、想用 AI 提升效率的開發者",
      "想轉職工程師、需要加速學習的人",
    ],
    outcomes: [
      "用 AI 輔助、做出第一個能跑的小專案",
      "看得懂錯誤訊息、會用 AI 一起 debug",
      "學會「拆問題」——把大目標切成 AI 能處理的小步驟",
      "知道 AI 寫的 code 哪裡可能有雷、不盲目信任",
    ],
    modules: [
      {
        title: "AI 輔助開發心法",
        desc: "AI 是副駕駛不是駕駛。什麼該問 AI、什麼該自己想、怎麼不變成「不會 code 的人」。",
        skills: ["人機分工", "學習心態"],
      },
      {
        title: "用 AI 學程式基礎",
        desc: "讓 AI 當你的 24 小時家教——解釋概念、出練習、檢查理解。",
        skills: ["AI 家教法", "概念提問"],
      },
      {
        title: "Vibe Coding 實戰",
        desc: "用 Cursor / Claude Code 把想法快速變 MVP——描述需求、AI 生 code、你來驗收。",
        skills: ["需求描述", "MVP 開發"],
      },
      {
        title: "Debug 工法",
        desc: "讀懂錯誤訊息、用 AI 一起抓蟲、二分法定位問題——把 BUG 混沌蟲打趴。",
        skills: ["錯誤訊息解讀", "問題定位"],
      },
      {
        title: "從 MVP 到上線",
        desc: "部署、網域、資料庫——用 AI 協助、把專案真正放上網路。",
        skills: ["部署上線", "資料庫"],
      },
    ],
    tools: [
      { name: "Cursor", desc: "AI 編輯器、寫 code 加速", url: "https://cursor.com/", price: "freemium" },
      { name: "Claude Code", desc: "終端機內的 AI agent、能自己做事", url: "https://docs.claude.com/en/docs/agents-and-tools/claude-code/overview", price: "paid" },
      { name: "GitHub Copilot", desc: "VS Code 內 AI 補全", url: "https://github.com/features/copilot", price: "paid" },
      { name: "v0", desc: "AI 生 UI、做前端超快", url: "https://v0.dev/", price: "freemium" },
      { name: "Replit", desc: "瀏覽器內寫 + 跑、含 AI", url: "https://replit.com/", price: "freemium" },
    ],
    relatedChapters: [
      { id: 1, title: "Ch01：HTML 完整入門" },
      { id: 63, title: "附錄 C：AI / Prompt 工法大全" },
      { id: 64, title: "附錄 D：開發工具速查" },
      { id: 68, title: "附錄 H：高階工程師修煉路徑" },
    ],
    proTips: [
      "AI 寫的 code 一定要自己看一遍、看不懂就問 AI「這行在做什麼」。",
      "錯誤訊息整段複製給 AI、不要只說「壞了」——訊息裡有答案。",
      "一次只改一個地方、改完就測、不要一次改十個地方。",
      "60 章主課程是你的後盾——AI 加速、但底子還是要打。",
    ],
  },
];

export function getDungeon(slug: string): Dungeon | undefined {
  return DUNGEONS.find((d) => d.slug === slug);
}
