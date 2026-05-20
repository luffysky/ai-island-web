import { createSupabaseAdmin } from "@/lib/supabase";

/**
 * Email 發送 helper
 *
 * - 自動檢查訂閱狀態（user 沒訂閱就不寄）
 * - 自動加退訂連結（CAN-SPAM 合規）
 * - 自動加 List-Unsubscribe header（Gmail / Yahoo 必要）
 *
 * 使用 Resend / SendGrid / AWS SES 等服務時、把 sendEmail 接過去就好。
 */

export type EmailCategory =
  | "newsletter"
  | "product_updates"
  | "course_announcements"
  | "weekly_digest"
  | "transactional"; // 不需訂閱檢查

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category: EmailCategory;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet";

export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: boolean; reason?: string }> {
  const admin = createSupabaseAdmin();

  // 檢查訂閱（transactional 跳過檢查）
  if (opts.category !== "transactional") {
    const { data: sub } = await admin
      .from("email_subscriptions")
      .select(opts.category + ", unsubscribed_at")
      .eq("email", opts.to)
      .maybeSingle();

    if (!sub || (sub as any).unsubscribed_at) {
      return { ok: false, reason: "user_unsubscribed_all" };
    }

    if (!(sub as any)[opts.category]) {
      return { ok: false, reason: `user_opted_out_${opts.category}` };
    }
  }

  // 取退訂 token
  const { data: subData } = await admin
    .from("email_subscriptions")
    .select("unsubscribe_token")
    .eq("email", opts.to)
    .maybeSingle();

  const unsubToken = subData?.unsubscribe_token ?? "";
  const unsubUrl = `${SITE_URL}/unsubscribe?token=${unsubToken}`;

  // 加退訂 footer
  const htmlWithFooter = opts.html + emailFooter(opts.to, unsubUrl, opts.category);
  const textWithFooter = (opts.text ?? "") + textFooter(unsubUrl);

  // 實際發送（依你用什麼服務改）
  try {
    await actualSend({
      to: opts.to,
      subject: opts.subject,
      html: htmlWithFooter,
      text: textWithFooter,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>, <mailto:unsubscribe@aiisland.tw?subject=Unsubscribe&body=token=${unsubToken}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    // 紀錄 last_email_at
    await admin
      .from("email_subscriptions")
      .update({ last_email_at: new Date().toISOString() })
      .eq("email", opts.to);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e.message };
  }
}

/**
 * 實際發送 - 接你的 email service
 *
 * 推薦：Resend（最易用）、SendGrid、AWS SES
 * Resend 範例（npm i resend）：
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *   await resend.emails.send({ from: '...', to, subject, html, text, headers });
 */
async function actualSend(_msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}) {
  if (process.env.NODE_ENV === "development") {
    console.log("[Email] DEV mode、不實際發送", { to: _msg.to, subject: _msg.subject });
    return;
  }

  // TODO: 接 email service
  // 例：
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: "AI 島 <hello@aiisland.tw>",
  //   ..._msg,
  // });

  throw new Error("Email service not configured. Add Resend/SendGrid/SES integration.");
}

function emailFooter(email: string, unsubUrl: string, category: EmailCategory): string {
  if (category === "transactional") {
    return `
<hr style="margin: 40px 0 20px; border: none; border-top: 1px solid #eee;">
<p style="font-size: 12px; color: #888; text-align: center;">
  此為系統通知、無法退訂、以確保帳號安全。<br>
  © 2026 AI 島 · <a href="${SITE_URL}/privacy" style="color: #888;">隱私權政策</a>
</p>`;
  }

  return `
<hr style="margin: 40px 0 20px; border: none; border-top: 1px solid #eee;">
<p style="font-size: 12px; color: #888; text-align: center; line-height: 1.6;">
  你收到這封信、是因為你訂閱了 AI 島 的通知。<br>
  寄到：${email}<br>
  <br>
  <a href="${unsubUrl}" style="color: #50fa7b;">管理訂閱偏好</a> ·
  <a href="${unsubUrl}" style="color: #ff6b6b;">退訂全部</a><br>
  <br>
  © 2026 AI 島 by SnowRealm · 新北市鶯歌區<br>
  <a href="${SITE_URL}/privacy" style="color: #888;">隱私權政策</a> ·
  <a href="${SITE_URL}/terms" style="color: #888;">使用條款</a>
</p>`;
}

function textFooter(unsubUrl: string): string {
  return `

--
退訂或管理偏好：${unsubUrl}
© 2026 AI 島 · ${SITE_URL}/privacy
`;
}
