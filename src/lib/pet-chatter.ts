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
  | "secret-luffy" | "secret-nami";

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
  // cat
  { text: "...不錯。", species: ["cat"] },
  { text: "嗯、可以。", species: ["cat"] },
  { text: "哼、還行。", species: ["cat"] },
  { text: "...有進步喔。", species: ["cat"] },
  { text: "啊、看完了？", species: ["cat"] },
  { text: "...摸頭。", species: ["cat"] },
  { text: "OK、繼續。", species: ["cat"] },
  { text: "勉強及格。", species: ["cat"] },
  // dog
  { text: "汪！太棒了！", species: ["dog"] },
  { text: "GOOD！", species: ["dog"] },
  { text: "你最強！！", species: ["dog"] },
  { text: "汪汪汪！過關！", species: ["dog"] },
  { text: "WOOF WOOF！", species: ["dog"] },
  { text: "我以你為榮！", species: ["dog"] },
  { text: "再來再來！", species: ["dog"] },
  { text: "下一關！衝啊！", species: ["dog"] },
  // rabbit
  { text: "蹦！好棒！", species: ["rabbit"] },
  { text: "啃啃、做得好。", species: ["rabbit"] },
  { text: "...有努力喔。", species: ["rabbit"] },
  { text: "蹦蹦蹦、繼續！", species: ["rabbit"] },
  { text: "小小棒一下。", species: ["rabbit"] },
  { text: "...偷偷給你拍手。", species: ["rabbit"] },
  { text: "...悄悄為你開心。", species: ["rabbit"] },
  { text: "嗯嗯、加油！", species: ["rabbit"] },
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
