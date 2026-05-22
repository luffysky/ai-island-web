import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isValidRecurRule, nextRecurDate, toISODate } from "@/lib/todo-recur";
import type { TodoUpdateInput } from "@/lib/types-todo";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/todo/[id]
 * 更新 todo。允許部分欄位。完成時若有 recur_rule、自動建下一筆。
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: TodoUpdateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 驗證
  if (body.title != null) {
    const t = String(body.title).trim();
    if (t.length < 1 || t.length > 200) {
      return NextResponse.json({ error: "title_invalid" }, { status: 400 });
    }
    body.title = t;
  }
  if (body.priority != null && ![1, 2, 3].includes(body.priority)) {
    return NextResponse.json({ error: "invalid_priority" }, { status: 400 });
  }
  if (body.recur_rule !== undefined && !isValidRecurRule(body.recur_rule)) {
    return NextResponse.json({ error: "invalid_recur_rule" }, { status: 400 });
  }

  // completed 同步 completed_at
  const patch: Record<string, any> = { ...body };
  if (patch.completed === true && patch.completed_at === undefined) {
    patch.completed_at = new Date().toISOString();
  } else if (patch.completed === false) {
    patch.completed_at = null;
  }

  const { data: updated, error } = await supabase
    .from("todos")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // recur 處理：完成且有規則時、建下一筆
  let nextTodo = null;
  if (patch.completed === true && updated.recur_rule) {
    const nextDate = nextRecurDate(updated.recur_rule, updated.due_date ? new Date(updated.due_date) : new Date());
    if (nextDate) {
      const { data: created } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          parent_id: updated.parent_id,
          title: updated.title,
          notes: updated.notes,
          due_date: toISODate(nextDate),
          priority: updated.priority,
          recur_rule: updated.recur_rule,
          sort_order: Date.now(),
        })
        .select("*")
        .single();
      nextTodo = created;
    }
  }

  return NextResponse.json({ todo: updated, next: nextTodo });
}

/**
 * DELETE /api/todo/[id]
 * 刪除 todo。子任務會被 ON DELETE CASCADE 連動清掉。
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
