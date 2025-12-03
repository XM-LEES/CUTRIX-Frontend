import apiClient from './client';
import { ProductionLog, CreateLogRequest, VoidLogRequest } from '@/types';

export const logsApi = {
  /**
   * 获取任务日志列表
   */
  list: async (taskId: number): Promise<ProductionLog[]> => {
    const response = await apiClient.get<ProductionLog[]>(`/tasks/${taskId}/logs`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 创建日志
   */
  create: async (data: CreateLogRequest): Promise<ProductionLog> => {
    const response = await apiClient.post<ProductionLog>('/logs', data);
    if (!response.data) {
      throw new Error('创建日志失败');
    }
    return response.data;
  },

  /**
   * 作废日志
   */
  void: async (id: number, data: VoidLogRequest): Promise<void> => {
    await apiClient.patch(`/logs/${id}`, data);
    // 204 No Content
  },
};

