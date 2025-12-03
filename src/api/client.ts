import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { APIResponse } from '@/types';
import { message } from 'antd';

// Token 存储键
const ACCESS_TOKEN_KEY = 'cutrix_access_token';
const REFRESH_TOKEN_KEY = 'cutrix_refresh_token';
const TOKEN_EXPIRY_KEY = 'cutrix_token_expiry';

// 创建 Axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 是否正在刷新 Token
let isRefreshing = false;
// 等待刷新完成的请求队列
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

// Token 管理函数
export const tokenManager = {
  getAccessToken: (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  
  setAccessToken: (token: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  
  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  
  setRefreshToken: (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  
  getTokenExpiry: (): number | null => {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  },
  
  setTokenExpiry: (expiry: string): void => {
    localStorage.setItem(TOKEN_EXPIRY_KEY, new Date(expiry).getTime().toString());
  },
  
  clearTokens: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },
  
  isTokenExpired: (): boolean => {
    const expiry = tokenManager.getTokenExpiry();
    if (!expiry) return true;
    // 提前 5 分钟刷新
    return Date.now() >= expiry - 5 * 60 * 1000;
  },
};

// 处理队列中的请求
const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 请求拦截器：添加 Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理 Token 刷新
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError<APIResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // 401 错误且未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      try {
        // 调用刷新 Token 接口（后端直接返回数据，不是包装格式）
        const response = await axios.post<{
          access_token: string;
          refresh_token: string;
          expires_at: string;
        }>('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        });
        
        if (response.data.access_token) {
          const { access_token, refresh_token, expires_at } = response.data;
          tokenManager.setAccessToken(access_token);
          tokenManager.setRefreshToken(refresh_token);
          tokenManager.setTokenExpiry(expires_at);
          
          // 更新请求头
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          
          // 处理队列
          processQueue(null, access_token);
          
          // 重试原请求
          return apiClient(originalRequest);
        } else {
          throw new Error('刷新 Token 失败');
        }
      } catch (refreshError) {
        // 刷新失败，清除 Token 并跳转登录
        processQueue(refreshError as AxiosError, null);
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // 403 权限错误
    if (error.response?.status === 403) {
      message.error('没有权限执行此操作');
    }
    
    // 其他错误
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || '请求失败';
    // 避免重复显示错误（某些错误可能已经在业务层处理）
    if (error.response?.status !== 401 && error.response?.status !== 403 && error.response?.status !== 404) {
      message.error(errorMessage);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

