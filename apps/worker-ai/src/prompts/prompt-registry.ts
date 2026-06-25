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

// ============== 建议式 NL 模板 ==============

export const NL_REPLY_TEMPLATES: Record<string, string[]> = {
  personal_lesson: [
    '收到。我猜这是一份{grade}{subject}的备课资料——《{title}》。推荐保存到个人备课，你看可以吗？',
    '看完了。看起来是{grade}{subject}《{title}》的备课。要不要保存到个人备课？',
    '好的，{grade}{subject}的《{title}》。我建议保存到个人备课，要确认吗？',
  ],

  reflection: [
    '收到。这是一份教学反思吧？我猜可能想关联《{recent_lesson}》这节课。',
    '看完了你的反思。最近一次备课是《{recent_lesson}》，我推荐关联到这一课。你觉得呢？',
    '已读。我猜这份反思和《{recent_lesson}》有关系？如果不是的话，我帮你列出最近的备课来选。',
  ],

  plan_summary: [
    '收到，这是《{title}》。我会自动归档到{academic_year}{semester}，你不用操心归档规则。要保存吗？',
    '好的，《{title}》已整理。系统会归档到{academic_year}{semester}。确认保存？',
  ],

  group_lesson: [
    '收到，关于「{title}」的集体备课记录。我建议保存到集体备课，组内老师都能看到。确认吗？',
    '好的，教研组关于「{title}」的讨论。推荐保存到集体备课，要确认吗？',
  ],

  unknown: [
    '我看了下，不太确定属于哪一类。你能帮我选一下吗？个人备课、集体备课、教学反思、还是计划与总结？',
  ],
};

// ============== 保存成功 + 价值说明 + 下一步建议 ==============

export const SUCCESS_REPLY_TEMPLATES: Record<string, string[]> = {
  personal_lesson: [
    '已保存。《{title}》已归档到个人备课。以后你可以在这里随时查看，也可以继续上传配套的课件或练习。',
    '保存好了。你可以在个人备课中找到《{title}》。需要的话，后续还可以补充教案附件或者课后写一份教学反思。',
  ],

  reflection: [
    '已保存，并帮你关联到《{lesson}》这节课。以后查看这份备课时，就能同时看到这次教学反思了。\n\n{next_hint}',
    '好了。已将反思关联到《{lesson}》。后续回顾这节课时，这次反思会一起展示，帮你积累教学经验。\n\n{next_hint}',
  ],

  plan_summary: [
    '已保存。《{title}》已归档到{academic_year}{semester}的计划与总结中。学期末回顾时会自动汇总到你这一学年的档案里。',
    '保存好了。《{title}》已按{academic_year}{semester}归档。到了学期末，系统会自动帮你汇总这一年的计划和总结。',
  ],

  group_lesson: [
    '已保存。关于「{title}」的集体备课记录已归档，组内其他老师也可以查看和参与讨论。\n\n{next_hint}',
    '好了。集体备课记录已保存，教研组的老师都可以在这里看到。如果后续有补充意见，可以继续在评论区参与。\n\n{next_hint}',
  ],
};

// ============== 下一步建议（随机一句） ==============

const NEXT_HINTS: Record<string, string[]> = {
  personal_lesson: [
    '如果想继续完善，可以上传这节课的课件或配套练习。',
    '这节课上完之后，随时可以来这里写一份教学反思。',
  ],
  reflection: ['下次上完课，也可以随时来这里记录反思，慢慢积累就是一笔很宝贵的教学财富。'],
  group_lesson: [
    '其他老师如果参与了这次集体备课，也可以让他们来评论区补充意见。',
    '后续如果有新的讨论或补充材料，可以继续在这里添加。',
  ],
};

export function getNextHint(contentType: string): string {
  const hints = NEXT_HINTS[contentType];
  if (!hints || hints.length === 0) return '';
  return hints[Math.floor(Math.random() * hints.length)];
}

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
  const tpl = templates[Math.floor(Math.random() * templates.length)];
  return fillTemplate(tpl, data);
}

export function buildSuccessReply(contentType: string, data: Record<string, any>): string {
  const templates = SUCCESS_REPLY_TEMPLATES[contentType] || ['已保存。'];
  const tpl = templates[Math.floor(Math.random() * templates.length)];
  const hint = getNextHint(contentType);
  return fillTemplate(tpl, { ...data, next_hint: hint });
}

function fillTemplate(text: string, data: Record<string, any>): string {
  return text
    .replace(/\{subject\}/g, data.subject || '')
    .replace(/\{grade\}/g, data.grade || '')
    .replace(/\{title\}/g, data.title || data.title_candidate || '')
    .replace(/\{recent_lesson\}/g, data.recent_lesson_title || '')
    .replace(/\{lesson\}/g, data.linked_lesson_title || data.recent_lesson_title || '')
    .replace(/\{academic_year\}/g, data.academic_year || '')
    .replace(/\{semester\}/g, data.semester || '')
    .replace(/\{count\}/g, String(data.recent_lesson_count || 0))
    .replace(/\{next_hint\}/g, data.next_hint || '');
}

interface LessonItem {
  id: number;
  title: string;
  date: string | null;
  subject: string | null;
}

export function sortLessonsByRelevance(
  lessons: LessonItem[],
  reflectionSubject?: string,
  reflectionTitle?: string
): (LessonItem & { score: number })[] {
  return lessons
    .map((l) => {
      let score = 0;
      if (l.date) {
        const days = (Date.now() - new Date(l.date).getTime()) / 86400000;
        if (days <= 1) score += 30;
        else if (days <= 7) score += 20;
        else if (days <= 30) score += 10;
      }
      if (reflectionSubject && l.subject && l.subject === reflectionSubject) score += 15;
      if (
        reflectionTitle &&
        l.title &&
        (l.title.includes(reflectionTitle) || reflectionTitle.includes(l.title))
      )
        score += 10;
      return { ...l, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function computeAcademicTerm(): { academic_year: string; semester: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const academicYear = month >= 8 ? `${year}-${year + 1}学年` : `${year - 1}-${year}学年`;
  const semester = month >= 2 && month <= 7 ? '下学期' : '上学期';
  return { academic_year: academicYear, semester };
}
