import { api } from './request';
import {
  ChatRequest,
  ChatResponseData,
  RecognitionResult,
  AIMessage,
  ChatQuotaData,
  AISession,
  ConfirmActionRequest,
  ConfirmResponseData,
  FileUploadData,
  Conversation,
} from '../types/api';

export const aiService = {
  /** 发送聊天消息 */
  chat(data: ChatRequest): Promise<ChatResponseData> {
    return api.post<ChatResponseData>('/ai/chat', data);
  },

  /** 轮询 AI 识别结果 */
  getRecognition(messageId: number): Promise<RecognitionResult> {
    return api.get<RecognitionResult>(`/ai/recognition/${messageId}`);
  },

  /** 确认保存 AI 结果 */
  confirm(data: ConfirmActionRequest): Promise<ConfirmResponseData> {
    return api.post<ConfirmResponseData>('/ai/confirm', data);
  },

  /** 撤销操作（5分钟内） */
  undo(messageId: number): Promise<{ success: boolean; nl_reply: string }> {
    return api.post(`/ai/undo/${messageId}`);
  },

  /** 上传文件 */
  async uploadFile(filePath: string, fileName: string): Promise<FileUploadData> {
    return api.upload<FileUploadData>('/ai/upload', filePath, fileName);
  },

  /** 获取当前活跃会话 */
  getActiveSession(): Promise<AISession | null> {
    return api.get<AISession | null>('/ai/session');
  },

  /** 获取会话消息 */
  getMessages(sessionId: number): Promise<AIMessage[]> {
    return api.get<AIMessage[]>(`/ai/session/${sessionId}/messages`);
  },

  /** 获取每日配额 */
  getChatQuota(): Promise<ChatQuotaData> {
    return api.get<ChatQuotaData>('/ai/chat-quota');
  },

  /** 获取/创建今日会话 */
  getTodayConversation(): Promise<Conversation> {
    return api.get<Conversation>('/ai/conversations/today');
  },

  /** 获取会话列表 */
  getConversations(keyword?: string): Promise<Conversation[]> {
    return api.get<Conversation[]>('/ai/conversations', keyword ? { keyword } : undefined);
  },

  /** 删除会话 */
  deleteConversation(id: number): Promise<void> {
    return api.delete(`/ai/conversations/${id}`);
  },
};
