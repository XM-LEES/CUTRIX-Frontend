import apiClient from './client';
import { ProductionPlan, CreatePlanRequest, APIResponse } from '@/types';

export const plansApi = {
  /**
   * 获取计划列表
   */
  list: async (): Promise<ProductionPlan[]> => {
    const response = await apiClient.get<APIResponse<ProductionPlan[]>>('/plans');
    return response.data.data || [];
  },

  /**
   * 获取计划详情
   */
  get: async (id: number): Promise<ProductionPlan> => {
    const response = await apiClient.get<APIResponse<ProductionPlan>>(`/plans/${id}`);
    if (!response.data.data) {
      throw new Error('计划不存在');
    }
    return response.data.data;
  },

  /**
   * 根据订单 ID 获取计划列表
   */
  getByOrderId: async (orderId: number): Promise<ProductionPlan[]> => {
    const response = await apiClient.get<APIResponse<ProductionPlan[]>>(`/orders/${orderId}/plans`);
    return response.data.data || [];
  },

  /**
   * 创建计划
   */
  create: async (data: CreatePlanRequest): Promise<ProductionPlan> => {
    const response = await apiClient.post<APIResponse<ProductionPlan>>('/plans', data);
    if (!response.data.data) {
      throw new Error(response.data.error || '创建计划失败');
    }
    return response.data.data;
  },

  /**
   * 更新计划备注
   */
  updateNote: async (id: number, note: string | null): Promise<void> => {
    const response = await apiClient.patch<APIResponse>(`/plans/${id}/note`, { note });
    if (!response.data.success) {
      throw new Error(response.data.error || '更新失败');
    }
  },

  /**
   * 发布计划
   */
  publish: async (id: number): Promise<void> => {
    const response = await apiClient.post<APIResponse>(`/plans/${id}/publish`, {});
    if (!response.data.success) {
      throw new Error(response.data.error || '发布失败');
    }
  },

  /**
   * 冻结计划
   */
  freeze: async (id: number): Promise<void> => {
    const response = await apiClient.post<APIResponse>(`/plans/${id}/freeze`, {});
    if (!response.data.success) {
      throw new Error(response.data.error || '冻结失败');
    }
  },

  /**
   * 删除计划
   */
  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<APIResponse>(`/plans/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || '删除失败');
    }
  },
};

