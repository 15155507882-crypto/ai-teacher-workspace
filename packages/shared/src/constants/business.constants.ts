/** 学年开始月日 (8月1日) */
export const ACADEMIC_YEAR_START_MONTH = 8;
export const ACADEMIC_YEAR_START_DAY = 1;

/** 学年结束月日 (7月31日) */
export const ACADEMIC_YEAR_END_MONTH = 7;
export const ACADEMIC_YEAR_END_DAY = 31;

/** 学期名称 */
export const SEMESTER_FIRST = '上学期';
export const SEMESTER_SECOND = '下学期';

/** 教学反思关联最近备课条数 */
export const RECENT_LESSON_COUNT = 3;

/** 默认上传文件大小限制 (200MB) */
export const DEFAULT_UPLOAD_MAX_SIZE = 200 * 1024 * 1024;

/** AI 置信度阈值 */
export const AI_CONFIDENCE_THRESHOLD = 0.6;

/** 计算当前学年学期 */
export function computeAcademicTerm(): { academic_year: string; semester: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const academicYear = month >= 8 ? `${year}-${year + 1}学年` : `${year - 1}-${year}学年`;
  const semester = month >= 2 && month <= 7 ? '下学期' : '上学期';
  return { academic_year: academicYear, semester };
}

/** 构建保存成功的 NL 回复 */
export function buildSuccessReply(contentType: string, data: Record<string, any>): string {
  const templates: Record<string, string[]> = {
    personal_lesson: [
      '已保存。《{title}》已归档到个人备课。需要的话，后续可以补充教案附件或者课后写一份教学反思。',
      '保存好了。你可以在个人备课中找到《{title}》。',
    ],
    reflection: [
      '已保存，并帮你关联到《{lesson}》这节课。以后查看这份备课时，就能同时看到这次教学反思了。\n\n{next_hint}',
      '好了。已将反思关联到《{lesson}》。后续回顾这节课时，这次反思会一起展示，帮你积累教学经验。\n\n{next_hint}',
    ],
    plan_summary: [
      '已保存。《{title}》已归档到{academic_year}{semester}的计划与总结中。学期末回顾时会自动汇总。',
      '保存好了。《{title}》已按{academic_year}{semester}归档。',
    ],
    group_lesson: [
      '已保存。关于「{title}」的集体备课记录已归档，组内其他老师也可以查看和参与讨论。\n\n{next_hint}',
      '好了。集体备课记录已保存，教研组的老师都可以在这里看到。\n\n{next_hint}',
    ],
  };
  const hints: Record<string, string[]> = {
    personal_lesson: [
      '如果想继续完善，可以上传这节课的课件或配套练习。',
      '这节课上完之后，随时可以来这里写一份教学反思。',
    ],
    reflection: ['下次上完课，也可以随时来这里记录反思。'],
    group_lesson: ['其他老师如果参与了这次集体备课，也可以让他们来评论区补充意见。'],
  };
  const list = templates[contentType] || ['已保存。'];
  const tpl = list[Math.floor(Math.random() * list.length)];
  const hintList = hints[contentType] || [];
  const nextHint = hintList.length > 0 ? hintList[Math.floor(Math.random() * hintList.length)] : '';
  return tpl
    .replace(/\{title\}/g, data.title || '')
    .replace(/\{lesson\}/g, data.linked_lesson_title || '')
    .replace(/\{academic_year\}/g, data.academic_year || '')
    .replace(/\{semester\}/g, data.semester || '')
    .replace(/\{next_hint\}/g, nextHint);
}
