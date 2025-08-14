import { supabase, Task } from "./supabase";

export async function updateParentCompletion(parentId: string): Promise<void> {
  const { data: children, error } = await supabase!
    .from("tasks")
    .select("id, is_completed")
    .eq("parent_id", parentId);
  if (error) throw error;
  const total = children?.length || 0;
  if (total === 0) return; // Do not override manual parent state when it has no children
  const completed = (children || []).filter((c) => c.is_completed).length;
  const allComplete = completed === total;
  const { error: upErr } = await supabase!
    .from("tasks")
    .update({ is_completed: allComplete })
    .eq("id", parentId);
  if (upErr) throw upErr;

  // Propagate completion state up the ancestor chain
  const grandParentId = await fetchTaskParentId(parentId);
  if (grandParentId) {
    await updateParentCompletion(grandParentId);
  }
}

export async function setChildrenCompletion(
  parentId: string,
  newStatus: boolean
): Promise<void> {
  const { error } = await supabase!
    .from("tasks")
    .update({ is_completed: newStatus })
    .eq("parent_id", parentId);
  if (error) throw error;
}

export async function toggleTaskAndSync(
  task: Task,
  newStatus: boolean
): Promise<void> {
  const { error } = await supabase!
    .from("tasks")
    .update({ is_completed: newStatus })
    .eq("id", task.id);
  if (error) throw error;

  // Cascade to children if this task has any
  await setChildrenCompletion(task.id, newStatus);

  // Recompute parent completion if this task has a parent
  if (task.parent_id) {
    await updateParentCompletion(task.parent_id);
  }
}

export async function loadChildrenProgress(
  parentIds: string[]
): Promise<Record<string, { total: number; completed: number }>> {
  if (parentIds.length === 0) return {};
  const { data, error } = await supabase!
    .from("tasks")
    .select("id, parent_id, is_completed")
    .in("parent_id", parentIds);
  if (error) throw error;
  const progress: Record<string, { total: number; completed: number }> = {};
  (data || []).forEach((child) => {
    const pid = (child as any).parent_id as string;
    if (!progress[pid]) progress[pid] = { total: 0, completed: 0 };
    progress[pid].total += 1;
    if ((child as any).is_completed) progress[pid].completed += 1;
  });
  return progress;
}

async function fetchTaskParentId(taskId: string): Promise<string | null> {
  const { data, error } = await supabase!
    .from("tasks")
    .select("id, parent_id")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  return (data as any)?.parent_id ?? null;
}

async function fetchChildIds(taskId: string): Promise<string[]> {
  const { data, error } = await supabase!
    .from("tasks")
    .select("id")
    .eq("parent_id", taskId);
  if (error) throw error;
  return (data || []).map((r) => (r as any).id as string);
}

export async function deleteTaskTree(taskId: string): Promise<void> {
  // delete descendants first (depth-first)
  const children = await fetchChildIds(taskId);
  for (const cid of children) {
    await deleteTaskTree(cid);
  }
  const parentId = await fetchTaskParentId(taskId);
  const { error } = await supabase!.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  if (parentId) {
    await updateParentCompletion(parentId);
  }
}

export async function reparentChildrenTo(
  taskId: string,
  newParentId: string | null
): Promise<void> {
  const { error } = await supabase!
    .from("tasks")
    .update({ parent_id: newParentId })
    .eq("parent_id", taskId);
  if (error) throw error;
}

export async function deleteTaskKeepChildrenOrReparent(
  taskId: string
): Promise<void> {
  const parentId = await fetchTaskParentId(taskId);
  // Move children up to grandparent (or detach if none)
  await reparentChildrenTo(taskId, parentId ?? null);
  // Delete the task itself
  const { error } = await supabase!.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  // Update impacted ancestors
  if (parentId) {
    await updateParentCompletion(parentId);
  }
}
