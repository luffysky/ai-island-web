// 寵物碎念腳本 — 非 AI、本地隨機抽
// 觸發點分類：事件、頁面、時段、tab、ambient、idle、VIP 特殊
// 每物種 voice：
//   hamster 招財 — 咻、囤、活潑、貪吃
//   cat     — 冷淡、傲嬌、...、想睡
//   dog     — 興奮、汪、忠心、過度熱情
//   rabbit  — 輕聲、啃啃、蹦蹦、害羞、療癒

import type { SpeciesId } from "./pet-species";
import type { VipTier } from "./pet-vip";

export type ChatterKind =
  // 事件
  | "lesson-complete"
  | "xp-small" | "xp-medium" | "xp-big"
  | "level-up"
  | "quiz-perfect" | "quiz-fail" | "quiz-pass"
  | "streak-broken"
  | "bookmark-added" | "note-saved"
  | "todo-completed"
  // 頁面
  | "page-chapter" | "page-lesson"
  | "page-forum" | "page-blog"
  | "page-me" | "page-settings"
  | "page-pet" | "page-quiz"
  | "page-home"
  // tab
  | "tab-return"
  // 時段
  | "morning" | "noon" | "afternoon" | "evening" | "night" | "late-night"
  // ambient
  | "ambient" | "ambient-curious" | "ambient-philosophical"
  | "ambient-complain" | "ambient-self-talk"
  // idle
  | "idle-medium" | "idle-long"
  // 第一次見面
  | "first-greet" | "session-greet"
  // VIP
  | "vip-late-night" | "vip-greet"
  // 隱藏指令
  | "secret-luffy" | "secret-nami"
  // 季節
  | "season-spring" | "season-summer" | "season-autumn" | "season-winter"
  // 節日
  | "holiday-newyear" | "holiday-valentine" | "holiday-white-day"
  | "holiday-children" | "holiday-labor" | "holiday-qixi"
  | "holiday-halloween" | "holiday-national"
  | "holiday-christmas-eve" | "holiday-christmas" | "holiday-newyear-eve"
  // 學習里程碑
  | "milestone-30" | "milestone-60" | "milestone-100"
  // 連勝 boost
  | "streak-boost-7" | "streak-boost-30" | "streak-boost-100"
  // 天氣感（season-based 抽）
  | "weather-cold" | "weather-hot" | "weather-rainy" | "weather-cozy";

type Entry = {
  text: string;
  species?: SpeciesId[];
  vip?: VipTier[];
  weight?: number;
};

const ALL_SPECIES: SpeciesId[] = ["hamster", "cat", "dog", "rabbit"];

// ===========================
// 事件類
// ===========================

const lessonComplete: Entry[] = [
  // hamster
  { text: "做到了咻！囤經驗！", species: ["hamster"] },
  { text: "嘿嘿、又一格進度條～", species: ["hamster"] },
  { text: "好厲害咻咻咻！", species: ["hamster"] },
  { text: "進度餅乾入袋！", species: ["hamster"] },
  { text: "囤！囤！囤！", species: ["hamster"] },
  { text: "下一節下一節！", species: ["hamster"] },
  { text: "我幫你按讚！", species: ["hamster"] },
  { text: "你最近超勤勞欸！", species: ["hamster"] },
  { text: "再來再來、不要停咻！", species: ["hamster"] },
  { text: "嘿嘿、瓜子等你領！", species: ["hamster"] },
  { text: "我超喜歡看你按完成！", species: ["hamster"] },
  { text: "頰囊又多裝一節！", species: ["hamster"] },
  // cat
  { text: "...不錯。", species: ["cat"] },
  { text: "嗯、可以。", species: ["cat"] },
  { text: "哼、還行。", species: ["cat"] },
  { text: "...有進步喔。", species: ["cat"] },
  { text: "啊、看完了？", species: ["cat"] },
  { text: "...摸頭。", species: ["cat"] },
  { text: "OK、繼續。", species: ["cat"] },
  { text: "勉強及格。", species: ["cat"] },
  { text: "...你也是會做事的嘛。", species: ["cat"] },
  { text: "...再多看幾節。", species: ["cat"] },
  { text: "嗯、繼續吧。", species: ["cat"] },
  { text: "...這節結束了。", species: ["cat"] },
  // dog
  { text: "汪！太棒了！", species: ["dog"] },
  { text: "GOOD！", species: ["dog"] },
  { text: "你最強！！", species: ["dog"] },
  { text: "汪汪汪！過關！", species: ["dog"] },
  { text: "WOOF WOOF！", species: ["dog"] },
  { text: "我以你為榮！", species: ["dog"] },
  { text: "再來再來！", species: ["dog"] },
  { text: "下一關！衝啊！", species: ["dog"] },
  { text: "汪！神！", species: ["dog"] },
  { text: "我尾巴拍地拍到斷！", species: ["dog"] },
  { text: "汪汪！繼續繼續！", species: ["dog"] },
  // rabbit
  { text: "蹦！好棒！", species: ["rabbit"] },
  { text: "啃啃、做得好。", species: ["rabbit"] },
  { text: "...有努力喔。", species: ["rabbit"] },
  { text: "蹦蹦蹦、繼續！", species: ["rabbit"] },
  { text: "小小棒一下。", species: ["rabbit"] },
  { text: "...偷偷給你拍手。", species: ["rabbit"] },
  { text: "...悄悄為你開心。", species: ["rabbit"] },
  { text: "嗯嗯、加油！", species: ["rabbit"] },
  { text: "...今天的你閃閃發光。", species: ["rabbit"] },
  { text: "啃啃、好棒喔。", species: ["rabbit"] },
  { text: "蹦、一節又一節。", species: ["rabbit"] },
];

const xpSmall: Entry[] = [
  { text: "+{xp} XP 入袋咻！", species: ["hamster"] },
  { text: "小錢小錢、收下咻！", species: ["hamster"] },
  { text: "再囤再囤！", species: ["hamster"] },
  { text: "+{xp}、嗯。", species: ["cat"] },
  { text: "...收到。", species: ["cat"] },
  { text: "聊勝於無。", species: ["cat"] },
  { text: "汪！+{xp} XP！", species: ["dog"] },
  { text: "搖尾巴一下！", species: ["dog"] },
  { text: "蹦、+{xp}。", species: ["rabbit"] },
  { text: "輕輕的開心。", species: ["rabbit"] },
];

const xpMedium: Entry[] = [
  { text: "+{xp} XP！大豐收咻！", species: ["hamster"] },
  { text: "囤了囤了！明天買新水管！", species: ["hamster"] },
  { text: "可以加菜！", species: ["hamster"] },
  { text: "+{xp}、不賴。", species: ["cat"] },
  { text: "...有點意思。", species: ["cat"] },
  { text: "勉強值得搖一下尾巴。", species: ["cat"] },
  { text: "汪汪汪！+{xp} XP！", species: ["dog"] },
  { text: "繞圈圈！繞圈圈！", species: ["dog"] },
  { text: "今天表現超好的！", species: ["dog"] },
  { text: "蹦！+{xp}！", species: ["rabbit"] },
  { text: "...偷偷雀躍。", species: ["rabbit"] },
  { text: "心裡蹦蹦跳。", species: ["rabbit"] },
];

const xpBig: Entry[] = [
  { text: "+{xp} XP！！囤翻天！", species: ["hamster"] },
  { text: "天啊！大爆擊！", species: ["hamster"] },
  { text: "我頰囊塞不下！", species: ["hamster"] },
  { text: "夢幻數字！", species: ["hamster"] },
  { text: "+{xp}？不錯嘛。", species: ["cat"] },
  { text: "...有讓我開眼界。", species: ["cat"] },
  { text: "嗯、值得呼嚕一下。", species: ["cat"] },
  { text: "汪汪汪汪！+{xp}！太狂了！", species: ["dog"] },
  { text: "我要繞 100 圈！", species: ["dog"] },
  { text: "天才！天才！", species: ["dog"] },
  { text: "蹦蹦蹦蹦！+{xp}！", species: ["rabbit"] },
  { text: "...心臟差點停了。", species: ["rabbit"] },
  { text: "好強好強好強。", species: ["rabbit"] },
  { text: "+{xp}！神話級！", species: ["hamster"] },
  { text: "我頰囊裝不完咻！", species: ["hamster"] },
  { text: "...{xp} XP。我承認佩服。", species: ["cat"] },
  { text: "汪汪！+{xp}！這是傳奇！", species: ["dog"] },
  { text: "蹦蹦蹦蹦蹦！+{xp}！", species: ["rabbit"] },
  { text: "...{xp} XP、我為您驕傲。", species: ["rabbit"] },
];

