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
   * 获取当前用户的日志列表
   */
  listMy: async (): Promise<ProductionLog[]> => {
    const response = await apiClient.get<ProductionLog[]>('/logs/my');
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

  /**
   * 获取最近作废的日志（用于manager查看）
   */
  listRecentVoided: async (limit?: number): Promise<ProductionLog[]> => {
    const url = limit ? `/logs/recent-voided?limit=${limit}` : '/logs/recent-voided';
    const response = await apiClient.get<ProductionLog[]>(url);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 获取所有日志（管理员用），支持筛选和分页
   */
  listAll: async (params?: {
    task_id?: number;
    worker_id?: number;
    voided?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: ProductionLog[]; total: number; limit: number; offset: number }> => {
    const response = await apiClient.get<{
      logs: ProductionLog[];
      total: number;
      limit: number;
      offset: number;
    }>('/logs', { params });
    return response.data;
  },
};

