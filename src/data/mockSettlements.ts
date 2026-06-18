import { addDays } from 'date-fns';
import { Settlement } from '../types';

const today = new Date();

export const mockSettlements: Settlement[] = [
  {
    id: 'settlement-001',
    bookingId: 'booking-001',
    tierId: 'tier-001',
    totalAmount: 12000,
    commissionRate: 10,
    commissionAmount: 1200,
    artistAmount: 10800,
    settlementDate: addDays(today, -2),
    status: 'SETTLED',
  },
  {
    id: 'settlement-002',
    bookingId: 'booking-002',
    tierId: 'tier-001',
    totalAmount: 7200,
    commissionRate: 10,
    commissionAmount: 720,
    artistAmount: 6480,
    settlementDate: addDays(today, -1),
    status: 'SETTLED',
  },
  {
    id: 'settlement-003',
    bookingId: 'booking-003',
    tierId: 'tier-001',
    totalAmount: 8400,
    commissionRate: 15,
    commissionAmount: 1260,
    artistAmount: 7140,
    settlementDate: today,
    status: 'UNSETTLED',
  },
  {
    id: 'settlement-004',
    bookingId: 'booking-007',
    tierId: 'tier-002',
    totalAmount: 2400,
    commissionRate: 15,
    commissionAmount: 360,
    artistAmount: 2040,
    settlementDate: today,
    status: 'UNSETTLED',
  },
];
