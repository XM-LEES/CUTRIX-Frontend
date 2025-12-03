import apiClient from './client';
import { tokenManager } from './client';
import { LoginRequest, LoginResponse, RefreshTokenRequest, User } from '@/types';

export const authApi = {
  /**
   * 登录
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<any>('/auth/login', data);
    // 后端直接返回数据，不是包装在 success/data 中
    if (response.data.access_token && response.data.user) {
      const loginData: LoginResponse = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: response.data.expires_at,
        user: response.data.user,
      };
      // 存储 Token
      tokenManager.setAccessToken(loginData.access_token);
      tokenManager.setRefreshToken(loginData.refresh_token);
      tokenManager.setTokenExpiry(loginData.expires_at);
      return loginData;
    }
    throw new Error(response.data.error || '登录失败');
  },

  /**
   * 刷新 Token
   */
  refresh: async (data: RefreshTokenRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<any>('/auth/refresh', data);
    // 后端直接返回数据
    if (response.data.access_token) {
      const loginData: LoginResponse = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: response.data.expires_at,
        user: response.data.user || { user_id: 0, name: '', role: 'worker', is_active: true },
      };
      tokenManager.setAccessToken(loginData.access_token);
      tokenManager.setRefreshToken(loginData.refresh_token);
      tokenManager.setTokenExpiry(loginData.expires_at);
      return loginData;
    }
    throw new Error(response.data.error || '刷新 Token 失败');
  },

  /**
   * 修改密码
   */
  changePassword: async (data: { old_password: string; new_password: string }): Promise<void> => {
    await apiClient.put('/auth/password', data);
    // 204 No Content
  },

  /**
   * 登出（清除本地 Token）
   */
  logout: (): void => {
    tokenManager.clearTokens();
  },
};

