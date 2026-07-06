import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { sanitizeRichHtml } from "@/lib/rich-html";
import { ArrowLeft, FileText, ShoppingBag, Lock } from "lucide-react";
import { BuyButton } from "./BuyButton";

export const dynamic = "force-dynamic";

export default async function NoteProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { data: { user } } = await (await createSupabaseServer()).auth.getUser();

  const { data: product } = await admin.from("note_products").select("*").eq("id", id).maybeSingle();
  if (!product) return notFound();
  const p = product as any;
  const { data: seller } = await admin.from("profiles").select("username, display_name, avatar_url, bio").eq("id", p.seller_id).maybeSingle();

  const isSeller = user?.id === p.seller_id;
  let owned = isSeller;
  if (user && !owned) {
    const { data: purchase } = await admin.from("note_product_purchases").select("id").eq("product_id", id).eq("buyer_id", user.id).maybeSingle();
    owned = !!purchase;
  }
  const { data: notes } = await admin.from("notes").select("id, title, content").in("id", p.note_ids ?? []);
  const noteRows = (notes as any[]) ?? [];
  const sellerName = (seller as any)?.display_name || (seller as any)?.username || "創作者";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/notes/market" className="text-sm text-fg-muted hover:text-fg inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> 筆記市集</Link>

      <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-bold">{p.title}</h1>
        <div className="flex items-center gap-3 text-xs text-fg-muted mt-2 flex-wrap">
          <Link href={`/notes/author/${(seller as any)?.username ?? p.seller_id}`} className="hover:text-accent">@{sellerName}</Link>
          <span className="inline-flex items-center gap-0.5"><FileText size={12} /> {(p.note_ids ?? []).length} 篇</span>
          <span className="inline-flex items-center gap-0.5"><ShoppingBag size={12} /> 售出 {p.sales}</span>
        </div>
        {p.description && <p className="text-sm text-fg-muted mt-3 whitespace-pre-wrap">{p.description}</p>}

        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-2xl font-bold text-accent">{p.price_z === 0 ? "免費" : `${p.price_z} Z 幣`}</div>
          {isSeller ? (
            <span className="text-sm text-fg-muted">這是你上架的商品</span>
          ) : owned ? (
            <span className="text-sm font-bold text-emerald-500">✓ 已擁有</span>
          ) : (
            <BuyButton productId={p.id} priceZ={p.price_z} loggedIn={!!user} />
          )}
        </div>
      </div>

      {/* 內容：擁有 → 全文；否則 → 試閱標題 + 鎖 */}
      <div className="mt-6 space-y-4">
        {noteRows.map((n) => (
          <div key={n.id} className="bg-bg-card border border-border rounded-2xl p-5">
            <div className="font-bold mb-2">{n.title?.trim() || "（無標題筆記）"}</div>
            {owned ? (
              <div className="prose-custom max-w-none text-sm" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(n.content) }} />
            ) : (
              <div className="text-sm text-fg-muted inline-flex items-center gap-1.5"><Lock size={13} /> 購買後解鎖全文</div>
            )}
          </div>
        ))}
        {noteRows.length === 0 && <div className="text-sm text-fg-muted text-center py-8">這個商品還沒有內容。</div>}
      </div>
    </div>
  );
}