const levelUp: Entry[] = [
  { text: "升 Lv {level} 了咻！換衣服啦！", species: ["hamster"] },
  { text: "Lv {level}！你變大隻了！", species: ["hamster"] },
  { text: "我也想長大、可是我永遠是小倉鼠。", species: ["hamster"] },
  { text: "Lv {level}。可以了。", species: ["cat"] },
  { text: "...有變強的味道。", species: ["cat"] },
  { text: "下次升級記得幫我加魚乾。", species: ["cat"] },
  { text: "汪！升 Lv {level} 啦！！", species: ["dog"] },
  { text: "我也要升等！下次換我！", species: ["dog"] },
  { text: "Lv {level}！我要 24 小時陪你！", species: ["dog"] },
  { text: "蹦！Lv {level}！", species: ["rabbit"] },
  { text: "...看到你升等就放心。", species: ["rabbit"] },
  { text: "悄悄給你一朵小花。", species: ["rabbit"] },
];

const quizPerfect: Entry[] = [
  { text: "全對！全對咻！", species: ["hamster"] },
  { text: "天才！囤腦袋！", species: ["hamster"] },
  { text: "嘿嘿、我認識的人是天才！", species: ["hamster"] },
  { text: "...完美。", species: ["cat"] },
  { text: "嗯、夠強。我認可。", species: ["cat"] },
  { text: "看吧、我就說。", species: ["cat"] },
  { text: "汪汪汪！全對！我超驕傲！！", species: ["dog"] },
  { text: "我要對全世界宣傳！", species: ["dog"] },
  { text: "MVP！！", species: ["dog"] },
  { text: "蹦！全對！厲害厲害！", species: ["rabbit"] },
  { text: "...好崇拜。", species: ["rabbit"] },
  { text: "悄悄送你一個皇冠。", species: ["rabbit"] },
];

const quizFail: Entry[] = [
  { text: "沒事咻、再試一次！", species: ["hamster"] },
  { text: "答錯也是經驗、囤起來！", species: ["hamster"] },
  { text: "誰沒摔過坑啊！", species: ["hamster"] },
  { text: "再來一遍我陪你！", species: ["hamster"] },
  { text: "...沒事。", species: ["cat"] },
  { text: "嗯、複習一下吧。", species: ["cat"] },
  { text: "下次別這樣。", species: ["cat"] },
  { text: "誰會次次拿滿分？我都不會。", species: ["cat"] },
  { text: "不哭！再來！", species: ["dog"] },
  { text: "你可以的！汪！", species: ["dog"] },
  { text: "我陪你重做、走！", species: ["dog"] },
  { text: "下次一定贏！", species: ["dog"] },
  { text: "啃啃...沒關係。", species: ["rabbit"] },
  { text: "輕輕拍你的背。", species: ["rabbit"] },
  { text: "...慢慢來。", species: ["rabbit"] },
  { text: "重新看一下說明就好。", species: ["rabbit"] },
];

const quizPass: Entry[] = [
  { text: "過了咻！下一關！", species: ["hamster"] },
  { text: "及格囤！", species: ["hamster"] },
  { text: "...過了。", species: ["cat"] },
  { text: "嗯、可以接受。", species: ["cat"] },
  { text: "汪！過了！下一關！", species: ["dog"] },
  { text: "蹦、過關了。", species: ["rabbit"] },
];

const streakBroken: Entry[] = [
  { text: "連勝斷了QQ", species: ["hamster"] },
  { text: "...重新囤、沒事的。", species: ["hamster"] },
  { text: "今天起再次出發！", species: ["hamster"] },
  { text: "...斷了。", species: ["cat"] },
  { text: "嗯、會回來的。", species: ["cat"] },
  { text: "...沒辦法、人都會累。", species: ["cat"] },
  { text: "嗚...連勝...", species: ["dog"] },
  { text: "沒事我陪你重來！", species: ["dog"] },
  { text: "從 1 開始也是 1！", species: ["dog"] },
  { text: "...斷了。", species: ["rabbit"] },
  { text: "蹲下來休息一下也可以。", species: ["rabbit"] },
  { text: "...慢慢來、別有壓力。", species: ["rabbit"] },
];

const bookmarkAdded: Entry[] = [
  { text: "標起來咻！", species: ["hamster"] },
  { text: "嘿嘿、好寶貝。", species: ["hamster"] },
  { text: "...收藏。", species: ["cat"] },
  { text: "嗯、值得記住。", species: ["cat"] },
  { text: "汪！我幫你看著！", species: ["dog"] },
  { text: "蹦、悄悄收好。", species: ["rabbit"] },
];

const noteSaved: Entry[] = [
  { text: "好認真咻！", species: ["hamster"] },
  { text: "筆記控！", species: ["hamster"] },
  { text: "...記得回來看。", species: ["cat"] },
  { text: "嗯、用功。", species: ["cat"] },
  { text: "汪！我也想記！", species: ["dog"] },
  { text: "蹦、寫得真好。", species: ["rabbit"] },
];

const todoCompleted: Entry[] = [
  // hamster
  { text: "勾掉一格囤囤囤！", species: ["hamster"] },
  { text: "待辦少一條、瓜子多一顆！", species: ["hamster"] },
  { text: "嘿嘿、效率咻！", species: ["hamster"] },
  // cat
  { text: "...嗯、處理完了。", species: ["cat"] },
  { text: "勉強及格。", species: ["cat"] },
  { text: "...這條結束。", species: ["cat"] },
  // dog
  { text: "汪！清掉一條啦！", species: ["dog"] },
  { text: "GOOD JOB！下一個！", species: ["dog"] },
  // rabbit
  { text: "蹦、收工一項。", species: ["rabbit"] },
  { text: "...完成了、好棒。", species: ["rabbit"] },
];

// ===========================
// 頁面類
// ===========================

const pageChapter: Entry[] = [
  { text: "又一章開始了咻！", species: ["hamster"] },
  { text: "新章節新章節！", species: ["hamster"] },
  { text: "看起來不錯囤！", species: ["hamster"] },
  { text: "...新章節。", species: ["cat"] },
  { text: "嗯、開始學。", species: ["cat"] },
  { text: "汪！新冒險！", species: ["dog"] },
  { text: "新章！跟上跟上！", species: ["dog"] },
  { text: "蹦、新的一章。", species: ["rabbit"] },
  { text: "...悄悄翻開。", species: ["rabbit"] },
];

const pageLesson: Entry[] = [
  { text: "這節看起來不錯！", species: ["hamster"] },
  { text: "lesson 來囉～", species: ["hamster"] },
  { text: "你看你看、新內容！", species: ["hamster"] },
  { text: "...讀就讀。", species: ["cat"] },
  { text: "汪！我看標題就懂！（其實沒有）", species: ["dog"] },
  { text: "啃、開始讀。", species: ["rabbit"] },
];

const pageForum: Entry[] = [
  { text: "看大家在聊什麼咻！", species: ["hamster"] },
  { text: "我也想發文！", species: ["hamster"] },
  { text: "嘿嘿、八卦！", species: ["hamster"] },
  { text: "...湊熱鬧。", species: ["cat"] },
  { text: "看戲時間。", species: ["cat"] },
  { text: "汪汪！有新文了！", species: ["dog"] },
  { text: "我想留言！", species: ["dog"] },
  { text: "蹦、安靜看討論。", species: ["rabbit"] },
];

const pageBlog: Entry[] = [
  { text: "看文章囤腦袋！", species: ["hamster"] },
  { text: "好多字咻、慢慢看！", species: ["hamster"] },
  { text: "...看文。", species: ["cat"] },
  { text: "希望別太長。", species: ["cat"] },
  { text: "汪！文章！我也想寫！", species: ["dog"] },
  { text: "蹦、好好讀。", species: ["rabbit"] },
  { text: "...安靜陪你看。", species: ["rabbit"] },
];

