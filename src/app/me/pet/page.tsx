import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { PetSettings } from "./PetSettings";

export const dynamic = "force-dynamic";

export default async function PetSettingsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdmin();
  let { data: pet } = await admin
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!pet) {
    const { data: created } = await admin
      .from("pets")
      .insert({ user_id: user.id })
      .select("*")
      .single();
    pet = created;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🐾 我的寵物</h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          選一隻陪你學習的小夥伴。會在前台跟著你走動、完成 lesson 時跳起來。
          PR 1 預設：走動 + 反應事件；之後升級加 AI 對話、心跳主動互動。
        </p>
      </div>
      <PetSettings initial={pet} />
    </div>
  );
}
