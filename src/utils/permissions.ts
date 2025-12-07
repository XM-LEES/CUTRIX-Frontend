import { UserRole, Permission } from '@/types';

// 权限映射表：角色 -> 权限列表
const rolePermissionsMap: Record<UserRole, Permission[]> = {
  admin: [
    // 所有权限
    'order:create', 'order:read', 'order:update', 'order:delete',
    'plan:create', 'plan:read', 'plan:update', 'plan:delete', 'plan:publish', 'plan:freeze',
    'layout:create', 'layout:read', 'layout:update', 'layout:delete',
    'task:create', 'task:read', 'task:update', 'task:delete',
    'log:create', 'log:read', 'log:update', 'log:void',
    'user:create', 'user:read', 'user:update', 'user:delete',
  ],
  manager: [
    // 与 admin 相同
    'order:create', 'order:read', 'order:update', 'order:delete',
    'plan:create', 'plan:read', 'plan:update', 'plan:delete', 'plan:publish', 'plan:freeze',
    'layout:create', 'layout:read', 'layout:update', 'layout:delete',
    'task:create', 'task:read', 'task:update', 'task:delete',
    'log:create', 'log:read', 'log:update', 'log:void',
    'user:create', 'user:read', 'user:update', 'user:delete',
  ],
  pattern_maker: [
    // 计划、版型管理（但不能发布计划）
    'plan:create', 'plan:read', 'plan:update', 'plan:delete',
    'layout:create', 'layout:read', 'layout:update', 'layout:delete',
    // 任务创建和删除权限（用于创建/编辑计划时创建任务，但不允许查看任务管理页面）
    'task:create', 'task:delete',
    'order:read',
  ],
  worker: [
    // 任务查看、日志提交和作废
    'task:read',
    'log:create', 'log:update', 'log:void',
    'order:read',
  ],
};

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(userRole: UserRole | null | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  
  // 标准化角色名（兼容可能的格式差异）
  const normalizedRole = userRole.toLowerCase() as UserRole;
  
  // admin 和 manager 拥有所有权限
  if (normalizedRole === 'admin' || normalizedRole === 'manager') {
    return true;
  }
  
  const permissions = rolePermissionsMap[normalizedRole] || [];
  return permissions.includes(permission);
}

/**
 * 检查用户是否有任一权限
 */
export function hasAnyPermission(userRole: UserRole | null, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * 检查用户是否有所有权限
 */
export function hasAllPermissions(userRole: UserRole | null, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * 检查用户角色
 */
export function hasRole(userRole: UserRole | null, roles: UserRole[]): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}

