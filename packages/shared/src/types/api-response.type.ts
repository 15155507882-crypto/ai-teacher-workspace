/** 统一 API 响应结构 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}

/** 分页响应 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 分页请求参数 */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}
