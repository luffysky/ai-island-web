"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { AnimatedEmojiPicker } from "@/components/ui/AnimatedEmojiPicker";
import { ArrowLeft, Check, Loader2, Store, Search } from "lucide-react";

type MyNote = { id: string; title: string };

export default function NewNoteProductPage() {
  const t = useTranslations("notes");
  const router = useRouter();
  const [notes, setNotes] = useState<MyNote[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState(99);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login?next=/notes/market/new"); return; }
      const { data } = await supabase.from("notes").select("id, title").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(200);
      setNotes((data ?? []).map((n: any) => ({ id: n.id, title: n.title?.trim() || t("untitledNote") })));
      setLoading(false);
    });
  }, [router]);

  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const shown = notes.filter((n) => !q.trim() || n.title.toLowerCase().includes(q.trim().toLowerCase()));

  async function publish() {
    if (!title.trim() || sel.size === 0) { setErr(t("missingTitleOrNote")); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/notes/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() || undefined, priceZ: price, noteIds: [...sel] }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || t("listFailed"));
      router.push(`/notes/market/${j.product.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/notes/market" className="text-sm text-fg-muted hover:text-fg inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> {t("market")}</Link>
      <h1 className="text-2xl font-bold inline-flex items-center gap-2 mb-1"><Store size={22} className="text-accent" /> {t("listMyNotes")}</h1>
      <p className="text-sm text-fg-muted mb-5">{t("listIntro")}</p>

      <div className="space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("productTitlePlaceholder")} className="w-full bg-bg-card border border-border rounded-lg p-2.5 text-lg font-bold outline-none focus:border-accent" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("productDescPlaceholder")} rows={2} className="w-full bg-bg-card border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent" />
        <div className="-mt-2"><AnimatedEmojiPicker onSelect={(e) => setDesc((v) => v + e)} /></div>
        <label className="flex items-center gap-2 text-sm">{t("price")}
          <input type="number" min={0} max={100000} value={price} onChange={(e) => setPrice(Math.max(0, Math.min(100000, Number(e.target.value) || 0)))} className="w-24 bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm" /> {t("coinsZeroFree")}
        </label>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold">{t("selectNotesToBundle")}{sel.size > 0 ? t("selectedCount", { n: sel.size }) : ""}</div>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="pl-7 pr-2 py-1 text-sm bg-bg-card border border-border rounded-lg outline-none focus:border-accent w-40" />
            </div>
          </div>
          {loading ? <div className="text-sm text-fg-muted py-6 text-center">{t("loadingYourNotes")}</div> : (
            <div className="grid sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto pr-1">
              {shown.map((n) => (
                <button key={n.id} onClick={() => toggle(n.id)} className={`text-left text-sm rounded-xl border px-3 py-2 inline-flex items-center gap-2 transition ${sel.has(n.id) ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
                  {sel.has(n.id) && <Check size={14} className="shrink-0" />}<span className="truncate">{n.title}</span>
                </button>
              ))}
              {shown.length === 0 && <div className="col-span-full text-sm text-fg-muted py-4 text-center">{t("noMatchingNotes")}</div>}
            </div>
          )}
        </div>

        {err && <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl px-4 py-2 text-sm">{err}</div>}

        <button onClick={publish} disabled={busy || !title.trim() || sel.size === 0} className="w-full py-3 rounded-full bg-accent text-black font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2">
          {busy ? <><Loader2 size={18} className="animate-spin" /> {t("listing")}</> : <>{t("publishLabel", { n: sel.size, price: price === 0 ? t("free") : `${price} Z` })}</>}
        </button>
      </div>
    </div>
  );
}
