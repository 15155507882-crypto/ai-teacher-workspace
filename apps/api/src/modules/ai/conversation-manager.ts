import { Redis } from 'ioredis';
import { ConversationStateMachine, ConversationState } from './conversation-state-machine';

export interface WorkspaceContext {
  sessionId: number;
  teacherId: number;
  file?: { fileId: number; fileName: string };
  lastMessage?: string;
  lastIntent?: string;
}

type EventHandler = (event: string, data: any) => void;

/** 会话管理器：协调 Workspace + StateMachine + EventBus */
export class ConversationManager {
  readonly stateMachine: ConversationStateMachine;
  private listeners: EventHandler[] = [];
  private context_: WorkspaceContext;

  constructor(
    private readonly redis: Redis,
    sessionId: number,
    teacherId: number
  ) {
    this.stateMachine = new ConversationStateMachine();
    this.context_ = { sessionId, teacherId };
  }

  // ===== State Machine =====

  async startProcessing() {
    this.stateMachine.forceSet('idle');
    const result = this.stateMachine.transition('processing');
    await this.persist();
    return result;
  }

  async toChatting() {
    const result = this.stateMachine.transition('chatting');
    if (result.success) await this.persist();
    return result;
  }

  async toGenerating() {
    const result = this.stateMachine.transition('generating');
    if (result.success) await this.persist();
    return result;
  }

  async toPreview() {
    const result = this.stateMachine.transition('preview');
    if (result.success) await this.persist();
    return result;
  }

  async toSaving() {
    const result = this.stateMachine.transition('saving');
    if (result.success) await this.persist();
    return result;
  }

  async toSaved() {
    const result = this.stateMachine.transition('saved');
    if (result.success) await this.persist();
    return result;
  }

  async toError(errorMsg: string) {
    this.stateMachine.forceSet('error');
    await this.setWorkspaceKV('lastError', errorMsg);
    await this.persist();
  }

  async retry() {
    this.stateMachine.forceSet('processing');
    await this.setWorkspaceKV('lastError', null);
    await this.persist();
  }

  // ===== Context =====

  get context(): WorkspaceContext {
    return this.context_;
  }

  setFile(fileId: number, fileName: string) {
    this.context_.file = { fileId, fileName };
  }

  setLastMessage(text: string) {
    this.context_.lastMessage = text;
  }

  setLastIntent(intent: string) {
    this.context_.lastIntent = intent;
  }

  // ===== Event Bus =====

  onEvent(handler: EventHandler) {
    this.listeners.push(handler);
  }

  emit(event: string, data: any) {
    for (const h of this.listeners) {
      try { h(event, data); } catch {}
    }
  }

  // ===== Persist =====

  private async persist() {
    const key = `ai:workspace:${this.context_.sessionId}`;
    const payload = {
      state: this.stateMachine.state,
      context: this.context_,
      updatedAt: Date.now(),
    };
    await this.redis.set(key, JSON.stringify(payload), 'EX', 86400);
  }

  async setWorkspaceKV(k: string, v: any) {
    const key = `ai:workspace:${this.context_.sessionId}`;
    const raw = await this.redis.get(key);
    const data = raw ? JSON.parse(raw) : {};
    data[k] = v;
    data.updatedAt = Date.now();
    await this.redis.set(key, JSON.stringify(data), 'EX', 86400);
  }

  async getWorkspaceKV(k: string): Promise<any> {
    const key = `ai:workspace:${this.context_.sessionId}`;
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw)[k] : null;
  }

  async restore(): Promise<boolean> {
    const key = `ai:workspace:${this.context_.sessionId}`;
    const raw = await this.redis.get(key);
    if (!raw) return false;
    const data = JSON.parse(raw);
    this.stateMachine.forceSet(data.state || 'idle');
    if (data.context) this.context_ = data.context;
    return true;
  }
}