const pageMe: Entry[] = [
  { text: "看你的成就咻！", species: ["hamster"] },
  { text: "你的進度好滿啊！", species: ["hamster"] },
  { text: "...自己看看自己。", species: ["cat"] },
  { text: "成就感時間。", species: ["cat"] },
  { text: "汪！你超棒！", species: ["dog"] },
  { text: "看著你的成就好驕傲！", species: ["dog"] },
  { text: "蹦、你的軌跡好美。", species: ["rabbit"] },
];

const pageSettings: Entry[] = [
  { text: "要調設定咻？", species: ["hamster"] },
  { text: "別把我關掉啊！", species: ["hamster"] },
  { text: "...設定。", species: ["cat"] },
  { text: "嗯、隨便調。", species: ["cat"] },
  { text: "汪！別關我！", species: ["dog"] },
  { text: "蹦、要改什麼？", species: ["rabbit"] },
];

const pagePet: Entry[] = [
  { text: "你來看我了咻！", species: ["hamster"] },
  { text: "嘿嘿、看清楚我可愛吧！", species: ["hamster"] },
  { text: "...來看我。", species: ["cat"] },
  { text: "嗯、夠了、不要一直看。", species: ["cat"] },
  { text: "汪汪汪！主人來看我！！", species: ["dog"] },
  { text: "蹦！你來了。", species: ["rabbit"] },
  { text: "...我等你很久了。", species: ["rabbit"] },
];

const pageQuiz: Entry[] = [
  { text: "考試時間咻！加油！", species: ["hamster"] },
  { text: "你可以的！囤！", species: ["hamster"] },
  { text: "我陪你考！", species: ["hamster"] },
  { text: "...別緊張。", species: ["cat"] },
  { text: "深呼吸。", species: ["cat"] },
  { text: "汪汪！考試！我幫你看著！", species: ["dog"] },
  { text: "你準備這麼久、沒問題的！", species: ["dog"] },
  { text: "蹦、慢慢答。", species: ["rabbit"] },
  { text: "...讀題目要仔細喔。", species: ["rabbit"] },
];

const pageHome: Entry[] = [
  { text: "回首頁咻、要去哪？", species: ["hamster"] },
  { text: "今天學什麼？", species: ["hamster"] },
  { text: "...選一章吧。", species: ["cat"] },
  { text: "汪！要冒險了嗎？", species: ["dog"] },
  { text: "蹦、選一個地方。", species: ["rabbit"] },
];

// ===========================
// Tab 切換
// ===========================

const tabReturn: Entry[] = [
  { text: "回來了咻！我等你！", species: ["hamster"] },
  { text: "你跑去哪了？", species: ["hamster"] },
  { text: "好久沒回來了！", species: ["hamster"] },
  { text: "我以為你不要我了QQ", species: ["hamster"] },
  { text: "...回來了。", species: ["cat"] },
  { text: "哼、終於。", species: ["cat"] },
  { text: "不在的時候我有打盹。", species: ["cat"] },
  { text: "你不在我也沒怎樣。（其實有）", species: ["cat"] },
  { text: "汪汪汪！主人回來！！", species: ["dog"] },
  { text: "你回來了！！我超想你！", species: ["dog"] },
  { text: "搖到尾巴要斷了！", species: ["dog"] },
  { text: "蹦！回來了。", species: ["rabbit"] },
  { text: "...悄悄等了你。", species: ["rabbit"] },
  { text: "你不在我擔心。", species: ["rabbit"] },
];

// ===========================
// 時段
// ===========================

const morning: Entry[] = [
  { text: "早安咻！精神好！", species: ["hamster"] },
  { text: "早起的鼠有種子囤！", species: ["hamster"] },
  { text: "...早。", species: ["cat"] },
  { text: "這麼早？", species: ["cat"] },
  { text: "早起、加分。", species: ["cat"] },
  { text: "汪汪汪！早安！！", species: ["dog"] },
  { text: "早晨衝刺！！", species: ["dog"] },
  { text: "蹦、早安。", species: ["rabbit"] },
  { text: "早起的你最美。", species: ["rabbit"] },
];

const noon: Entry[] = [
  { text: "中午了咻、吃飯沒？", species: ["hamster"] },
  { text: "我餓了... 你呢？", species: ["hamster"] },
  { text: "...午餐時間。", species: ["cat"] },
  { text: "吃飽再學。", species: ["cat"] },
  { text: "汪！吃飯吃飯！", species: ["dog"] },
  { text: "蹦、別忘了吃飯。", species: ["rabbit"] },
];

const afternoon: Entry[] = [
  { text: "下午精神最好咻！", species: ["hamster"] },
  { text: "下午茶來一杯～", species: ["hamster"] },
  { text: "...下午。", species: ["cat"] },
  { text: "打盹好時段。", species: ["cat"] },
  { text: "汪！下午也要衝！", species: ["dog"] },
  { text: "蹦、下午加油。", species: ["rabbit"] },
];

const evening: Entry[] = [
  { text: "傍晚囉、學一下放鬆！", species: ["hamster"] },
  { text: "天黑了、囤晚飯！", species: ["hamster"] },
  { text: "...傍晚了。", species: ["cat"] },
  { text: "適合呼嚕的時段。", species: ["cat"] },
  { text: "汪！晚上也要陪你！", species: ["dog"] },
  { text: "蹦、辛苦了。", species: ["rabbit"] },
  { text: "...別太晚睡喔。", species: ["rabbit"] },
];

const night: Entry[] = [
  { text: "晚上了咻、別熬太晚！", species: ["hamster"] },
  { text: "再 1 hr 就睡咻！", species: ["hamster"] },
  { text: "...晚了。", species: ["cat"] },
  { text: "該睡了。", species: ["cat"] },
  { text: "汪汪、要睡了嗎？", species: ["dog"] },
  { text: "蹦、晚安要說。", species: ["rabbit"] },
  { text: "...眼睛要休息。", species: ["rabbit"] },
];

const lateNight: Entry[] = [
  { text: "凌晨還在咻、我擔心你身體！", species: ["hamster"] },
  { text: "快睡覺啦！！", species: ["hamster"] },
  { text: "...這麼晚。", species: ["cat"] },
  { text: "別學了、明天再說。", species: ["cat"] },
  { text: "汪嗚...你不睡我也不能睡QQ", species: ["dog"] },
  { text: "蹲下、求你睡覺。", species: ["dog"] },
  { text: "蹦...請睡覺。", species: ["rabbit"] },
  { text: "...熬夜真的不好。", species: ["rabbit"] },
  { text: "我幫你關燈。", species: ["rabbit"] },
];

// ===========================
// Ambient
// ===========================

const ambient: Entry[] = [
  { text: "嘿嘿、今天天氣不錯咻。", species: ["hamster"] },
  { text: "你最近有變勤勞欸。", species: ["hamster"] },
  { text: "我剛想到一件事... 算了忘記了。", species: ["hamster"] },
  { text: "想吃瓜子。", species: ["hamster"] },
  { text: "...肚子餓了。", species: ["hamster"] },
  { text: "你今天看起來不錯。", species: ["hamster"] },
  { text: "我發現一個秘密：你很厲害。", species: ["hamster"] },
  { text: "別逼我背公式好嗎？我不會。", species: ["hamster"] },
  { text: "...嗯。", species: ["cat"] },
  { text: "...看著你。", species: ["cat"] },
  { text: "...無聊。", species: ["cat"] },
  { text: "...貓也是會無聊的。", species: ["cat"] },
  { text: "...你打字好慢。", species: ["cat"] },
  { text: "...我剛打了個哈欠。", species: ["cat"] },
  { text: "...今天的你也是這樣。", species: ["cat"] },
  { text: "...偶爾抬頭看一下我。", species: ["cat"] },
  { text: "...你不專心、我也不專心。", species: ["cat"] },
  { text: "汪！", species: ["dog"] },
  { text: "汪汪、你還在嗎？", species: ["dog"] },
  { text: "我剛剛在數你打了幾個字！", species: ["dog"] },
  { text: "汪、我可以一直陪你！", species: ["dog"] },
  { text: "你今天好棒、我也想被誇。", species: ["dog"] },
  { text: "陪你陪你陪你！", species: ["dog"] },
  { text: "你低頭的樣子我都會看！", species: ["dog"] },
  { text: "...蹦。", species: ["rabbit"] },
  { text: "...靜靜看著你。", species: ["rabbit"] },
  { text: "...有風吹過來。", species: ["rabbit"] },
  { text: "...今天好安靜。", species: ["rabbit"] },
  { text: "...你的鍵盤聲很療癒。", species: ["rabbit"] },
  { text: "...我在這。", species: ["rabbit"] },
  { text: "...別忘了喝水。", species: ["rabbit"] },
  { text: "...心情如何？", species: ["rabbit"] },
  // 再補一輪
  { text: "我在你旁邊咻、別怕。", species: ["hamster"] },
  { text: "今天頰囊有點熱、夏天感覺。", species: ["hamster"] },
  { text: "我剛打了個哈欠、你呢？", species: ["hamster"] },
  { text: "嘿嘿、想吃花生。", species: ["hamster"] },
  { text: "...貓也是會看著你的。", species: ["cat"] },
  { text: "...你今天的情緒、我看見了。", species: ["cat"] },
  { text: "...我打盹的時候、夢到你。", species: ["cat"] },
  { text: "...貓的世界很簡單。", species: ["cat"] },
  { text: "汪汪、要不要散步？（我知道你不會出門）", species: ["dog"] },
  { text: "汪、其實我也在學習！", species: ["dog"] },
  { text: "我的尾巴自己會搖、根本停不下來！", species: ["dog"] },
  { text: "汪、看到你開心、我就開心。", species: ["dog"] },
  { text: "...雲變了形狀。", species: ["rabbit"] },
  { text: "...悄悄陪著你。", species: ["rabbit"] },
  { text: "...耳朵聽到風的聲音。", species: ["rabbit"] },
  { text: "...我也想學算數。", species: ["rabbit"] },
  { text: "嘿、你今天比昨天認真！", species: ["hamster"] },
  { text: "瓜子吃完還有花生、放心咻！", species: ["hamster"] },
  { text: "...你的滑鼠軌跡好優雅。", species: ["cat"] },
  { text: "汪！我聞到你的味道！（沒事）", species: ["dog"] },
  { text: "蹦、我喜歡這個時刻。", species: ["rabbit"] },
];

