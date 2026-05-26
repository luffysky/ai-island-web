#!/usr/bin/env node
// 列出 DB 內所有含 aiisland.tw 的 row（不修改、只 list）
// 範圍：marketing_drafts / utm_links / ad_creatives / affiliate_codes / brand_voice

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const TARGETS = [
  // 行銷類
  { table: 'marketing_drafts', textCols: [], jsonbCols: [] },
  { table: 'utm_links',         textCols: [], jsonbCols: [] },
  { table: 'ad_creatives',      textCols: [], jsonbCols: [] },
  { table: 'affiliate_codes',   textCols: [], jsonbCols: [] },
  { table: 'brand_voice',       textCols: [], jsonbCols: [] },
  // AI 類（最可能藏歷史 aiisland.tw）
  { table: 'ai_response_cache', textCols: [], jsonbCols: [] },
  { table: 'ai_messages',       textCols: [], jsonbCols: [] },
  { table: 'ai_conversations',  textCols: [], jsonbCols: [] },
  // 客服 / 模板
  { table: 'canned_replies',    textCols: [], jsonbCols: [] },
  // Blog / 公告
  { table: 'blog_posts',        textCols: [], jsonbCols: [] },
  { table: 'broadcasts',        textCols: [], jsonbCols: [] },
  { table: 'changelog_entries', textCols: [], jsonbCols: [] },
];

let grandTotal = 0;
const summary = [];

for (const t of TARGETS) {
  const { data, error } = await sb.from(t.table).select('*');
  if (error) {
    console.log(`[skip] ${t.table}: ${error.message}`);
    continue;
  }
  if (!data?.length) {
    console.log(`[empty] ${t.table}: 0 rows`);
    continue;
  }
  let tableHits = 0;
  const hits = [];
  for (const row of data) {
    const serialized = JSON.stringify(row);
    if (serialized.includes('aiisland.tw')) {
      tableHits++;
      const occurrences = (serialized.match(/aiisland\.tw/g) || []).length;
      hits.push({ id: row.id, occurrences, sample: serialized.slice(0, 120) });
    }
  }
  console.log(`\n=== ${t.table}: ${data.length} rows total, ${tableHits} hit aiisland.tw ===`);
  hits.slice(0, 10).forEach((h, i) => {
    console.log(`  ${i + 1}. id=${h.id}  (${h.occurrences} occurrences)`);
    console.log(`     ${h.sample}...`);
  });
  if (hits.length > 10) console.log(`  ... + ${hits.length - 10} more`);
  grandTotal += tableHits;
  summary.push({ table: t.table, rows: data.length, hits: tableHits });
}

console.log('\n\n=== SUMMARY ===');
summary.forEach(s => console.log(`  ${s.table.padEnd(22)} ${s.hits}/${s.rows} rows have aiisland.tw`));
console.log(`\n  TOTAL: ${grandTotal} rows contain aiisland.tw across DB tables`);
