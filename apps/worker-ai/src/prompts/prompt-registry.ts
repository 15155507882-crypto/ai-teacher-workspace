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

// ============== 自然语言回复模板（多套随机） ==============

/** 四段式结构: ①理解 ②依据 ③建议 ④请求 */
export const NL_REPLY_TEMPLATES: Record<string, string[]> = {
  personal_lesson: [
    /* 模板A */
    [
      '收到，我已经阅读了这份资料。',
      '根据内容判断，这应该是一份{grade}{subject}的备课材料，主题是《{title}》。',
      '我建议将标题定为《{title}》，保存到你的个人备课中。',
      '要帮你保存吗？',
    ].join('\n\n'),

    /* 模板B */
    [
      '看完了，这是一份备课资料对吧？',
      '从内容来看，涉及{grade}{subject}的《{title}》。教学目标、重难点和教学过程都比较清楚。',
      '建议保存到个人备课，标题就用《{title}》，如果需要调整你随时可以修改。',
      '确认保存吗？',
    ].join('\n\n'),

    /* 模板C */
    [
      '好的，已经整理好了这份资料。',
      '我识别到这是一份{grade}{subject}的备课——《{title}》。',
      '按常规流程，我会帮你归档到个人备课。如果标题或学科需要调整，点"修改标题"就行。',
      '要现在保存吗？',
    ].join('\n\n'),
  ],

  reflection: [
    [
      '收到，这看起来是在总结课堂情况。',
      '内容提到了课堂效果和教学改进方向，符合教学反思的特征。',
      '教学反思需要关联一次之前的个人备课——我会列出你最近3次备课，你选一条关联就行。',
      '准备好选了吗？',
    ].join('\n\n'),

    [
      '我看完了，这是一份教学反思吧？',
      '你在回顾课堂的实际效果和改进点，这种复盘对教学很有帮助。',
      '接下来需要把它关联到你最近的一次备课，我帮你列出来——选一条就可以。',
      '现在看看最近几次备课？',
    ].join('\n\n'),

    [
      '已整理好，你写的这段反思很清晰。',
      '反思中提到的问题和改进措施，后续回顾时可以作为宝贵的经验积累。',
      '在保存前，我需要你选择关联的备课——下面是你最近3次个人备课。',
      '选一条关联吧？',
    ].join('\n\n'),
  ],

  plan_summary: [
    [
      '收到，我已经阅读了这份资料。',
      '从内容来看，这是一份{title}，涉及阶段性工作安排。',
      '这类资料我会按当前学年学期自动归档，方便以后查找。保存到【计划与总结】。',
      '要保存吗？',
    ].join('\n\n'),

    [
      '好的，看完了。这应该是你的工作计划或总结吧？',
      '内容涵盖了时间节点和工作重点，结构很清晰。',
      '我会自动归到本学年学期下，不用你手动选。保存到计划与总结即可。',
      '确认保存？',
    ].join('\n\n'),
  ],

  group_lesson: [
    [
      '收到，这是一份集体备课的记录对吧？',
      '内容涉及教研组的共同研讨——「{title}」。',
      '建议保存到集体备课，后续组内教师都可以查看和补充。',
      '确认保存吗？',
    ].join('\n\n'),

    [
      '看完了，应该是你们教研组的一次集体活动记录。',
      '关于「{title}」的讨论内容已经帮你整理好了。',
      '保存后，其他老师也可以在这里看到这次集体备课的内容。',
      '现在保存？',
    ].join('\n\n'),
  ],

  unknown: [
    [
      '我仔细看了一下，但不太确定这份内容应该归到哪一类。',
      '可能是个人备课、教学反思、集体备课或者计划总结。',
      '你帮我选一下类型吧——选好之后我会继续帮你整理并保存。',
      '请选择：1.个人备课  2.集体备课  3.教学反思  4.计划与总结',
    ].join('\n\n'),
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

/** 随机选择一条NL回复模板并填充变量 */
export function buildNLReply(contentType: string, data: Record<string, any>): string {
  const templates = NL_REPLY_TEMPLATES[contentType] || NL_REPLY_TEMPLATES['unknown'];
  const idx = Math.floor(Math.random() * templates.length);
  const template = templates[idx];
  return template
    .replace(/\{subject\}/g, data.subject || '')
    .replace(/\{grade\}/g, data.grade || '')
    .replace(/\{title\}/g, data.title_candidate || '')
    .replace(/\{confidence\}/g, String(data.confidence || 0));
}
