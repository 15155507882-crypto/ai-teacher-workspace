import { ContentType } from '@workspace/shared';
import { IAIAdapter } from '../ai-adapter.interface';
import { AIRecognitionInput, AIRecognitionResult } from '../types';

export interface DeepSeekCallParams {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}

export interface DeepSeekCallResult {
  predictedType?: ContentType | 'unknown';
  title?: string;
  confidence?: number;
  subject?: string;
  grade?: string;
  summary?: string;
  extractedFields?: Record<string, any>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  latencyMs?: number;
  error?: string;
  fallback?: boolean;
}

export class DeepSeekAdapter implements IAIAdapter {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
  }

  /** 构建请求参数（由调用方执行 HTTP 请求） */
  buildRequest(input: AIRecognitionInput, systemPrompt?: string): DeepSeekCallParams {
    return {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: this.model,
      systemPrompt: systemPrompt || this.buildDefaultSystemPrompt(),
      userPrompt: this.buildUserPrompt(input),
    };
  }

  /** 解析 API 返回的原始文本为结构化结果 */
  parseResponse(rawContent: string, input: AIRecognitionInput): DeepSeekCallResult {
    try {
      const parsed = JSON.parse(rawContent);
      // 兼容新旧字段名：title 或 title_candidate
      const title = parsed.title || parsed.title_candidate || input.fileName || '未命名';
      const extractedEntities = parsed.extracted_entities || {};
      return {
        predictedType: parsed.type || parsed.content_type || ContentType.PERSONAL_LESSON,
        title,
        confidence: parsed.confidence || 0.85,
        subject: parsed.subject || extractedEntities.subject || '',
        grade: parsed.grade || extractedEntities.grade || '',
        summary: parsed.summary || extractedEntities.summary || '',
        // 传递结构化字段供 Metadata Builder 使用
        extractedFields: {
          ...extractedEntities,
          subject: parsed.subject || extractedEntities.subject || '',
          grade: parsed.grade || extractedEntities.grade || '',
          summary: parsed.summary || extractedEntities.summary || '',
        },
      };
    } catch {
      return this.mockClassify(input);
    }
  }

  /** Fallback 关键词分类 */
  mockClassify(input: AIRecognitionInput): DeepSeekCallResult {
    const inputText =
      (input.fileName || '') + ' ' + (input.text || '') + ' ' + (input.fileContent || '');
    const lower = inputText.toLowerCase();
    let predictedType: ContentType = ContentType.PERSONAL_LESSON;
    let confidence = 0.75;
    let subject = '';
    let grade = '';
    const title = (input.fileName || input.text?.slice(0, 30) || '未命名')
      .replace(/\.(docx?|pptx?|pdf|jpg|jpeg|png)$/i, '')
      .replace(/[_-]/g, ' ')
      .trim();

    if (lower.includes('反思') || lower.includes('课后')) {
      predictedType = ContentType.REFLECTION;
      confidence = 0.88;
    } else if (lower.includes('集体备课') || lower.includes('教研')) {
      predictedType = ContentType.GROUP_LESSON;
      confidence = 0.82;
    } else if (lower.includes('计划') || lower.includes('总结') || lower.includes('学期')) {
      predictedType = ContentType.PLAN_SUMMARY;
      confidence = 0.8;
    }
    if (lower.includes('数学')) subject = '数学';
    else if (lower.includes('语文')) subject = '语文';
    else if (lower.includes('英语')) subject = '英语';

    return {
      predictedType,
      title,
      confidence,
      subject,
      grade,
      summary: `${title} - ${subject}${grade}教学内容`,
      extractedFields: { subject, grade, summary: `${title} - ${subject}${grade}教学内容` },
    };
  }

  // ======= IAIAdapter 接口 =======
  async recognize(input: AIRecognitionInput): Promise<AIRecognitionResult> {
    return this.toResult(this.mockClassify(input));
  }
  async recognizeWithContext(
    input: AIRecognitionInput,
    _history: string[]
  ): Promise<AIRecognitionResult> {
    return this.toResult(this.mockClassify(input));
  }
  async recognizeWithPrompt(
    input: AIRecognitionInput,
    _systemPrompt: string
  ): Promise<AIRecognitionResult> {
    return this.toResult(this.mockClassify(input));
  }

  private toResult(r: DeepSeekCallResult): AIRecognitionResult {
    return {
      predictedType: r.predictedType || ContentType.PERSONAL_LESSON,
      title: r.title || '未命名',
      confidence: r.confidence || 0.75,
      extractedFields: { subject: r.subject || '', grade: r.grade || '', summary: r.summary || '' },
      summary: r.summary || '',
    };
  }

  private buildDefaultSystemPrompt(): string {
    return `你是一个教育内容分类助手。请分析用户提供的教学资料，返回JSON。格式: {"type":"personal_lesson|reflection|group_lesson|plan_summary","title":"标题","subject":"学科","grade":"年级","confidence":0.9,"summary":"摘要"}`;
  }

  private buildUserPrompt(input: AIRecognitionInput): string {
    return [input.fileName, input.text, input.fileContent?.slice(0, 2000)]
      .filter(Boolean)
      .join('\n');
  }
}
