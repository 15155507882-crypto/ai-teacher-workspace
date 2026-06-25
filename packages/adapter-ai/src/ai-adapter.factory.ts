import { IAIAdapter } from './ai-adapter.interface';
import { DeepSeekAdapter } from './adapters';

export type AIAdapterType = 'deepseek' | 'openai';

export interface AIAdapterConfig {
  type: AIAdapterType;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export function createAIAdapter(config: AIAdapterConfig): IAIAdapter {
  switch (config.type) {
    case 'deepseek':
      return new DeepSeekAdapter({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
      });
    default:
      throw new Error(`Unsupported AI adapter type: ${config.type}`);
  }
}
