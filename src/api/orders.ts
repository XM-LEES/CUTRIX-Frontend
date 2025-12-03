import apiClient from './client';
import { ProductionOrder, OrderItem, CreateOrderRequest, APIResponse } from '@/types';

export const ordersApi = {
  /**
   * 获取订单列表
   */
  list: async (): Promise<ProductionOrder[]> => {
    const response = await apiClient.get<ProductionOrder[]>('/orders');
    // 后端直接返回数组
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 获取订单详情
   */
  get: async (id: number): Promise<ProductionOrder> => {
    const response = await apiClient.get<ProductionOrder>(`/orders/${id}`);
    if (!response.data) {
      throw new Error('订单不存在');
    }
    return response.data;
  },

  /**
   * 根据订单号获取订单
   */
  getByNumber: async (number: string): Promise<ProductionOrder> => {
    const response = await apiClient.get<ProductionOrder>(`/orders/by-number/${number}`);
    if (!response.data) {
      throw new Error('订单不存在');
    }
    return response.data;
  },

  /**
   * 获取订单完整信息（含明细）
   */
  getFull: async (id: number): Promise<{ order: ProductionOrder; items: OrderItem[] }> => {
    const response = await apiClient.get<{ order: ProductionOrder; items: OrderItem[] }>(`/orders/${id}/full`);
    if (!response.data) {
      throw new Error('订单不存在');
    }
    return response.data;
  },

  /**
   * 创建订单
   */
  create: async (data: CreateOrderRequest): Promise<ProductionOrder> => {
    const response = await apiClient.post<ProductionOrder>('/orders', data);
    if (!response.data) {
      throw new Error('创建订单失败');
    }
    return response.data;
  },

  /**
   * 更新订单备注
   */
  updateNote: async (id: number, note: string | null): Promise<void> => {
    await apiClient.patch(`/orders/${id}/note`, { note });
    // 204 No Content，无需检查响应
  },

  /**
   * 更新订单完成日期
   */
  updateFinishDate: async (id: number, order_finish_date: string | null): Promise<void> => {
    await apiClient.patch(`/orders/${id}/finish-date`, { order_finish_date });
    // 204 No Content
  },

  /**
   * 删除订单
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/orders/${id}`);
    // 204 No Content
  },
};

