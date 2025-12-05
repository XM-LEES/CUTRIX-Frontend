import apiClient from './client';
import { ProductionTask, CreateTaskRequest } from '@/types';

export const tasksApi = {
  /**
   * 获取任务列表
   */
  list: async (): Promise<ProductionTask[]> => {
    const response = await apiClient.get<ProductionTask[]>('/tasks');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 根据版型 ID 获取任务列表
   */
  listByLayout: async (layoutId: number): Promise<ProductionTask[]> => {
    const response = await apiClient.get<ProductionTask[]>(`/layouts/${layoutId}/tasks`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 获取任务详情
   */
  get: async (id: number): Promise<ProductionTask> => {
    const response = await apiClient.get<ProductionTask>(`/tasks/${id}`);
    if (!response.data) {
      throw new Error('任务不存在');
    }
    return response.data;
  },

  /**
   * 创建任务
   */
  create: async (data: CreateTaskRequest): Promise<ProductionTask> => {
    const response = await apiClient.post<ProductionTask>('/tasks', data);
    if (!response.data) {
      throw new Error('创建任务失败');
    }
    return response.data;
  },

  /**
   * 删除任务
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
    // 204 No Content
  },
};

