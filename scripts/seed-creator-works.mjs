/**
 * 創作者島嶼「作品」種子：正經的種子創作者 → 給工作空間放碎片 → 從碎片編織出「已公開展示」的作品。
 * 讓 /works 作品牆與 /creator-island/showcase 一開始就有真作品（不是社群貼文）。
 * - 種子創作者用正經創作者名（非導師人設 綠寶/哥布林…）。
 * - 每則作品都手寫、標 meta.seed 方便冪等重跑；並記 ci_work_fragments（編織來源）。
 * 冪等：先刪這批（作品 + 這批碎片）再重鋪。Usage: node scripts/seed-creator-works.mjs
 */
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const SEED_TAG = "creator-works-seed";
const now = () => new Date().toISOString();

// 正經的種子創作者（真人創作者的樣子：本名 + 個人風格 bio）
const CREATORS = [
  {
    username: "suwan", display_name: "蘇晚", bio: "寫日常與微光。相信最小的細節裡藏著最大的溫柔。",
    works: [
      {
        work_type: "essay", title: "清晨那口咖啡的蒸氣",
        fragments: [
          "清晨第一口咖啡的蒸氣，像把昨天的疲憊都蒸散了",
          "窗外的光還沒完全醒，城市在打呵欠",
          "我把馬克杯捧在手心，等它把冷指尖焐熱",
        ],
        body: "清晨第一口咖啡的蒸氣，像把昨天的疲憊都蒸散了。\n\n窗外的光還沒完全醒，城市也在打呵欠。我把馬克杯捧在手心，等它把冷指尖一點一點焐熱——那幾秒鐘，是一天裡我唯一不趕時間的時候。\n\n後來我才懂，所謂儀式感不是要多講究，而是願意為一件小事，慢下來一次。",
      },
      {
        work_type: "poem", title: "把日子過成句子",
        fragments: ["我墊著腳尖走在妳的世界", "路燈把影子拉得好長好長", "有些話，適合寫給明天的自己"],
        body: "我墊著腳尖\n走在妳的世界\n\n路燈把影子拉得好長\n長到蓋住了猶豫\n\n有些話\n適合寫給明天的自己\n今晚先收著",
      },
      {
        work_type: "essay", title: "洗碗的時候，最適合想事情",
        fragments: [
          "水聲會蓋掉腦子裡那些吵吵鬧鬧的聲音",
          "手在忙，心反而空出來了",
          "有些答案，是在不特別想它的時候浮上來的",
        ],
        body: "我發現我很多想不通的事，都是在洗碗的時候想通的。\n\n水聲會蓋掉腦子裡那些吵吵鬧鬧的聲音，手在忙、心反而空出來了。你沒有在「努力思考」，可是那些答案，偏偏就在你不特別想它的時候，自己浮上來。\n\n所以現在我不搶著用洗碗機。那十分鐘，是我留給自己的。",
      },
      {
        work_type: "poem", title: "共傘",
        fragments: ["一把傘的寬度，剛好是一個人願意靠近的距離", "你往我這邊偏，肩膀就濕了一半", "雨沒有停，可是我不太希望它停"],
        body: "一把傘的寬度\n剛好是一個人\n願意靠近的距離\n\n你往我這邊偏\n肩膀就濕了一半\n卻裝作沒事\n\n雨沒有停\n可是這條路上\n我不太希望它停",
      },
    ],
  },
  {
    username: "zhiyuan", display_name: "林之遠", bio: "工程師/技術寫作。把難的東西講成人話，是我覺得最浪漫的事。",
    works: [
      {
        work_type: "article", title: "為什麼我從此只寫小函式",
        fragments: [
          "一個函式只做一件事，出錯時你一眼知道是誰",
          "命名是最便宜的註解",
          "能刪的程式碼，是最好的程式碼",
        ],
        body: "以前我很愛寫一個「什麼都做」的大函式，覺得很省事。直到某次半夜被叫起來修 bug，我對著兩百行的函式完全不知道從哪看起。\n\n那天之後我改了習慣：一個函式只做一件事。出錯時你幾乎一眼就知道是誰的問題，因為它的名字就寫著它負責什麼。命名是最便宜的註解，取好名字，未來的你會少加很多班。\n\n還有——能刪的程式碼，是最好的程式碼。少寫一行，就少一個會壞的地方。",
      },
      {
        work_type: "idea", title: "一個給新手的除錯口訣",
        fragments: ["先讓 bug 穩定重現", "二分法夾兇手", "一次只改一處"],
        body: "整理給剛入門的朋友，三句話：\n\n1. 先讓 bug「穩定重現」——抓不到重現步驟，就別急著改 code，不然只是亂槍打鳥。\n2. 二分法夾兇手——在中間印一行「到這裡了」，有印＝前半沒事，往後找。\n3. 一次只改一處，改完就測——不然壞了也不知道是哪一刀。\n\n除錯不是天分，是方法。",
      },
      {
        work_type: "article", title: "程式碼是寫給人看的，順便給機器跑",
        fragments: [
          "電腦不在乎你變數叫 a 還是叫 userAge，但半年後的你在乎",
          "看不懂的聰明寫法，不如看得懂的笨方法",
          "程式碼被讀的次數，遠多於被寫的次數",
        ],
        body: "剛學程式的時候，我很迷戀那種「一行解決」的炫技寫法，覺得很帥。後來接手別人的專案，才被自己的帥打醒。\n\n電腦根本不在乎你變數叫 a 還是叫 userAge，可是半年後回來改的你、還有你的同事，非常在乎。一段看不懂的聰明寫法，價值遠低於一段看得懂的笨方法——因為程式碼被「讀」的次數，遠多於被「寫」的次數。\n\n所以現在我寫 code 的第一個讀者，設定成「三個月後、忘光光的自己」。他看得懂，這段就算過關。",
      },
      {
        work_type: "idea", title: "我用一張紙，管我一整天",
        fragments: ["工具越多，我花在整理工具的時間越多", "一張紙的好處是：它不會跳通知給你", "劃掉一行的爽感，App 給不了"],
        body: "試過大概十款待辦 App 之後，我又回去用紙筆了。\n\n不是懷舊。是我發現工具越多，我花在「整理工具、搬移卡片、選標籤顏色」的時間，比真正做事還多。一張紙的好處是——它不會跳通知給你、不會誘惑你去滑別的。\n\n我的方法很土：早上寫下今天最重要的三件事，做完就用筆狠狠劃掉。那個劃掉一行的爽感，老實說，哪個 App 都給不了我。",
      },
    ],
  },
  {
    username: "hemo.ink", display_name: "何默", bio: "詩與短句。文字是我對世界小小的抵抗。",
    works: [
      {
        work_type: "poem", title: "雜訊裡的夏天",
        fragments: [
          "小時候那台永遠調不準的收音機，雜訊裡藏著整個夏天",
          "電風扇搖頭，把午後搖得很慢",
          "蟬聲是那年最長的一首歌",
        ],
        body: "小時候那台\n永遠調不準的收音機\n雜訊裡\n藏著整個夏天\n\n電風扇搖頭\n把午後搖得很慢\n蟬聲\n是那年最長的一首歌",
      },
      {
        work_type: "story", title: "最後一班公車",
        fragments: ["末班車的燈，是城市留給晚歸者的一盞", "司機說：坐穩了喔", "有人上車，就有人終於能回家"],
        body: "末班車的燈，是城市留給晚歸者的一盞。\n\n我趕在最後一秒跳上車，司機從後照鏡看我一眼，說：「坐穩了喔。」車子晃了一下，往我家的方向開去。\n\n那一刻我忽然覺得，這座這麼大的城市，其實一直有人在替你把最後一盞燈留著。有人上車，就有人終於能回家。",
      },
      {
        work_type: "poem", title: "舊鑰匙",
        fragments: [
          "那把不再開任何門的鑰匙，我還是留著",
          "它記得的鎖，早就換過了",
          "有些東西留下來，不是為了用，是為了記得",
        ],
        body: "那把\n不再開任何門的鑰匙\n我還是留著\n\n它記得的那道鎖\n早就換過了\n連那扇門\n都拆了\n\n有些東西留下來\n不是為了用\n是為了記得\n自己曾經\n有地方可回",
      },
      {
        work_type: "story", title: "巷口那盞燈，其實是有人在等",
        fragments: ["我一直以為那盞燈是壞了才整晚亮著", "後來才知道，是阿婆等她兒子回家", "有些光看起來理所當然，其實是有人在守"],
        body: "我家巷口有盞燈，整晚都亮著。我一直以為是壞了、沒人修。\n\n直到有天很晚回家，看見開雜貨店的阿婆坐在燈下打盹，桌上留了一碗還冒著煙的湯。鄰居說，她兒子在外地工作，偶爾深夜才回來——那盞燈，是她替他留的。\n\n原來有些光，看起來理所當然，其實背後都是有人在守。那之後我經過那盞燈，腳步都會放輕一點。",
      },
    ],
  },
  {
    username: "riverseen", display_name: "江見", bio: "產品與點子筆記。把生活裡的小麻煩，變成值得做的小東西。",
    works: [
      {
        work_type: "idea", title: "把『等一下再說』變成一顆按鈕",
        fragments: ["最好的提醒，是在你會忘記的那個當下出現", "少一個步驟，就多一個人會用", "先做最小可用，再談漂亮"],
        body: "我常常想到事情卻在三秒後忘記。市面上的待辦 App 都要開啟、輸入、分類——步驟太多，我根本懶得記。\n\n所以我想做一顆按鈕：在我「正要忘記」的當下，一鍵就把這件事丟進明天早上。最好的提醒，是在你會忘記的那個當下出現，而不是事後你想起來要去設。\n\n先做最小可用版：一顆按鈕、一個時間、一則通知。漂亮之後再說。少一個步驟，就多一個人會用。",
      },
      {
        work_type: "essay", title: "我不做功能，我做習慣",
        fragments: [
          "使用者不會為了你的功能改變生活，只會把你塞進他原本的習慣裡",
          "與其教他一套新流程，不如黏在他已經在做的事上",
          "留存不是靠提醒，是靠『不用你提醒也會想打開』",
        ],
        body: "做了幾個小產品後，我最大的體悟是：使用者不會為了你的功能，去改變他的生活。他只會判斷——你能不能塞進他「原本就在做的事」裡。\n\n所以我現在想東西，不先想「要做什麼功能」，而是先問「他每天已經在做什麼、我能不能黏上去」。與其教他一套全新流程，不如站在他既有的習慣旁邊，順手幫一把。\n\n真正的留存，不是靠一直推通知去把人拉回來，而是做到「不用你提醒，他也會自己想打開」。做到那一步，才算做出了習慣，而不只是功能。",
      },
      {
        work_type: "idea", title: "把發票變成一本自動記帳本",
        fragments: ["最好的記帳，是你根本不用記", "資料其實早就存在了，只是躺在你不會去看的地方", "先解決 80% 的懶，剩下 20% 再讓他手動"],
        body: "我一直記帳失敗，原因很簡單：要「手動輸入」這關，我就懶得過。\n\n後來我想，其實每一筆消費，發票上早就有了——金額、店家、時間，資料明明存在，只是躺在雲端發票那個你永遠不會點開的地方。那為什麼還要我再打一次？\n\n點子就是：自動把載具發票撈進來、粗略分類，我只要偶爾修一下就好。最好的記帳，是你根本不用記。先用自動化解決掉 80% 的懶，剩下那 20% 真的需要人判斷的，再讓他手動——這樣的工具，人才留得下來。",
      },
    ],
  },
];

