import { Job } from 'bullmq';
import { IAIAdapter } from '@workspace/adapter-ai';

export interface AiRecognitionJob {
  sessionId: number;
  messageId: number;
  teacherId: number;
  schoolId: number;
  text?: string;
  fileId?: number;
  fileName?: string;
  fileContent?: string;
  scope?: string;
}

export class AiRecognitionProcessor {
  constructor(private aiAdapter: IAIAdapter) {}

  async process(job: Job<AiRecognitionJob>) {
    const { sessionId, messageId, text, fileName, fileContent, scope } = job.data;

    const systemPrompt = `你是学校AI教师工作空间的内容识别助手。
任务：根据用户发送的文字、文件名、文件文本片段，判断内容类型。
可选类型只能是：personal_lesson、group_lesson、reflection、plan_summary、unknown。

规则：
1. 不允许编造教师姓名、学校、教研组，这些来自系统登录态。
2. 如果判断为 reflection，必须设置 need_lesson_link=true。
3. 如果置信度低于0.70，type=unknown。
4. 输出必须为JSON，不要输出额外说明。

JSON格式：
{
  "type": "personal_lesson|group_lesson|reflection|plan_summary|unknown",
  "title": "建议标题",
  "subject": "学科或空",
  "grade": "年级或空",
  "summary": "200字内摘要",
  "confidence": 0.0,
  "need_user_confirm": true,
  "need_lesson_link": false,
  "reason": "判断原因"
}

优先级规则：
1. 内容包含课堂效果/学生表现/课后改进 → 教学反思，need_lesson_link=true
2. 文件名或正文包含教学计划/总结/学期/年度 → 计划与总结
3. 内容包含集体备课/教研组/组内讨论 → 集体备课
4. PPT/教案/课件/教学目标 → 个人备课
5. 无法确定 → unknown`;

    let userPrompt = '';
    if (fileName) userPrompt += `文件名: ${fileName}\n`;
    if (text) userPrompt += `文本内容: ${text}\n`;
    if (fileContent) userPrompt += `文件内容: ${fileContent}\n`;
    if (!userPrompt) userPrompt = '无内容';

    const result = await this.aiAdapter.recognize({
      text: userPrompt,
      fileName,
      fileContent,
      scope,
    });
    console.log(
      `[Worker-AI] Job ${job.id}: type=${result.predictedType} conf=${result.confidence}`
    );

    return {
      sessionId,
      messageId,
      type: result.predictedType,
      title: result.title,
      summary: result.summary || '',
      subject: result.extractedFields?.subject || '',
      grade: result.extractedFields?.grade || '',
      confidence: result.confidence,
      need_user_confirm: true,
      need_lesson_link: result.predictedType === 'reflection',
      reason: result.extractedFields?.reason || '',
    };
  }
}
