import { CommissionTier } from '../types';

export const mockTiers: CommissionTier[] = [
  {
    id: 'tier-001',
    minAmount: 0,
    maxAmount: 100000,
    rate: 10,
    tierOrder: 1,
    isActive: true,
  },
  {
    id: 'tier-002',
    minAmount: 100000,
    maxAmount: 300000,
    rate: 15,
    tierOrder: 2,
    isActive: true,
  },
  {
    id: 'tier-003',
    minAmount: 300000,
    maxAmount: 500000,
    rate: 20,
    tierOrder: 3,
    isActive: true,
  },
  {
    id: 'tier-004',
    minAmount: 500000,
    maxAmount: 999999999,
    rate: 25,
    tierOrder: 4,
    isActive: true,
  },
];
