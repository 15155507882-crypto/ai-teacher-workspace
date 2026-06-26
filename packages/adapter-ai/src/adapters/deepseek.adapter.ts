import { ContentType } from '@workspace/shared';
import { IAIAdapter } from '../ai-adapter.interface';
import { AIRecognitionInput, AIRecognitionResult } from '../types';

export class DeepSeekAdapter implements IAIAdapter {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
  }

  async recognize(input: AIRecognitionInput): Promise<AIRecognitionResult> {
    return this.recognizeWithPrompt(input, '');
  }

  async recognizeWithContext(
    input: AIRecognitionInput,
    history: string[]
  ): Promise<AIRecognitionResult> {
    return this.recognizeWithPrompt(input, '');
  }

  async recognizeWithPrompt(
    input: AIRecognitionInput,
    systemPrompt: string
  ): Promise<AIRecognitionResult> {
    const userPrompt = this.buildUserPrompt(input);
    const sysPrompt = systemPrompt || this.buildDefaultSystemPrompt();

    // TODO: Sprint 4C - 实现实际 DeepSeek HTTP API 调用
    // curl -X POST https://api.deepseek.com/v1/chat/completions
    //   -H "Authorization: Bearer $AI_API_KEY"
    //   -d '{ "model": "deepseek-chat", "messages": [{ "role": "system", "content": "..." }, { "role": "user", "content": "..." }] }'

    // Smart mock: 基于文件名+文本内容关键词分类
    const inputText = (input.fileName || '') + ' ' + (input.text || '') + ' ' + (input.fileContent || '');
    const lower = inputText.toLowerCase();
    
    let predictedType: ContentType | 'unknown' = ContentType.PERSONAL_LESSON;
    let confidence = 0.75;
    let subject = '';
    let grade = '';
    let title = input.fileName || input.text?.slice(0, 30) || '未命名';

    // Keyword-based classification
    if (lower.includes('反思') || lower.includes('课后') || lower.includes('改进') || lower.includes('效果')) {
      predictedType = ContentType.REFLECTION; confidence = 0.88;
    } else if (lower.includes('集体备课') || lower.includes('教研') || lower.includes('组内') || lower.includes('评课')) {
      predictedType = ContentType.GROUP_LESSON; confidence = 0.82;
    } else if (lower.includes('计划') || lower.includes('总结') || lower.includes('学期') || lower.includes('年度')) {
      predictedType = ContentType.PLAN_SUMMARY; confidence = 0.80;
    } else if (lower.includes('教案') || lower.includes('课件') || lower.includes('备课') || lower.includes('教学设计')) {
      predictedType = ContentType.PERSONAL_LESSON; confidence = 0.90;
    }

    // Subject detection
    if (lower.includes('数学')) subject = '数学';
    else if (lower.includes('语文')) subject = '语文';
    else if (lower.includes('英语')) subject = '英语';
    else if (lower.includes('科学')) subject = '科学';
    
    // Grade detection
    if (lower.includes('一年级')) grade = '一年级';
    else if (lower.includes('二年级')) grade = '二年级';
    else if (lower.includes('三年级')) grade = '三年级';
    else if (lower.includes('四年级')) grade = '四年级';
    else if (lower.includes('五年级')) grade = '五年级';
    else if (lower.includes('六年级')) grade = '六年级';

    // Clean title: remove extension
    title = title.replace(/\.(docx?|pptx?|pdf|jpg|jpeg|png)$/i, '').replace(/[_-]/g, ' ').trim();

    return {
      predictedType,
      title: title || '未命名',
      confidence,
      extractedFields: {
        subject,
        grade,
        summary: `${title} - ${subject}${grade}教学内容`,
        reason: `关键词匹配: ${predictedType}`,
      },
      summary: `${title} - ${subject}${grade}教学内容`,
    };
  }

  private buildDefaultSystemPrompt(): string {
    return '你是一个教育内容分类助手。请按JSON格式返回识别结果。';
  }

  private buildUserPrompt(input: AIRecognitionInput): string {
    const parts: string[] = [];
    if (input.fileName) parts.push(`文件名: ${input.fileName}`);
    if (input.text) parts.push(`文本内容: ${input.text}`);
    if (input.fileContent) parts.push(`文件内容: ${input.fileContent}`);
    return parts.join('\n');
  }
}
