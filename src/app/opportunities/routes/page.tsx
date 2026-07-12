import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { MyRoutesClient } from "./MyRoutesClient";

export const metadata: Metadata = {
  title: "我的航線 — 機會島 | AI 島",
  description: "你收藏的競賽/補助機會，追蹤截止日與投件進度。",
  alternates: { canonical: "/opportunities/routes" },
};

export const dynamic = "force-dynamic";

export default async function MyRoutesPage() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/opportunities/routes");
  return <MyRoutesClient />;
}
