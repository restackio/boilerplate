import type { Task } from "@/hooks/use-workspace-scoped-actions";

/**
 * True when the task carries a non-empty schedule (cron/interval UI).
 * Empty `{}` from JSON/bugs is treated as "no schedule" so build and normal tasks stay visible.
 */
export function hasMeaningfulScheduleSpec(spec: unknown): boolean {
  if (spec == null) return false;
  if (typeof spec === "object" && !Array.isArray(spec)) {
    return Object.keys(spec as Record<string, unknown>).length > 0;
  }
  return true;
}

/** Whether this row belongs on the main Tasks tab (not the Schedules tab). */
export function isMainTasksTabTask(task: Pick<Task, "schedule_spec">): boolean {
  return !hasMeaningfulScheduleSpec(task.schedule_spec);
}

/**
 * Agent builder sessions: in progress and tied to the build agent, or legacy title "Build".
 */
export function isInProgressBuildTask(
  task: Pick<Task, "status" | "agent_id" | "title">,
  buildAgentId: string | null,
): boolean {
  if (task.status !== "in_progress") return false;
  if (buildAgentId && task.agent_id === buildAgentId) return true;
  return task.title === "Build";
}
