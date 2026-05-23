import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { BreachDetailForm } from "./BreachDetailForm";

export const dynamic = "force-dynamic";

export default async function BreachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  const admin = createSupabaseAdmin();
  const { data: incident } = await admin
    .from("breach_incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!incident) notFound();

  const hoursSinceDiscovered = (Date.now() - new Date(incident.discovered_at).getTime()) / 3600_000;
  const isOverdue = hoursSinceDiscovered >= 72 && !incident.reported_to_authority;
  const isUrgent = hoursSinceDiscovered >= 48 && !incident.reported_to_authority;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={adminHref("/admin/breach") as any}
            className="text-sm text-fg-muted hover:text-accent"
          >
            ← 回事件列表
          </Link>
          <h2 className="text-xl font-bold mt-1">🚨 事件 #{incident.id}</h2>
        </div>
        {isOverdue && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
            已逾期 {Math.floor(hoursSinceDiscovered)}h
          </span>
        )}
        {!isOverdue && isUrgent && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white">
            急、{Math.max(0, Math.ceil(72 - hoursSinceDiscovered))}h 內須通報
          </span>
        )}
      </div>

      <BreachDetailForm incident={incident} />
    </div>
  );
}
