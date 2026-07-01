import Taro from '@tarojs/taro';
import { ApiResponse } from '../types/api';

// ====== 配置 ======
// H5 模式走相对路径（由 dev-server 代理到后端），小程序走绝对路径
const API_BASE_URL = typeof window !== 'undefined' ? '/api' : 'http://localhost:3000/api';
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  TEACHER: 'teacher',
} as const;

// ====== 工具函数 ======
function getAccessToken(): string {
  try {
    return Taro.getStorageSync(STORAGE_KEYS.ACCESS_TOKEN) || '';
  } catch {
    return '';
  }
}

function getRefreshToken(): string {
  try {
    return Taro.getStorageSync(STORAGE_KEYS.REFRESH_TOKEN) || '';
  } catch {
    return '';
  }
}

// ====== 请求封装 ======
async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  options?: { public?: boolean; formData?: boolean }
): Promise<T> {
  const isPublic = options?.public || false;
  const isFormData = options?.formData || false;

  const token = getAccessToken();
  const header: Record<string, string> = {};

  if (!isPublic && token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData) {
    header['content-type'] = 'application/json';
  }

  try {
    const res = await Taro.request({
      url: API_BASE_URL + url,
      method,
      data,
      header,
      timeout: 30000,
    });

    // 解包响应
    const body = res.data as ApiResponse<T>;

    if (res.statusCode >= 400) {
      // 401 处理：尝试刷新 Token
      if (res.statusCode === 401 && !isPublic) {
        const refreshed = await refreshTokenAndRetry();
        if (refreshed) {
          return request<T>(method, url, data, options);
        }
        // 刷新失败，清除登录状态
        clearAuth();
        Taro.redirectTo({ url: '/pages/login/index' });
        throw new Error('登录已过期，请重新登录');
      }
      throw new Error(body.message || `请求失败 (${res.statusCode})`);
    }

    if (body.code !== undefined && body.code !== 0) {
      throw new Error(body.message || `业务错误 (code: ${body.code})`);
    }

    return body.data as T;
  } catch (err: any) {
    if (err.message && !err.message.includes('请求失败') && !err.message.includes('业务错误')) {
      throw new Error(err.message || '网络异常，请稍后重试');
    }
    throw err;
  }
}

// ====== Token 刷新 ======
async function refreshTokenAndRetry(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await Taro.request({
      url: API_BASE_URL + '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      header: { 'content-type': 'application/json' },
    });

    const body = res.data as ApiResponse<{ tokenPair: { accessToken: string; refreshToken: string; expiresIn: number } }>;

    if (body.code === 0 && body.data?.tokenPair) {
      Taro.setStorageSync(STORAGE_KEYS.ACCESS_TOKEN, body.data.tokenPair.accessToken);
      Taro.setStorageSync(STORAGE_KEYS.REFRESH_TOKEN, body.data.tokenPair.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function clearAuth(): void {
  try {
    Taro.removeStorageSync(STORAGE_KEYS.ACCESS_TOKEN);
    Taro.removeStorageSync(STORAGE_KEYS.REFRESH_TOKEN);
    Taro.removeStorageSync(STORAGE_KEYS.TEACHER);
  } catch { /* ignore */ }
}

// ====== 导出方法 ======
export const api = {
  get<T>(url: string, params?: any, isPublic = false): Promise<T> {
    const query = params ? '?' + Object.keys(params)
      .filter(k => params[k] !== undefined && params[k] !== null)
      .map(k => `${k}=${encodeURIComponent(params[k])}`)
      .join('&') : '';
    return request<T>('GET', url + query, undefined, { public: isPublic });
  },
  post<T>(url: string, data?: any, isPublic = false): Promise<T> {
    return request<T>('POST', url, data, { public: isPublic });
  },
  put<T>(url: string, data?: any): Promise<T> {
    return request<T>('PUT', url, data);
  },
  delete<T>(url: string, data?: any): Promise<T> {
    return request<T>('DELETE', url, data);
  },
  async upload<T>(url: string, filePath: string, fileName: string): Promise<T> {
    const token = getAccessToken();
    try {
      const res = await Taro.uploadFile({
        url: API_BASE_URL + url,
        filePath,
        name: 'file',
        header: token ? { Authorization: `Bearer ${token}` } : {},
        formData: {},
      });
      const body = JSON.parse(res.data) as ApiResponse<T>;
      if (body.code !== 0) throw new Error(body.message || '上传失败');
      return body.data as T;
    } catch (err: any) {
      throw new Error(err.message || '上传失败');
    }
  },
};

export { getAccessToken, STORAGE_KEYS };
