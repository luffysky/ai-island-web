export type TodoPriority = 1 | 2 | 3;

export type Todo = {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  notes: string | null;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  priority: TodoPriority;
  sort_order: number;
  recur_rule: string | null;
  created_at: string;
  updated_at: string;
};

export type TodoCreateInput = {
  title: string;
  notes?: string | null;
  parent_id?: string | null;
  due_date?: string | null;
  priority?: TodoPriority;
  recur_rule?: string | null;
  sort_order?: number;
};

export type TodoUpdateInput = Partial<{
  title: string;
  notes: string | null;
  completed: boolean;
  due_date: string | null;
  priority: TodoPriority;
  recur_rule: string | null;
  sort_order: number;
  parent_id: string | null;
}>;

export type TodoTreeNode = Todo & { children: Todo[] };
