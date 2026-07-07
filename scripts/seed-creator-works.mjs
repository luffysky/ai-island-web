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
