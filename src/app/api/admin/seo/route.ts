import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json();
  const admin = createSupabaseAdmin();

  const { error } = await admin.from("seo_pages").upsert({
    path: body.path,
    title: body.title,
    description: body.description,
    keywords: body.keywords,
    og_image: body.og_image,
    canonical_url: body.canonical_url,
    robots: body.robots,
    schema_jsonld: body.schema_jsonld,
    custom_head_html: body.custom_head_html,
    priority: body.priority,
    changefreq: body.changefreq,
    geo_target: body.geo_target,
    hreflang: body.hreflang,
    updated_by: gate.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "path" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
