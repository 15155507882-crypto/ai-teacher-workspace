import { Job } from 'bullmq';
import { IAIAdapter } from '@workspace/adapter-ai';
import { classifyByKeyword, getPrompt, buildNLReply } from '../prompts/prompt-registry';

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

export interface AIResult {
  type: string;
  title_candidate: string;
  subject?: string;
  grade?: string;
  summary: string;
  confidence: number;
  need_user_confirm: boolean;
  need_lesson_link: boolean;
  next_action: string;
  extracted_entities: Record<string, any>;
  reason: string;
  /** 自然语言回复，展示给老师 */
  nl_reply: string;
}

export class AiRecognitionProcessor {
  constructor(private aiAdapter: IAIAdapter) {}

  async process(job: Job<AiRecognitionJob>): Promise<AIResult> {
    const { sessionId, messageId, text, fileName, fileContent } = job.data;
    const attempt = job.attemptsMade + 1;
    const inputText = [fileName, text, fileContent].filter(Boolean).join(' ');

    console.log(`[Worker-AI] Job ${job.id} attempt ${attempt}`);

    const suggestedType = classifyByKeyword(inputText);
    const promptName = suggestedType || 'personal_lesson';
    const prompt = getPrompt(promptName);
    const systemPrompt = prompt?.systemPrompt || '';

    let result: AIResult;
    try {
      const aiResult = await this.aiAdapter.recognizeWithPrompt(
        { text: inputText, fileName, fileContent },
        systemPrompt
      );

      const title = aiResult.title || fileName || '未命名';
      const subject = aiResult.extractedFields?.subject || '';
      const grade = aiResult.extractedFields?.grade || '';

      const nlReply = buildNLReply(prompt?.nlReplyTemplate || '我已处理了你的消息。', {
        title_candidate: title,
        subject,
        grade,
        confidence: aiResult.confidence,
      });

      result = {
        type: aiResult.predictedType || 'unknown',
        title_candidate: title,
        subject,
        grade,
        summary: aiResult.summary || '',
        confidence: aiResult.confidence,
        need_user_confirm: true,
        need_lesson_link: aiResult.predictedType === 'reflection',
        next_action: this.getNextAction(aiResult.predictedType),
        extracted_entities: aiResult.extractedFields || {},
        reason: `Prompt: ${promptName}`,
        nl_reply: nlReply,
      };
    } catch (error: any) {
      console.error(`[Worker-AI] Job ${job.id} failed:`, error.message);
      if (job.attemptsMade < 2) throw error;
      result = {
        type: 'unknown',
        title_candidate: fileName || '未命名内容',
        summary: '',
        confidence: 0,
        need_user_confirm: true,
        need_lesson_link: false,
        next_action: 'manual_select',
        extracted_entities: {},
        reason: `AI调用失败(${attempt}次)`,
        nl_reply:
          '抱歉，我暂时无法准确判断这份内容属于哪一类。\n\n请选择保存类型：\n1. 个人备课\n2. 集体备课\n3. 教学反思\n4. 计划与总结',
      };
    }

    console.log(`[Worker-AI] Job ${job.id}: type=${result.type}`);
    return result;
  }

  private getNextAction(type: string): string {
    const map: Record<string, string> = {
      personal_lesson: 'confirm_personal_lesson',
      reflection: 'link_personal_lesson',
      group_lesson: 'confirm_group_lesson',
      plan_summary: 'confirm_plan_summary',
      unknown: 'manual_select',
    };
    return map[type] || 'manual_select';
  }
}