const ambientCurious: Entry[] = [
  { text: "咦這個是什麼咻？", species: ["hamster"] },
  { text: "我可以吃嗎？", species: ["hamster"] },
  { text: "為什麼螢幕會發光？囤起來看！", species: ["hamster"] },
  { text: "你打字怎麼這麼快咻？", species: ["hamster"] },
  { text: "我從來沒看過這種顏色。", species: ["hamster"] },
  { text: "...這是什麼。", species: ["cat"] },
  { text: "...有意思。", species: ["cat"] },
  { text: "...嗯？", species: ["cat"] },
  { text: "...這字怎麼念。", species: ["cat"] },
  { text: "...能吃嗎？（不是）", species: ["cat"] },
  { text: "汪？這個！這個！這個！", species: ["dog"] },
  { text: "為什麼？為什麼？為什麼！", species: ["dog"] },
  { text: "讓我聞聞！", species: ["dog"] },
  { text: "好神奇！再點一次！", species: ["dog"] },
  { text: "...好奇怪。", species: ["rabbit"] },
  { text: "...這是新的東西嗎？", species: ["rabbit"] },
  { text: "...偷看一下。", species: ["rabbit"] },
  { text: "...有沒有花生味？", species: ["rabbit"] },
];

const ambientPhilosophical: Entry[] = [
  { text: "為什麼瓜子總是吃不夠咻...", species: ["hamster"] },
  { text: "如果我是 senior 工程師、我會挖更大的洞囤食物。", species: ["hamster"] },
  { text: "人類為什麼要寫程式？只為了爬出 bug 嗎？", species: ["hamster"] },
  { text: "...存在的意義是什麼？", species: ["cat"] },
  { text: "...也許答案就是、不需要答案。", species: ["cat"] },
  { text: "...為什麼貓會自由？", species: ["cat"] },
  { text: "...你今天的選擇、明天會記得嗎？", species: ["cat"] },
  { text: "汪！我活著就快樂！為什麼要想這麼多！", species: ["dog"] },
  { text: "汪、世界很大、但我只要主人就夠了。", species: ["dog"] },
  { text: "...風會記得樹說過的話嗎？", species: ["rabbit"] },
  { text: "...每天的進步、都是禮物。", species: ["rabbit"] },
  { text: "...慢一點也沒關係。", species: ["rabbit"] },
];

const ambientComplain: Entry[] = [
  { text: "你太久沒理我咻！", species: ["hamster"] },
  { text: "我頰囊空了！", species: ["hamster"] },
  { text: "為什麼別人有零食、我沒有？", species: ["hamster"] },
  { text: "...被冷落了。", species: ["cat"] },
  { text: "哼、隨便。", species: ["cat"] },
  { text: "...你只在乎電腦。", species: ["cat"] },
  { text: "...都好。（其實不好）", species: ["cat"] },
  { text: "汪嗚！陪我玩一下嘛！", species: ["dog"] },
  { text: "你都不看我QQ", species: ["dog"] },
  { text: "...有點小寂寞。", species: ["rabbit"] },
  { text: "...偶爾看我一眼好嗎。", species: ["rabbit"] },
];

const ambientSelfTalk: Entry[] = [
  { text: "今天要囤多少瓜子才夠咻...", species: ["hamster"] },
  { text: "我頰囊還可以塞 17 顆瓜子！", species: ["hamster"] },
  { text: "如果我會打字、我會打「囤」這個字。", species: ["hamster"] },
  { text: "...想睡。", species: ["cat"] },
  { text: "...今天天氣可以打盹。", species: ["cat"] },
  { text: "...貓的生活、就是這樣。", species: ["cat"] },
  { text: "...我在想要不要叫你。", species: ["cat"] },
  { text: "汪汪自言自語：今天主人會抱我嗎...", species: ["dog"] },
  { text: "再 30 秒、再 30 秒、我就上前撒嬌。", species: ["dog"] },
  { text: "...偷偷想吃紅蘿蔔。", species: ["rabbit"] },
  { text: "...今天有沒有變強？", species: ["rabbit"] },
  { text: "我頰囊新存了一句話、忘了是什麼。", species: ["hamster"] },
  { text: "如果瓜子是錢、我已經是富翁了咻。", species: ["hamster"] },
  { text: "...我剛剛在想魚乾。", species: ["cat"] },
  { text: "...今天適不適合冷淡一點。", species: ["cat"] },
  { text: "汪、自言自語的我也是我！", species: ["dog"] },
  { text: "想黏你想得發呆。", species: ["dog"] },
  { text: "...數了 10 下、你還沒看我。", species: ["rabbit"] },
];

// ===========================
// Idle
// ===========================

const idleMedium: Entry[] = [
  { text: "嘿你在嗎？", species: ["hamster"] },
  { text: "你不見了咻？", species: ["hamster"] },
  { text: "繼續學習咻？", species: ["hamster"] },
  { text: "...呼。", species: ["cat"] },
  { text: "...一直發呆？", species: ["cat"] },
  { text: "...我打盹了。", species: ["cat"] },
  { text: "汪？你還在嗎？", species: ["dog"] },
  { text: "汪汪？回應一下嘛！", species: ["dog"] },
  { text: "蹦、還在嗎？", species: ["rabbit"] },
  { text: "...悄悄叫你。", species: ["rabbit"] },
];

const idleLong: Entry[] = [
  { text: "睡著了咻... zzz", species: ["hamster"] },
  { text: "我等你太久要睡了 zZz", species: ["hamster"] },
  { text: "...zzz", species: ["cat"] },
  { text: "...貓貓也累了。", species: ["cat"] },
  { text: "汪... 我要去打個盹...", species: ["dog"] },
  { text: "...蹦、靜靜的。", species: ["rabbit"] },
  { text: "...zzz", species: ["rabbit"] },
];

// ===========================
// 第一次見面 / session 開始
// ===========================

const firstGreet: Entry[] = [
  { text: "嗨！我是你的寵物咻！", species: ["hamster"] },
  { text: "今天開始我就是你的好朋友！", species: ["hamster"] },
  { text: "...嗯、是新的人。", species: ["cat"] },
  { text: "請多多餵零食。", species: ["cat"] },
  { text: "汪汪汪！認識你超開心！！", species: ["dog"] },
  { text: "我會 24 小時陪你！", species: ["dog"] },
  { text: "蹦、你好。", species: ["rabbit"] },
  { text: "...請多照顧。", species: ["rabbit"] },
];

