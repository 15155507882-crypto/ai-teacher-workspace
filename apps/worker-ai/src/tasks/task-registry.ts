/** 任务注册表：Task → SaveType 映射 */
export interface TaskDef {
  task: string;
  label: string;
  saveType: string;
  planType?: string;
}

const REGISTRY: TaskDef[] = [
  { task: 'Create Lesson', label: '创建备课', saveType: 'personal_lesson' },
  { task: 'Create Reflection', label: '创建教学反思', saveType: 'reflection' },
  { task: 'Create Summary', label: '创建学期总结', saveType: 'plan_summary', planType: 'semester_summary' },
  { task: 'Create Plan', label: '创建教学计划', saveType: 'plan_summary', planType: 'teaching_plan' },
  { task: 'Optimize', label: '优化内容', saveType: 'keep_original' },
  { task: 'Other', label: '其他', saveType: 'personal_lesson' },
];

/** 根据 task 查找 SaveType */
export function resolveSaveType(task: string): { saveType: string; planType?: string } {
  const def = REGISTRY.find((d) => d.task === task) || REGISTRY.find((d) => d.task === 'Other')!;
  return { saveType: def.saveType, planType: def.planType };
}

/** 获取所有注册的 task */
export function getRegisteredTasks(): TaskDef[] {
  return [...REGISTRY];
}

/** 动态注册新任务（插件化扩展点） */
export function registerTask(def: TaskDef) {
  REGISTRY.push(def);
}
