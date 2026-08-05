import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { BackgroundPicker } from "./BackgroundPicker";
import type { BackgroundSpec } from "@/lib/background/scenes";

export const metadata: Metadata = {
  title: "背景 — AI 島",
  description: "挑一個動態粒子場景或漸層當你的全站背景：即時預覽、一鍵套用、跨裝置同步。",
  alternates: { canonical: "/background" },
};

export const dynamic = "force-dynamic";

export default async function BackgroundPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/background");

  const { data: prof } = await supabase
    .from("profiles")
    .select("active_background")
    .eq("id", user.id)
    .single();

  const initial = (prof?.active_background ?? null) as BackgroundSpec;

  return <BackgroundPicker initial={initial} />;
}
