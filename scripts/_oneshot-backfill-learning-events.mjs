/**
 * Backfill learning_events 表：把既有的 lesson_progress + quiz_attempts
 * 對應 event row 補進去。idempotent（WHERE NOT EXISTS、可重複跑）。
 *
 * 之前 gamification.completeLesson / submitQuiz 完全沒寫 learning_events、
 * 所以 admin/analytics/learning-events 頁永遠空、/me/footprint 也只能拿到 0 row。
 *
 * 2026-05-29 修法：
 *   1. gamification.ts 兩個方法補 learning_events insert（之後新行為自動寫）
 *   2. 跑這支 backfill 補既有歷史 row（一次性）
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const before = await c.query(`SELECT COUNT(*) AS n FROM learning_events`);
console.log(`learning_events before: ${before.rows[0].n} 筆`);

// 1. lesson_progress → lesson_complete event
const r1 = await c.query(`
  INSERT INTO learning_events (user_id, event_type, chapter_id, lesson_id, metadata, created_at)
  SELECT lp.user_id, 'lesson_complete', lp.chapter_id, lp.lesson_id,
         jsonb_build_object('xp_awarded', lp.xp_awarded, 'backfilled', true),
         COALESCE(lp.completed_at, NOW())
    FROM lesson_progress lp
   WHERE (lp.completed = true OR lp.completed_at IS NOT NULL)
     AND NOT EXISTS (
       SELECT 1 FROM learning_events le
        WHERE le.user_id = lp.user_id
          AND le.event_type = 'lesson_complete'
          AND le.chapter_id = lp.chapter_id
          AND le.lesson_id = lp.lesson_id
     )
  RETURNING id
`);
console.log(`+ lesson_complete: ${r1.rowCount} 筆`);

// 2. quiz_attempts → quiz_complete / quiz_perfect event
const r2 = await c.query(`
  INSERT INTO learning_events (user_id, event_type, chapter_id, lesson_id, metadata, created_at)
  SELECT qa.user_id,
         CASE WHEN qa.correct = qa.total_questions THEN 'quiz_perfect' ELSE 'quiz_complete' END,
         qa.chapter_id,
         qa.quiz_id,
         jsonb_build_object(
           'score', qa.score,
           'correct', qa.correct,
           'total', qa.total_questions,
           'xp_awarded', qa.xp_awarded,
           'z_coin_awarded', qa.z_coin_awarded,
           'backfilled', true
         ),
         COALESCE(qa.attempted_at, NOW())
    FROM quiz_attempts qa
   WHERE NOT EXISTS (
     SELECT 1 FROM learning_events le
      WHERE le.user_id = qa.user_id
        AND le.event_type IN ('quiz_complete', 'quiz_perfect')
        AND le.chapter_id = qa.chapter_id
        AND le.lesson_id = qa.quiz_id
   )
  RETURNING id
`);
console.log(`+ quiz_complete / quiz_perfect: ${r2.rowCount} 筆`);

const after = await c.query(`SELECT COUNT(*) AS n FROM learning_events`);
console.log(`learning_events after:  ${after.rows[0].n} 筆\n`);

const byType = await c.query(`
  SELECT event_type, COUNT(*) AS n FROM learning_events GROUP BY event_type ORDER BY n DESC
`);
console.log("by type:");
for (const r of byType.rows) console.log(`  ${r.event_type}: ${r.n}`);

await c.end();
console.log("\n✓ backfill 完成");
