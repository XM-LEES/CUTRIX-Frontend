import { create } from 'zustand';
import { authApi, tokenManager } from '@/api';
import { User, LoginRequest, UserRole } from '@/types';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,

  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.login(data);
      // 标准化用户数据格式（兼容后端大写字段）
      const user: User = {
        user_id: response.user.user_id || response.user.UserID || 0,
        name: response.user.name || response.user.Name || '',
        role: (response.user.role || response.user.Role || 'worker') as UserRole,
        is_active: response.user.is_active !== undefined ? response.user.is_active : (response.user.IsActive !== undefined ? response.user.IsActive : true),
        user_group: response.user.user_group || response.user.UserGroup || undefined,
        note: response.user.note || response.user.Note || undefined,
      };
      // 保存用户信息到 localStorage
      localStorage.setItem('cutrix_user', JSON.stringify(user));
      set({
        isAuthenticated: true,
        user,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  logout: () => {
    authApi.logout();
    localStorage.removeItem('cutrix_user');
    set({
      isAuthenticated: false,
      user: null,
      error: null,
    });
  },

  checkAuth: () => {
    const token = tokenManager.getAccessToken();
    if (token && !tokenManager.isTokenExpired()) {
      // 如果有有效的 Token，尝试从 localStorage 恢复用户信息
      const userStr = localStorage.getItem('cutrix_user');
      if (userStr) {
        try {
          const rawUser = JSON.parse(userStr);
          // 标准化用户数据格式（兼容后端大写字段）
          const user: User = {
            user_id: rawUser.user_id || rawUser.UserID || 0,
            name: rawUser.name || rawUser.Name || '',
            role: (rawUser.role || rawUser.Role || 'worker') as UserRole,
            is_active: rawUser.is_active !== undefined ? rawUser.is_active : (rawUser.IsActive !== undefined ? rawUser.IsActive : true),
            user_group: rawUser.user_group || rawUser.UserGroup || undefined,
            note: rawUser.note || rawUser.Note || undefined,
          };
          set({
            isAuthenticated: true,
            user,
          });
        } catch {
          // 解析失败，清除
          tokenManager.clearTokens();
          localStorage.removeItem('cutrix_user');
        }
      }
    } else {
      // Token 无效或过期，清除状态
      tokenManager.clearTokens();
      localStorage.removeItem('cutrix_user');
      set({
        isAuthenticated: false,
        user: null,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