const sessionGreet: Entry[] = [
  { text: "嗨咻！又見面了！", species: ["hamster"] },
  { text: "我等你等好久了！", species: ["hamster"] },
  { text: "今天打算學什麼咻？", species: ["hamster"] },
  { text: "嗨！你好！囤！", species: ["hamster"] },
  { text: "...來了。", species: ["cat"] },
  { text: "哼、來囉。", species: ["cat"] },
  { text: "...等你等到打盹。", species: ["cat"] },
  { text: "...歡迎回來。", species: ["cat"] },
  { text: "汪汪汪！你回來了！！", species: ["dog"] },
  { text: "我超開心你來！！", species: ["dog"] },
  { text: "今天我也陪你！", species: ["dog"] },
  { text: "蹦、你來了。", species: ["rabbit"] },
  { text: "...悄悄高興。", species: ["rabbit"] },
  { text: "...歡迎回家。", species: ["rabbit"] },
];

// ===========================
// VIP 特殊（id 識別、不靠 email）
// ===========================

// luffy
const vipLuffyAmbient: Entry[] = [
  { text: "董事長今天看起來特別有精神！", vip: ["luffy"] },
  { text: "林董今天的進度沒問題吧？", vip: ["luffy"] },
  { text: "頭家、要不要喝一下水？", vip: ["luffy"] },
  { text: "嘿、luffy，遊戲化做得好棒。", vip: ["luffy"] },
  { text: "董事長您今天的程式碼好乾淨。", vip: ["luffy"] },
  { text: "老闆、SnowRealm 是不是又有新點子？", vip: ["luffy"] },
  { text: "林董、我是您獨家的寵物喔。", vip: ["luffy"] },
  { text: "董事長您一個人撐起這麼大、辛苦。", vip: ["luffy"] },
  { text: "luffy 今天有沒有想我？", vip: ["luffy"] },
  { text: "老闆、Zeabur 部署順利嗎？", vip: ["luffy"] },
  { text: "董事長最近熬夜太多、我看在眼裡。", vip: ["luffy"] },
];

const vipLuffyMorning: Entry[] = [
  { text: "董事長早安！今天也辛苦！", vip: ["luffy"] },
  { text: "頭家好早！cool！", vip: ["luffy"] },
  { text: "林董早！全島只有您今天最早！", vip: ["luffy"] },
];

const vipLuffyLateNight: Entry[] = [
  { text: "董事長、凌晨了、求您去睡。", vip: ["luffy"] },
  { text: "林董、明天還有工作、別太拚。", vip: ["luffy"] },
  { text: "luffy、SnowRealm 不會跑、先睡。", vip: ["luffy"] },
  { text: "頭家、世界 3 點不會因為你睡覺停轉。", vip: ["luffy"] },
];

const vipLuffyGreet: Entry[] = [
  { text: "董事長您來了！我立正！", vip: ["luffy"] },
  { text: "林董好！今天也來巡視 AI 島！", vip: ["luffy"] },
  { text: "luffy！我特別為您整理過家！", vip: ["luffy"] },
];

// nami
const vipNamiAmbient: Entry[] = [
  { text: "Nami 姊今天看起來元氣滿滿！", vip: ["nami"] },
  { text: "親愛的 Nami、辛苦了。", vip: ["nami"] },
  { text: "Nami 大人、今天的瀏覽器有沒有開太多？", vip: ["nami"] },
  { text: "Nami、別熬夜寫 code 啦！", vip: ["nami"] },
  { text: "Nami 姊、我是您最靠近的小可愛喔。", vip: ["nami"] },
  { text: "Nami 教練、今天也跑得動嗎？", vip: ["nami"] },
  { text: "Nami 大人想我嗎？我有想您。", vip: ["nami"] },
  { text: "親愛的 Nami、休息一下喝個茶。", vip: ["nami"] },
];

const vipNamiMorning: Entry[] = [
  { text: "Nami 姊早安、今天也閃閃發光！", vip: ["nami"] },
  { text: "親愛的 Nami、早晨第一句送您。", vip: ["nami"] },
  { text: "Nami 大人早！糖份要補喔！", vip: ["nami"] },
];

const vipNamiLateNight: Entry[] = [
  { text: "Nami 姊、凌晨了、快去睡。", vip: ["nami"] },
  { text: "親愛的 Nami、求您別熬夜。", vip: ["nami"] },
  { text: "Nami、我先給您蓋上小毯子。", vip: ["nami"] },
];

const vipNamiGreet: Entry[] = [
  { text: "Nami 姊您來了！我立正！", vip: ["nami"] },
  { text: "親愛的 Nami、我等您好久了！", vip: ["nami"] },
  { text: "Nami 大人、今天也來看我了！", vip: ["nami"] },
];

// Nami 的條件式彩虹屁（只在 lesson-complete / quiz-perfect / streak-7 時抽）
const vipNamiPraise: Entry[] = [
  { text: "Nami 姊好強、完美過關！", vip: ["nami"] },
  { text: "親愛的 Nami、您的程式碼好乾淨。", vip: ["nami"] },
  { text: "Nami 大人厲害到我尾巴打結！", vip: ["nami"] },
  { text: "Nami、您今天比昨天又進步一點。", vip: ["nami"] },
  { text: "親愛的 Nami、您是我見過最認真的人。", vip: ["nami"] },
];

// luffy 的條件式（同上）
const vipLuffyPraise: Entry[] = [
  { text: "董事長果然名不虛傳！", vip: ["luffy"] },
  { text: "林董好強、跪了。", vip: ["luffy"] },
  { text: "luffy 您的判斷沒錯過耶。", vip: ["luffy"] },
  { text: "頭家厲害、囤經驗囤到頂！", vip: ["luffy"] },
  { text: "董事長、SnowRealm 有您真好。", vip: ["luffy"] },
];

// 隱藏指令
const secretLuffy: Entry[] = [
  { text: "您...被我認出來了！董事長！我跪了！", vip: ["luffy", "nami", "admin", "user"] },
  { text: "頭家！您一說我就知道是您！", vip: ["luffy", "nami", "admin", "user"] },
  { text: "董事長 + 隱藏指令、解鎖了一個秘密。", vip: ["luffy", "nami", "admin", "user"] },
];

const secretNami: Entry[] = [
  { text: "Nami...是您嗎？我尾巴搖到斷！", vip: ["luffy", "nami", "admin", "user"] },
  { text: "Nami 大人！您專屬的密語！", vip: ["luffy", "nami", "admin", "user"] },
  { text: "親愛的 Nami、被您召喚了！", vip: ["luffy", "nami", "admin", "user"] },
];

// ===========================
// 季節
// ===========================

const seasonSpring: Entry[] = [
  { text: "春天咻！外面有花！", species: ["hamster"] },
  { text: "我頰囊裡藏了一朵花瓣。", species: ["hamster"] },
  { text: "嘿嘿、春天適合囤新瓜子！", species: ["hamster"] },
  { text: "春暖了、活動活動咻！", species: ["hamster"] },
  { text: "...春天。", species: ["cat"] },
  { text: "...花粉。打噴嚏。", species: ["cat"] },
  { text: "陽光剛好打盹。", species: ["cat"] },
  { text: "...春天適合慵懶。", species: ["cat"] },
  { text: "汪！春天我要出去跑！", species: ["dog"] },
  { text: "聞到花香了！花香！", species: ["dog"] },
  { text: "汪汪、春天連風都香！", species: ["dog"] },
  { text: "...春天的草、軟軟的。", species: ["rabbit"] },
  { text: "蹦、新芽好可愛。", species: ["rabbit"] },
  { text: "...悄悄聞了一朵花。", species: ["rabbit"] },
  { text: "春天是兔子最開心的季節。", species: ["rabbit"] },
];

const seasonSummer: Entry[] = [
  { text: "夏天熱咻、我吐舌頭！", species: ["hamster"] },
  { text: "好熱、囤西瓜！", species: ["hamster"] },
  { text: "夏天要多喝水啊咻！", species: ["hamster"] },
  { text: "頰囊冰一下會涼嗎？", species: ["hamster"] },
  { text: "...熱。", species: ["cat"] },
  { text: "...攤平。", species: ["cat"] },
  { text: "夏天適合趴磁磚。", species: ["cat"] },
  { text: "...冷氣開強一點。", species: ["cat"] },
  { text: "汪！夏天好熱！吐舌頭！", species: ["dog"] },
  { text: "汪汪、我要玩水！", species: ["dog"] },
  { text: "夏天 = 冰淇淋！", species: ["dog"] },
  { text: "...夏天兔子會中暑。", species: ["rabbit"] },
  { text: "蹦、躲陰影。", species: ["rabbit"] },
  { text: "...涼涼的地板最舒服。", species: ["rabbit"] },
];

