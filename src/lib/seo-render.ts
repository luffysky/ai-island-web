import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { renderSeoTemplate, SITE_STATS } from "@/lib/site-stats";

/**
 * Fetch SEO override for a path from public.seo_pages and return a
 * Next.js Metadata partial. All string fields run through
 * renderSeoTemplate so {{chapter_count}} / {{lesson_count}} /
 * {{published_count}} are filled in with current live numbers.
 *
 * Returns null if no row, so callers can fall back to their own
 * static defaults without an extra branch.
 */
export async function getSeoForPath(path: string): Promise<Metadata | null> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("seo_pages")
      .select(
        "title, description, keywords, og_image, canonical_url, robots, schema_jsonld"
      )
      .eq("path", path)
      .maybeSingle();

    if (!data) return null;

    const title = renderSeoTemplate(data.title);
    const description = renderSeoTemplate(data.description);
    const keywords = Array.isArray(data.keywords)
      ? data.keywords.map((k: string) => renderSeoTemplate(k))
      : undefined;

    const meta: Metadata = {};
    if (title) meta.title = title;
    if (description) meta.description = description;
    if (keywords && keywords.length) meta.keywords = keywords;
    if (data.canonical_url) {
      meta.alternates = { canonical: renderSeoTemplate(data.canonical_url) };
    }
    if (data.robots) meta.robots = data.robots;

    const ogImage = data.og_image
      ? renderSeoTemplate(data.og_image)
      : undefined;
    meta.openGraph = {
      title: title || undefined,
      description: description || undefined,
      ...(ogImage ? { images: [ogImage] } : {}),
    };
    return meta;
  } catch (err) {
    console.warn("[seo] getSeoForPath failed for", path, err);
    return null;
  }
}

/**
 * Same as getSeoForPath but always returns a Metadata, falling back
 * to the provided default and merging the override on top.
 *
 * Useful for pages that have their own dynamic metadata
 * (chapter pages, blog articles) where they want any admin SEO
 * override to win but never disappear if the DB row is missing.
 */
export async function mergeSeoForPath(
  path: string,
  fallback: Metadata,
): Promise<Metadata> {
  const override = await getSeoForPath(path);
  if (!override) return fallback;
  return {
    ...fallback,
    ...override,
    openGraph: {
      ...(fallback.openGraph as object | undefined),
      ...(override.openGraph as object | undefined),
    },
    alternates: {
      ...(fallback.alternates as object | undefined),
      ...(override.alternates as object | undefined),
    },
  };
}

/**
 * For debug pages / admin SEO preview. Run renderSeoTemplate on a
 * string and return both raw + rendered so we can show before/after.
 */
export function previewSeoTemplate(input: string | null | undefined) {
  return {
    raw: input ?? "",
    rendered: renderSeoTemplate(input ?? ""),
    stats: SITE_STATS,
  };
}