// 確保種子創作者存在（沒有就建 auth user + profile）
async function ensureCreator(cr) {
  const { data: prof } = await admin.from("profiles").select("id").eq("username", cr.username).maybeSingle();
  if (prof) {
    await admin.from("profiles").update({ display_name: cr.display_name, bio: cr.bio }).eq("id", prof.id);
    return prof.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: `${cr.username.replace(/[^a-z0-9]/g, "")}@npc.snowrealm.pet`,
    password: crypto.randomUUID() + "Aa1!", email_confirm: true,
    user_metadata: { username: cr.username, full_name: cr.display_name },
  });
  if (error) throw new Error(`建 ${cr.username} 失敗：${error.message}`);
  await admin.from("profiles").update({ username: cr.username, display_name: cr.display_name, bio: cr.bio }).eq("id", data.user.id);
  return data.user.id;
}

// 確保創作者有個人工作空間（沒有就建 + 預設子表）
async function ensureWorkspace(userId, who) {
  const { data: ex } = await admin.from("ci_workspaces").select("id").eq("owner_id", userId).eq("type", "personal").maybeSingle();
  if (ex) return ex.id;
  const { data: ws, error } = await admin.from("ci_workspaces")
    .insert({ name: `${who} 的工作空間`, type: "personal", owner_id: userId, created_by: userId }).select("id").single();
  if (error) throw new Error(`建 workspace 失敗：${error.message}`);
  await admin.from("ci_workspace_members").insert({ workspace_id: ws.id, user_id: userId, role: "owner" }).then(() => {}, () => {});
  await admin.from("ci_workspace_wallet").insert({ workspace_id: ws.id, balance: 0 }).then(() => {}, () => {});
  await admin.from("ci_workspace_ai_settings").insert({ workspace_id: ws.id }).then(() => {}, () => {});
  return ws.id;
}

