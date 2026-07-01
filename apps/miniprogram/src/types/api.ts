// ====== 全局响应包装 ======
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ====== 认证 ======
export interface LoginRequest {
  mobile: string;
  password: string;
  captchaId?: string;
  captchaCode?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TeacherBrief {
  id: number;
  name: string;
  mobile: string;
  role: 'teacher' | 'admin';
  schoolId: number;
  departmentId: number;
}

export interface LoginResponseData {
  tokenPair: TokenPair;
  teacher: TeacherBrief;
  mustChangePassword: boolean;
}

export interface CaptchaData {
  captchaId: string;
  imageBase64: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ====== AI 聊天 ======
export interface ChatRequest {
  text?: string;
  file_id?: number | string;
  file_ids?: number[];
  scope?: string;
  mode?: string;
}

export interface ChatResponseData {
  sessionId: number;
  messageId: number;
  status: 'processing';
}

export type RecognitionStatus = 'pending' | 'completed' | 'timeout';

export interface RecognitionResult {
  status: RecognitionStatus;
  message?: string;
  result?: AIWorkerResult;
}

export interface AIWorkerResult {
  type: string;
  title_candidate?: string;
  subject?: string;
  grade?: string;
  summary?: string;
  confidence?: number;
  modules?: Record<string, any>;
  recognition_reasons?: string[];
  showPreviewCard?: boolean;
  isBusinessScene?: boolean;
  need_user_confirm?: boolean;
  nl_reply?: string;
}

export interface AIMessage {
  id: number;
  session_id: number;
  sender_type: 'teacher' | 'ai';
  message_type: 'text' | 'file' | 'action';
  text_content: string | null;
  file_id: number | null;
  created_at: string;
}

export interface ChatQuotaData {
  used: number;
  limit: number;
  remaining: number;
  date: string;
}

export interface AISession {
  id: number;
  teacher_id: number;
  scope: string;
  status: string;
  conversation_title?: string;
  created_at: string;
  updated_at: string;
}

// ====== AI 确认 ======
export interface ConfirmActionRequest {
  messageId: number;
  type: string;
  title: string;
  subject?: string;
  grade?: string;
  linkedContentId?: number;
  extractedEntities?: Record<string, any>;
  fileIds?: number[];
}

export interface ConfirmSuccessData {
  success: true;
  nl_reply: string;
  actionId: number;
}

export interface ConfirmConflictData {
  conflict: true;
  existing: {
    id: number;
    version: number;
    created_at: string;
  };
  message: string;
  options: ('overwrite' | 'new_version')[];
}

export type ConfirmResponseData = ConfirmSuccessData | ConfirmConflictData;

// ====== 内容 ======
export type ContentTypeStr = 'personal_lesson' | 'reflection' | 'group_lesson' | 'plan_summary';

export interface ContentItem {
  id: number;
  teacher_id: number;
  department_id: number;
  content_type: ContentTypeStr;
  title: string;
  summary: string | null;
  academic_year: string;
  semester: string;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export type ContentListData = PaginatedData<ContentItem>;

export interface ContentStatsData {
  personal_lesson: number;
  reflection: number;
  group_lesson: number;
  plan_summary: number;
  total: number;
}

export type BatchTeacherStatsData = Record<string, ContentStatsData>;

export interface ContentDetail extends ContentItem {
  personal_lesson?: any;
  reflection?: any;
  group_lesson?: any;
  plan_summary?: any;
  attachments?: AttachmentItem[];
}

export interface AttachmentItem {
  id: number;
  content_id: number;
  file_id: number;
  attachment_role: string;
  file?: FileItem;
}

export interface FileItem {
  id: number;
  original_name: string;
  mime_type: string;
  file_ext: string;
  file_size: number;
  preview_status: string;
  preview_url?: string;
}

// ====== 评论 ======
export interface CommentItem {
  id: number;
  teacher_id: number;
  teacher_name: string;
  comment_text: string | null;
  file_id: number | null;
  file_name: string | null;
  created_at: string;
}

export interface AddCommentRequest {
  comment_text?: string;
  file_id?: number;
}

// ====== 文件上传 ======
export interface FileUploadData {
  file_id: number;
  original_name: string;
  mime_type: string;
  file_ext: string;
  file_size: number;
}

// ====== 教师 ======
export interface TeacherItem {
  id: number;
  name: string;
  mobile: string;
  gender?: string;
  employee_no?: string;
  avatar?: string;
  department_id?: number;
  department_name?: string;
  role: string;
  status: string;
  personal_lesson_count?: number;
  reflection_count?: number;
  group_lesson_count?: number;
  plan_summary_count?: number;
}

// ====== 首页分组 ======
export interface HomeGroup {
  id: number;
  name: string;
  teachers: TeacherItem[];
}

// ====== 会话 ======
export interface Conversation {
  id: number;
  title: string;
  summary?: string;
  status: string;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

// ====== 学校信息 ======
export interface SchoolInfo {
  id: number;
  name: string;
  short_name: string;
  logo_data?: string;
  login_bg_data?: string;
}
