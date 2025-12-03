import { User, UserRole } from '@/types';

/**
 * 用户权限检查工具函数
 */

/**
 * 检查是否是操作自己
 */
export function isSelf(currentUser: User | null, targetUser: User): boolean {
  if (!currentUser) return false;
  const currentUserId = currentUser.user_id || currentUser.UserID;
  const targetUserId = targetUser.user_id || targetUser.UserID;
  return currentUserId === targetUserId;
}

/**
 * 获取当前用户角色
 */
export function getCurrentUserRole(user: User | null): UserRole | null {
  if (!user) return null;
  return (user.role || user.Role) as UserRole;
}

/**
 * 获取目标用户角色
 */
export function getTargetUserRole(user: User): UserRole | null {
  return (user.role || user.Role) as UserRole;
}

/**
 * 检查 manager 是否可以操作目标用户
 */
export function canManagerOperate(currentUser: User | null, targetUser: User): boolean {
  const currentRole = getCurrentUserRole(currentUser);
  const targetRole = getTargetUserRole(targetUser);
  // manager 不能操作 admin
  return !(currentRole === 'manager' && targetRole === 'admin');
}

/**
 * 检查是否可以修改自己的角色
 */
export function canModifyOwnRole(currentUser: User | null, targetUser: User): boolean {
  const currentRole = getCurrentUserRole(currentUser);
  if (!currentRole) return true;
  // admin 和 manager 不能修改自己的角色
  return !isSelf(currentUser, targetUser) || (currentRole !== 'admin' && currentRole !== 'manager');
}

/**
 * 检查是否可以修改自己的状态
 */
export function canModifyOwnStatus(currentUser: User | null, targetUser: User): boolean {
  const currentRole = getCurrentUserRole(currentUser);
  if (!currentRole) return true;
  // admin 和 manager 不能修改自己的状态
  return !isSelf(currentUser, targetUser) || (currentRole !== 'admin' && currentRole !== 'manager');
}

/**
 * 检查是否可以删除自己
 */
export function canDeleteSelf(currentUser: User | null, targetUser: User): boolean {
  const currentRole = getCurrentUserRole(currentUser);
  if (!currentRole) return true;
  // admin 和 manager 不能删除自己
  return !isSelf(currentUser, targetUser) || (currentRole !== 'admin' && currentRole !== 'manager');
}

/**
 * 检查是否可以创建指定角色
 */
export function canCreateRole(
  currentUser: User | null,
  role: UserRole,
  existingUsers: User[]
): { allowed: boolean; reason?: string } {
  const currentRole = getCurrentUserRole(currentUser);
  if (!currentRole) return { allowed: false, reason: '未登录' };

  // 检查 admin 角色
  if (role === 'admin') {
    const hasAdmin = existingUsers.some(u => {
      const r = getTargetUserRole(u);
      return r === 'admin';
    });
    if (hasAdmin) {
      return { allowed: false, reason: '系统已存在管理员，不能创建新的管理员用户' };
    }
    if (currentRole === 'admin') {
      return { allowed: false, reason: '不能创建新的管理员用户，系统只需一个管理员' };
    }
    if (currentRole === 'manager') {
      return { allowed: false, reason: '没有权限创建管理员用户' };
    }
  }

  // 检查 manager 角色
  if (role === 'manager') {
    if (currentRole === 'manager') {
      return { allowed: false, reason: '不能创建经理用户' };
    }
    const hasManager = existingUsers.some(u => {
      const r = getTargetUserRole(u);
      return r === 'manager';
    });
    if (hasManager) {
      return { allowed: false, reason: '系统已存在经理，不能创建新的经理用户' };
    }
  }

  return { allowed: true };
}

/**
 * 检查是否可以停用账户
 */
export function canDeactivate(currentUser: User | null, targetUser: User, active: boolean): boolean {
  if (active) return true; // 激活总是允许的
  const currentRole = getCurrentUserRole(currentUser);
  if (!currentRole) return false;
  // admin 和 manager 不能停用自己
  return !isSelf(currentUser, targetUser) || (currentRole !== 'admin' && currentRole !== 'manager');
}

