import { AIRecognitionInput, AIRecognitionResult } from './types';

export interface IAIAdapter {
  recognize(input: AIRecognitionInput): Promise<AIRecognitionResult>;
  recognizeWithContext(input: AIRecognitionInput, history: string[]): Promise<AIRecognitionResult>;
  recognizeWithPrompt(
    input: AIRecognitionInput,
    systemPrompt: string
  ): Promise<AIRecognitionResult>;
}
