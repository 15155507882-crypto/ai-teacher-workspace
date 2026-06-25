import { ContentType } from '@workspace/shared';

export interface AIRecognitionInput {
  /** 文本内容 */
  text?: string;
  /** 上传文件名 */
  fileName?: string;
  /** 文件解析后的文本内容 */
  fileContent?: string;
  /** 上下文范围 */
  scope?: string;
}

export interface AIRecognitionResult {
  /** AI 预测类型 */
  predictedType: ContentType | 'unknown';
  /** AI 提取的标题 */
  title: string;
  /** 置信度 0.00 ~ 1.00 */
  confidence: number;
  /** AI 提取的其他字段 */
  extractedFields: Record<string, any>;
  /** AI 生成的摘要 */
  summary?: string;
}
