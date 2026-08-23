import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { AlertTriangle } from "lucide-react";
import RedirectsClient from "./RedirectsClient";

export const dynamic = "force-dynamic";

export default async function RedirectsPage() {
  const supabase = createSupabaseAdmin();

  const { data: redirects, error } = await supabase
    .from("seo_redirects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2 inline-flex items-center gap-1"><AlertTriangle size={16} className="inline-block align-[-2px]" /> 需要先跑 ai_migration.sql</div>
      </div>
    );
  }

  return <RedirectsClient initial={redirects ?? []} />;
}
