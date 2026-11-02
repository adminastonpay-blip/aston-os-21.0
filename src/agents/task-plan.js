const ALLOWED_ROLES = new Set(["investigator", "analyst", "verifier", "executor"]);
const MAX_TASKS = 12;
const MAX_DEPENDENCIES = 8;
const MAX_GOAL_LENGTH = 2_000;

export function validateTaskPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== "object" || !Array.isArray(plan.tasks)) {
    return { valid: false, errors: ["tasks_array_required"] };
  }
  const tasks = plan.tasks;
  if (tasks.length === 0 || tasks.length > MAX_TASKS) errors.push("task_count_out_of_bounds");

  tasks.forEach((task, index) => {
    if (!task || typeof task !== "object" || Array.isArray(task)) {
      errors.push("invalid_task:" + index);
      return;
    }
    if (!ALLOWED_ROLES.has(task.role)) errors.push("invalid_role:" + index);
    if (typeof task.goal !== "string" || !task.goal.trim() || task.goal.length > MAX_GOAL_LENGTH) {
      errors.push("invalid_goal:" + index);
    }
    if (task.dependsOn !== undefined) {
      if (!Array.isArray(task.dependsOn) || task.dependsOn.length > MAX_DEPENDENCIES ||
          task.dependsOn.some((d) => !Number.isInteger(d) || d < 0 || d >= tasks.length || d === index)) {
        errors.push("invalid_dependencies:" + index);
      }
    }
  });

  if (errors.length) return { valid: false, errors, maxTasks: MAX_TASKS };

  const state = new Array(tasks.length).fill(0);
  function visit(index) {
    if (state[index] === 1) return false;
    if (state[index] === 2) return true;
    state[index] = 1;
    for (const dependency of tasks[index].dependsOn ?? []) {
      if (!visit(dependency)) return false;
    }
    state[index] = 2;
    return true;
  }

  for (let i = 0; i < tasks.length; i++) {
    if (!visit(i)) return { valid: false, errors: ["dependency_cycle_detected"], maxTasks: MAX_TASKS };
  }
  return { valid: true, errors: [], taskCount: tasks.length, maxTasks: MAX_TASKS };
}
