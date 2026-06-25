import { Job } from 'bullmq';
import { IAIAdapter } from '@workspace/adapter-ai';
import { classifyByKeyword, getPrompt } from '../prompts/prompt-registry';

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
}

export class AiRecognitionProcessor {
  constructor(private aiAdapter: IAIAdapter) {}

  async process(job: Job<AiRecognitionJob>): Promise<AIResult> {
    const { sessionId, messageId, text, fileName, fileContent } = job.data;
    const attempt = job.attemptsMade + 1;
    const inputText = [fileName, text, fileContent].filter(Boolean).join(' ');

    console.log(`[Worker-AI] Job ${job.id} attempt ${attempt}: processing`);

    // Step 1: 关键词预分类选择 Prompt
    const suggestedType = classifyByKeyword(inputText);
    const promptName = suggestedType || 'personal_lesson';
    const prompt = getPrompt(promptName);
    const systemPrompt = prompt?.systemPrompt || '';

    // Step 2: 调用 AI (使用自定义 Prompt)
    let result: AIResult;
    try {
      const aiResult = await this.aiAdapter.recognizeWithPrompt(
        { text: inputText, fileName, fileContent },
        systemPrompt
      );

      result = {
        type: aiResult.predictedType || 'unknown',
        title_candidate: aiResult.title || fileName || '未命名',
        subject: aiResult.extractedFields?.subject || '',
        grade: aiResult.extractedFields?.grade || '',
        summary: aiResult.summary || '',
        confidence: aiResult.confidence,
        need_user_confirm: true,
        need_lesson_link: aiResult.predictedType === 'reflection',
        next_action: this.getNextAction(aiResult.predictedType),
        extracted_entities: aiResult.extractedFields || {},
        reason: `Prompt: ${promptName}, ` + (aiResult.extractedFields?.reason || ''),
      };
    } catch (error: any) {
      console.error(`[Worker-AI] Job ${job.id} AI failed:`, error.message);
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
        reason: `AI调用失败(已重试${attempt}次): ${error.message}`,
      };
    }

    console.log(`[Worker-AI] Job ${job.id}: type=${result.type} conf=${result.confidence}`);
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
