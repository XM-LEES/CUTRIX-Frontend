import apiClient from './client';
import { ProductionPlan, CreatePlanRequest, APIResponse } from '@/types';

export const plansApi = {
  /**
   * 获取计划列表
   */
  list: async (): Promise<ProductionPlan[]> => {
    const response = await apiClient.get<ProductionPlan[]>('/plans');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 获取计划详情
   */
  get: async (id: number): Promise<ProductionPlan> => {
    const response = await apiClient.get<ProductionPlan>(`/plans/${id}`);
    if (!response.data) {
      throw new Error('计划不存在');
    }
    return response.data;
  },

  /**
   * 根据订单 ID 获取计划列表
   */
  getByOrderId: async (orderId: number): Promise<ProductionPlan[]> => {
    const response = await apiClient.get<ProductionPlan[]>(`/orders/${orderId}/plans`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 创建计划
   */
  create: async (data: CreatePlanRequest): Promise<ProductionPlan> => {
    const response = await apiClient.post<ProductionPlan>('/plans', data);
    if (!response.data) {
      throw new Error('创建计划失败');
    }
    return response.data;
  },

  /**
   * 更新计划备注
   */
  updateNote: async (id: number, note: string | null): Promise<void> => {
    // 204 No Content 响应没有 body，直接返回成功
    await apiClient.patch(`/plans/${id}/note`, { note });
  },

  /**
   * 发布计划
   */
  publish: async (id: number): Promise<void> => {
    try {
      // 204 No Content 响应没有 body，直接返回成功
      await apiClient.post(`/plans/${id}/publish`, {});
    } catch (error: any) {
      // 提取后端返回的错误消息，清理技术信息
      let errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || '发布失败';
      
      // 清理 SQLSTATE 等技术信息
      if (errorMessage.includes('(SQLSTATE')) {
        errorMessage = errorMessage.split('(SQLSTATE')[0].trim();
      }
      
      // 如果错误消息是 "internal_error"，使用默认消息
      if (errorMessage === 'internal_error') {
        errorMessage = '发布失败';
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * 冻结计划
   */
  freeze: async (id: number): Promise<void> => {
    try {
      // 204 No Content 响应没有 body，直接返回成功
      await apiClient.post(`/plans/${id}/freeze`, {});
    } catch (error: any) {
      // 提取后端返回的错误消息，清理技术信息
      let errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || '冻结失败';
      
      // 清理 SQLSTATE 等技术信息
      if (errorMessage.includes('(SQLSTATE')) {
        errorMessage = errorMessage.split('(SQLSTATE')[0].trim();
      }
      
      // 如果错误消息是 "internal_error"，使用默认消息
      if (errorMessage === 'internal_error') {
        errorMessage = '冻结失败';
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * 删除计划
   */
  delete: async (id: number): Promise<void> => {
    // 204 No Content 响应没有 body，直接返回成功
    await apiClient.delete(`/plans/${id}`);
  },
};

