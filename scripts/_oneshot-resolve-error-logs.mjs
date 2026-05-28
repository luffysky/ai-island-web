/**
 * 把 36 條 error log 標為 resolved。
 * 分類：
 *   - LINE flex "width" field (3 條 5/26-5/27)：code 已移除 width field、bug 已解
 *   - Telegram UTF-8 400 (10 條 5/27)：code 已加 stripLoneSurrogates、bug 已解
 *   - Telegram fetch failed / ETIMEDOUT (~22 條)：Zeabur 出口問題、長期已知、靠 3 平台同送繞道
 *   - Anthropic 401 (1 條)：production DB 上 key 跟 AI_KEY_SECRET 對不上、林董要在 production /admin/ai-keys 重貼
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);

// 林董提供的 36 條 ID
const IDS = [
  "12f70479-414e-4944-9318-1a4270d47201",  // anthropic 401
  "5b175f93-d59f-4770-b21d-0acdf20dc7da",
  "252d5664-ea55-4165-926b-1759aedf19d5",
  "31fa0917-c8fb-4a23-8918-e7227b9893a6",
  "1e39a904-6487-4585-88b8-276ce309eca3",
  "85af760a-d19a-49f9-96ba-7933194d25bd",
  "00ed5bfa-44df-4e34-b12a-1106267fcfd0",
  "dc988beb-fb48-4c7b-8555-e574323b77c2",
  "72506e8e-a301-44e3-9463-55c699cb0480",
  "13f6cf57-4b5c-4e02-b2f7-22493b05c612",
  "fb5ab25b-e3ac-4353-9171-d5e8aa969205",
  "a1d74115-201f-407f-a849-281c1bb273e6",
  "b6c47b76-0470-4ec5-b931-e66a2f838205",
  "8289671d-0204-48be-b907-5f3d002c7353",
  "3693703f-e2cc-49b1-a9db-fd3910143082",
  "b09aed3e-4869-4159-812a-907973dcece7",
  "9743b3a2-11f7-4e61-993e-d65d1ebde2f4",
  "dc7eae33-c9a8-4404-96f3-005dd45b9eb5",  // UTF-8 400
  "bdd7546c-bf5d-4fbe-b13f-02eacd7ea152",
  "69ed839d-d8bb-48d5-b137-841a103ae2f7",
  "73ce0b0a-cb3a-472a-a301-7672f2f00691",
  "d6ea341a-3d72-4b7f-bb32-5faf00af2cc5",
  "281c7ba9-11f1-470c-96c2-6c03195ef124",
  "b106c998-732b-46d3-ae27-dbb2945d2875",
  "78d1770a-5921-4932-894f-de3554f19566",
  "888076f8-4507-469c-8d8c-11fc09929ca8",
  "8a85f1e2-5952-431f-85d4-f3746dafcc79",
  "8ad78df4-78d3-412a-8c01-ccb44902c631",
  "f2321740-0662-44cd-a848-bc3975aed68d",
  "e9b52c0f-b5d0-4604-973c-5aa36cbeff5b",
  "453104a8-340e-425a-bfae-d11d2fe37ba8",
  "575e602e-6f9a-4448-a1bf-a9ff0d633ed8",
  "84513898-d50c-4995-8522-190f22246ca4",  // LINE flex width
  "8e54038e-b743-4566-82a1-5abc5d13f369",
  "3b9f9a7b-75bf-446b-badd-901f8f53c0e4",
  "99833a8f-e0b3-4cdc-a35a-4e9587446305",
];

const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const r = await c.query(
  `UPDATE error_logs
      SET resolved = true,
          resolved_at = NOW(),
          resolved_note = 'Bulk resolved 2026-05-29：' ||
            CASE
              WHEN source = 'line-ai-tools/anthropic' THEN 'AI_KEY_SECRET 跟 production DB 不一致、待林董到 production /admin/ai-keys 重貼 key'
              WHEN source = 'notify-admin/telegram' AND message ILIKE '%fetch failed%' THEN 'Zeabur → telegram.org ETIMEDOUT、已知 infra 問題、靠 3 平台同送繞道'
              WHEN source = 'notify-admin/telegram' AND message ILIKE '%UTF-8%' THEN 'code 已加 stripLoneSurrogates 處理 emoji 殘片、新版本不會再發生'
              WHEN source = 'line-webhook' AND message ILIKE '%width%' THEN 'Flex schema width 已從 header.contents 移除'
              ELSE 'Bulk close stale errors'
            END
    WHERE id::text = ANY($1::text[])
    RETURNING id, source, LEFT(message, 60) AS message`,
  [IDS]
);

console.log(`✓ 標記 ${r.rowCount} 條 resolved\n`);
const byCategory = {};
for (const row of r.rows) {
  const key = row.source;
  byCategory[key] = (byCategory[key] || 0) + 1;
}
console.log("分類統計：");
for (const [k, v] of Object.entries(byCategory)) {
  console.log(`  ${k}: ${v} 條`);
}
await c.end();
