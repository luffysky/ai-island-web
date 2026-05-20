import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

// /api/debug-origin - 只給 admin 用、看 server 端真實拿到的 host headers
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({
    "env.NEXT_PUBLIC_SITE_URL": process.env.NEXT_PUBLIC_SITE_URL ?? "(not set)",
    "header.host": req.headers.get("host"),
    "header.x-forwarded-host": req.headers.get("x-forwarded-host"),
    "header.x-forwarded-proto": req.headers.get("x-forwarded-proto"),
    "header.x-forwarded-for": req.headers.get("x-forwarded-for"),
    "req.url": req.url,
    "new URL(req.url).origin": new URL(req.url).origin,
    "computed_origin": (() => {
      const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
      if (env && !env.includes("localhost")) return env;
      const fwdHost = req.headers.get("x-forwarded-host");
      const fwdProto = req.headers.get("x-forwarded-proto") || "https";
      if (fwdHost && !fwdHost.includes("localhost")) return `${fwdProto}://${fwdHost}`;
      const host = req.headers.get("host");
      if (host && !host.includes("localhost")) return `https://${host}`;
      return new URL(req.url).origin;
    })(),
  });
}
