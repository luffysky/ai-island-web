import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { ReferralClient } from "./ReferralClient";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

function generateCode(seed: string): string {
  // 8-char base36 from user id, uppercase
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return "ISLAND-" + Math.abs(h).toString(36).slice(0, 6).toUpperCase();
}

export default async function MyReferralsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdmin();

  // 取或建立邀請碼
  let { data: code } = await admin
    .from("referral_codes")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!code) {
    const newCode = generateCode(user.id);
    const { data: inserted } = await admin
      .from("referral_codes")
      .insert({ code: newCode, user_id: user.id })
      .select("*")
      .single();
    code = inserted;
  }

  // 取已邀請的使用者列表
  const { data: referrals } = await admin
    .from("referrals")
    .select(`
      id, signed_up_at, first_lesson_at, reward_granted,
      referred:profiles!referrals_referred_id_fkey(username, display_name, avatar_url, xp, level)
    `)
    .eq("referrer_id", user.id)
    .order("signed_up_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎁 我的邀請碼</h1>
      <p className="text-sm text-fg-muted">
        分享邀請碼給朋友、對方註冊並完成第 1 個 lesson 後、你會獲得 100 XP + 20 Z-coin 獎勵。
      </p>

      <ReferralClient
        code={code!.code}
        usesCount={code!.uses_count}
        siteUrl={SITE_URL}
        referrals={(referrals ?? []) as any}
      />
    </div>
  );
}
