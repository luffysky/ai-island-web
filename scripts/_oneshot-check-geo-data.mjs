/** 看 analytics_sessions / page_views 的 country/region/city/district 實際分布 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const out = {};

// 1. analytics_sessions 24h 各地理欄位「非 null」筆數
try {
  const r = await c.query(
    `SELECT
        COUNT(*) AS total,
        COUNT(country) AS country_n,
        COUNT(region) AS region_n,
        COUNT(city) AS city_n,
        COUNT(district) AS district_n,
        COUNT(*) FILTER (WHERE district IS NOT NULL AND district <> '') AS district_real
      FROM analytics_sessions
      WHERE last_seen_at >= NOW() - INTERVAL '7 days'`
  );
  out.sessions_7d = r.rows[0];

  // top 區
  const t = await c.query(
    `SELECT country, region, city, district, COUNT(*) AS n
       FROM analytics_sessions
      WHERE last_seen_at >= NOW() - INTERVAL '7 days'
      GROUP BY country, region, city, district
      ORDER BY n DESC LIMIT 15`
  );
  out.session_geo_breakdown = t.rows;
} catch (e) { out.sessions_err = e.message; }

console.log(JSON.stringify(out, null, 2));
await c.end();
