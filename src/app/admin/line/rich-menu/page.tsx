import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { ArrowLeft } from "lucide-react";
import { RichMenuClient } from "./RichMenuClient";

export const dynamic = "force-dynamic";

export default async function AdminRichMenuPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const currentImageUrl = process.env.RICH_MENU_IMAGE_URL || null;
  const hasUserBot = !!(process.env.USER_LINE_CHANNEL_TOKEN && process.env.USER_LINE_CHANNEL_SECRET);

  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/line") as any}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent"
      >
        <ArrowLeft size={14} /> 回 LINE 控制台
      </Link>

      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🎴 Rich Menu</h1>
        <p className="text-sm text-fg-muted mt-1 leading-relaxed">
          LINE bot 對話框下方那塊大圖選單。點圖上不同區域 → 跳到網站不同頁面。
          <br />
          <span className="text-yellow-400 text-xs">⚠️ 需要 <b>2500×1686</b> 的 PNG / JPEG 圖、≤ 1 MB</span>
        </p>
      </header>

      <RichMenuClient currentImageUrl={currentImageUrl} hasUserBot={hasUserBot} />
    </div>
  );
}
