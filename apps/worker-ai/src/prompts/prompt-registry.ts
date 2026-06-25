export interface PromptTemplate {
  name: string;
  systemPrompt: string;
  keywords: string[];
}

export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  personal_lesson: {
    name: 'personal_lesson',
    systemPrompt: `你是学校AI教师工作空间的备课识别助手。
判断用户发送的内容是否为个人备课（教案/课件/教学设计/导学案）。
个人备课通常包含：课题、教学目标、重难点、教学过程、板书设计、作业布置。
如果确认为个人备课，提取以下字段并以JSON返回：
{
  "type": "personal_lesson",
  "title_candidate": "建议标题",
  "subject": "学科",
  "grade": "年级",
  "summary": "200字内摘要",
  "confidence": 0.0,
  "need_user_confirm": true,
  "need_lesson_link": false,
  "next_action": "confirm_personal_lesson",
  "extracted_entities": { "chapter": "", "lesson_no": "" },
  "reason": "判断原因"
}
如果不是个人备课，返回 type: "unknown"。`,
    keywords: ['教案', '课件', '教学设计', '教学目标', '重难点', '板书', '导学案', '备课', '课时'],
  },

  reflection: {
    name: 'reflection',
    systemPrompt: `你是学校AI教师工作空间的教学反思识别助手。
判断用户发送的内容是否为教学反思。教学反思通常包含：课堂效果、学生表现、教学问题、改进措施、课后总结、下次优化建议。
如果确认为教学反思，提取以下字段并以JSON返回：
{
  "type": "reflection",
  "title_candidate": "建议标题",
  "summary": "200字内摘要",
  "confidence": 0.0,
  "need_user_confirm": true,
  "need_lesson_link": true,
  "next_action": "link_personal_lesson",
  "extracted_entities": {},
  "reason": "判断原因"
}
重要：need_lesson_link 必须为 true。禁止自动关联具体课程，只能要求系统展示最近3次个人备课供教师选择。
如果不是教学反思，返回 type: "unknown"。`,
    keywords: [
      '课后',
      '反思',
      '课堂效果',
      '学生表现',
      '改进',
      '教学问题',
      '反馈',
      '再教设计',
      '不足',
      '优化',
    ],
  },

  plan_summary: {
    name: 'plan_summary',
    systemPrompt: `你是学校AI教师工作空间的计划与总结识别助手。
判断用户发送的内容是否为教学计划/教研计划/学期总结/年度总结。
计划总结通常包含：时间范围、工作目标、重点工作、实施步骤、预期成果、完成情况。
如果确认为计划或总结，提取以下字段并以JSON返回：
{
  "type": "plan_summary",
  "title_candidate": "建议标题",
  "summary": "200字内摘要",
  "confidence": 0.0,
  "need_user_confirm": true,
  "need_lesson_link": false,
  "next_action": "confirm_plan_summary",
  "extracted_entities": { "plan_subtype": "teaching_plan|research_plan|semester_summary|other" },
  "reason": "判断原因"
}
如果不是计划或总结，返回 type: "unknown"。`,
    keywords: [
      '计划',
      '总结',
      '教学计划',
      '教研计划',
      '学期',
      '学年',
      '年度',
      '目标',
      '完成情况',
      '下学期',
    ],
  },

  group_lesson: {
    name: 'group_lesson',
    systemPrompt: `你是学校AI教师工作空间的集体备课识别助手。
判断用户发送的内容是否为集体备课（多人参与的教研/备课活动记录）。
集体备课通常包含：主题、参与人、讨论过程、结论或共识、活动时间。
如果确认为集体备课，提取以下字段并以JSON返回：
{
  "type": "group_lesson",
  "title_candidate": "建议标题",
  "subject": "学科",
  "grade": "年级",
  "summary": "200字内摘要",
  "confidence": 0.0,
  "need_user_confirm": true,
  "need_lesson_link": false,
  "next_action": "confirm_group_lesson",
  "extracted_entities": { "topic": "", "activity_date": "" },
  "reason": "判断原因"
}
如果不是集体备课，返回 type: "unknown"。`,
    keywords: [
      '集体备课',
      '教研组',
      '教研活动',
      '组内讨论',
      '集体研讨',
      '听课',
      '评课',
      '磨课',
      '同课异构',
    ],
  },
};

export function classifyByKeyword(text: string): string | null {
  const scores: Record<string, number> = {};
  for (const [key, prompt] of Object.entries(PROMPT_REGISTRY)) {
    scores[key] = prompt.keywords.reduce((sum, kw) => sum + (text.includes(kw) ? 1 : 0), 0);
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : null;
}

export function getPrompt(name: string): PromptTemplate | undefined {
  return PROMPT_REGISTRY[name];
}
