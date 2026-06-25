import { AIRecognitionInput, AIRecognitionResult } from './types';

export interface IAIAdapter {
  /** 识别内容类型与提取字段 */
  recognize(input: AIRecognitionInput): Promise<AIRecognitionResult>;

  /** 带上下文的识别 */
  recognizeWithContext(input: AIRecognitionInput, history: string[]): Promise<AIRecognitionResult>;
}
