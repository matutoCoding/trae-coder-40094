import { addDays, addHours } from 'date-fns';
import { MasterDelivery } from '../types';

const today = new Date();

export const mockMasters: MasterDelivery[] = [
  {
    id: 'master-001',
    bookingId: 'booking-001',
    version: 'v1.0',
    downloadUrl: 'https://example.com/masters/booking-001-v1.zip',
    notes: '首次母带交付，已完成EQ和压缩处理',
    isConfirmed: true,
    deliveredAt: addDays(today, -1),
    confirmedAt: addDays(today, -1),
  },
  {
    id: 'master-002',
    bookingId: 'booking-001',
    version: 'v1.1',
    downloadUrl: 'https://example.com/masters/booking-001-v1.1.zip',
    notes: '根据艺人反馈调整了低频部分',
    isConfirmed: false,
    deliveredAt: today,
  },
  {
    id: 'master-003',
    bookingId: 'booking-002',
    version: 'v1.0',
    downloadUrl: 'https://example.com/masters/booking-002-v1.zip',
    notes: '人声专辑母带，共10首曲目',
    isConfirmed: true,
    deliveredAt: addDays(today, -1),
    confirmedAt: addHours(addDays(today, -1), 3),
  },
];
