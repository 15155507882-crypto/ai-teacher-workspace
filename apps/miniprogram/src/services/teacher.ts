import { api } from './request';
import { TeacherItem, HomeGroup, SchoolInfo } from '../types/api';

export const teacherService = {
  /** 获取教师列表 */
  async list(schoolId: number = 1, keyword?: string): Promise<TeacherItem[]> {
    const res = await api.get<any>('/home/teachers', { school_id: schoolId, keyword });
    return res?.items || res || [];
  },

  /** 获取首页分组（含教师） */
  getHomeGroups(): Promise<HomeGroup[]> {
    return api.get<HomeGroup[]>('/home/groups');
  },

  /** 获取教师内容统计（新版统一接口） */
  getStats(schoolId: number = 1): Promise<Record<string, any>> {
    return api.get('/home/teachers-stats', { school_id: schoolId });
  },

  /** 获取学校信息（公开） */
  getSchoolInfo(): Promise<SchoolInfo> {
    return api.get<SchoolInfo>('/public/school', undefined, true);
  },
};
