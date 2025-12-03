import apiClient from './client';
import { User } from '@/types';

export const usersApi = {
  /**
   * 获取用户列表
   */
  list: async (params?: {
    query?: string;
    name?: string;
    role?: string;
    active?: boolean;
    group?: string;
  }): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users', { params });
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 获取用户详情
   */
  get: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    if (!response.data) {
      throw new Error('用户不存在');
    }
    return response.data;
  },

  /**
   * 创建用户
   */
  create: async (data: {
    name: string;
    role: string;
    group?: string;
    note?: string;
  }): Promise<User> => {
    const response = await apiClient.post<User>('/users', data);
    if (!response.data) {
      throw new Error('创建用户失败');
    }
    return response.data;
  },

  /**
   * 更新用户资料
   */
  updateProfile: async (id: number, data: {
    name?: string;
    group?: string;
    note?: string;
  }): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${id}/profile`, data);
    if (!response.data) {
      throw new Error('更新失败');
    }
    return response.data;
  },

  /**
   * 分配角色
   */
  assignRole: async (id: number, role: string): Promise<void> => {
    await apiClient.put(`/users/${id}/role`, { role });
    // 204 No Content
  },

  /**
   * 设置激活状态
   */
  setActive: async (id: number, active: boolean): Promise<void> => {
    await apiClient.put(`/users/${id}/active`, { active });
    // 204 No Content
  },

  /**
   * 重置密码
   */
  setPassword: async (id: number, new_password: string): Promise<void> => {
    await apiClient.put(`/users/${id}/password`, { new_password });
    // 204 No Content
  },

  /**
   * 删除用户
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
    // 204 No Content
  },
};

