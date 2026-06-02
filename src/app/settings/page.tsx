import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsForm } from "./SettingsForm";
import { BackgroundSection } from "./BackgroundSection";
import { PreciseLocationToggle } from "@/components/PreciseLocationToggle";
import { GdprSection } from "./GdprSection";
import { LineBindSection } from "./LineBindSection";
import { DiscordBindSection } from "./DiscordBindSection";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export default async function SettingsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) redirect("/login");

  const admin = createSupabaseAdmin();
  const { data: dcBind } = await admin
    .from("user_discord_bind")
    .select("discord_username, discord_avatar, bound_at, last_role_sync_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>
      <SettingsForm profile={profile} email={user.email!} />
      <BackgroundSection initial={(profile as any).background ?? null} />

      {/* BYOK 入口：使用者自帶 API key、跳過免費額度限制 */}
      <Link
        href={"/settings/ai-keys" as any}
        className="block rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5 hover:from-purple-500/15 hover:to-pink-500/15 transition"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold flex items-center gap-2">
              🔑 我的 AI API Keys（BYOK）
            </div>
            <p className="text-sm text-fg-muted mt-1">
              自帶 OpenAI / Anthropic / Google key、跳過每日免費額度、用多少付多少給原廠。AI 島不收手續費、key 加密儲存。
            </p>
          </div>
          <span className="text-2xl text-purple-900 dark:text-purple-200">→</span>
        </div>
      </Link>

      <LineBindSection
        initialBound={!!profile.line_user_id}
        initialNotifyEnabled={profile.line_notify_enabled !== false}
      />
      <DiscordBindSection initialBind={dcBind as any} />
      <PreciseLocationToggle />
      <GdprSection initialDeletedAt={profile.deleted_at ?? null} />
    </div>
  );
}
