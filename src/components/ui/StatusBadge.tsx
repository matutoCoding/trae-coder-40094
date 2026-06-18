import { BookingStatus, SettlementStatus } from '../../types';
import { getBookingStatusLabel, getBookingStatusColor } from '../../utils/dateUtils';

interface StatusBadgeProps {
  status: BookingStatus | SettlementStatus;
  type?: 'booking' | 'settlement';
}

export function StatusBadge({ status, type = 'booking' }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    PENDING: 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30',
    ALLOCATED: 'bg-neon-purple/20 text-neon-purple border-neon-purple/30',
    CONFIRMED: 'bg-neon-green/20 text-neon-green border-neon-green/30',
    COMPLETED: 'bg-gold/20 text-gold border-gold/30',
    CANCELLED: 'bg-text-muted/20 text-text-muted border-text-muted/30',
    UNSETTLED: 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30',
    SETTLED: 'bg-neon-green/20 text-neon-green border-neon-green/30',
  };

  const labelMap: Record<string, string> = {
    PENDING: '待分配',
    ALLOCATED: '已分配',
    CONFIRMED: '已确认',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    UNSETTLED: '待结算',
    SETTLED: '已结算',
  };

  const bgColor = colorMap[status] || colorMap.PENDING;
  const label = labelMap[status] || status;

  return (
    <span className={`status-badge border ${bgColor}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {label}
    </span>
  );
}
