import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isValidRecurRule } from "@/lib/todo-recur";
import type { TodoCreateInput } from "@/lib/types-todo";

export const dynamic = "force-dynamic";

/**
 * GET /api/todo
 * 回傳目前 user 的所有 todo（含完成的）、依 sort_order 升序。
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("completed", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ todos: data ?? [] });
}

/**
 * POST /api/todo
 * 新建 todo。回傳建好的 row（含 server-generated id / created_at）。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: TodoCreateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (title.length < 1 || title.length > 200) {
    return NextResponse.json({ error: "title_required_1_to_200" }, { status: 400 });
  }
  if (body.priority != null && ![1, 2, 3].includes(body.priority)) {
    return NextResponse.json({ error: "invalid_priority" }, { status: 400 });
  }
  if (!isValidRecurRule(body.recur_rule)) {
    return NextResponse.json({ error: "invalid_recur_rule" }, { status: 400 });
  }

  const insert: Record<string, any> = {
    user_id: user.id,
    title,
    notes: body.notes ?? null,
    parent_id: body.parent_id ?? null,
    due_date: body.due_date ?? null,
    priority: body.priority ?? 2,
    recur_rule: body.recur_rule ?? null,
    sort_order: body.sort_order ?? Date.now(),
  };

  const { data, error } = await supabase
    .from("todos")
    .insert(insert)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ todo: data });
}
