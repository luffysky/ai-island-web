import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ThemeStudioClient, type SavedTheme } from "./ThemeStudioClient";
import type { ThemeDefinition } from "@/lib/theme/engine";

export const metadata: Metadata = {
  title: "主題工作室 — AI 島",
  description: "調出你自己的配色與質感：即時預覽、無障礙檢查、一鍵套用全站。",
  alternates: { canonical: "/theme-studio" },
};

export const dynamic = "force-dynamic";

export default async function ThemeStudioPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/theme-studio");

  // 使用者已存的主題
  const { data: themes } = await supabase
    .from("themes")
    .select("id,name,definition,source,a11y_report,is_favorite,updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(60);

  // 目前套用中的主題（拿來當草稿起點）
  const { data: prof } = await supabase
    .from("profiles")
    .select("active_theme_id")
    .eq("id", user.id)
    .single();

  let activeDefinition: ThemeDefinition | null = null;
  if (prof?.active_theme_id) {
    const active = (themes ?? []).find((t) => t.id === prof.active_theme_id);
    if (active?.definition) activeDefinition = active.definition as ThemeDefinition;
  }

  return (
    <ThemeStudioClient
      initialThemes={(themes ?? []) as SavedTheme[]}
      initialActiveDefinition={activeDefinition}
    />
  );
}
