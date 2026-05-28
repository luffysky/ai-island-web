/**
 * GA4 Data API → analytics_snapshots 同步
 *
 * 觸發方式：
 * 1. Zeabur Cron Job：每天午夜 call GET /api/admin/ga4/sync
 *    需要 header: x-cron-secret = process.env.CRON_SECRET
 * 2. 手動：admin 後台按按鈕 POST
 *
 * 設定步驟：
 * 1. Google Cloud Console 開啟 Google Analytics Data API
 * 2. 建 Service Account、給 Viewer role
 * 3. 下載 JSON key
 * 4. GA4 → Admin → Property → Access Management、加 Service Account 為 Viewer
 * 5. Zeabur env：
 *    - GA4_PROPERTY_ID (例：123456789)
 *    - GA4_SA_CREDENTIALS = JSON key（整段貼進去）
 *    - CRON_SECRET = 隨機字串
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
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
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return runSync();
}

async function runSync() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const credentialsJson = process.env.GA4_SA_CREDENTIALS;

  if (!propertyId || !credentialsJson) {
    return NextResponse.json({
      error: "ga4_not_configured",
      message: "GA4_PROPERTY_ID 或 GA4_SA_CREDENTIALS 未設定",
    }, { status: 503 });
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    return NextResponse.json({ error: "credentials_parse_failed" }, { status: 500 });
  }

  try {
    // 取 access token（用 service account JWT）
    const accessToken = await getGoogleAccessToken(credentials);

    // GA4 Data API: 過去 30 天
    const today = new Date();
    const startDate = new Date(Date.now() - 30 * 86400_000);

    // 1. 每日總計
    const dailyRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{
            startDate: startDate.toISOString().slice(0, 10),
            endDate: today.toISOString().slice(0, 10),
          }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
            { name: "userEngagementDuration" },
            { name: "bounceRate" },
          ],
        }),
      }
    );

    if (!dailyRes.ok) {
      const err = await dailyRes.text();
      return NextResponse.json({ error: "ga_api_error", detail: err }, { status: 502 });
    }

    const daily = await dailyRes.json();

    // 2. Top pages（近 7 天）
    const topPagesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{
            startDate: new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10),
            endDate: today.toISOString().slice(0, 10),
          }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 20,
        }),
      }
    );
    const topPagesData = await topPagesRes.json();
    const topPages = (topPagesData.rows ?? []).map((r: any) => ({
      path: r.dimensionValues[0]?.value,
      views: Number(r.metricValues[0]?.value ?? 0),
    }));

    // 3. Top referrers
    const refRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{
            startDate: new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10),
            endDate: today.toISOString().slice(0, 10),
          }],
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          limit: 20,
        }),
      }
    );
    const refData = await refRes.json();
    const topReferrers = (refData.rows ?? []).map((r: any) => ({
      source: r.dimensionValues[0]?.value,
      visits: Number(r.metricValues[0]?.value ?? 0),
    }));

    // 4. Top countries
    const countryRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{
            startDate: new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10),
            endDate: today.toISOString().slice(0, 10),
          }],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          limit: 10,
        }),
      }
    );
    const countryData = await countryRes.json();
    const topCountries = (countryData.rows ?? []).map((r: any) => ({
      country: r.dimensionValues[0]?.value,
      users: Number(r.metricValues[0]?.value ?? 0),
    }));

    // 5. Devices
    const deviceRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{
            startDate: new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10),
            endDate: today.toISOString().slice(0, 10),
          }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "totalUsers" }],
        }),
      }
    );
    const deviceData = await deviceRes.json();
    const topDevices = (deviceData.rows ?? []).map((r: any) => ({
      device: r.dimensionValues[0]?.value,
      users: Number(r.metricValues[0]?.value ?? 0),
    }));

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
        top_pages: isLatest ? topPages : [],
        top_referrers: isLatest ? topReferrers : [],
        top_countries: isLatest ? topCountries : [],
        top_devices: isLatest ? topDevices : [],
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

// === Google Service Account JWT → Access Token ===
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
