import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { FileText, ShoppingBag, BookOpen, Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NoteAuthorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const admin = createSupabaseAdmin();

  // username 或 user id
  let { data: prof } = await admin.from("profiles").select("id, username, display_name, avatar_url, bio").ilike("username", username).maybeSingle();
  if (!prof) { const r = await admin.from("profiles").select("id, username, display_name, avatar_url, bio").eq("id", username).maybeSingle(); prof = r.data; }
  if (!prof) return notFound();
  const p = prof as any;

  const [{ data: products }, { count: publicNotes }, { data: blog }] = await Promise.all([
    admin.from("note_products").select("id, title, description, price_z, note_ids, sales").eq("seller_id", p.id).eq("is_active", true).order("created_at", { ascending: false }),
    admin.from("notes").select("id", { count: "exact", head: true }).eq("user_id", p.id).eq("is_public", true),
    admin.from("user_blog_settings").select("blog_slug").eq("user_id", p.id).maybeSingle(),
  ]);
  const rows = (products as any[]) ?? [];
  const name = p.display_name || p.username;
  const blogSlug = (blog as any)?.blog_slug || p.username;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* 作者 header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-2 grid place-items-center text-2xl font-bold text-black overflow-hidden shrink-0">
          {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (name?.[0] ?? "?")}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{name}</h1>
          {p.bio && <p className="text-sm text-fg-muted mt-0.5 line-clamp-2">{p.bio}</p>}
          <div className="flex items-center gap-3 text-xs text-fg-muted mt-1.5">
            <span className="inline-flex items-center gap-0.5"><Store size={12} /> {rows.length} 商品</span>
            <span className="inline-flex items-center gap-0.5"><FileText size={12} /> {publicNotes ?? 0} 公開筆記</span>
            <Link href={`/blogs/${blogSlug}`} className="inline-flex items-center gap-0.5 hover:text-accent"><BookOpen size={12} /> 部落格</Link>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-fg-muted mb-3">📦 上架的筆記商品</h2>
      {rows.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-8 text-center text-sm text-fg-muted">還沒有上架商品。</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((pr) => (
            <Link key={pr.id} href={`/notes/market/${pr.id}`} className="group bg-bg-card border border-border rounded-2xl p-4 hover:border-accent/50 transition flex flex-col">
              <div className="font-bold group-hover:text-accent transition line-clamp-2">{pr.title}</div>
              {pr.description && <p className="text-xs text-fg-muted mt-1 line-clamp-2">{pr.description}</p>}
              <div className="mt-auto pt-3 flex items-center justify-between text-xs">
                <span className="text-fg-muted inline-flex items-center gap-2"><span className="inline-flex items-center gap-0.5"><FileText size={11} /> {(pr.note_ids ?? []).length}</span><span className="inline-flex items-center gap-0.5"><ShoppingBag size={11} /> {pr.sales}</span></span>
                <span className="font-bold text-accent">{pr.price_z === 0 ? "免費" : `${pr.price_z} Z`}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
