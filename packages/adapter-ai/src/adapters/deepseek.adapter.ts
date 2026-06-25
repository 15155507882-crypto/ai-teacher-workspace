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

    // Mock: 返回默认结果
    return {
      predictedType: ContentType.PERSONAL_LESSON,
      title: input.fileName || '未命名',
      confidence: 0.85,
      extractedFields: {
        subject: '',
        grade: '',
        summary: '',
        reason: `Prompt used: ${sysPrompt.slice(0, 30)}...`,
      },
      summary: 'AI 识别结果（Mock）',
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
