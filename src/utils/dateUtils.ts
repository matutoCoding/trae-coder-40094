import {
  format,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isSameDay,
  addHours,
  differenceInMinutes,
  isWithinInterval,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDate(date: Date | string, pattern: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: zhCN });
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm');
}

export function formatTime(date: Date | string): string {
  return formatDate(date, 'HH:mm');
}

export function formatMonth(date: Date | string): string {
  return formatDate(date, 'yyyy年MM月');
}

export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function isInCurrentMonth(date: Date): boolean {
  return isSameMonth(date, new Date());
}

export function calculateDuration(start: Date, end: Date): number {
  return differenceInMinutes(end, start);
}

export function isOverlapping(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return (
    isWithinInterval(start1, { start: start2, end: end2 }) ||
    isWithinInterval(end1, { start: start2, end: end2 }) ||
    isWithinInterval(start2, { start: start1, end: end1 }) ||
    (start1 < start2 && end1 > end2)
  );
}

export function getHoursInDay(date: Date): Date[] {
  return eachHourOfInterval({
    start: startOfDay(date),
    end: endOfDay(date),
  });
}

export function getStudioTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    LARGE: '大棚',
    MEDIUM: '中棚',
    SMALL: '小棚',
  };
  return labels[type] || type;
}

export function getBookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: '待分配',
    ALLOCATED: '已分配',
    CONFIRMED: '已确认',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };
  return labels[status] || status;
}

export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: '#ffd166',
    ALLOCATED: '#9d4edd',
    CONFIRMED: '#3ddc97',
    COMPLETED: '#d4af37',
    CANCELLED: '#666666',
  };
  return colors[status] || '#666666';
}
