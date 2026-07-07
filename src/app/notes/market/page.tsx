import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { Store, FileText, ShoppingBag, Plus } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "筆記市集 — 用別人整理好的知識起步 | AI 島",
  description: "買賣整理好的學習筆記/知識地圖，用 Z 幣交易、作者 0 抽成。",
  alternates: { canonical: "/notes/market" },
};

export default async function NotesMarketPage() {
  const t = await getTranslations("notes");
  const admin = createSupabaseAdmin();
  const { data: { user } } = await (await createSupabaseServer()).auth.getUser();
  const { data: products } = await admin.from("note_products")
    .select("id, seller_id, title, description, price_z, note_ids, sales, created_at")
    .eq("is_active", true).order("created_at", { ascending: false }).limit(60);
  const rows = (products as any[]) ?? [];
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
  const sellerMap: Record<string, any> = {};
  if (sellerIds.length) {
    const { data: sellers } = await admin.from("profiles").select("id, username, display_name").in("id", sellerIds);
    for (const s of (sellers ?? []) as any[]) sellerMap[s.id] = s;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Store size={22} className="text-accent" /> {t("market")}</h1>
          <p className="text-sm text-fg-muted mt-1">{t("marketIntro")}</p>
        </div>
        {user && <Link href="/notes/market/new" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-black text-sm font-bold"><Plus size={15} /> {t("listMyNotes")}</Link>}
      </header>

      {rows.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-fg-muted">{t("marketEmpty")}{user ? t("beFirst") : t("loginToList")}</p>
          {user && <Link href="/notes/market/new" className="inline-block mt-4 px-5 py-2 rounded-full bg-accent text-black font-bold text-sm">{t("listMyNotes")}</Link>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <Link key={p.id} href={`/notes/market/${p.id}`} className="group bg-bg-card border border-border rounded-2xl p-4 hover:border-accent/50 transition flex flex-col">
              <div className="font-bold group-hover:text-accent transition line-clamp-2">{p.title}</div>
              {p.description && <p className="text-xs text-fg-muted mt-1 line-clamp-2">{p.description}</p>}
              <div className="flex items-center gap-2 text-[11px] text-fg-muted mt-2">
                <span className="inline-flex items-center gap-0.5"><FileText size={11} /> {t("noteCount", { n: (p.note_ids ?? []).length })}</span>
                <span className="inline-flex items-center gap-0.5"><ShoppingBag size={11} /> {t("soldCount", { n: p.sales })}</span>
              </div>
              <div className="mt-auto pt-3 flex items-center justify-between">
                <span className="text-xs text-fg-muted">@{sellerMap[p.seller_id]?.display_name || sellerMap[p.seller_id]?.username || t("creator")}</span>
                <span className="font-bold text-accent">{p.price_z === 0 ? t("free") : `${p.price_z} Z`}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
