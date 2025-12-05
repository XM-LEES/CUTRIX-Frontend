// ========== 基础类型 ==========
export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type UserRole = 'admin' | 'manager' | 'worker' | 'pattern_maker';

// ========== 用户相关 ==========
export interface User {
  user_id?: number;
  name?: string;
  role?: UserRole;
  is_active?: boolean;
  user_group?: string;
  note?: string;
  // 兼容后端返回的大写格式
  UserID?: number;
  Name?: string;
  Role?: UserRole;
  IsActive?: boolean;
  UserGroup?: string | null;
  Note?: string | null;
}

export interface LoginRequest {
  name: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// ========== 订单相关 ==========
export interface ProductionOrder {
  order_id: number;
  order_number: string;
  style_number: string;
  customer_name?: string;
  order_start_date?: string;
  order_finish_date?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  item_id: number;
  order_id: number;
  color: string;
  size: string;
  quantity: number;
}

export interface CreateOrderRequest {
  order_number: string;
  style_number: string;
  customer_name?: string;
  order_start_date?: string;
  order_finish_date?: string;
  note?: string;
  items: Array<{
    color: string;
    size: string;
    quantity: number;
  }>;
}

// ========== 计划相关 ==========
export interface ProductionPlan {
  plan_id: number;
  plan_name: string;
  order_id: number;
  note?: string;
  planned_publish_date?: string;
  planned_finish_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'frozen';
}

export interface CreatePlanRequest {
  plan_name: string;
  order_id: number;
  note?: string;
  planned_finish_date?: string;
}

// ========== 版型相关 ==========
export interface CuttingLayout {
  layout_id: number;
  plan_id: number;
  layout_name: string;
  note?: string;
}

export interface LayoutSizeRatio {
  ratio_id: number;
  layout_id: number;
  size: string;
  ratio: number;
}

export interface CreateLayoutRequest {
  plan_id: number;
  layout_name: string;
  note?: string;
}

// ========== 任务相关 ==========
export interface ProductionTask {
  task_id: number;
  layout_id: number;
  color: string;
  planned_layers: number;
  completed_layers: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface CreateTaskRequest {
  layout_id: number;
  color: string;
  planned_layers: number;
}

// ========== 日志相关 ==========
export interface ProductionLog {
  log_id: number;
  task_id: number;
  worker_id?: number;
  worker_name?: string;
  layers_completed: number;
  log_time: string;
  note?: string;
  voided: boolean;
  void_reason?: string;
  voided_at?: string;
  voided_by?: number;
  voided_by_name?: string;
}

export interface CreateLogRequest {
  task_id: number;
  layers_completed: number;
  worker_id?: number;
  worker_name?: string;
  note?: string;
}

export interface VoidLogRequest {
  void_reason: string;
}

// ========== 权限相关 ==========
export type Permission = 
  | 'order:create' | 'order:read' | 'order:update' | 'order:delete'
  | 'plan:create' | 'plan:read' | 'plan:update' | 'plan:delete' | 'plan:publish' | 'plan:freeze'
  | 'layout:create' | 'layout:read' | 'layout:update' | 'layout:delete'
  | 'task:create' | 'task:read' | 'task:update' | 'task:delete'
  | 'log:create' | 'log:read' | 'log:update' | 'log:void'
  | 'user:create' | 'user:read' | 'user:update' | 'user:delete';

