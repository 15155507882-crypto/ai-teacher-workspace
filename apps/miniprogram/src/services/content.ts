import { api } from './request';
import {
  ContentListData,
  ContentStatsData,
  BatchTeacherStatsData,
  ContentDetail,
  CommentItem,
  AddCommentRequest,
  ContentTypeStr,
} from '../types/api';

export const contentService = {
  /** 获取教师内容列表 */
  listByTeacher(
    teacherId: number,
    params?: { content_type?: ContentTypeStr; page?: number; size?: number }
  ): Promise<ContentListData> {
    return api.get<ContentListData>(`/teachers/${teacherId}/contents`, params);
  },

  /** 获取教师内容统计 */
  getStatsByTeacher(teacherId: number): Promise<ContentStatsData> {
    return api.get<ContentStatsData>(`/teachers/${teacherId}/content-stats`);
  },

  /** 批量教师统计 */
  getBatchTeacherStats(schoolId: number): Promise<BatchTeacherStatsData> {
    return api.get<BatchTeacherStatsData>('/home/teachers-stats', { school_id: schoolId });
  },

  /** 获取内容详情 */
  getDetail(id: number): Promise<ContentDetail> {
    return api.get<ContentDetail>(`/contents/${id}`);
  },

  /** 删除内容 */
  delete(id: number, reason?: string): Promise<{ message: string }> {
    return api.delete(`/contents/${id}`, reason ? { reason } : undefined);
  },
};

export const commentService = {
  /** 获取集体备课评论 */
  getGroupComments(contentId: number): Promise<{ items: CommentItem[] }> {
    return api.get(`/group-lessons/${contentId}/comments`);
  },

  /** 添加集体备课评论 */
  addGroupComment(contentId: number, data: AddCommentRequest): Promise<{ id: number; created_at: string }> {
    return api.post(`/group-lessons/${contentId}/comments`, data);
  },

  /** 删除集体备课评论 */
  deleteGroupComment(id: number): Promise<void> {
    return api.delete(`/group-lessons/comments/${id}`);
  },

  /** 获取个人备课评论 */
  getPersonalComments(contentId: number): Promise<{ items: CommentItem[] }> {
    return api.get(`/personal-lessons/${contentId}/comments`);
  },

  /** 添加个人备课评论 */
  addPersonalComment(contentId: number, data: AddCommentRequest): Promise<{ id: number; created_at: string }> {
    return api.post(`/personal-lessons/${contentId}/comments`, data);
  },

  /** 删除个人备课评论 */
  deletePersonalComment(id: number): Promise<void> {
    return api.delete(`/personal-lessons/comments/${id}`);
  },
};