let creators = 0, works = 0, frags = 0;
for (const cr of CREATORS) {
  const uid = await ensureCreator(cr);
  const wsId = await ensureWorkspace(uid, cr.display_name);
  creators++;

  // 冪等：先刪這批（作品 meta.seed 標記 + 這批碎片用 tag「作品種子」標記）
  await admin.from("ci_works").delete().eq("created_by", uid).contains("meta", { seed: SEED_TAG });
  await admin.from("ci_fragments").delete().eq("workspace_id", wsId).contains("tags", ["作品種子"]);

  for (const w of cr.works) {
    // 1) 碎片（編織的來源）— source_type 用合法值、tag 標記方便冪等刪
    const { data: fr, error: fErr } = await admin.from("ci_fragments").insert(
      (w.fragments ?? []).map((t) => ({ workspace_id: wsId, created_by: uid, title: t, category: "靈感", tags: ["種子", "作品種子"], source_type: "human_original" })),
    ).select("id");
    if (fErr) console.warn(`  ⚠ 碎片插入失敗（${w.title}）：${fErr.message}`);
    const fragIds = (fr ?? []).map((r) => r.id);
    frags += fragIds.length;

    // 2) 作品（已公開展示）— status 用預設值（showcase 只看 is_showcased）
    const { data: work, error: wErr } = await admin.from("ci_works").insert({
      workspace_id: wsId, created_by: uid, work_type: w.work_type,
      title: w.title, body: w.body, source_type: "human_original",
      is_showcased: true, showcased_at: now(), meta: { seed: SEED_TAG },
    }).select("id").single();
    if (wErr) { console.warn(`  ⚠ 作品插入失敗（${w.title}）：${wErr.message}`); continue; }

    // 3) 編織關係
    if (fragIds.length) {
      await admin.from("ci_work_fragments").insert(fragIds.map((fid, i) => ({ work_id: work.id, fragment_id: fid, position: i }))).then(() => {}, () => {});
    }
    works++;
  }
  console.log(`  ✓ ${cr.display_name}（@${cr.username}）→ ${cr.works.length} 件作品`);
}

const { count } = await admin.from("ci_works").select("*", { count: "exact", head: true }).eq("is_showcased", true);
console.log(`✓ 創作者作品種子完成：${creators} 位創作者 / ${works} 件公開作品 / ${frags} 個碎片`);
console.log(`  現況 → 公開展示作品共 ${count ?? "?"} 件（/works 作品牆）`);
