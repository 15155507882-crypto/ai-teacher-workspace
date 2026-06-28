/** AI 工作空间状态机 — 独立模块 */
export type ConversationState =
  | 'idle'
  | 'processing'
  | 'chatting'
  | 'generating'
  | 'asking'
  | 'preview'
  | 'saving'
  | 'saved'
  | 'error';

const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  idle: ['processing'],
  processing: ['chatting', 'generating', 'asking', 'error'],
  chatting: ['processing', 'error'],
  generating: ['preview', 'error'],
  asking: ['processing', 'error'],
  preview: ['saving', 'processing', 'error'],
  saving: ['saved', 'error'],
  saved: ['processing', 'error'],
  error: ['processing'],
};

const FORBIDDEN_TRANSITIONS: Record<string, string> = {
  'idle→saving': '必须经过预览',
  'idle→saved': '必须经过预览→保存',
  'processing→saved': '必须经过预览→保存',
  'error→saved': '必须先重试',
  'chatting→saving': '必须先生成内容',
};

export class ConversationStateMachine {
  private current: ConversationState = 'idle';

  get state(): ConversationState {
    return this.current;
  }

  /** 尝试状态转换 */
  transition(to: ConversationState): { success: true } | { success: false; reason: string } {
    const key = `${this.current}→${to}` as keyof typeof FORBIDDEN_TRANSITIONS;
    if (FORBIDDEN_TRANSITIONS[key]) {
      return { success: false, reason: FORBIDDEN_TRANSITIONS[key] };
    }
    const allowed = VALID_TRANSITIONS[this.current] || [];
    if (!allowed.includes(to)) {
      return { success: false, reason: `不允许从 ${this.current} 转换到 ${to}` };
    }
    this.current = to;
    return { success: true };
  }

  /** 强制设置状态（用于恢复） */
  forceSet(state: ConversationState) {
    this.current = state;
  }

  /** 是否在终态 */
  isTerminal(): boolean {
    return ['saved'].includes(this.current);
  }

  /** 是否可以接受新输入 */
  canAcceptInput(): boolean {
    return ['idle', 'chatting', 'preview', 'saved', 'error'].includes(this.current);
  }
}