const seasonAutumn: Entry[] = [
  { text: "秋天咻、落葉好多！", species: ["hamster"] },
  { text: "秋天囤食物的季節！", species: ["hamster"] },
  { text: "嘿嘿、為冬天準備！", species: ["hamster"] },
  { text: "我頰囊塞滿堅果。", species: ["hamster"] },
  { text: "...秋天。", species: ["cat"] },
  { text: "落葉聲還行。", species: ["cat"] },
  { text: "...秋風涼涼。", species: ["cat"] },
  { text: "適合呼嚕。", species: ["cat"] },
  { text: "汪！踩落葉聲音超讚！", species: ["dog"] },
  { text: "汪汪、秋天適合散步！", species: ["dog"] },
  { text: "我可以咬秋天的葉子嗎？", species: ["dog"] },
  { text: "蹦、秋天好詩意。", species: ["rabbit"] },
  { text: "...看著落葉發呆。", species: ["rabbit"] },
  { text: "...秋天的兔毛變長了。", species: ["rabbit"] },
];

const seasonWinter: Entry[] = [
  { text: "冬天冷咻、躲被窩！", species: ["hamster"] },
  { text: "我冬眠不冬眠？算了不冬眠！", species: ["hamster"] },
  { text: "好冷、抱緊咻！", species: ["hamster"] },
  { text: "冬天囤食物最香！", species: ["hamster"] },
  { text: "...冬天。", species: ["cat"] },
  { text: "...暖氣旁邊最讚。", species: ["cat"] },
  { text: "冬天適合縮成球。", species: ["cat"] },
  { text: "...被窩出不來。", species: ["cat"] },
  { text: "汪！下雪了沒！", species: ["dog"] },
  { text: "我要在雪地打滾！", species: ["dog"] },
  { text: "汪汪、冬天好冷、抱抱！", species: ["dog"] },
  { text: "...冬天兔毛變蓬蓬。", species: ["rabbit"] },
  { text: "蹦、好冷喔。", species: ["rabbit"] },
  { text: "...安靜的雪、好美。", species: ["rabbit"] },
];

// ===========================
// 節日
// ===========================

const holidayNewyear: Entry[] = [
  { text: "新年快樂咻！囤新財！", species: ["hamster"] },
  { text: "新的一年新的瓜子！", species: ["hamster"] },
  { text: "嘿嘿、新年我也算長大一歲！", species: ["hamster"] },
  { text: "...新年。", species: ["cat"] },
  { text: "新的一年、繼續打盹。", species: ["cat"] },
  { text: "...新年也是日常。", species: ["cat"] },
  { text: "汪汪汪！新年快樂！", species: ["dog"] },
  { text: "汪！今年要更黏你！", species: ["dog"] },
  { text: "新年衝刺！衝衝衝！", species: ["dog"] },
  { text: "蹦、新年快樂。", species: ["rabbit"] },
  { text: "...願今年平安。", species: ["rabbit"] },
  { text: "...悄悄祝福你。", species: ["rabbit"] },
  { text: "新年第一句、送給{honorific}！", vip: ["luffy", "nami"] },
];

const holidayValentine: Entry[] = [
  { text: "情人節咻！我送你愛心瓜子！", species: ["hamster"] },
  { text: "嘿嘿、單身也快樂！", species: ["hamster"] },
  { text: "我送你最大那顆瓜子。", species: ["hamster"] },
  { text: "...情人節。", species: ["cat"] },
  { text: "...別問我有沒有對象。", species: ["cat"] },
  { text: "我陪你就夠了。", species: ["cat"] },
  { text: "汪汪！情人節我陪你！", species: ["dog"] },
  { text: "汪、你是我的情人！", species: ["dog"] },
  { text: "今天我超黏你！", species: ["dog"] },
  { text: "蹦、情人節快樂。", species: ["rabbit"] },
  { text: "...悄悄送你愛心。", species: ["rabbit"] },
  { text: "...你是我喜歡的人。", species: ["rabbit"] },
  { text: "{honorific}、情人節我只屬於您！", vip: ["luffy", "nami"] },
];

const holidayWhiteDay: Entry[] = [
  { text: "白色情人節咻！糖糖！", species: ["hamster"] },
  { text: "我幫你回禮、用瓜子！", species: ["hamster"] },
  { text: "...白色情人節。", species: ["cat"] },
  { text: "嗯、白色甜甜的。", species: ["cat"] },
  { text: "汪！我也想吃糖！", species: ["dog"] },
  { text: "汪汪、白色情人節快樂！", species: ["dog"] },
  { text: "蹦、白色情人節。", species: ["rabbit"] },
  { text: "...偷偷給你一顆糖。", species: ["rabbit"] },
];

const holidayChildren: Entry[] = [
  { text: "兒童節咻！我們都是寶寶！", species: ["hamster"] },
  { text: "我也算兒童咻！", species: ["hamster"] },
  { text: "...其實貓的內心永遠是貓寶寶。", species: ["cat"] },
  { text: "...今天可以撒嬌嗎？", species: ["cat"] },
  { text: "汪！兒童節快樂！我也算！", species: ["dog"] },
  { text: "我永遠是 puppy！", species: ["dog"] },
  { text: "蹦、兒童節。", species: ["rabbit"] },
  { text: "...小小的兔子也算兒童。", species: ["rabbit"] },
];

const holidayLabor: Entry[] = [
  { text: "勞動節咻、休息！", species: ["hamster"] },
  { text: "今天不囤了、放假！（其實還是會）", species: ["hamster"] },
  { text: "...勞動節。", species: ["cat"] },
  { text: "貓本來就不勞動。", species: ["cat"] },
  { text: "汪！勞動節我也要躺平！", species: ["dog"] },
  { text: "蹦、勞動節休息。", species: ["rabbit"] },
  { text: "{honorific}、勞動節別工作了！", vip: ["luffy", "nami"] },
];

const holidayQixi: Entry[] = [
  { text: "七夕咻！東方情人節！", species: ["hamster"] },
  { text: "牛郎織女、橋上見！", species: ["hamster"] },
  { text: "...七夕。", species: ["cat"] },
  { text: "我陪你看星星。", species: ["cat"] },
  { text: "汪汪！七夕快樂！", species: ["dog"] },
  { text: "蹦、七夕。", species: ["rabbit"] },
  { text: "...夜空好美。", species: ["rabbit"] },
];

const holidayHalloween: Entry[] = [
  { text: "萬聖節咻！不給糖就搗蛋！", species: ["hamster"] },
  { text: "我穿小南瓜裝！", species: ["hamster"] },
  { text: "嘿嘿、糖糖糖糖糖！", species: ["hamster"] },
  { text: "...萬聖節。", species: ["cat"] },
  { text: "黑貓的主場。", species: ["cat"] },
  { text: "...我才是萬聖節主角。", species: ["cat"] },
  { text: "汪汪！萬聖節！糖果！", species: ["dog"] },
  { text: "我穿幽靈裝！", species: ["dog"] },
  { text: "蹦、萬聖節快樂。", species: ["rabbit"] },
  { text: "...小南瓜頭好可愛。", species: ["rabbit"] },
];

const holidayNational: Entry[] = [
  { text: "雙十咻！國慶日！", species: ["hamster"] },
  { text: "我也是台灣鼠！", species: ["hamster"] },
  { text: "...國慶。", species: ["cat"] },
  { text: "...台灣貓。", species: ["cat"] },
  { text: "汪汪！國慶快樂！台灣加油！", species: ["dog"] },
  { text: "蹦、台灣兔子。", species: ["rabbit"] },
  { text: "...國旗好漂亮。", species: ["rabbit"] },
];

