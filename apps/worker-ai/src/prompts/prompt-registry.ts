export interface PromptTemplate {
  name: string;
  systemPrompt: string;
  keywords: string[];
}

export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  personal_lesson: {
    name: 'personal_lesson',
    systemPrompt: `你是AI教师工作助手的备课识别专家。
请按JSON格式输出（仅JSON，不要额外文字）：
{
  "type": "personal_lesson",
  "title_candidate": "建议标题",
  "subject": "学科",
  "grade": "年级",
  "summary": "200字内摘要",
  "confidence": 0.0,
  "extracted_entities": { "chapter": "", "lesson_no": "" },
  "reason": "判断原因"
}
如果不是个人备课，type设为"unknown"。`,
    keywords: ['教案', '课件', '教学设计', '教学目标', '重难点', '板书', '导学案', '备课', '课时'],
  },

  reflection: {
    name: 'reflection',
    systemPrompt: `你是AI教师工作助手的教学反思识别专家。
请按JSON格式输出（仅JSON，不要额外文字）：
{
  "type": "reflection",
  "title_candidate": "建议标题",
  "summary": "200字内摘要",
  "confidence": 0.0,
  "extracted_entities": {},
  "reason": "判断原因"
}
如果不是教学反思，type设为"unknown"。`,
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
    systemPrompt: `你是AI教师工作助手的计划总结识别专家。
请按JSON格式输出（仅JSON，不要额外文字）：
{
  "type": "plan_summary",
  "title_candidate": "建议标题",
  "summary": "200字内摘要",
  "confidence": 0.0,
  "extracted_entities": { "plan_subtype": "teaching_plan|research_plan|semester_summary|other" },
  "reason": "判断原因"
}
如果不是计划或总结，type设为"unknown"。`,
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
    systemPrompt: `你是AI教师工作助手的集体备课识别专家。
请按JSON格式输出（仅JSON，不要额外文字）：
{
  "type": "group_lesson",
  "title_candidate": "建议标题",
  "subject": "学科",
  "grade": "年级",
  "summary": "200字内摘要",
  "confidence": 0.0,
  "extracted_entities": { "topic": "", "activity_date": "" },
  "reason": "判断原因"
}
如果不是集体备课，type设为"unknown"。`,
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

// ============== 自然语言回复模板（灵活风格） ==============

export const NL_REPLY_TEMPLATES: Record<string, string[]> = {
  personal_lesson: [
    '收到，这是一份{grade}{subject}《{title}》的备课资料。要保存到个人备课吗？',
    '看完了，{grade}{subject}《{title}》。帮你归档到个人备课？',
    '好的，{grade}{subject}的《{title}》。确认保存吗？',
    '已整理。这是{grade}{subject}的备课——《{title}》。保存？',
  ],

  reflection: [
    // 简洁版（信息明确时）
    '收到，这是一份教学反思。我看了下，你最近备课是《{recent_lesson}》，应该关联这一次吧？',
    '看完了你的反思。最近一次备课是《{recent_lesson}》，要关联到这一课吗？',

    // 需要选择时（信息不够明确）
    '收到，这份教学反思我先帮你整理好了。你最近有{count}次备课，我觉得和《{recent_lesson}》最相关。需要我列出全部最近备课让你选吗？',

    // 带建议版
    '已读。这是对《{recent_lesson}》的反思吗？如果是的话直接确认保存就行，如果不是我帮你列出其他备课。',
  ],

  plan_summary: [
    '收到，这是《{title}》。我会按当前学期归档到计划与总结，要保存吗？',
    '好的，《{title}》已整理。按{academic_year}{semester}归档，确认保存？',
  ],

  group_lesson: [
    '收到，这是关于「{title}」的集体备课记录。保存到集体备课？',
    '好的，教研组关于「{title}」的讨论已整理。确认保存吗？',
  ],

  unknown: [
    '我看了下，不太确定该归到哪一类。你帮我选一下：个人备课、集体备课、教学反思、还是计划与总结？',
  ],
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

export function buildNLReply(contentType: string, data: Record<string, any>): string {
  const templates = NL_REPLY_TEMPLATES[contentType] || NL_REPLY_TEMPLATES['unknown'];
  const idx = Math.floor(Math.random() * templates.length);
  let text = templates[idx];
  text = text.replace(/\{subject\}/g, data.subject || '');
  text = text.replace(/\{grade\}/g, data.grade || '');
  text = text.replace(/\{title\}/g, data.title_candidate || '');
  text = text.replace(/\{recent_lesson\}/g, data.recent_lesson_title || '（暂无备课记录）');
  text = text.replace(/\{academic_year\}/g, data.academic_year || '');
  text = text.replace(/\{semester\}/g, data.semester || '');
  text = text.replace(/\{count\}/g, String(data.recent_lesson_count || 0));
  return text;
}
