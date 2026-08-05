import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { checkOwner } from "@/lib/is-owner";
import { redirect } from "next/navigation";
import { FontsAdminClient, type FontRow } from "./FontsAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 字體安裝器（後台限定）。上傳 .ttf/.otf/.woff/.woff2 → Supabase Storage `fonts` bucket
// → 寫 `fonts` 表 → 主題工作室即可選、前台即時 @font-face 渲染。
export default async function AdminFontsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, is_owner")
    .eq("id", user.id)
    .single();

  const { isOwner } = checkOwner({
    id: user.id,
    role: profile?.role ?? null,
    username: profile?.username ?? null,
    isOwner: (profile as any)?.is_owner ?? null,
    email: user.email ?? null,
  });
  if (!isOwner && profile?.role !== "admin") redirect("/");

  const admin = createSupabaseAdmin();
  const { data: fonts } = await admin
    .from("fonts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return <FontsAdminClient initialFonts={(fonts ?? []) as FontRow[]} />;
}
