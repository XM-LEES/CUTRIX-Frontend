import { ProductionTask, CuttingLayout, ProductionPlan } from '@/types';

interface PlanWithTasks extends ProductionPlan {
  layouts: Array<CuttingLayout & { tasks: ProductionTask[] }>;
}

/**
 * 计算计划的总进度
 */
export function calculatePlanProgress(plan: PlanWithTasks) {
  const allTasks = plan.layouts.flatMap((layout) => layout.tasks);
  const totalPlanned = allTasks.reduce((sum, task) => sum + task.planned_layers, 0);
  const totalCompleted = allTasks.reduce((sum, task) => sum + task.completed_layers, 0);
  const progress = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;
  return { totalPlanned, totalCompleted, progress };
}

/**
 * 计算版型的平均进度
 */
export function calculateLayoutProgress(tasks: ProductionTask[]): number {
  if (tasks.length === 0) return 0;
  const totalProgress = tasks.reduce((sum, task) => {
    const taskProgress = task.planned_layers > 0 ? (task.completed_layers / task.planned_layers) * 100 : 0;
    return sum + taskProgress;
  }, 0);
  return totalProgress / tasks.length;
}