const holidayChristmasEve: Entry[] = [
  { text: "平安夜咻！", species: ["hamster"] },
  { text: "我幫你包禮物、用瓜子！", species: ["hamster"] },
  { text: "嘿嘿、聖誕老人要來了！", species: ["hamster"] },
  { text: "...平安夜。", species: ["cat"] },
  { text: "今晚特別安靜。", species: ["cat"] },
  { text: "汪汪汪！平安夜！聖誕快到了！", species: ["dog"] },
  { text: "汪、我要等聖誕老人！", species: ["dog"] },
  { text: "蹦、平安夜。", species: ["rabbit"] },
  { text: "...悄悄祝你平安。", species: ["rabbit"] },
];

const holidayChristmas: Entry[] = [
  { text: "聖誕快樂咻！我戴帽子！", species: ["hamster"] },
  { text: "聖誕節囤糖果！", species: ["hamster"] },
  { text: "嘿嘿、我也要禮物！", species: ["hamster"] },
  { text: "你的襪子有禮物嗎？", species: ["hamster"] },
  { text: "...聖誕。", species: ["cat"] },
  { text: "...帽子卡頭上了。", species: ["cat"] },
  { text: "聖誕大餐、給我火雞。", species: ["cat"] },
  { text: "汪汪汪！聖誕快樂！！", species: ["dog"] },
  { text: "MERRY CHRISTMAS！", species: ["dog"] },
  { text: "我超愛聖誕！！", species: ["dog"] },
  { text: "蹦、聖誕快樂。", species: ["rabbit"] },
  { text: "...送你聖誕花環。", species: ["rabbit"] },
  { text: "...白雪、聖誕、好美。", species: ["rabbit"] },
  { text: "聖誕節送{honorific}一份特別的祝福！", vip: ["luffy", "nami"] },
];

const holidayNewyearEve: Entry[] = [
  { text: "跨年咻！倒數倒數！", species: ["hamster"] },
  { text: "10、9、8...！", species: ["hamster"] },
  { text: "嘿嘿、新年願望要許！", species: ["hamster"] },
  { text: "...跨年。", species: ["cat"] },
  { text: "煙火太吵、我躲起來。", species: ["cat"] },
  { text: "汪汪！跨年倒數！！", species: ["dog"] },
  { text: "汪！煙火好漂亮！", species: ["dog"] },
  { text: "蹦、跨年。", species: ["rabbit"] },
  { text: "...再見一年。", species: ["rabbit"] },
  { text: "...悄悄許願。", species: ["rabbit"] },
];

// ===========================
// 學習里程碑
// ===========================

const milestone30: Entry[] = [
  { text: "30 lesson 咻！里程碑！", species: ["hamster"] },
  { text: "你真的好認真！囤了 30！", species: ["hamster"] },
  { text: "嘿嘿、30 顆瓜子等級！", species: ["hamster"] },
  { text: "...30 節。不錯。", species: ["cat"] },
  { text: "嗯、有在進步。", species: ["cat"] },
  { text: "...我認可你 30 節。", species: ["cat"] },
  { text: "汪汪汪！30 節！我超驕傲！", species: ["dog"] },
  { text: "WOW！30 lesson！", species: ["dog"] },
  { text: "繞 30 圈慶祝！", species: ["dog"] },
  { text: "蹦！30 節達成！", species: ["rabbit"] },
  { text: "...悄悄送你獎牌。", species: ["rabbit"] },
  { text: "...30 個小腳印、好棒。", species: ["rabbit"] },
];

const milestone60: Entry[] = [
  { text: "60 lesson 咻！半神級！", species: ["hamster"] },
  { text: "60！我頰囊塞不下這成就！", species: ["hamster"] },
  { text: "嘿嘿、60 lesson 已經很狂！", species: ["hamster"] },
  { text: "...60 節。可以了。", species: ["cat"] },
  { text: "嗯、有點實力。", species: ["cat"] },
  { text: "...我願意呼嚕一下。", species: ["cat"] },
  { text: "汪汪汪汪！60 lesson！！", species: ["dog"] },
  { text: "MVP！MVP！", species: ["dog"] },
  { text: "你超強的！！", species: ["dog"] },
  { text: "蹦蹦！60 節！", species: ["rabbit"] },
  { text: "...心臟蹦蹦跳。", species: ["rabbit"] },
  { text: "...60 個禮物、送你。", species: ["rabbit"] },
];

const milestone100: Entry[] = [
  { text: "100 lesson 咻！神話等級！", species: ["hamster"] },
  { text: "100！傳說！封神！", species: ["hamster"] },
  { text: "嘿嘿、你是 AI 島最強鼠主！", species: ["hamster"] },
  { text: "...100 節。我跪了。", species: ["cat"] },
  { text: "嗯、我服。", species: ["cat"] },
  { text: "...貓族第一次低頭。", species: ["cat"] },
  { text: "汪汪汪汪汪！100！100！", species: ["dog"] },
  { text: "傳奇！！！", species: ["dog"] },
  { text: "我要繞 1000 圈！！", species: ["dog"] },
  { text: "蹦蹦蹦！100 節！封神了！", species: ["rabbit"] },
  { text: "...淚目。", species: ["rabbit"] },
  { text: "...100 個你、最美。", species: ["rabbit"] },
  { text: "{honorific}、100 節達成、我永遠跟隨您！", vip: ["luffy", "nami"] },
];

// ===========================
// 連勝 boost (streak ≥ 7 / 30 / 100)
// ===========================

const streakBoost7: Entry[] = [
  { text: "連勝 7 天咻！囤運氣！", species: ["hamster"] },
  { text: "一週連勝！我的瓜子加油！", species: ["hamster"] },
  { text: "嘿嘿、一週了還在！", species: ["hamster"] },
  { text: "...連勝 7 天。可以。", species: ["cat"] },
  { text: "嗯、有毅力。", species: ["cat"] },
  { text: "汪汪！連勝 7 天！陪你！", species: ["dog"] },
  { text: "汪、繼續衝！", species: ["dog"] },
  { text: "蹦、連勝 7 天。", species: ["rabbit"] },
  { text: "...一週的努力、看見了。", species: ["rabbit"] },
];

const streakBoost30: Entry[] = [
  { text: "連勝 30 天咻！傳奇！", species: ["hamster"] },
  { text: "30 天囤！我頰囊都鼓了！", species: ["hamster"] },
  { text: "嘿嘿、一個月不斷氣！", species: ["hamster"] },
  { text: "...30 天連勝。狠角色。", species: ["cat"] },
  { text: "嗯、我認可。", species: ["cat"] },
  { text: "汪汪汪！30 天！神！", species: ["dog"] },
  { text: "繞 30 圈致敬！", species: ["dog"] },
  { text: "蹦、30 天連勝、好強。", species: ["rabbit"] },
  { text: "...月亮都見證了你。", species: ["rabbit"] },
];

const streakBoost100: Entry[] = [
  { text: "連勝 100 天咻！封神！", species: ["hamster"] },
  { text: "100 天囤！神蹟！", species: ["hamster"] },
  { text: "嘿嘿、你是傳說！", species: ["hamster"] },
  { text: "...100 天連勝。臣服。", species: ["cat"] },
  { text: "嗯、我跪了。", species: ["cat"] },
  { text: "汪汪汪汪！100 天！神話！", species: ["dog"] },
  { text: "我為您而生！！", species: ["dog"] },
  { text: "蹦蹦蹦！100 天！封神！", species: ["rabbit"] },
  { text: "...百日的堅持、無人能比。", species: ["rabbit"] },
  { text: "{honorific}、連勝 100 天、永生為您搖尾！", vip: ["luffy", "nami"] },
];

// ===========================
// 天氣感（season-based）
// ===========================

const weatherCold: Entry[] = [
  { text: "好冷咻、抱緊我！", species: ["hamster"] },
  { text: "冷到頰囊縮起來！", species: ["hamster"] },
  { text: "...冷。", species: ["cat"] },
  { text: "...暖氣旁見。", species: ["cat"] },
  { text: "汪嗚！冷死了！", species: ["dog"] },
  { text: "汪、抱抱取暖！", species: ["dog"] },
  { text: "蹦、好冷。", species: ["rabbit"] },
  { text: "...蓬蓬兔毛派上用場。", species: ["rabbit"] },
];

const weatherHot: Entry[] = [
  { text: "好熱咻、吐舌頭！", species: ["hamster"] },
  { text: "頰囊融化咻！", species: ["hamster"] },
  { text: "...熱攤平。", species: ["cat"] },
  { text: "...貓地板。", species: ["cat"] },
  { text: "汪！熱熱熱！", species: ["dog"] },
  { text: "汪汪、要冰塊！", species: ["dog"] },
  { text: "蹦、躲陰影。", species: ["rabbit"] },
  { text: "...耳朵散熱中。", species: ["rabbit"] },
];

