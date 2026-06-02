/**
 * GA4 Data API → analytics_snapshots 同步
 *
 * 觸發方式：
 * 1. Zeabur Cron Job：每天午夜 call GET /api/admin/ga4/sync
 *    需要 header: x-cron-secret = process.env.CRON_SECRET
 * 2. 手動：admin 後台按按鈕 POST
 *
 * 認證二選一（程式自動偵測、優先 OAuth2）：
 *
 * 【推薦】OAuth2 Refresh Token（繞過 GA4 後台加 service account 卡死的 bug）
 *   1. Google Cloud Console 開啟 Google Analytics Data API
 *   2. 建「OAuth 用戶端 ID（網頁應用程式）」、在 OAuth Playground 用管理員帳號授權榨出 refresh token
 *   3. Zeabur env：
 *      - GA4_PROPERTY_ID (9 位數純數字、例：123456789)
 *      - GA4_CLIENT_ID / GA4_CLIENT_SECRET / GA4_REFRESH_TOKEN
 *      - CRON_SECRET = 隨機字串(≥16)
 *
 * 【舊方法 fallback】Service Account：設 GA4_PROPERTY_ID + GA4_SA_CREDENTIALS（JSON key 整段）
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";
import { verifyCronAuth } from "@/lib/cron-auth";

export const maxDuration = 60;

// GET 給 cron 用、認證三選一：Bearer / x-cron-secret / ?secret=
export async function GET(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (guard) return guard;
  return runSync();
}

// POST 給 admin 後台手動觸發
export async function POST() {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;
    return runSync();
  } catch (e: any) {
    return NextResponse.json({ error: "auth_failed", message: e?.message ?? "unknown" }, { status: 500 });
  }
}

async function runSync() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const hasOAuth = !!(process.env.GA4_CLIENT_ID && process.env.GA4_CLIENT_SECRET && process.env.GA4_REFRESH_TOKEN);
  const hasSA = !!process.env.GA4_SA_CREDENTIALS;

  if (!propertyId || (!hasOAuth && !hasSA)) {
    return NextResponse.json({
      error: "ga4_not_configured",
      message: "需設 GA4_PROPERTY_ID ＋（OAuth2: GA4_CLIENT_ID / GA4_CLIENT_SECRET / GA4_REFRESH_TOKEN，或舊版 GA4_SA_CREDENTIALS）",
    }, { status: 503 });
  }

  try {
    // 取 access token（優先 OAuth2 refresh token、fallback service account JWT）
    const accessToken = await getAccessToken();

    // GA4 Data API: 過去 30 天
    const today = new Date();
    const startDate = new Date(Date.now() - 30 * 86400_000);

    const dateStr = (d: Date) => d.toISOString().slice(0, 10);
    const last7 = dateStr(new Date(Date.now() - 7 * 86400_000));
    const todayStr = dateStr(today);

    // 單支 runReport：帶 20 秒逾時，卡住就丟錯（被外層 try 接成 JSON，不會變平台 504 HTML）
    const runReport = (body: any) =>
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });

    // GA4 報表全部並行（一支卡住有 20s 逾時、不會拖垮整體）
    const [
      dailyRes, topPagesRes, refRes, countryRes, deviceRes, cityRes,
      channelRes, browserRes, osRes, langRes, landingRes, nvrRes,
    ] = await Promise.all([
      runReport({
        dateRanges: [{ startDate: dateStr(startDate), endDate: todayStr }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "totalUsers" },
          { name: "userEngagementDuration" },
          { name: "bounceRate" },
          { name: "sessions" },
          { name: "engagementRate" },
          { name: "newUsers" },
        ],
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 20,
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 20,
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 10,
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "totalUsers" }],
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 15,
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 12,
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "browser" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 10,
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "operatingSystem" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 10,
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "language" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 10,
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 15,
      }),
      runReport({
        dateRanges: [{ startDate: last7, endDate: todayStr }],
        dimensions: [{ name: "newVsReturning" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 5,
      }),
    ]);

    if (!dailyRes.ok) {
      const err = await dailyRes.text();
      return NextResponse.json({ error: "ga_api_error", detail: err.slice(0, 500) }, { status: 502 });
    }

    const [
      daily, topPagesData, refData, countryData, deviceData, cityData,
      channelData, browserData, osData, langData, landingData, nvrData,
    ] = await Promise.all([
      dailyRes.json(),
      topPagesRes.json(),
      refRes.json(),
      countryRes.json(),
      deviceRes.json(),
      cityRes.json(),
      channelRes.json(),
      browserRes.json(),
      osRes.json(),
      langRes.json(),
      landingRes.json(),
      nvrRes.json(),
    ]);

    // 共用：把「單一維度 + 單一數值」的報表轉成 [{<key>, <valKey>}]
    const mapRows = (data: any, key: string, valKey = "users") =>
      (data.rows ?? []).map((r: any) => ({
        [key]: r.dimensionValues[0]?.value,
        [valKey]: Number(r.metricValues[0]?.value ?? 0),
      }));

    const topPages = mapRows(topPagesData, "path", "views");
    const topReferrers = mapRows(refData, "source", "visits");
    const topCountries = mapRows(countryData, "country");
    const topDevices = mapRows(deviceData, "device");
    const topCities = mapRows(cityData, "city");
    const topChannels = mapRows(channelData, "channel");
    const topBrowsers = mapRows(browserData, "browser");
    const topOs = mapRows(osData, "os");
    const topLanguages = mapRows(langData, "language");
    const topLandingPages = mapRows(landingData, "path", "views");
    const newVsReturning = mapRows(nvrData, "type");

    // 寫入 DB
    const admin = createSupabaseAdmin();
    const rows = (daily.rows ?? []).map((r: any) => {
      const dateStr = r.dimensionValues[0]?.value; // YYYYMMDD
      const formatted = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      const isLatest = dateStr === today.toISOString().slice(0, 10).replace(/-/g, "");
      return {
        date: formatted,
        page_views: Number(r.metricValues[0]?.value ?? 0),
        unique_visitors: Number(r.metricValues[1]?.value ?? 0),
        avg_engagement_sec: Math.round(Number(r.metricValues[2]?.value ?? 0)),
        bounce_rate: Number(r.metricValues[3]?.value ?? 0) * 100,
        sessions: Number(r.metricValues[4]?.value ?? 0),
        engagement_rate: Number(r.metricValues[5]?.value ?? 0) * 100,
        new_users: Number(r.metricValues[6]?.value ?? 0),
        top_pages: isLatest ? topPages : [],
        top_referrers: isLatest ? topReferrers : [],
        top_countries: isLatest ? topCountries : [],
        top_cities: isLatest ? topCities : [],
        top_devices: isLatest ? topDevices : [],
        top_channels: isLatest ? topChannels : [],
        top_browsers: isLatest ? topBrowsers : [],
        top_os: isLatest ? topOs : [],
        top_languages: isLatest ? topLanguages : [],
        top_landing_pages: isLatest ? topLandingPages : [],
        new_vs_returning: isLatest ? newVsReturning : [],
        source: "ga4",
        updated_at: new Date().toISOString(),
      };
    });

    let upserted = 0;
    for (const row of rows) {
      const { error } = await admin.from("analytics_snapshots").upsert(row, { onConflict: "date" });
      if (!error) upserted++;
    }

    return NextResponse.json({
      ok: true,
      upserted,
      latestDate: rows[rows.length - 1]?.date,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// === 取 access token：優先 OAuth2 refresh token、fallback service account JWT ===
async function getAccessToken(): Promise<string> {
  if (process.env.GA4_REFRESH_TOKEN && process.env.GA4_CLIENT_ID && process.env.GA4_CLIENT_SECRET) {
    return getAccessTokenViaRefreshToken();
  }
  const credentials = JSON.parse(process.env.GA4_SA_CREDENTIALS as string);
  return getGoogleAccessToken(credentials);
}

// === OAuth2 Refresh Token → Access Token（繞過 GA4 後台加 service account 的限制）===
async function getAccessTokenViaRefreshToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GA4_CLIENT_ID as string,
      client_secret: process.env.GA4_CLIENT_SECRET as string,
      refresh_token: process.env.GA4_REFRESH_TOKEN as string,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OAuth refresh: ${res.status} ${err.slice(0, 200)}`);
  }
  const { access_token } = await res.json();
  if (!access_token) throw new Error("OAuth refresh: 沒拿到 access_token");
  return access_token;
}

// === Google Service Account JWT → Access Token（舊方法、fallback）===
async function getGoogleAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  // 用 Node crypto 簽 JWT
  const crypto = await import("crypto");
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(credentials.private_key, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google auth: ${tokenRes.status} ${err}`);
  }
  const { access_token } = await tokenRes.json();
  return access_token;
}
