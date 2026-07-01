import { api, clearAuth, STORAGE_KEYS } from './request';
import {
  LoginRequest,
  LoginResponseData,
  CaptchaData,
  TokenPair,
  ChangePasswordRequest,
} from '../types/api';
import Taro from '@tarojs/taro';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponseData> {
    const res = await api.post<LoginResponseData>('/auth/login', data, true);
    // 存储 token
    Taro.setStorageSync(STORAGE_KEYS.ACCESS_TOKEN, res.tokenPair.accessToken);
    Taro.setStorageSync(STORAGE_KEYS.REFRESH_TOKEN, res.tokenPair.refreshToken);
    Taro.setStorageSync(STORAGE_KEYS.TEACHER, JSON.stringify(res.teacher));
    return res;
  },

  async getCaptcha(): Promise<CaptchaData> {
    return api.get<CaptchaData>('/auth/captcha', undefined, true);
  },

  async refreshToken(): Promise<TokenPair> {
    const refreshToken = Taro.getStorageSync(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) throw new Error('无刷新令牌');
    const res = await api.post<{ tokenPair: TokenPair }>('/auth/refresh', { refreshToken }, true);
    Taro.setStorageSync(STORAGE_KEYS.ACCESS_TOKEN, res.tokenPair.accessToken);
    Taro.setStorageSync(STORAGE_KEYS.REFRESH_TOKEN, res.tokenPair.refreshToken);
    return res.tokenPair;
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await api.post('/auth/change-password', data);
    // 改密后清除登录状态，需重新登录
    clearAuth();
  },

  logout(): void {
    clearAuth();
    Taro.redirectTo({ url: '/pages/login/index' });
  },

  isLoggedIn(): boolean {
    try {
      const token = Taro.getStorageSync(STORAGE_KEYS.ACCESS_TOKEN);
      return !!token;
    } catch {
      return false;
    }
  },
};
