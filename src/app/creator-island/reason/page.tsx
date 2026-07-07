import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getActiveWorkspace } from "@/lib/creator-engine/workspace";
import { listAllFragments } from "@/lib/creator-engine/fragments";
import { ReasonClient } from "./ReasonClient";

export const dynamic = "force-dynamic";

export default async function ReasonPage({ searchParams }: { searchParams: Promise<{ seed?: string }> }) {
  const t = await getTranslations("creator");
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title={t("reasonFeatureOff")} />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/reason");
  const ws = await getActiveWorkspace(user.id);
  const fragments = await listAllFragments(ws.id); // 全部碎片（分頁撈滿，避免只給前 60 個）
  const ids = new Set(fragments.map((f) => f.id));
  // 從意外配對/搖一搖帶進來的 seed（?seed=id1,id2）→ 預選（只留真的存在的）
  const { seed } = await searchParams;
  const preselect = (seed ?? "").split(",").map((s) => s.trim()).filter((s) => s && ids.has(s));
  return <ReasonClient workspaceId={ws.id} fragments={fragments.map((f) => ({ id: f.id, title: f.title }))} initialSelected={preselect} />;
}