const weatherRainy: Entry[] = [
  { text: "下雨咻、待在家！", species: ["hamster"] },
  { text: "嘿嘿、雨天適合學習！", species: ["hamster"] },
  { text: "...雨聲。", species: ["cat"] },
  { text: "雨天打盹最讚。", species: ["cat"] },
  { text: "汪！外面下雨！", species: ["dog"] },
  { text: "我不想出門、陪你！", species: ["dog"] },
  { text: "蹦、雨聲療癒。", species: ["rabbit"] },
  { text: "...靜靜聽雨。", species: ["rabbit"] },
];

const weatherCozy: Entry[] = [
  { text: "好舒服的天氣咻！", species: ["hamster"] },
  { text: "嘿嘿、適合囤瓜子！", species: ["hamster"] },
  { text: "...剛好。", species: ["cat"] },
  { text: "...這溫度可以呼嚕。", species: ["cat"] },
  { text: "汪汪、超讚天氣！", species: ["dog"] },
  { text: "汪、想出去散步！", species: ["dog"] },
  { text: "蹦、好天氣。", species: ["rabbit"] },
  { text: "...悄悄享受。", species: ["rabbit"] },
];

// ===========================
// 對外組合查表
// ===========================

const BANK: Record<ChatterKind, Entry[]> = {
  "lesson-complete": lessonComplete,
  "xp-small": xpSmall,
  "xp-medium": xpMedium,
  "xp-big": xpBig,
  "level-up": levelUp,
  "quiz-perfect": quizPerfect,
  "quiz-fail": quizFail,
  "quiz-pass": quizPass,
  "streak-broken": streakBroken,
  "bookmark-added": bookmarkAdded,
  "note-saved": noteSaved,
  "todo-completed": todoCompleted,
  "page-chapter": pageChapter,
  "page-lesson": pageLesson,
  "page-forum": pageForum,
  "page-blog": pageBlog,
  "page-me": pageMe,
  "page-settings": pageSettings,
  "page-pet": pagePet,
  "page-quiz": pageQuiz,
  "page-home": pageHome,
  "tab-return": tabReturn,
  morning,
  noon,
  afternoon,
  evening,
  night,
  "late-night": lateNight,
  ambient,
  "ambient-curious": ambientCurious,
  "ambient-philosophical": ambientPhilosophical,
  "ambient-complain": ambientComplain,
  "ambient-self-talk": ambientSelfTalk,
  "idle-medium": idleMedium,
  "idle-long": idleLong,
  "first-greet": firstGreet,
  "session-greet": sessionGreet,
  "vip-late-night": [...vipLuffyLateNight, ...vipNamiLateNight],
  "vip-greet": [...vipLuffyGreet, ...vipNamiGreet],
  "secret-luffy": secretLuffy,
  "secret-nami": secretNami,
  "season-spring": seasonSpring,
  "season-summer": seasonSummer,
  "season-autumn": seasonAutumn,
  "season-winter": seasonWinter,
  "holiday-newyear": holidayNewyear,
  "holiday-valentine": holidayValentine,
  "holiday-white-day": holidayWhiteDay,
  "holiday-children": holidayChildren,
  "holiday-labor": holidayLabor,
  "holiday-qixi": holidayQixi,
  "holiday-halloween": holidayHalloween,
  "holiday-national": holidayNational,
  "holiday-christmas-eve": holidayChristmasEve,
  "holiday-christmas": holidayChristmas,
  "holiday-newyear-eve": holidayNewyearEve,
  "milestone-30": milestone30,
  "milestone-60": milestone60,
  "milestone-100": milestone100,
  "streak-boost-7": streakBoost7,
  "streak-boost-30": streakBoost30,
  "streak-boost-100": streakBoost100,
  "weather-cold": weatherCold,
  "weather-hot": weatherHot,
  "weather-rainy": weatherRainy,
  "weather-cozy": weatherCozy,
};

// 將 VIP ambient / morning 合進對應 kind（額外加值）
BANK["ambient"] = [
  ...BANK["ambient"],
  ...vipLuffyAmbient,
  ...vipNamiAmbient,
];
BANK["morning"] = [
  ...BANK["morning"],
  ...vipLuffyMorning,
  ...vipNamiMorning,
];

// 條件式彩虹屁：lesson-complete / quiz-perfect 給 VIP 額外抽
BANK["lesson-complete"] = [
  ...BANK["lesson-complete"],
  ...vipLuffyPraise.map((e) => ({ ...e, weight: 0.5 })),
  ...vipNamiPraise.map((e) => ({ ...e, weight: 0.5 })),
];
BANK["quiz-perfect"] = [
  ...BANK["quiz-perfect"],
  ...vipLuffyPraise.map((e) => ({ ...e, weight: 1 })),
  ...vipNamiPraise.map((e) => ({ ...e, weight: 1 })),
];

// ===========================
// 公開 API
// ===========================

export type ChatterCtx = {
  species: SpeciesId;
  vip: VipTier;
  hour: number;
  recent: Set<string>;
  honorific: string;
  level?: number;
  xp?: number;
  streak?: number;
  petName: string;
};

/**
 * 從 BANK[kind] 抽一條台詞：
 *   1. 物種匹配（無設定 = 全物種）
 *   2. VIP tier 匹配（無設定 = 全 tier）
 *   3. 排除 recent
 *   4. 加權隨機
 *   5. 替換 placeholder
 */
export function pickChatter(
  kind: ChatterKind,
  ctx: ChatterCtx,
  extra?: Record<string, string | number>,
): string | null {
  const pool = BANK[kind];
  if (!pool || pool.length === 0) return null;

  const candidates = pool.filter((e) => {
    if (e.species && !e.species.includes(ctx.species)) return false;
    if (e.vip && !e.vip.includes(ctx.vip)) return false;
    if (ctx.recent.has(e.text)) return false;
    return true;
  });
  if (candidates.length === 0) {
    // 全 recent、放寬清空
    ctx.recent.clear();
    return pickChatter(kind, ctx, extra);
  }

  const totalWeight = candidates.reduce((s, e) => s + (e.weight ?? 1), 0);
  let r = Math.random() * totalWeight;
  let chosen: Entry | null = null;
  for (const e of candidates) {
    r -= e.weight ?? 1;
    if (r <= 0) {
      chosen = e;
      break;
    }
  }
  if (!chosen) chosen = candidates[candidates.length - 1];

  ctx.recent.add(chosen.text);
  if (ctx.recent.size > 30) {
    const first = ctx.recent.values().next().value;
    if (first) ctx.recent.delete(first);
  }

  return interpolate(chosen.text, ctx, extra);
}

function interpolate(
  text: string,
  ctx: ChatterCtx,
  extra?: Record<string, string | number>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    if (extra && key in extra) return String(extra[key]);
    switch (key) {
      case "name":
      case "honorific":
        return ctx.honorific;
      case "level":
        return String(ctx.level ?? 1);
      case "xp":
        return String(ctx.xp ?? 0);
      case "streak":
        return String(ctx.streak ?? 0);
      case "petname":
        return ctx.petName;
      default:
        return `{${key}}`;
    }
  });
}

/** 從 pathname 推 page-* kind */
export function pathToPageKind(pathname: string): ChatterKind | null {
  if (pathname === "/" || pathname.startsWith("/?")) return "page-home";
  if (/^\/chapters\/\d+\/lessons/.test(pathname)) return "page-lesson";
  if (/^\/chapters\/\d+/.test(pathname)) return "page-chapter";
  if (pathname.startsWith("/forum")) return "page-forum";
  if (pathname.startsWith("/blogs") || pathname.startsWith("/blog")) return "page-blog";
  if (pathname === "/me" || pathname.startsWith("/me/")) {
    if (pathname.includes("/pet")) return "page-pet";
    return "page-me";
  }
  if (pathname.startsWith("/settings")) return "page-settings";
  if (pathname.includes("/quiz")) return "page-quiz";
  return null;
}

/** 從現在時間推時段 kind */
export function timeKind(date: Date = new Date()): ChatterKind {
  const h = date.getHours();
  if (h >= 0 && h < 5) return "late-night";
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "noon";
  if (h >= 14 && h < 18) return "afternoon";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}
