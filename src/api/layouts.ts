import apiClient from './client';
import { CuttingLayout, CreateLayoutRequest } from '@/types';

export const layoutsApi = {
  /**
   * 获取版型列表（按计划）
   */
  listByPlan: async (planId: number): Promise<CuttingLayout[]> => {
    const response = await apiClient.get<CuttingLayout[]>(`/plans/${planId}/layouts`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 获取所有版型
   */
  list: async (): Promise<CuttingLayout[]> => {
    const response = await apiClient.get<CuttingLayout[]>(`/layouts`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 获取版型详情
   */
  get: async (id: number): Promise<CuttingLayout> => {
    const response = await apiClient.get<CuttingLayout>(`/layouts/${id}`);
    if (!response.data) {
      throw new Error('版型不存在');
    }
    return response.data;
  },

  /**
   * 创建版型
   */
  create: async (data: CreateLayoutRequest): Promise<CuttingLayout> => {
    const response = await apiClient.post<CuttingLayout>('/layouts', data);
    if (!response.data) {
      throw new Error('创建版型失败');
    }
    return response.data;
  },

  /**
   * 更新版型名称
   */
  updateName: async (id: number, name: string): Promise<void> => {
    await apiClient.patch(`/layouts/${id}/name`, { name });
    // 204 No Content
  },

  /**
   * 更新版型备注
   */
  updateNote: async (id: number, note: string | null): Promise<void> => {
    await apiClient.patch(`/layouts/${id}/note`, { note });
    // 204 No Content
  },

  /**
   * 删除版型
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/layouts/${id}`);
    // 204 No Content
  },
};

