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
    return this.callAI(input, []);
  }

  async recognizeWithContext(
    input: AIRecognitionInput,
    history: string[]
  ): Promise<AIRecognitionResult> {
    return this.callAI(input, history);
  }

  private async callAI(input: AIRecognitionInput, history: string[]): Promise<AIRecognitionResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input, history);

    // TODO: 在 Sprint 4 中实现实际 HTTP 调用
    // 当前返回 mock 结果，确保接口定义正确
    return {
      predictedType: ContentType.PERSONAL_LESSON,
      title: input.fileName || '未命名',
      confidence: 0.85,
      extractedFields: {},
      summary: 'AI 识别结果（Mock）',
    };
  }

  private buildSystemPrompt(): string {
    return `你是一个教育内容分类助手。请识别教师提交的内容类型：
- personal_lesson: 个人备课（课件、教案、教学设计）
- reflection: 教学反思（课后总结、反思文字）
- group_lesson: 集体备课（多人参与的备课内容）
- plan_summary: 计划与总结（教学计划、教研计划、学期总结）

请返回 JSON 格式：{"type": "...", "title": "...", "confidence": 0.XX, "summary": "..."}`;
  }

  private buildUserPrompt(input: AIRecognitionInput, history: string[]): string {
    const parts: string[] = [];
    if (input.fileName) parts.push(`文件名: ${input.fileName}`);
    if (input.text) parts.push(`文本内容: ${input.text}`);
    if (input.fileContent) parts.push(`文件内容: ${input.fileContent}`);
    if (history.length > 0) {
      parts.push(`对话历史: ${history.join(' | ')}`);
    }
    return parts.join('\n');
  }
}
