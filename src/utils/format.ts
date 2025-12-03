import dayjs from 'dayjs';

/**
 * 格式化日期时间
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return dayjs(date).fromNow();
}

/**
 * 格式化状态标签
 */
export function getStatusLabel(status: string): { text: string; color: string } {
  const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '待发布', color: 'default' },
    in_progress: { text: '进行中', color: 'processing' },
    completed: { text: '已完成', color: 'success' },
    frozen: { text: '已冻结', color: 'warning' },
  };
  return statusMap[status] || { text: status, color: 'default' };
}

/**
 * 计算进度百分比
 */
export function calculateProgress(completed: number, planned: number): number {
  if (planned === 0) return 0;
  return Math.min(Math.round((completed / planned) * 100), 100);
}

